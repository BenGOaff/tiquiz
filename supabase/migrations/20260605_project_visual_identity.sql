-- 20260605_project_visual_identity.sql
--
-- Visual identity pour les projets multiprofils Tiquiz (port du
-- pattern Tipote 20260507_project_visual_identity.sql — "même
-- emplacement, même design" — Béné 2 juin 2026).
--
-- Ajoute 3 colonnes optionnelles à `projects` pour qu'un user qui
-- jongle entre plusieurs profils (audience yoga / coach business / etc.)
-- reconnaisse instantanément lequel est actif :
--   - accent_color       : code hex appliqué sur la pill header,
--                          marqueur sidebar et focus rings
--   - icon_emoji         : un seul emoji affiché à côté du nom
--   - use_branding_logo  : si true, on remplace l'emoji par le logo
--                          brand de l'user (champ profiles.brand_logo)
--
-- STRICTEMENT ADDITIF — aucune ligne existante n'est touchée. Les
-- projets sans styling tombent sur la pill neutre (= comportement
-- actuel). Les CHECK constraints valident le format hex et la
-- longueur emoji sans figer la palette en DB → on pourra étendre
-- ACCENT_COLORS / PROJECT_EMOJI côté TS sans nouvelle migration.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS icon_emoji TEXT,
  ADD COLUMN IF NOT EXISTS use_branding_logo BOOLEAN NOT NULL DEFAULT FALSE;

-- Light validation : hex colors only when set (#RGB ou #RRGGBB), and
-- single grapheme range for l'emoji. Garde l'UI safe sans forcer un
-- enum DB (on étendra la palette TS-side sans nouvelle migration).
DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_accent_color_format'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_accent_color_format
      CHECK (accent_color IS NULL OR accent_color ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_icon_emoji_length'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_icon_emoji_length
      CHECK (icon_emoji IS NULL OR char_length(icon_emoji) BETWEEN 1 AND 8);
  END IF;
END
$constraints$;

NOTIFY pgrst, 'reload schema';
