-- 20260831_blog_commentaires_moderation.sql
--
-- L'AUTO-MODÉRATION DES COMMENTAIRES (Béné, 31 août 2026).
--
-- "Qui les valide, quand et comment ? [...] Peut être une auto
-- modération (pas de liens, pas de discours négatifs ou déplacés, pas
-- de spam). L'idée c'est de permettre aux gens de laisser des
-- commentaires (mais je dois être alertée pour savoir qu'il y en a) et
-- de montrer aux moteurs de recherche et à l'IA que mon blog intéresse
-- le public."
--
-- CE QUE CETTE MIGRATION AJOUTE : une seule colonne, `motifs`, qui dit
-- POURQUOI un commentaire a été retenu ("lien", "spam", "cris"...).
--
-- Sans elle, l'écran d'admin affiche une file de messages sans dire ce
-- qui les a arrêtés, donc Béné relit chaque message pour deviner. Avec
-- elle, elle voit "contient un lien" et tranche en une seconde.
--
-- La colonne est FACULTATIVE côté code : `enregistrerCommentaire` se
-- replie sur l'écriture sans `motifs` si la migration n'est pas encore
-- passée, et `lireFileModeration` fait pareil en lecture. Sans ce
-- repli, un déploiement en avance sur la migration perdrait TOUS les
-- commentaires en silence (drame `quiz_events.meta`, 15 jours de
-- statistiques perdues).
--
-- Les commentaires DÉJÀ en base restent `en_attente` avec `motifs` à
-- NULL : ils ont été reçus avant l'auto-modération, personne ne peut
-- dire après coup ce qui les aurait retenus. L'écran affiche alors
-- "reçu avant l'auto-modération", jamais un motif inventé.

alter table public.blog_commentaires
  add column if not exists motifs text;

-- Le compte "combien attendent" est la première chose que l'admin
-- affiche : il doit rester une lecture d'index, pas un parcours de
-- table, le jour où la table grossit.
create index if not exists blog_commentaires_publie_idx
  on public.blog_commentaires (statut, slug, cree_le);

notify pgrst, 'reload schema';
