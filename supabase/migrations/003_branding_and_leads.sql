-- ═══════════════════════════════════════════
-- TIQUIZ - Branding columns + leads sync tracking
-- ═══════════════════════════════════════════

-- Branding columns on profiles (like Tipote)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_color_primary TEXT DEFAULT '#5D6CDB';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_color_accent TEXT DEFAULT '#20BBE6';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_font TEXT DEFAULT 'Inter';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_tone TEXT DEFAULT 'professionnel';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_website_url TEXT;

-- Quiz custom footer (free vs paid)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS custom_footer_text TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS custom_footer_url TEXT;

-- Leads: track SIO sync status
ALTER TABLE quiz_leads ADD COLUMN IF NOT EXISTS sio_synced BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE quiz_leads ADD COLUMN IF NOT EXISTS sio_synced_at TIMESTAMPTZ;
ALTER TABLE quiz_leads ADD COLUMN IF NOT EXISTS sio_tag_applied TEXT;
