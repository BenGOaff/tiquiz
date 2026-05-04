-- ════════════════════════════════════════════
-- TIQUIZ — Popquiz: bump video bucket file size limit
-- ════════════════════════════════════════════
--
-- 026 created the popquiz-videos bucket without explicit limits, so
-- it inherits Supabase defaults (typically 50 MB on free / hobby).
-- That's way below the size of a real recorded course video — Gwenn
-- and other creators would hit "Fichier trop volumineux" on every
-- meaningful upload.
--
-- 2 GB is generous enough for a 60-min screen recording at 1080p
-- without leaving room for accidental terabyte uploads.
--
-- allowed_mime_types is scoped to common video containers + the
-- thumbnail JPEG we ship alongside the source. Defensive — avoids a
-- creator mistakenly dropping a .zip or document into the bucket
-- (RLS would block other users but the file would still occupy
-- storage quota).

UPDATE storage.buckets
SET
  file_size_limit = 2147483648, -- 2 GB
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/ogg',
    'image/jpeg',
    'image/png'
  ]
WHERE id = 'popquiz-videos';
