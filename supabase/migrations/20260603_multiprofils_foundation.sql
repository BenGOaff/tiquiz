-- 20260603_multiprofils_foundation.sql
--
-- Phase 1/3 du chantier multiprofils Tiquiz (cf. ROADMAP_RETENTION.md
-- + CLAUDE_PITFALLS.md "MULTIPROFILS Tiquiz").
--
-- ⚠️ CETTE MIGRATION N'ACTIVE AUCUN FILTRE CÔTÉ CODE — elle prépare
-- uniquement la structure DB. Le code Tiquiz continue d'utiliser
-- `quizzes.user_id` comme avant. Les phases 2 et 3 (helpers serveur,
-- UI ProjectSwitcher, gate plan premium) viendront dans des commits
-- séparés, une fois cette foundation déployée et stable en prod.
--
-- Invariant absolu (cf. pitfall en tête de CLAUDE_PITFALLS.md) :
-- ne JAMAIS activer un filtre project_id avant que TOUTES les lignes
-- existantes aient project_id != NULL. Le backfill ci-dessous garantit
-- cela, mais quand on activera les filtres (phase 3), il faudra
-- TOUJOURS écrire `WHERE project_id = :active OR project_id IS NULL`
-- pour la lecture tolérante pendant la transition.
--
-- Tables impactées : projects (nouvelle) + colonne project_id ajoutée
-- sur quizzes, popquizzes, business_events, user_milestones.
-- NON impactés (V1) : custom_domains, sio_api_keys, visual_studio_*,
-- profiles — restent globaux par user. Béné décidera en V2 si elle
-- veut isoler ces ressources par projet.

-- ============================================================================
-- 1. Table projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mon espace',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.projects IS
  'Espaces de travail (multiprofils Tiquiz). Chaque user a au moins 1 projet (is_default=true) créé automatiquement. Le plan premium débloque la création de projets supplémentaires.';

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);

-- Un seul projet "is_default = true" par user. Crucial : ce sera le
-- fallback de toute lecture tolérante pendant la transition phase 2/3.
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_user_default
  ON public.projects(user_id) WHERE is_default = true;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_own ON public.projects;
CREATE POLICY projects_select_own ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS projects_insert_own ON public.projects;
CREATE POLICY projects_insert_own ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS projects_update_own ON public.projects;
CREATE POLICY projects_update_own ON public.projects
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS projects_delete_own ON public.projects;
CREATE POLICY projects_delete_own ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Ajout colonne project_id NULLABLE sur les tables scopées
--
-- Important : NULLABLE volontairement. Tant que le backfill n'est pas
-- 100% appliqué et stable, on doit pouvoir lire les lignes sans
-- project_id (cf. lecture tolérante). FOREIGN KEY avec ON DELETE SET
-- NULL → si un projet est supprimé, les quizzes du projet basculent
-- en orphelins (project_id NULL) et sont alors lisibles par le projet
-- par défaut de l'user. Aucune donnée perdue.
-- ============================================================================

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quizzes_project ON public.quizzes(project_id)
  WHERE project_id IS NOT NULL;

-- popquizzes : la table peut ne pas exister sur tous les déploiements
-- (feature ajoutée en mai 2026 sur Tiquiz). On guard via DO block.
DO $popquiz$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'popquizzes') THEN
    EXECUTE 'ALTER TABLE public.popquizzes
             ADD COLUMN IF NOT EXISTS project_id UUID
             REFERENCES public.projects(id) ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_popquizzes_project
             ON public.popquizzes(project_id) WHERE project_id IS NOT NULL';
  END IF;
END
$popquiz$;

ALTER TABLE public.business_events
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_business_events_project ON public.business_events(project_id)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.user_milestones
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_milestones_project ON public.user_milestones(project_id)
  WHERE project_id IS NOT NULL;

-- ============================================================================
-- 3. Backfill : 1 projet "Mon espace" par user, puis assignation des
--    quizzes / popquizzes / business_events / user_milestones existants.
--
-- Idempotent : peut être re-run sans casser. On boucle sur les users
-- distincts depuis profiles (la table user-source canonique Tiquiz),
-- on s'assure qu'un projet is_default existe, puis on UPDATE les
-- lignes orphelines (project_id IS NULL).
-- ============================================================================

DO $backfill$
DECLARE
  user_record RECORD;
  default_project_id UUID;
BEGIN
  FOR user_record IN
    SELECT DISTINCT user_id FROM public.profiles WHERE user_id IS NOT NULL
  LOOP
    -- S'assurer qu'un projet par défaut existe pour cet user.
    SELECT id INTO default_project_id
    FROM public.projects
    WHERE user_id = user_record.user_id AND is_default = true
    LIMIT 1;

    IF default_project_id IS NULL THEN
      INSERT INTO public.projects (user_id, name, is_default)
      VALUES (user_record.user_id, 'Mon espace', true)
      RETURNING id INTO default_project_id;
    END IF;

    -- Backfill quizzes orphelins.
    UPDATE public.quizzes
    SET project_id = default_project_id
    WHERE user_id = user_record.user_id AND project_id IS NULL;

    -- Backfill popquizzes (si table existe).
    BEGIN
      EXECUTE format(
        'UPDATE public.popquizzes SET project_id = %L WHERE user_id = %L AND project_id IS NULL',
        default_project_id, user_record.user_id
      );
    EXCEPTION WHEN undefined_table THEN
      -- popquizzes absent — on skip silencieusement.
      NULL;
    END;

    -- Backfill business_events.
    UPDATE public.business_events
    SET project_id = default_project_id
    WHERE user_id = user_record.user_id AND project_id IS NULL;

    -- Backfill user_milestones.
    UPDATE public.user_milestones
    SET project_id = default_project_id
    WHERE user_id = user_record.user_id AND project_id IS NULL;
  END LOOP;
END
$backfill$;

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
