-- 0027_questions_reveal.sql
-- Feedback pedagogique sur les questions "recall" : apres avoir repondu,
-- l'eleve voit une revelation douce (l'idee a retenir). Jamais un score,
-- jamais un "faux" : on entraine, on ne recale pas.
-- Colonne optionnelle, NULL = aucune revelation (comportement actuel).

alter table public.questions
  add column if not exists reveal_html text;

notify pgrst, 'reload schema';
