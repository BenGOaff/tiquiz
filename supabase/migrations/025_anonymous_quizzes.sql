-- ═══════════════════════════════════════════
-- TIQUIZ — Anonymous quizzes for the embed preview
-- ═══════════════════════════════════════════
--
-- Why this exists:
-- The sales-page embed used to live in its own JSONB blob inside
-- embed_quiz_sessions. That gave a nice prototype but kept us with
-- two parallel codebases for the editor (real /quiz/[id] vs the
-- vanilla EmbedEditor) — guaranteed drift over time.
--
-- This migration unifies them: an embed visitor now edits a REAL
-- quizzes row (with REAL quiz_questions / quiz_results / brand
-- columns), just one whose user_id is NULL until a checkout transfers
-- ownership. Same UI, same persistence, same end result — the only
-- difference is the auth path the API uses.
--
-- Safety for existing users:
--   - quizzes.user_id stays referenced by every dashboard query
--     (filter `eq("user_id", user.id)`) and the RLS policy
--     `auth.uid() = user_id`. An anonymous row evaluates that to
--     NULL → false → invisible to every connected user. Existing
--     quizzes / questions / results / leads all keep working
--     unchanged.
--   - quiz_questions / quiz_results / quiz_leads / quiz_events RLS
--     is scoped via `quiz_id IN (SELECT id FROM quizzes WHERE
--     user_id = auth.uid())` — same logic, anonymous quizzes simply
--     don't appear in the inner select.
--
-- Cleanup:
-- Orphan anonymous quizzes (visitor that never converted) are
-- deleted by ON DELETE CASCADE when their embed_quiz_sessions row
-- is purged. A future GC job can simply
--   DELETE FROM embed_quiz_sessions
--   WHERE claimed_by_user_id IS NULL AND created_at < now() - '30d';
-- and the linked quizzes go with it.

-- 1) Make user_id nullable. We deliberately do NOT touch the FK
--    so anonymous rows still fail-safe if auth.users is ever
--    referenced (the FK only checks present values).
ALTER TABLE quizzes
  ALTER COLUMN user_id DROP NOT NULL;

-- 2) Link an anonymous quiz back to the embed session that owns it.
--    Possession of the session_token is the only auth signal for
--    anonymous edits — same opaque UUID stored in localStorage.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS embed_session_id UUID
    REFERENCES embed_quiz_sessions(id) ON DELETE CASCADE;

-- One quiz per session (a session can only spawn a single anonymous
-- quiz; if the visitor restarts the form we mark the old one for
-- deletion and recreate). Partial unique because all claimed quizzes
-- have NULL here and we don't want them to collide.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_quizzes_embed_session
  ON quizzes (embed_session_id)
  WHERE embed_session_id IS NOT NULL;

-- 3) Fast lookup for the dual-mode auth path:
--    SELECT * FROM quizzes WHERE id = ? AND embed_session_id = ?
CREATE INDEX IF NOT EXISTS idx_quizzes_embed_session
  ON quizzes (embed_session_id, id);

-- 4) Tighten the existing RLS policy so it can never accidentally
--    surface an anonymous row. The previous policy already returned
--    false for NULL user_id (NULL = NULL is unknown), but spelling
--    it out makes the invariant grep-able.
DROP POLICY IF EXISTS "Users manage own quizzes" ON quizzes;
CREATE POLICY "Users manage own quizzes" ON quizzes FOR ALL
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);
