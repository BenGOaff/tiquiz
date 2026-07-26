-- 0014_profile_affiliate.sql
-- Espace Affiliation de l'Atelier du Quiz : l'élève peut devenir affilié et
-- recommander Quizing (100% sur la vente) + Tiquiz (40%/mois récurrent).
-- L'affiliation est NATIVE Systeme.io : on stocke juste l'identifiant affilié
-- Systeme.io (sa...) pour construire son lien tracké
-- https://www.tipote.fr/atelier-du-quiz?sa=<id>. Le suivi des gains et le
-- paiement restent gérés par Systeme.io (source de vérité).
--
--   sio_affiliate_id      : identifiant affilié Systeme.io (format saXXXX...)
--   affiliate_opted_in_at : 1re activation de l'espace affilié (NULL = jamais)
--
-- Colonnes additives sur profiles (RLS self-update déjà en place : l'élève
-- ne modifie que sa propre ligne). Aucun impact sur l'existant.

alter table profiles
  add column if not exists sio_affiliate_id text,
  add column if not exists affiliate_opted_in_at timestamptz;

notify pgrst, 'reload schema';
