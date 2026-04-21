-- ═══════════════════════════════════════════
-- TIQUIZ — Editable result headings
-- ═══════════════════════════════════════════
--
-- Lets each creator override the default section labels displayed above the
-- result insight ("Prise de conscience") and projection ("Et si...") blocks.
-- NULL falls back to the translated default for quiz.locale.

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS result_insight_heading TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS result_projection_heading TEXT;

COMMENT ON COLUMN quizzes.result_insight_heading IS 'Custom label above the result insight block. NULL = translated default.';
COMMENT ON COLUMN quizzes.result_projection_heading IS 'Custom label above the result projection block. NULL = translated default.';
