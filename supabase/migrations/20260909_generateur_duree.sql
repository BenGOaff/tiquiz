-- 9 septembre 2026 : combien de temps un visiteur attend son quiz.
--
-- POURQUOI UNE COLONNE, ALORS QUE GA4 MESURE DÉJÀ LA DURÉE.
--
-- Béné veut "la durée médiane de génération, mesurée avant et après" le
-- chantier du flux (les questions qui s'écrivent au fur et à mesure).
-- GA4 ne calcule PAS de médiane dans ses rapports standards : il rend
-- des moyennes, et une moyenne sur une distribution à longue traîne (un
-- appel qui part en timeout à 120 s) dit autre chose que ce qu'on
-- cherche. La médiane demande une exploration ou BigQuery ; une colonne
-- ici la rend lisible dans son admin, à côté du coût.
--
-- CE QUE CETTE COLONNE MESURE, ET CE QU'ELLE NE MESURE PAS.
--
-- Elle est écrite à l'entrée de la requête et lue juste après la
-- réponse du modèle : elle nomme donc la durée de L'APPEL AU MODÈLE,
-- pas ce que le visiteur vit. Les insertions en base qui suivent (le
-- quiz, ses questions, ses profils) n'y sont pas, et le rendu côté
-- navigateur encore moins.
--
-- La durée VÉCUE est celle de `generation_reussie` côté GA4 (requête
-- partie -> éditeur affiché). Les deux ne se confondent pas, et les
-- appeler pareil serait la faute qui coûte le plus cher dans ces
-- dépôts : deux chiffres qui répondent à deux questions différentes
-- sous le même nom.
alter table public.embed_quiz_sessions
  add column if not exists duree_ms integer;

comment on column public.embed_quiz_sessions.duree_ms is
  'Duree de l''appel au modele, en millisecondes : entree de la requete -> reponse lue. N''inclut PAS la materialisation du quiz ni le rendu. La duree vecue par le visiteur vit dans GA4 (generation_reussie.duree_ms).';

notify pgrst, 'reload schema';
