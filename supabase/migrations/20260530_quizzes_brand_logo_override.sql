-- Adeline (30 mai 2026, suite) : "j'ai essayé de supprimer mon logo dans
-- les designs du quiz, mais celui par défaut est ajouté automatiquement.
-- Si je veux créer un quiz pour quelqu'un d'autre, mon logo doit pouvoir
-- être modifié."
--
-- Le logo vivait UNIQUEMENT au niveau du profil (single source of truth).
-- Conséquence : impossible de poser un logo différent par quiz (typiquement
-- quand on bosse pour un client). Le bouton "Supprimer" effaçait carrément
-- le logo du profil → réapparition automatique dès qu'on rechargeait.
--
-- On ajoute deux colonnes sur quizzes pour faire de l'override par quiz :
--   • brand_logo_url : URL d'un logo spécifique à CE quiz. NULL = utiliser
--     le logo du profil (comportement actuel pour les quiz existants).
--   • hide_brand_logo : si TRUE, masque TOUT logo sur ce quiz (pas même
--     le fallback profil). Sert quand on veut un quiz totalement sans logo
--     (ex: quiz "anonyme" pour un sondage interne). Default FALSE pour
--     ne rien changer aux quiz existants.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS hide_brand_logo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.quizzes.brand_logo_url IS
  'URL d''un logo override pour CE quiz uniquement. NULL = fallback sur profiles.brand_logo_url.';
COMMENT ON COLUMN public.quizzes.hide_brand_logo IS
  'Si TRUE, masque tout logo sur ce quiz (ni override, ni profil). Default FALSE.';

NOTIFY pgrst, 'reload schema';
