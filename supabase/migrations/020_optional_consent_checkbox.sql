-- ═══════════════════════════════════════════
-- TIQUIZ — Optional consent checkbox
-- ═══════════════════════════════════════════
-- Some creators (Bénédicte's first user) want to drop the GDPR-style
-- consent checkbox below the email capture form. Default stays `true`
-- so existing quizzes keep the safer behaviour; creators can opt out
-- per-quiz from the editor.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS show_consent_checkbox BOOLEAN NOT NULL DEFAULT true;
