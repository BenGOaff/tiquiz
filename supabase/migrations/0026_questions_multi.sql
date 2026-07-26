-- 0026_questions_multi.sql
-- Certaines questions du parcours acceptent PLUSIEURS réponses (multi-select),
-- comme sur Tiquiz où un quiz peut viser plusieurs objectifs à la fois.
-- Ex. Jour 1 : "Quel est l'objectif principal de ton quiz ?" -> l'élève peut
-- en combiner plusieurs (capter ET segmenter ET vendre...).
--
-- Stockage : la réponse multi est écrite dans answers.value_choice sous forme
-- de valeurs jointes par une virgule (ex. "capter,segmenter,vendre"). Aucun
-- changement de schéma côté answers (value_choice est déjà du texte).

alter table public.questions
  add column if not exists multi boolean not null default false;

-- Jour 1 : la question d'objectif devient multi-select. On aligne aussi le
-- help_text (il disait "Indique le principal ici", ce qui contredisait le
-- multi-choix). Match tolérant sur le libellé pour couvrir les variantes.
update public.questions
set multi = true,
    help_text = 'Tu peux en combiner plusieurs (capter ET segmenter ET vendre...). Sélectionne tous ceux qui comptent pour toi.'
where prompt ilike '%objectif principal%'
  and type = 'decision';

notify pgrst, 'reload schema';
