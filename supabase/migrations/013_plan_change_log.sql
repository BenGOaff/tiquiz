-- Audit trail for plan changes on profiles.
--
-- WHY THIS EXISTS
-- ---------------
-- When a buyer asks "quand suis-je passé lifetime ?" or "why did my plan
-- flip to free last month?" there's no way to answer today: profiles.plan
-- is just the current value, with no history. The Systeme.io webhook is
-- the main writer but admin actions (manual upgrades, refunds) could also
-- change it — we want every change captured with a reason.
--
-- Write-only via service_role (no user-facing reads); RLS enabled with no
-- user policies so regular users can't see the log, but service_role
-- bypasses RLS and keeps working.

CREATE TABLE IF NOT EXISTS public.plan_change_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email   TEXT,
  old_plan       TEXT,
  new_plan       TEXT,
  reason         TEXT,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.plan_change_log IS
  'Audit log for plan changes (webhook, admin). Write-only via service_role.';

CREATE INDEX IF NOT EXISTS plan_change_log_target_user_idx
  ON public.plan_change_log (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS plan_change_log_target_email_idx
  ON public.plan_change_log (target_email, created_at DESC);

ALTER TABLE public.plan_change_log ENABLE ROW LEVEL SECURITY;
