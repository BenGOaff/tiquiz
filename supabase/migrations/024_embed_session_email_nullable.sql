-- ═══════════════════════════════════════════
-- TIQUIZ — Embed sessions: defer email capture
-- ═══════════════════════════════════════════
--
-- Why this exists:
-- The first version of the embed asked for the visitor's email up
-- front, BEFORE generating the quiz. UX testing showed this kills
-- conversion: visitors don't yet know what they're getting, so the
-- email field reads as a paywall on the homepage. Better funnel
-- (Tally / Typeform pattern):
--   1) generate the quiz instantly, no email
--   2) let them edit it (sunk cost)
--   3) ask the email at the publish step, with a clear value prop
--      ("get your quiz by email + unlock sharing")
--
-- That means embed_quiz_sessions.email must be allowed to start as
-- NULL and be filled in later via /save. We keep the rate-limit on
-- ip_hash alone for those early rows; the email-based per-hour cap
-- still applies once we know the email.

ALTER TABLE embed_quiz_sessions
  ALTER COLUMN email DROP NOT NULL;

-- The previous email index is still useful for the rate-limit lookup
-- and the "find latest unclaimed session for this email" query in
-- /api/embed/quiz/claim — Postgres simply skips NULL rows, no work
-- needed there.
