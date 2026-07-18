-- ───────────────────────────────────────────────────────────────
-- 0017. Titres de vidéos (Béné, juillet 2026).
-- Chaque vidéo d'un jour peut avoir un titre, affiché dans un bandeau
-- brandé L'Atelier du Quiz au-dessus du lecteur. Complète les
-- shortcodes [[video:1]] / [[video:2]] qui placent les vidéos dans le
-- contenu riche du jour (aucun changement de schéma pour ceux-là, ils
-- vivent dans intro_html).
-- ───────────────────────────────────────────────────────────────

alter table days add column if not exists video_title text;
alter table days add column if not exists video2_title text;

NOTIFY pgrst, 'reload schema';
