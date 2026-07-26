-- 0022_affiliate_commissions_refunds.sql
-- Fiabilise le suivi des gains affiliés côté app pour qu'il colle à
-- Systeme.io (source de vérité du paiement) :
--   - refunds : une vente remboursée pendant la garantie 30 jours ne doit
--     plus compter dans les gains. On ajoute le statut 'refunded' + la date.
--   - sale_amount_cents = montant HT (base de calcul de la commission
--     Systeme.io : 70% Atelier / 40% Tiquiz, toujours sur le HT).
--   - index sale_at pour les agrégats par période.
--
-- NB : les commissions sont calculées à partir du HT extrait du payload
-- Systeme.io (total - taxe). Si le payload ne porte pas de taxe (franchise
-- de TVA), HT = total.

alter table affiliate_commissions
  add column if not exists refunded_at timestamptz;

-- Le statut 'refunded' n'était pas dans la contrainte d'origine (0015).
alter table affiliate_commissions
  drop constraint if exists affiliate_commissions_status_check;
alter table affiliate_commissions
  add constraint affiliate_commissions_status_check
  check (status in ('pending', 'approved', 'paid', 'cancelled', 'rejected', 'refunded'));

create index if not exists affiliate_commissions_sale_at_idx
  on affiliate_commissions (sale_at desc);

notify pgrst, 'reload schema';
