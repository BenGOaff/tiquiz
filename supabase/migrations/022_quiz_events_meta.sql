-- ═══════════════════════════════════════════
-- TIQUIZ — Per-question funnel tracking
-- ═══════════════════════════════════════════
--
-- Why this exists:
-- The events table from migration 021 captures view / start /
-- complete / share at the project level. That tells you "30 % of
-- starters complete the quiz", but not "Question 3 is where 40 % of
-- them bail" — which is the actionable insight an entrepreneur
-- needs to fix the quiz copy.
--
-- We add a thin meta column (jsonb) so we can attach arbitrary
-- structured payload to events without ever needing another schema
-- migration. The first new event type that uses it is
-- 'question_view': fired the first time a visitor lands on each
-- question, with `{"q": <question_index>}`. From there the stats
-- page can compute, for each question, "how many got this far"
-- vs "how many stopped here".
--
-- Backwards compat: existing event rows have meta = NULL and are
-- unaffected. The CHECK constraint widens to allow the new event
-- type only — typos still fail loud.

ALTER TABLE quiz_events
  ADD COLUMN IF NOT EXISTS meta JSONB;

-- Drop + recreate the check constraint to add 'question_view'.
ALTER TABLE quiz_events DROP CONSTRAINT IF EXISTS quiz_events_event_type_check;
ALTER TABLE quiz_events ADD CONSTRAINT quiz_events_event_type_check
  CHECK (event_type IN ('view', 'start', 'complete', 'share', 'question_view'));

-- Replace log_quiz_event with a meta-aware variant. The 4-arg
-- signature is a superset of the 2-arg one so the JS callers that
-- still pass only (quiz_id, event_type) keep working.
CREATE OR REPLACE FUNCTION log_quiz_event(
  quiz_id_input UUID,
  event_type_input TEXT,
  meta_input JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO quiz_events (quiz_id, event_type, meta)
  VALUES (quiz_id_input, event_type_input, meta_input);

  IF event_type_input = 'view' THEN
    UPDATE quizzes SET views_count = views_count + 1 WHERE id = quiz_id_input;
  ELSIF event_type_input = 'start' THEN
    UPDATE quizzes SET starts_count = starts_count + 1 WHERE id = quiz_id_input;
  ELSIF event_type_input = 'complete' THEN
    UPDATE quizzes SET completions_count = completions_count + 1 WHERE id = quiz_id_input;
  ELSIF event_type_input = 'share' THEN
    UPDATE quizzes SET shares_count = shares_count + 1 WHERE id = quiz_id_input;
  END IF;
  -- 'question_view' has no cumulative counter on quizzes — it's
  -- exclusively time-series data.
END;
$$;

-- A composite index on (quiz_id, event_type, created_at) makes the
-- per-question retention query fast: SELECT meta->>'q', COUNT(*)
-- FROM quiz_events WHERE quiz_id = ? AND event_type = 'question_view'
-- AND created_at >= ? GROUP BY meta->>'q'.
CREATE INDEX IF NOT EXISTS idx_quiz_events_quiz_type_created
  ON quiz_events (quiz_id, event_type, created_at DESC);
