-- 11 septembre 2026 : une commission que Tipote n'a pas prise n'est
-- plus perdue.
--
-- LE TROU. `commissionnerVente` tourne DANS le webhook de paiement, et
-- il ne doit jamais bloquer l'accès du client : quand Tipote ne répond
-- pas (panne, déploiement en cours, secret pas encore posé), il écrivait
-- une ligne dans le journal et rendait la main. Le webhook répondait 200,
-- la ligne passait `processed`, et aucun réessai du fournisseur ne
-- repassait jamais par là. L'affilié n'était pas payé, et rien à
-- l'écran ne le disait : c'est exactement le genre de perte que Béné
-- refuse avant de démarcher de gros affiliés.
--
-- CE QUE CETTE TABLE FAIT. Le corps EXACT de l'appel qui a échoué est
-- rangé ici, avec son action (attribuer une commission, ou l'annuler sur
-- un remboursement). Il est rejoué plus tard, tel quel, jusqu'à ce que
-- Tipote l'accepte. Le rejeu est sans danger : Tipote répond `duplicate`
-- sur une clé déjà connue (contrainte d'unicité sur `source_app` +
-- `sio_order_id`), donc une commission ne peut pas naître deux fois.
--
-- La CLÉ est celle de la commission chez Tipote (`stripe:<facture>`,
-- `paypal:<vente>`), préfixée par l'action : une attribution et son
-- annulation sur la même vente sont deux lignes.
create table if not exists public.commissions_en_attente (
  cle text primary key,
  action text not null check (action in ('attribuer', 'annuler')),
  corps jsonb not null,
  tentatives integer not null default 1,
  rejouable boolean not null default true,
  derniere_erreur text,
  cree_le timestamptz not null default now(),
  derniere_tentative timestamptz not null default now(),
  envoye_le timestamptz
);

comment on table public.commissions_en_attente is
  'Appels vers le registre d''affiliés de Tipote qui ont échoué et attendent d''être rejoués. Une ligne envoyée garde sa trace (envoye_le).';

create index if not exists commissions_en_attente_a_rejouer_idx
  on public.commissions_en_attente (cree_le)
  where envoye_le is null and rejouable;

alter table public.commissions_en_attente enable row level security;

notify pgrst, 'reload schema';
