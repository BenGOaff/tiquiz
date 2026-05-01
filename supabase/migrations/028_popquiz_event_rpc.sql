-- ════════════════════════════════════════════
-- TIQUIZ — Popquiz: atomic counter bumps via RPC
-- ════════════════════════════════════════════
--
-- Mirrors log_quiz_event from migration 021. SECURITY DEFINER so
-- anonymous viewers can bump views_count via the public play page
-- without ever holding write privileges on popquizzes directly.
--
-- Open `event_type` (TEXT + IF chain) instead of an enum so we can
-- add new event types in one-line migrations later (start, complete,
-- share, abandon…). Today we wire 'view' on every page render and
-- 'complete' when the video reaches its end; 'start' is reserved
-- for the first user-initiated PLAY when the player tracker lands.

CREATE OR REPLACE FUNCTION log_popquiz_event(
  popquiz_id_input UUID,
  event_type_input TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF event_type_input = 'view' THEN
    UPDATE popquizzes
      SET views_count = views_count + 1
      WHERE id = popquiz_id_input;
  ELSIF event_type_input = 'start' THEN
    UPDATE popquizzes
      SET starts_count = starts_count + 1
      WHERE id = popquiz_id_input;
  ELSIF event_type_input = 'complete' THEN
    UPDATE popquizzes
      SET completions_count = completions_count + 1
      WHERE id = popquiz_id_input;
  END IF;
END;
$$;
