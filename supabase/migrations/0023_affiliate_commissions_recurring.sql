-- 0023_affiliate_commissions_recurring.sql
-- Fiabilise le comptage des commissions RÉCURRENTES (abonnement Tiquiz 40%).
--
-- Bug latent : l'idempotence d'origine (0015) était unique(source_app,
-- sio_order_id). Si Systeme.io réutilise le même order.id à chaque échéance
-- mensuelle d'un abonnement, seul le 1er mois était enregistré (les suivants
-- rejetés comme doublons). On bascule la clé d'unicité sur la RÉFÉRENCE DE
-- PAIEMENT (facture / paiement), distincte à chaque échéance.
--
-- sio_order_id reste stocké (matching des remboursements par commande).

alter table affiliate_commissions
  add column if not exists sio_payment_ref text;

-- Backfill : pour l'existant, la référence de paiement = l'order id.
update affiliate_commissions
  set sio_payment_ref = sio_order_id
  where sio_payment_ref is null;

alter table affiliate_commissions
  alter column sio_payment_ref set not null;

-- Remplace l'unicité (source_app, sio_order_id) par (source_app, sio_payment_ref).
alter table affiliate_commissions
  drop constraint if exists affiliate_commissions_source_app_sio_order_id_key;
create unique index if not exists affiliate_commissions_payment_ref_key
  on affiliate_commissions (source_app, sio_payment_ref);

notify pgrst, 'reload schema';
