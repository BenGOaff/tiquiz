-- ═══════════════════════════════════════════
-- TIQUIZ — Editable "Start quiz" button label
-- ═══════════════════════════════════════════
--
-- Lets each creator override the default "Commencer le test" CTA on the
-- intro step. NULL falls back to the translated default for quiz.locale.

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS start_button_text TEXT;

COMMENT ON COLUMN quizzes.start_button_text IS 'Custom label for the intro "Start quiz" button. NULL = translated default.';
