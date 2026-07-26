-- 0025_tiquiz_selected_scope.sql
-- Sélecteur projet/quiz dans le panel Tiquiz de l'Atelier (Gwenn 19 juil
-- 2026 : un user Tiquiz avec plusieurs projets/quiz veut choisir lequel
-- s'affiche). On mémorise sa dernière sélection sur sa connexion Tiquiz.
--
-- Valeurs : "" ou NULL = tout (meilleur quiz global, comportement d'origine),
-- "project:<id>" = un projet, "quiz:<id>" = un quiz précis.

ALTER TABLE public.tiquiz_connections
  ADD COLUMN IF NOT EXISTS selected_scope TEXT;

NOTIFY pgrst, 'reload schema';
