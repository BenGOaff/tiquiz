-- ═══════════════════════════════════════════
-- TIQUIZ — Multi Systeme.io API keys per user
-- ═══════════════════════════════════════════
--
-- WHY THIS EXISTS
-- ---------------
-- Until now a user could only store ONE Systeme.io API key in
-- profiles.sio_user_api_key. This blocked the funnel-builder use case
-- where a single Tiquiz account manages quizzes for many different
-- clients, each with their own Systeme.io workspace.
--
-- This migration introduces sio_api_keys, a one-to-many table keyed by
-- user_id. Each row holds a named, ENCRYPTED key. A partial unique index
-- enforces "at most one default per user" at the DB level (no race).
--
-- BACKWARDS COMPATIBILITY
-- -----------------------
-- profiles.sio_user_api_key is intentionally KEPT (not dropped). The
-- application's resolver checks the new table first, then falls back to
-- the legacy column, so existing live quizzes keep syncing without any
-- user action. The legacy column is migrated lazily into sio_api_keys
-- the first time the user opens Settings (or creates their first new key)
-- — this is done in TS so the value is encrypted at rest with AES-GCM,
-- which pgcrypto cannot easily replicate without exposing the master key
-- to Postgres.

CREATE TABLE IF NOT EXISTS sio_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Versioned ciphertext: "v1.<iv_b64url>.<ct_b64url>.<tag_b64url>".
  -- See lib/sio/keyCrypto.ts. Never stored in plaintext.
  api_key_encrypted TEXT NOT NULL,
  -- Last 4 chars of the plaintext key, kept clear for the UI to display
  -- something like "pk_live_••••3xy8" without ever decrypting.
  api_key_last4 TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  validation_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- At most one default key per user, enforced by the DB so two concurrent
-- requests can never both succeed in setting is_default=true.
CREATE UNIQUE INDEX IF NOT EXISTS sio_api_keys_one_default_per_user
  ON sio_api_keys(user_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS sio_api_keys_user_id_idx
  ON sio_api_keys(user_id);

-- Per-quiz override: which key this quiz uses to sync its leads.
-- NULL = use the user's default key (cascading resolver in TS).
-- ON DELETE SET NULL guarantees deleting a key never orphans a quiz.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS sio_api_key_id UUID
    REFERENCES sio_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quizzes_sio_api_key_id_idx
  ON quizzes(sio_api_key_id) WHERE sio_api_key_id IS NOT NULL;

-- RLS: users can only see and manage their own keys.
ALTER TABLE sio_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own SIO keys" ON sio_api_keys FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE sio_api_keys IS
  'Systeme.io API keys, one user → many keys. Encrypted at rest with AES-256-GCM via lib/sio/keyCrypto.ts.';
COMMENT ON COLUMN sio_api_keys.api_key_encrypted IS
  'Versioned envelope: v1.<iv>.<ct>.<tag> (base64url). NEVER stored in plaintext.';
COMMENT ON COLUMN sio_api_keys.is_default IS
  'Default key used when a quiz has no sio_api_key_id set. Enforced unique-per-user via partial index.';
COMMENT ON COLUMN quizzes.sio_api_key_id IS
  'Which SIO key this quiz syncs leads to. NULL = use user default. ON DELETE SET NULL.';
