-- Per-user preferred share domain. NULL = fallback to the first verified
-- custom domain if any (creators who paid for a branded URL almost always
-- want THAT URL to be the one they copy), else 'quiz.tipote.com'.
--
-- Stored as a plain hostname (no scheme, no path), validated against the
-- caller's own custom_domains rows (status='verified') OR the main app
-- host inside the PATCH route — never trust the client.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_share_domain TEXT;

COMMENT ON COLUMN public.profiles.default_share_domain IS
  'Hostname preferred by this user for share links shown in the dashboard. NULL = computed default (verified custom domain if any, else quiz.tipote.com). Validated server-side on update.';
