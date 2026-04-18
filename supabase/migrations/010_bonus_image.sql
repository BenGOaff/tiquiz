-- TIQUIZ - 010 - Optional bonus image/mockup/gif
--
-- Lets the creator attach a visual to showcase the bonus on the share step.
-- Nullable; empty means no image.

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS bonus_image_url TEXT;
