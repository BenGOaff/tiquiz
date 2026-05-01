-- ════════════════════════════════════════════
-- TIQUIZ — Popquiz: video + cuepoint quizzes
-- ════════════════════════════════════════════
--
-- A "popquiz" pauses a video at chosen timestamps to surface an
-- existing quiz. We deliberately don't duplicate any quiz data —
-- popquiz_cues references the existing `quizzes` table by id, so a
-- single quiz can power N popquizzes and the editor flow stays
-- the same as today.
--
-- Tables (5) + bucket (1):
--   popquiz_videos    abstract video (YouTube, Vimeo, direct URL
--                     or self-hosted upload). One row per physical
--                     media; reusable across popquizzes.
--   popquizzes        a video + theme + ordered cues bundle, the
--                     thing the user creates and shares.
--   popquiz_cues      (timestamp_ms, quiz_id) pairs that pause the
--                     video and trigger the linked quiz overlay.
--   popquiz_themes    reusable visual presets for the player
--                     (colors / radius / icons), ownable + sharable.
--   popquiz_sessions  one row per viewer-play with a JSONB events
--                     array for analytics (cue_reached, answered,
--                     skipped, abandoned…). Same idea as quiz_events
--                     but per-session because we need the full
--                     timeline for drop-off charts.
--
--   bucket popquiz-videos  private. Raw uploads land in
--   raw/<auth.uid>/<video_id>/source.<ext>. The transcoding worker
--   (VPS, service role) writes back HLS artifacts under
--   hls/<video_id>/. Viewers read via signed URLs minted server-side.

-- ───────────────────────────────────────────
-- 1. popquiz_videos
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popquiz_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('youtube','vimeo','url','upload')),
  external_url TEXT,
  -- Provider-specific id parsed from external_url at insert time
  -- (YouTube videoId, Vimeo numeric id). Lets us call provider
  -- APIs without re-parsing.
  external_id TEXT,
  -- For uploads: path inside popquiz-videos bucket
  -- (raw/<uid>/<id>/source.<ext>).
  storage_path TEXT,
  -- Set by the transcoding worker once HLS is ready.
  hls_path TEXT,
  -- Best thumbnail we know of (oEmbed for YouTube/Vimeo, ffmpeg
  -- frame at t=2s for uploads).
  thumbnail_url TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','transcoding','ready','failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popquiz_videos_user
  ON popquiz_videos(user_id);
