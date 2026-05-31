-- Adeline (30 mai 2026) : "ce serait cool, en mode sondage, de pouvoir
-- montrer aux participants comment les autres ont répondu — un peu
-- comme '70% ont choisi A, 30% B'. Ça donne envie aux nouveaux de
-- répondre pour comparer."
--
-- Nouvelle option par sondage : si TRUE, la page de remerciement
-- affiche un encart "Comparé aux autres participants" avec les % de
-- chaque option par question.
--
-- Default FALSE pour ne RIEN changer aux sondages existants (l'auteur
-- l'active explicitement dans les paramètres).

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS show_aggregate_responses BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.quizzes.show_aggregate_responses IS
  'Si TRUE, affiche les pourcentages de réponses des autres participants sur la page de remerciement du sondage. Default FALSE.';

NOTIFY pgrst, 'reload schema';
