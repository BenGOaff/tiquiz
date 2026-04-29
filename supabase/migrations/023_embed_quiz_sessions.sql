-- ═══════════════════════════════════════════
-- TIQUIZ — Embed quiz sessions (sales-page demo)
-- ═══════════════════════════════════════════
--
-- Why this exists:
-- The Tiquiz sales page (systeme.io) embeds a public mini-builder so a
-- visitor can generate, edit and *almost* publish a quiz before being
-- asked to pay. Every interaction is anonymous (no Supabase auth) but
-- we still need to:
--   1) capture the lead email up-front (it's the price of the magic),
--   2) persist the quiz draft so they can come back / be claimed
--      later by a real Tiquiz account after checkout,
--   3) rate-limit generation to keep Anthropic costs under control.
--
-- Volume note: a single embed session = 1 row. Even with 1k visitors
-- a day, that's 30k rows / month — trivial.

CREATE TABLE IF NOT EXISTS embed_quiz_sessions (
  -- Random opaque token used as the only handle the browser keeps.
  -- We never expose the row id to the embed.
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead capture (required before generation).
  email TEXT NOT NULL,

  -- Raw form inputs from the embed (sujet / audience / objective…).
  -- Kept JSON so we can iterate the form without migrations.
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- The latest version of the quiz (generated, then edited by user).
  -- Same shape as the JSON returned by /api/quiz/generate so the rest
  -- of Tiquiz can ingest it as-is when the lead converts.
  quiz JSONB,

  -- Where the session was opened (referrer / page slug). Lets us
  -- attribute conversions per landing page.
  source TEXT,

  -- Best-effort fingerprint for rate-limiting. NOT a security boundary
  -- (CGNAT collisions exist) — combined with email it's enough to
  -- shield us from accidental loops.
  ip_hash TEXT,

  -- Once the visitor pays, the systeme.io webhook calls /claim with
  -- this session id and we link the row to the freshly created user.
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,

  -- If the visitor opted into the soft "save for later" flow we mark
  -- it here so the relance email worker only picks the right rows.
  saved_for_later BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot path 1: rate-limit lookup ("how many sessions did this email
-- start in the last hour?").
CREATE INDEX IF NOT EXISTS idx_embed_sessions_email_created
  ON embed_quiz_sessions (email, created_at DESC);

-- Hot path 2: same thing keyed on ip_hash, in case the visitor cycles
-- through different fake emails.
CREATE INDEX IF NOT EXISTS idx_embed_sessions_ip_created
  ON embed_quiz_sessions (ip_hash, created_at DESC);

-- Hot path 3: the claim flow looks up the session by id; the PK index
-- already covers it. We add a partial index on un-claimed rows to make
-- the relance job ("send a come-back email to people who didn't pay")
-- O(saved_for_later) instead of O(all).
CREATE INDEX IF NOT EXISTS idx_embed_sessions_unclaimed_saved
  ON embed_quiz_sessions (created_at DESC)
  WHERE claimed_by_user_id IS NULL AND saved_for_later = TRUE;

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION embed_quiz_sessions_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS embed_quiz_sessions_touch ON embed_quiz_sessions;
CREATE TRIGGER embed_quiz_sessions_touch
  BEFORE UPDATE ON embed_quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION embed_quiz_sessions_touch_updated_at();

ALTER TABLE embed_quiz_sessions ENABLE ROW LEVEL SECURITY;

-- No public RLS policies on purpose: every read/write goes through
-- the API routes using supabaseAdmin (service role). Even after a
-- claim, the user reads their newly-created quiz from the regular
-- `quizzes` table, not from this one.
