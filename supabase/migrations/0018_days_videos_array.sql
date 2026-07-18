-- ───────────────────────────────────────────────────────────────
-- 0018. Multi-vidéos par jour (Béné, juillet 2026).
-- Certains modules (le bonus "Promouvoir par réseau") ont besoin
-- d'AUTANT de vidéos que nécessaire : une par réseau, plus les bases,
-- extensible (YouTube, TikTok, Pinterest à venir). Les colonnes
-- video_id/video2_id ne suffisent plus.
--
-- `videos` = liste ORDONNÉE de vidéos : chaque entrée
--   { "title": "Facebook", "url": "https://...", "video_id": "uuid|null" }
-- url XOR video_id (upload auto-hébergé prioritaire, comme la vidéo
-- principale). Placement dans le contenu via les shortcodes [[video:N]]
-- (N = position 1-indexée dans la liste). Si `videos` est non vide, il
-- devient la source des vidéos du jour ; sinon on garde l'ancien couple
-- video/video2 (jours J0 à J7 inchangés).
-- ───────────────────────────────────────────────────────────────

alter table days add column if not exists videos jsonb not null default '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
