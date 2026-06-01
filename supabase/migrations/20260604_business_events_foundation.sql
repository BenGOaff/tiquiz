-- ============================================================================
-- 20260604_business_events_foundation.sql (Tiquiz)
--
-- Port de la fondation rétention Tipote, adaptée à Tiquiz :
--   - PAS de project_id (Tiquiz = mono-user, pas de multi-projet Elite)
--   - PAS de table notifications / email (Tiquiz n'a pas de mailer V1)
--     → les milestones se montrent uniquement en toast in-app
--   - PAS de kind "sale" (Tiquiz ne tracke pas le CA business du créateur ;
--     les ventes Systeme.io upgradent juste le plan via webhook)
--
-- Deux tables socle :
--   1. business_events  → log unique des outcomes (lead/vue/complete/share/
--                         quiz_published/popquiz_published)
--   2. user_milestones  → jalons débloqués (consommé phase 1)
--
-- Conventions (cf. CLAUDE_PITFALLS.md) :
--   - IF NOT EXISTS partout, DROP POLICY IF EXISTS avant CREATE
--   - NOTIFY pgrst en fin
--   - dedupe_key UNIQUE partiel pour idempotence
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. business_events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'internal',
  dedupe_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.business_events IS
'Log unique des événements business par user Tiquiz. Source consommée par milestones + Wall of Wins. Pas de project_id (mono-user), pas de sale (Tiquiz ne tracke pas le CA créateur).';

COMMENT ON COLUMN public.business_events.kind IS
'Type : lead_captured, quiz_view, quiz_start, quiz_complete, quiz_share, quiz_published, popquiz_published, milestone_unlocked.';

CREATE INDEX IF NOT EXISTS idx_business_events_user_occurred
  ON public.business_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_events_user_kind_occurred
  ON public.business_events (user_id, kind, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_events_user_dedupe
  ON public.business_events (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_events_select_own ON public.business_events;
CREATE POLICY business_events_select_own ON public.business_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE pour les users : INSERT toujours via
-- lib/businessEvents.ts → logBusinessEvent() avec le client service-role.

-- ----------------------------------------------------------------------------
-- 2. user_milestones
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_milestones (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ,
  shared_at TIMESTAMPTZ
);

COMMENT ON TABLE public.user_milestones IS
'Jalons débloqués par user Tiquiz. Insertion automatique par l''engine milestones depuis business_events. seen_at NULL = pas encore affiché en toast.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_milestones_user_key
  ON public.user_milestones (user_id, milestone_key);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user_unseen
  ON public.user_milestones (user_id, unlocked_at DESC)
  WHERE seen_at IS NULL;

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_milestones_select_own ON public.user_milestones;
CREATE POLICY user_milestones_select_own ON public.user_milestones
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_milestones_update_own_seen ON public.user_milestones;
CREATE POLICY user_milestones_update_own_seen ON public.user_milestones
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
