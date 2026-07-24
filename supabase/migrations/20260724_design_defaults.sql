-- 20260724_design_defaults.sql
-- Modele de design PAR PROJET : memorise la disposition/forme preferee du
-- createur pour l'ESTAMPILLER sur chaque NOUVEAU quiz/sondage a la creation
-- (jamais sur les quiz existants). Toutes nullable sans default -> NULL =
-- aucune preference = rendu historique. Les quiz deja crees ne bougent pas.
--
-- Tiquiz stocke le branding sur DEUX tables selon le plan :
--   - business_profiles (par projet) pour les users multiprofils
--   - profiles (par user) pour les plans legacy (free/monthly/yearly)
-- On ajoute donc les colonnes aux DEUX, comme les colonnes brand_* / default_*
-- existantes, pour que le "meme design par projet" marche pour les
-- multiprofils ET que les autres gardent leur unique modele par defaut.
--
-- Les couleurs/police/logo restent gerees par les colonnes brand_* existantes.
-- Ici on ne stocke QUE la mise en forme structurelle (par-quiz) qui n'avait
-- pas de defaut projet.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS default_question_layout TEXT,
  ADD COLUMN IF NOT EXISTS default_intro_layout TEXT,
  ADD COLUMN IF NOT EXISTS default_button_shape TEXT,
  ADD COLUMN IF NOT EXISTS default_answer_layout TEXT,
  ADD COLUMN IF NOT EXISTS default_background_style TEXT,
  ADD COLUMN IF NOT EXISTS default_background_gradient TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_question_layout TEXT,
  ADD COLUMN IF NOT EXISTS default_intro_layout TEXT,
  ADD COLUMN IF NOT EXISTS default_button_shape TEXT,
  ADD COLUMN IF NOT EXISTS default_answer_layout TEXT,
  ADD COLUMN IF NOT EXISTS default_background_style TEXT,
  ADD COLUMN IF NOT EXISTS default_background_gradient TEXT;

NOTIFY pgrst, 'reload schema';
