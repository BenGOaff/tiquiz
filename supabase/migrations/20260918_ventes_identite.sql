-- supabase/migrations/20260918_ventes_identite.sql
--
-- LA FICHE D'IDENTITÉ D'UN ENCAISSEMENT.
--
-- Béné, 17 septembre 2026 : "j'ai fait une vente sur notre nouveau
-- système, mais rien n'est identifié correctement", et "il faut être
-- sûre à 200 % qu'un affilié ne va pas perdre sa com parce que notre
-- système aurait foiré."
--
-- Les deux phrases ont la même cause. Le webhook SAIT qui a payé, quoi,
-- via quel affilié, et ce que le registre de Tipote a répondu : il
-- interroge le fournisseur pour l'établir. Puis il écrit tout ça dans un
-- `console.log`, et le tableau de bord re-déduit ce qu'il peut du
-- payload brut, qui ne porte pas la moitié de ces champs.
--
-- Cette table garde ce que le webhook a établi. Elle ne REMPLACE rien :
-- `webhook_logs` reste le journal (ce qu'on a reçu), celle ci est la
-- conclusion (ce qu'on en a compris, et ce qu'on en a fait).
--
-- LA CLÉ EST CELLE DE LA COMMISSION.
--
-- `(provider, reference)` où `reference` est exactement ce que
-- `commissionnerVente` envoie à Tipote dans `sio_order_id` (la facture
-- Stripe, la vente PayPal). Un deuxième identifiant à tenir serait un
-- deuxième endroit où se tromper, et le rapprochement vente/commission
-- redeviendrait une devinette.
--
-- AUCUN MONTANT DE VENTE N'EST FAIT AUTORITÉ ICI.
--
-- Les sommes encaissées restent lues dans `webhook_logs`, telles que le
-- fournisseur les a envoyées. Ce qui est stocké ici est ce qu'on a
-- calculé POUR LA COMMISSION (la base HT), pour pouvoir vérifier après
-- coup sur quoi un affilié a été payé. Deux sources pour un chiffre
-- d'affaires finiraient par se contredire.

create table if not exists public.ventes_identite (
  id uuid primary key default gen_random_uuid(),

  -- Qui a encaissé : `stripe`, `paypal`.
  provider text not null,
  -- LA CLÉ DE LA COMMISSION, sans son préfixe de moyen.
  reference text not null,

  -- ── QUI ──
  -- L'adresse SAISIE sur notre bon de commande, celle qui ouvre l'accès,
  -- jamais celle du compte PayPal (elles diffèrent souvent).
  email text,
  nom text,
  -- L'abonnement qui a produit cet encaissement, quand il y en a un.
  subscription_id text,

  -- ── QUOI ──
  product_id text,
  product_label text,
  -- `bon_de_commande` | `hors_bon_de_commande` | `inconnue`.
  -- Contrainte volontairement absente : une valeur nouvelle doit pouvoir
  -- arriver par un déploiement sans exiger une migration le même jour,
  -- sinon c'est le webhook qui tombe. La lecture est bornée en TypeScript.
  origine text not null default 'inconnue',

  -- ── VIA QUI ──
  -- Les deux champs restent SÉPARÉS : `?sa=` est l'ancien lien
  -- Systeme.io, `?ref=` le code public de nos liens actuels. Les
  -- fusionner obligerait à deviner lequel on a reçu.
  affiliate_ref text,
  affiliate_code text,

  -- ── ET CE QUE LA COMMISSION EST DEVENUE ──
  -- Les statuts de `lib/ventes/identite.ts`. C'est CE champ qui répond à
  -- "est-ce qu'un affilié a perdu sa com ?", par encaissement, sans
  -- avoir à recalculer quoi que ce soit.
  commission_statut text,
  commission_cents integer,
  commission_affilie text,
  commission_detail text,
  -- La base HT sur laquelle la commission a été demandée. Pour vérifier
  -- après coup, jamais pour alimenter un chiffre d'affaires.
  base_ht_cents integer,

  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- L'IDEMPOTENCE. Un webhook rejoué doit METTRE À JOUR sa fiche, pas en
-- créer une deuxième : deux fiches pour un encaissement donneraient deux
-- réponses à la question de la commission.
create unique index if not exists ventes_identite_cle
  on public.ventes_identite (provider, reference);

-- La lecture du tableau de bord est bornée par période.
create index if not exists ventes_identite_paid_at
  on public.ventes_identite (paid_at desc);

-- Retrouver toutes les échéances d'un abonnement.
create index if not exists ventes_identite_abonnement
  on public.ventes_identite (subscription_id)
  where subscription_id is not null;

-- Et l'index qui sert à l'alerte : ce qui demande un humain.
create index if not exists ventes_identite_commission_statut
  on public.ventes_identite (commission_statut);

-- ── RLS : PERSONNE, SAUF LA CLÉ DE SERVICE ────────────────────────────
--
-- Cette table porte des adresses de clients et des montants de
-- commission. Elle n'est lue que par les routes d'administration, qui
-- passent par `supabaseAdmin` et contournent donc RLS. Activer RLS sans
-- aucune policy est la fermeture la plus sûre : un jeton anonyme ou
-- authentifié ne voit RIEN.
alter table public.ventes_identite enable row level security;

comment on table public.ventes_identite is
  'Ce que le webhook a identifié d''un encaissement : qui, quoi, via qui, et ce que la commission est devenue. Clé = celle de la commission chez Tipote.';

notify pgrst, 'reload schema';
