-- 20260710_ai_insights.sql (Tiquiz)
--
-- Analyse IA STRATÉGIQUE (au-dela de l'analyse de sondage existante
-- survey_ai_analysis, qui reste dediee au detail des reponses).
--
-- 1) Par quiz OU sondage : diagnostic complet (visites, completion,
--    capture, profil des visiteurs, axes d'amelioration, actions ventes
--    et captures), stocke sur la ligne quizzes.
-- 2) Au niveau GLOBAL (tous les quiz/sondages d'un user) : compte-rendu
--    strategique (ce qui marche, ce qui bloque, quoi lancer ensuite),
--    stocke dans une table dediee cle-user.
--
-- Gate par PLAN (canUseAIAnalysis, cf. lib/planLimits). Mises a jour
-- gratuites (pas de credits Tiquiz). Conventions : IF NOT EXISTS + NOTIFY.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS ai_insights JSONB,
  ADD COLUMN IF NOT EXISTS ai_insights_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quizzes.ai_insights IS
  'Analyse IA strategique du quiz/sondage : { summary, funnel, audience, improvements[], actions[], stats_at_generation, model, generated_at }. NULL = jamais generee. Gatee par plan (canUseAIAnalysis).';
COMMENT ON COLUMN public.quizzes.ai_insights_at IS
  'Timestamp de la derniere generation de l''analyse IA strategique du quiz/sondage.';

-- Compte-rendu strategique GLOBAL, un par user.
CREATE TABLE IF NOT EXISTS public.user_insight_reports (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  report       JSONB,
  generated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_insight_reports IS
  'Analyse IA strategique GLOBALE par user (tous ses quiz/sondages). report = { summary, whatWorks[], toFix[], nextMoves[], stats_at_generation, model, generated_at }.';

ALTER TABLE public.user_insight_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own insight report" ON public.user_insight_reports;
CREATE POLICY "own insight report" ON public.user_insight_reports
  FOR SELECT USING (auth.uid() = user_id);
-- Ecriture uniquement via service role (routes serveur) : pas de policy
-- insert/update pour le client.

NOTIFY pgrst, 'reload schema';