-- Partial index because once a video is 'ready' we never query by
-- status again (it's the steady state).
CREATE INDEX IF NOT EXISTS idx_popquiz_videos_status
  ON popquiz_videos(status) WHERE status <> 'ready';

-- ───────────────────────────────────────────
-- 2. popquiz_themes
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popquiz_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- CSS custom-property values keyed by var name without the
  -- leading `--pq-`. Example: { "accent": "#5D6CDB", "radius": "12px" }
  -- The keys allowed are enforced application-side (lib/popquiz/theme.ts).
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popquiz_themes_user
  ON popquiz_themes(user_id);

-- ───────────────────────────────────────────
-- 3. popquizzes
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popquizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ON DELETE RESTRICT on the video: deleting an asset still
  -- referenced by a published popquiz would silently break the
  -- viewer experience; force the user to unpublish/delete the
  -- popquiz first.
  video_id UUID NOT NULL REFERENCES popquiz_videos(id) ON DELETE RESTRICT,
  theme_id UUID REFERENCES popquiz_themes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  locale TEXT NOT NULL DEFAULT 'fr',
  is_published BOOLEAN NOT NULL DEFAULT false,
  -- Same lifetime-counter pattern as the quizzes table; per-event
  -- timeline lives on popquiz_sessions.
  views_count INTEGER NOT NULL DEFAULT 0,
  starts_count INTEGER NOT NULL DEFAULT 0,
  completions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popquizzes_user
  ON popquizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_popquizzes_video
  ON popquizzes(video_id);
CREATE INDEX IF NOT EXISTS idx_popquizzes_published
  ON popquizzes(is_published) WHERE is_published = true;

-- ───────────────────────────────────────────
-- 4. popquiz_cues
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popquiz_cues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popquiz_id UUID NOT NULL REFERENCES popquizzes(id) ON DELETE CASCADE,
  -- The reused quiz from the existing `quizzes` table. RESTRICT so
  -- a creator can't accidentally orphan a popquiz by deleting the
  -- linked quiz — the editor will surface a warning instead.
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,
  timestamp_ms INTEGER NOT NULL CHECK (timestamp_ms >= 0),
  -- 'block' = viewer must answer to resume; 'optional' = can skip.
  behavior TEXT NOT NULL DEFAULT 'block'
    CHECK (behavior IN ('block','optional')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Two cues at the exact same ms in the same popquiz would be
  -- ambiguous (which one fires first?). Enforce uniqueness; the
  -- editor nudges users to space cues apart.
  UNIQUE(popquiz_id, timestamp_ms)
);

CREATE INDEX IF NOT EXISTS idx_popquiz_cues_popquiz_ts
  ON popquiz_cues(popquiz_id, timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_popquiz_cues_quiz
  ON popquiz_cues(quiz_id);

-- ───────────────────────────────────────────
-- 5. popquiz_sessions
-- ───────────────────────────────────────────
-- One row per viewer that hits a popquiz. The `events` JSONB array
-- is appended to as the player progresses — gives us per-cue
-- drop-off + time-to-answer without a row-per-event table.
CREATE TABLE IF NOT EXISTS popquiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popquiz_id UUID NOT NULL REFERENCES popquizzes(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Anonymous viewer fingerprint (cookie or random uuid stored in
  -- localStorage by the player). Lets the analytics page show
  -- "unique viewers" without knowing who they are.
  anon_id TEXT,
  locale TEXT,
  user_agent TEXT,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_popquiz_sessions_popquiz_started
  ON popquiz_sessions(popquiz_id, started_at DESC);

-- ───────────────────────────────────────────
-- RLS
-- ───────────────────────────────────────────
ALTER TABLE popquiz_videos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE popquiz_themes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE popquizzes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE popquiz_cues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE popquiz_sessions ENABLE ROW LEVEL SECURITY;

-- Videos: owner-only management.
CREATE POLICY "Users manage own popquiz videos" ON popquiz_videos FOR ALL
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

-- Themes: owner manages, plus public read for shared / preset
-- themes so the editor can offer them to everyone.
CREATE POLICY "Users manage own popquiz themes" ON popquiz_themes FOR ALL
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Anyone reads shared or preset themes" ON popquiz_themes FOR SELECT
  USING (is_shared = true OR is_preset = true);

-- Popquizzes: owner can do anything. Published ones are publicly
-- readable so a viewer with the link can play.
CREATE POLICY "Users manage own popquizzes" ON popquizzes FOR ALL
  USING (user_id IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Public reads published popquizzes" ON popquizzes FOR SELECT
  USING (is_published = true);

-- Cues: same model — owner manages, public reads if parent
-- popquiz is published.
CREATE POLICY "Users manage cues of own popquizzes" ON popquiz_cues FOR ALL
  USING (popquiz_id IN (SELECT id FROM popquizzes WHERE user_id = auth.uid()))
  WITH CHECK (popquiz_id IN (SELECT id FROM popquizzes WHERE user_id = auth.uid()));

CREATE POLICY "Public reads cues of published popquizzes" ON popquiz_cues FOR SELECT
  USING (popquiz_id IN (SELECT id FROM popquizzes WHERE is_published = true));

-- Sessions: owner of the popquiz can read their viewers' sessions.
-- Inserts/updates happen via service role from /api routes (we
-- don't want clients tampering with their own analytics) so no
-- INSERT/UPDATE policy here.
CREATE POLICY "Owner reads sessions of own popquizzes" ON popquiz_sessions FOR SELECT
  USING (popquiz_id IN (SELECT id FROM popquizzes WHERE user_id = auth.uid()));

-- ───────────────────────────────────────────
-- Storage: popquiz-videos bucket
-- ───────────────────────────────────────────
-- Private bucket. Raw uploads gated by the user's own folder.
-- HLS reads happen via signed URLs from the API (no client policy
-- needed for that path).
INSERT INTO storage.buckets (id, name, public)
VALUES ('popquiz-videos', 'popquiz-videos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "popquiz-videos: user manage own raw" ON storage.objects;
CREATE POLICY "popquiz-videos: user manage own raw"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'popquiz-videos'
    AND (storage.foldername(name))[1] = 'raw'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'popquiz-videos'
    AND (storage.foldername(name))[1] = 'raw'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ───────────────────────────────────────────
-- Triggers: keep updated_at honest
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION popquiz_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS popquiz_videos_touch ON popquiz_videos;
CREATE TRIGGER popquiz_videos_touch BEFORE UPDATE ON popquiz_videos
  FOR EACH ROW EXECUTE FUNCTION popquiz_touch_updated_at();

DROP TRIGGER IF EXISTS popquiz_themes_touch ON popquiz_themes;
CREATE TRIGGER popquiz_themes_touch BEFORE UPDATE ON popquiz_themes
  FOR EACH ROW EXECUTE FUNCTION popquiz_touch_updated_at();

DROP TRIGGER IF EXISTS popquizzes_touch ON popquizzes;
CREATE TRIGGER popquizzes_touch BEFORE UPDATE ON popquizzes
  FOR EACH ROW EXECUTE FUNCTION popquiz_touch_updated_at();

-- ───────────────────────────────────────────
-- Seed: 4 default presets the editor offers out of the box
-- ───────────────────────────────────────────
INSERT INTO popquiz_themes (user_id, name, config, is_preset, is_shared)
SELECT NULL, name, config::jsonb, true, true
FROM (VALUES
  ('Minimal',  '{"accent":"#5D6CDB","bg":"rgba(15,18,30,0.55)","radius":"12px","controls-height":"48px"}'),
  ('Glass',    '{"accent":"#20BBE6","bg":"rgba(255,255,255,0.10)","radius":"16px","controls-height":"52px","backdrop":"blur(18px)"}'),
  ('Bold',     '{"accent":"#FF3D71","bg":"rgba(0,0,0,0.75)","radius":"4px","controls-height":"56px"}'),
  ('Dark Pro', '{"accent":"#A78BFA","bg":"rgba(10,12,20,0.85)","radius":"10px","controls-height":"50px"}')
) AS presets(name, config)
WHERE NOT EXISTS (
  SELECT 1 FROM popquiz_themes WHERE is_preset = true AND name = presets.name
);
