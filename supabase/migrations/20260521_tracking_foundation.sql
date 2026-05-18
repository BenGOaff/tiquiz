-- Tracking foundation (Adeline, 19 mai 2026 : "les statistiques ne
-- sont ni fiables ni cohérentes — il faut un bon système de tracking
-- qui reflète les vrais visiteurs, les vrais chiffres").
--
-- État avant cette migration :
--   - `quizzes.{views,starts,completions,shares}_count` : compteurs
--     cumulés, bumpés par 2 chemins différents.
--   - `log_quiz_event` RPC : insère dans quiz_events ET bumpe le
--     compteur (utilisé pour 'view' uniquement, depuis /public).
--   - `/track` route : UPDATE direct sur le compteur (pour start /
--     complete), n'écrit JAMAIS dans quiz_events.
--   → Le log time-series est INCOMPLET pour start/complete. La page
--     analytics affiche un mix incohérent.
--   → Aucune déduplication. Refresh = +1 view. Bots comptent.
--
-- Objectif :
--   - Un seul chemin : tout passe par INSERT dans quiz_events.
--   - Trigger automatique qui bumpe le compteur sur insert → les
--     compteurs ne peuvent PLUS dériver du log.
--   - Déduplication par cookie session : avant insert, vérifier qu'on
--     n'a pas déjà la même paire (quiz, event, session) sur 24h.
--   - Bot filtering + owner exclusion : côté /track route (ce SQL ne
--     filtre rien, c'est juste un coffre-fort pour les compteurs).
--   - Backfill une fois : recompute les compteurs depuis le log.

-- ─── 1) session_id sur quiz_events pour dédup ────────────────────
ALTER TABLE public.quiz_events
  ADD COLUMN IF NOT EXISTS session_id TEXT;

COMMENT ON COLUMN public.quiz_events.session_id IS
  'Cookie session id (random UUID) du visiteur. NULL pour les events historiques. Utilisé par /track pour dédupliquer (quiz_id, event_type, session_id) sur fenêtre 24h.';

-- Index dedup : (quiz_id, event_type, session_id, created_at DESC)
-- partial sur session_id NOT NULL pour rester compact (les vieux
-- events ont session_id NULL).
CREATE INDEX IF NOT EXISTS idx_quiz_events_dedup
  ON public.quiz_events (quiz_id, event_type, session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

-- ─── 2) RPC log_quiz_event refactor — INSERT only ────────────────
-- L'ancienne version bumpait elle-même le compteur. Maintenant c'est
-- le trigger qui s'en charge → la RPC ne fait QUE l'insert. Idempotent
-- vs ancienne signature : on garde le paramètre meta_input pour pas
-- casser les anciens callers, on ajoute session_id_input en optionnel.
CREATE OR REPLACE FUNCTION log_quiz_event(
  quiz_id_input UUID,
  event_type_input TEXT,
  meta_input JSONB DEFAULT NULL,
  session_id_input TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.quiz_events (quiz_id, event_type, meta, session_id)
  VALUES (quiz_id_input, event_type_input, meta_input, session_id_input);
  -- Les compteurs sur quizzes sont auto-bumpés par
  -- trg_quiz_events_bump_counter (voir plus bas) → plus de logique
  -- dupliquée ici.
END;
$$;

-- ─── 3) Trigger qui bumpe les compteurs sur INSERT ───────────────
-- Source de vérité = quiz_events. Les colonnes sur quizzes
-- deviennent un cache auto-maintenu par ce trigger. Plus jamais
-- d'UPDATE direct sur views_count et amis depuis le code applicatif.
CREATE OR REPLACE FUNCTION bump_quiz_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'view' THEN
    UPDATE public.quizzes SET views_count = COALESCE(views_count, 0) + 1
      WHERE id = NEW.quiz_id;
  ELSIF NEW.event_type = 'start' THEN
    UPDATE public.quizzes SET starts_count = COALESCE(starts_count, 0) + 1
      WHERE id = NEW.quiz_id;
  ELSIF NEW.event_type = 'complete' THEN
    UPDATE public.quizzes SET completions_count = COALESCE(completions_count, 0) + 1
      WHERE id = NEW.quiz_id;
  ELSIF NEW.event_type = 'share' THEN
    UPDATE public.quizzes SET shares_count = COALESCE(shares_count, 0) + 1
      WHERE id = NEW.quiz_id;
  END IF;
  -- 'question_view' et autres event_types restent dans le log
  -- sans bumper de compteur cumulé.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_events_bump_counter ON public.quiz_events;
CREATE TRIGGER trg_quiz_events_bump_counter
  AFTER INSERT ON public.quiz_events
  FOR EACH ROW EXECUTE FUNCTION bump_quiz_counter();

-- ─── 4) Pas de backfill ──────────────────────────────────────────
-- On NE reset PAS les compteurs historiques :
--   - views_count : reflète des vues qui incluent bots + refresh,
--     mais c'est ce que les créateurs voient depuis le début. Reset
--     leur donnerait l'impression d'avoir "perdu" des vues.
--   - starts_count / completions_count / shares_count : jamais loggés
--     dans quiz_events avant cette migration (UPDATE direct), donc un
--     reset = COUNT du log = 0 pour TOUTES les valeurs historiques.
--     Catastrophique pour la confiance des créateurs.
--
-- Stratégie retenue : les compteurs existants restent figés comme
-- "historique pré-refonte". Le trigger les bumpera désormais à
-- chaque nouvel INSERT dans quiz_events (passant par /track avec
-- dédup + bot filter + owner exclusion). Les NOUVELLES vues seront
-- fiables ; les anciennes restent visibles.
--
-- Si un créateur veut un "vrai compteur depuis date X", la page
-- analytics peut filtrer par date sur quiz_events (déjà supporté).

-- ─── 5) Notifier PostgREST de la mise à jour du schéma ───────────
NOTIFY pgrst, 'reload schema';
