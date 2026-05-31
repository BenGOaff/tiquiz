-- Adeline (30 mai 2026) : "j'aimerais pouvoir faire un sondage public
-- sans demander d'email — les participants vont directement à la page
-- de remerciement / résultats après la dernière question."
--
-- Le mode sondage de Tiquiz force aujourd'hui le visiteur à passer par
-- l'étape email + champs avant le remerciement. On ajoute un flag par
-- sondage pour court-circuiter cette étape.
--
-- Default TRUE pour ne RIEN changer aux sondages existants — il faut
-- explicitement le décocher dans les paramètres pour rendre le sondage
-- anonyme.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS capture_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.quizzes.capture_enabled IS
  'Si TRUE (default), demande email + champs au visiteur avant le remerciement. Si FALSE, sondage anonyme : on saute l''étape capture après la dernière question. S''applique surtout au mode sondage.';

NOTIFY pgrst, 'reload schema';
