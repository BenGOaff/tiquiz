-- ════════════════════════════════════════════
-- TIQUIZ — Popquiz: thumbnail storage path + duration tightening
-- ════════════════════════════════════════════
--
-- Adds a dedicated `thumbnail_path` column so we can store the
-- bucket-relative path of the auto-extracted poster frame and mint
-- a signed URL on demand at fetch time — same model as the raw
-- video file, never expose the bucket layout to the player.
--
-- Why a separate column from `thumbnail_url`:
--   thumbnail_url stays as a free-form URL string so we can keep
--   it valid for external sources (YouTube oEmbed thumbnail URLs,
--   Vimeo, etc.) which are publicly addressable.
--   thumbnail_path is for storage objects we own and need to sign.
--   The player resolves them in priority: thumbnail_url → signed
--   thumbnail_path → nothing.

ALTER TABLE popquiz_videos
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
