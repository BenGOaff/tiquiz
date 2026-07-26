-- ───────────────────────────────────────────────────────────────
-- 0016. Deuxième vidéo optionnelle sur un jour (Béné, juillet 2026).
-- Certains jours du parcours ont besoin de deux vidéos (ex. cours +
-- démo). Mêmes deux modes que la vidéo principale : URL externe
-- (video2_url) OU upload auto-hébergé (video2_id -> quizing_videos).
-- ───────────────────────────────────────────────────────────────

alter table days add column if not exists video2_url text;
alter table days add column if not exists video2_id uuid;

NOTIFY pgrst, 'reload schema';
