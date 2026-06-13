-- 20260613_quiz_results_heading_overrides.sql (Tiquiz)
--
-- Titres de blocs résultat personnalisables PAR PROFIL (retour Gwenn
-- 13 juin 2026).
--
-- Aujourd'hui les 2 titres de blocs ("Prise de conscience" / insight et
-- "Et si..." / projection) sont au niveau du QUIZ
-- (quizzes.result_insight_heading / result_projection_heading), donc
-- partagés par tous les profils. Pratique quand ils sont identiques,
-- mais Gwenn veut pouvoir mettre un titre DIFFÉRENT par profil.
--
-- Solution : un override NULLABLE par résultat. NULL = on utilise le
-- titre commun du quiz (comportement actuel, fill-once préservé).
-- Renseigné = ce profil affiche SON titre. Le mode "identique vs
-- personnalisé" est dérivé côté éditeur (au moins un override non-null
-- sur le bloc = mode personnalisé), pas de flag en base.

ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS insight_heading TEXT,
  ADD COLUMN IF NOT EXISTS projection_heading TEXT;

COMMENT ON COLUMN public.quiz_results.insight_heading IS
'Override du titre du bloc insight pour CE profil. NULL/vide = titre commun du quiz (quizzes.result_insight_heading).';

COMMENT ON COLUMN public.quiz_results.projection_heading IS
'Override du titre du bloc projection (Et si...) pour CE profil. NULL/vide = titre commun du quiz.';

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
