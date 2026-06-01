-- 20260605_survey_ai_analysis.sql (Tiquiz)
--
-- Stocke l'analyse IA d'un sondage (mode='survey') sur la ligne quizzes.
-- Permet de re-servir l'analyse sans régénérer (mises à jour gratuites).
--
-- Tiquiz n'a PAS de système de crédits → l'analyse IA est gatée par le
-- PLAN (option payante d'un plan plus cher, cf. lib/planLimits
-- canUseSurveyAI). Pas de colonne "first_charged_at" (pas de débit).
--
-- survey_ai_analysis : JSONB { summary, takeaways[], actions[],
--   responses_at_generation, model, generated_at }.
--
-- Conventions : IF NOT EXISTS + NOTIFY pgrst.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS survey_ai_analysis JSONB,
  ADD COLUMN IF NOT EXISTS survey_ai_analysis_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quizzes.survey_ai_analysis IS
  'Analyse IA du sondage : { summary, takeaways[], actions[], responses_at_generation, model, generated_at }. NULL = jamais générée. Gatée par plan (canUseSurveyAI).';
COMMENT ON COLUMN public.quizzes.survey_ai_analysis_at IS
  'Timestamp de la dernière génération de l''analyse IA du sondage.';

NOTIFY pgrst, 'reload schema';
