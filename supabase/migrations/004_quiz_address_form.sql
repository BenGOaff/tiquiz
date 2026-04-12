-- ═══════════════════════════════════════════
-- TIQUIZ - Add address_form to quizzes (per-quiz tu/vous)
-- ═══════════════════════════════════════════

-- Allow each quiz to have its own tu/vous setting.
-- Falls back to the user's profile address_form if NULL.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS address_form TEXT DEFAULT NULL CHECK (address_form IS NULL OR address_form IN ('tu', 'vous'));
