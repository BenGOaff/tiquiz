-- ═══════════════════════════════════════════
-- TIQUIZ — Quiz events (dated funnel data)
-- ═══════════════════════════════════════════
--
-- Why this exists:
-- Until now, view / start / completion / share totals were stored as
-- *cumulative integer counters* on the quizzes table. That gives the
-- creator a lifetime number but makes any time-based question
-- impossible to answer:
--   - "How many views did I get this week vs. last week?"
--   - "What's my conversion trend over the last 30 days?"
--   - "Which day-of-week is best for sharing?"
--
-- An entrepreneur needs that. So we add a thin event log: one row per
-- discrete funnel event, each timestamped. The cumulative counters on
-- `quizzes` are kept (cheap to read, safe for old code paths), but
-- every counter bump now also writes a row here.
--
-- Volume note: a typical viral quiz might log ~10k events / month.
-- A simple (quiz_id, created_at) index keeps date-range scans cheap.

CREATE TABLE IF NOT EXISTS quiz_events (
  id BIGSERIAL PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  -- 'view' / 'start' / 'complete' / 'share' — kept open with a CHECK
  -- constraint instead of an enum so adding new event types is a
  -- single-line migration.
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'start', 'complete', 'share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot path: "give me events for THIS quiz between two timestamps".
CREATE INDEX IF NOT EXISTS idx_quiz_events_quiz_created
  ON quiz_events (quiz_id, created_at DESC);

-- Cross-quiz aggregations on the dashboard ("all my events in the
-- last 7 days") use this composite to avoid full-table scans.
CREATE INDEX IF NOT EXISTS idx_quiz_events_type_created
  ON quiz_events (event_type, created_at DESC);

ALTER TABLE quiz_events ENABLE ROW LEVEL SECURITY;

-- The owner of the underlying quiz can read its events. Writes are
-- never made by end users directly — only by the API routes via
-- supabaseAdmin (service role bypasses RLS) — so we don't need an
-- INSERT policy here.
CREATE POLICY "Owner reads own quiz events" ON quiz_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_events.quiz_id AND q.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════
-- RPC: log + atomically increment counter
-- ═══════════════════════════════════════════
-- Wraps both writes in one call so the counter never drifts from the
-- event log (and we don't pay two round-trips per tracked action).
CREATE OR REPLACE FUNCTION log_quiz_event(
  quiz_id_input UUID,
  event_type_input TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO quiz_events (quiz_id, event_type) VALUES (quiz_id_input, event_type_input);

  IF event_type_input = 'view' THEN
    UPDATE quizzes SET views_count = views_count + 1 WHERE id = quiz_id_input;
  ELSIF event_type_input = 'start' THEN
    UPDATE quizzes SET starts_count = starts_count + 1 WHERE id = quiz_id_input;
  ELSIF event_type_input = 'complete' THEN
    UPDATE quizzes SET completions_count = completions_count + 1 WHERE id = quiz_id_input;
  ELSIF event_type_input = 'share' THEN
    UPDATE quizzes SET shares_count = shares_count + 1 WHERE id = quiz_id_input;
  END IF;
END;
$$;
