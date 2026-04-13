-- 005: Add target_audience to profiles for AI quiz generation pre-fill
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_audience TEXT;
