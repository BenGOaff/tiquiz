-- Add observability columns for Systeme.io sync failures on quiz_leads.
--
-- WHY THIS EXISTS
-- ---------------
-- The /api/quiz/[quizId]/public POST path spawns a fire-and-forget async
-- IIFE to sync the lead to Systeme.io (tag, course enrollment, community).
-- When that sync failed (SIO 5xx, timeout, bad API key), the error was
-- only console.errored on the server and the lead silently stayed at
-- sio_synced=false with zero indication why. Creators had no way to see
-- which leads failed to sync or why.
--
-- These columns let the POST handler record the last attempt timestamp
-- and error message so a future dashboard panel can surface failed syncs
-- with a retry button. The columns are nullable and default-null, so
-- existing rows and code paths are unaffected.

ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS sio_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS sio_last_error text;

-- Partial index so "show me all leads that failed to sync" is cheap even
-- on large lead tables. Only indexes rows that actually have an error.
CREATE INDEX IF NOT EXISTS quiz_leads_sio_failed_idx
  ON public.quiz_leads (quiz_id, sio_last_attempt_at DESC)
  WHERE sio_last_error IS NOT NULL;
