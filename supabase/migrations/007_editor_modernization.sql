-- ═══════════════════════════════════════════
-- TIQUIZ — Quiz editor modernization (Phase 3B)
-- ═══════════════════════════════════════════
--
-- Adds per-quiz branding overrides, a custom slug, share network
-- preferences, and an OG meta description. All columns are nullable
-- so existing quizzes keep falling back to profile defaults.
--
--   quizzes.slug                   — custom public URL (/q/<slug>), unique
--   quizzes.brand_font             — override profile.brand_font for this quiz
--   quizzes.brand_color_primary    — override profile.brand_color_primary
--   quizzes.brand_color_background — per-quiz background
--   quizzes.share_networks         — JSON array of enabled share networks
--   quizzes.og_description         — per-quiz meta description for social shares

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS brand_font TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS brand_color_primary TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS brand_color_background TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS share_networks JSONB;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS og_description TEXT;

-- Case-insensitive uniqueness on slug (nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_slug_lower_unique
  ON quizzes ((lower(slug)))
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN quizzes.slug IS 'Custom public URL slug (lowercase, alphanumeric + dash). NULL = use quiz ID.';
COMMENT ON COLUMN quizzes.brand_font IS 'Font family for this quiz. NULL = inherit from profile.brand_font.';
COMMENT ON COLUMN quizzes.brand_color_primary IS 'Primary color for this quiz. NULL = inherit from profile.brand_color_primary.';
COMMENT ON COLUMN quizzes.brand_color_background IS 'Background color for this quiz. NULL = white default.';
COMMENT ON COLUMN quizzes.share_networks IS 'JSON array of enabled social share networks (e.g. ["facebook","linkedin","x"]).';
COMMENT ON COLUMN quizzes.og_description IS 'Per-quiz meta description for social shares. Falls back to introduction.';
