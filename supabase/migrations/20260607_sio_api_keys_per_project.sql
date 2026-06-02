-- 20260607_sio_api_keys_per_project.sql
--
-- sio_api_keys per-projet (multiprofils Tiquiz phase 6) — Béné 2 juin 2026 :
-- "compte dédié avec [...] nouvelle clé API etc... les comptes secondaires
-- ne doivent PAS hériter des réglages des autres comptes".
--
-- Avant : sio_api_keys était scoped (user_id, name) UNIQUE → toutes
-- les clés Systeme.io de l'user étaient visibles depuis n'importe quel
-- projet. Après : (user_id, project_id, name) UNIQUE → chaque projet
-- a SES propres clés. Un projet secondaire démarre VIDE (aucune clé)
-- et l'user configure sa propre intégration SIO indépendamment.
--
-- COMPAT QUIZ EN LIGNE — INVARIANT FORT :
-- - quizzes.sio_api_key_id (FK avec ON DELETE SET NULL) continue de
--   pointer vers la clé spécifique. La clé reste accessible via son
--   id même si elle "appartient" à un autre projet (read by id is
--   project-agnostic). Donc AUCUN quiz en ligne n'arrête de syncer.
-- - Le scoping par project_id n'est appliqué qu'à la LECTURE des
--   listes (Settings UI) et à la création de nouvelles clés.
-- - Le filtrage par projet dans le resolveApiKey est optionnel : pour
--   les events publics (track, lead capture), on n'a pas de cookie
--   actif → on lit par quiz.sio_api_key_id direct (= clé qui a
--   syncé jusqu'à présent, peu importe son project_id).
--
-- BACKFILL : chaque clé existante hérite du projet par défaut de son
-- owner. UNIQUE(user_id, name) → 1 clé "Ma clé X" max par user
-- AVANT migration → pas de conflit possible APRÈS backfill puisque
-- chaque user n'a qu'un seul projet par défaut.

-- ============================================================================
-- 1. ADD COLUMN project_id (NULLABLE pour permettre le backfill safe)
-- ============================================================================

ALTER TABLE public.sio_api_keys
  ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sio_api_keys_project
  ON public.sio_api_keys(project_id)
  WHERE project_id IS NOT NULL;

-- ============================================================================
-- 2. BACKFILL : chaque clé existante → projet par défaut de son owner
-- ============================================================================

DO $backfill$
DECLARE
  key_record RECORD;
  default_project_id UUID;
BEGIN
  FOR key_record IN
    SELECT id, user_id FROM public.sio_api_keys WHERE project_id IS NULL
  LOOP
    SELECT id INTO default_project_id
    FROM public.projects
    WHERE user_id = key_record.user_id AND is_default = true
    LIMIT 1;

    -- Skip si pas de projet par défaut (théoriquement impossible après
    -- 20260603_multiprofils_foundation). La clé reste project_id=NULL
    -- = clé "globale", continue de fonctionner via lookup par id.
    IF default_project_id IS NOT NULL THEN
      UPDATE public.sio_api_keys
      SET project_id = default_project_id
      WHERE id = key_record.id;
    END IF;
  END LOOP;
END
$backfill$;

-- ============================================================================
-- 3. REMPLACEMENT DES CONTRAINTES D'UNICITÉ
--
-- Ancien :
--   UNIQUE (user_id, name) — 1 clé "Ma clé X" max par user
--   UNIQUE INDEX (user_id) WHERE is_default — 1 default max par user
--
-- Nouveau (per-projet) :
--   UNIQUE (user_id, project_id, name) — 1 clé "Ma clé X" max par (user, project)
--   UNIQUE INDEX (user_id, project_id) WHERE is_default — 1 default max par (user, project)
-- ============================================================================

DO $constraints$
BEGIN
  -- Drop ancien UNIQUE(user_id, name) — nom de contrainte usuel
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sio_api_keys_user_id_name_key'
  ) THEN
    ALTER TABLE public.sio_api_keys DROP CONSTRAINT sio_api_keys_user_id_name_key;
  END IF;

  -- Add nouveau UNIQUE(user_id, project_id, name) — idempotent
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sio_api_keys_user_project_name_key'
  ) THEN
    ALTER TABLE public.sio_api_keys
      ADD CONSTRAINT sio_api_keys_user_project_name_key
      UNIQUE (user_id, project_id, name);
  END IF;
END
$constraints$;

-- Drop ancien partial index "1 default per user"
DROP INDEX IF EXISTS public.sio_api_keys_one_default_per_user;

-- Add nouveau "1 default per (user, project)"
CREATE UNIQUE INDEX IF NOT EXISTS sio_api_keys_one_default_per_user_project
  ON public.sio_api_keys(user_id, project_id) WHERE is_default = true;

NOTIFY pgrst, 'reload schema';
