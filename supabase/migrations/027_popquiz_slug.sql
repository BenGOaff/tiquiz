-- ════════════════════════════════════════════
-- TIQUIZ — Popquiz: custom slug for shareable URLs
-- ════════════════════════════════════════════
--
-- Mirrors the slug column already in place on `quizzes`. The play
-- route /p/[popquizId] resolves either a UUID or a slug, like /q/
-- does for quizzes — so creators get readable, brandable URLs
-- ("/p/intro-product-tour") instead of UUID soup.
--
-- Nullable + partial unique index: most rows will keep slug NULL
-- (no custom slug → fall back to the UUID URL), and the unique
-- constraint only kicks in for non-null values so we don't waste
-- index space on every blank row.

ALTER TABLE popquizzes ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_popquizzes_slug
  ON popquizzes(slug)
  WHERE slug IS NOT NULL;

-- Lookup index for the slug-based play route.
CREATE INDEX IF NOT EXISTS idx_popquizzes_slug_lookup
  ON popquizzes(slug)
  WHERE slug IS NOT NULL AND is_published = true;
