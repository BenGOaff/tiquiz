-- ═══════════════════════════════════════════
-- TIQUIZ — Per-answer Systeme.io tags
-- ═══════════════════════════════════════════
--
-- Goal: let a creator attach a Systeme.io tag to
--   (a) every individual answer option of a question, and
--   (b) the "Accès aux résultats" capture step (applied on every lead).
--
-- Storage model:
--   - Per-answer tag: stored inline in `quiz_questions.options` JSONB,
--     as an optional `sio_tag_name` field on each option object.
--     Shape per option: { text, result_index, sio_tag_name? }.
--     Absent = no tag (backward-compatible with existing quizzes).
--   - Capture-step tag: new column on `quizzes`.
--
-- This migration only adds the capture-step column. The per-option field
-- needs no schema change since `options` is already JSONB.

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS sio_capture_tag TEXT;

COMMENT ON COLUMN quizzes.sio_capture_tag IS
  'Systeme.io tag applied to every lead when they submit the capture form. Empty = no tag.';
