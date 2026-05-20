-- 20260523_brand_favicon.sql
-- Favicon custom (Gwenn via Béné, 23 mai 2026) — quand un user a
-- configuré son branding, on veut que le favicon affiché dans l'onglet
-- du navigateur soit le sien et pas celui de Tiquiz, sur toutes les
-- pages publiques (slug court, custom domain, /q/<id>, /p/<id>).
--
-- Niveau brand uniquement pour v1 (pas d'override per-quiz — Gwenn n'a
-- demandé qu'au niveau global). Si on veut un favicon différent par
-- quiz plus tard, on ajoutera une colonne sur `quizzes`.

alter table public.profiles
  add column if not exists brand_favicon_url text;

comment on column public.profiles.brand_favicon_url is
  'Favicon affiché dans l''onglet navigateur sur les pages publiques du user (custom domain ou app.tiquiz.com). Image carrée recommandée, idéalement 256x256 PNG ou ICO.';

notify pgrst, 'reload schema';
