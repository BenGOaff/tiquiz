-- 0015_affiliate_tracking.sql
-- Vrai suivi des commissions affiliées de l'Atelier du Quiz, calqué sur le
-- pipeline affiliate Tipote (clic -> conversion -> vente -> commission).
-- Données fiables : chaque vente Systeme.io attribuée par identifiant affilié
-- (sa) crée une ligne immuable de commission.
--
-- Taux PAR PRODUIT (configurés aussi côté Systeme.io, on applique les mêmes) :
--   - Atelier du Quiz (Quizing)  -> source_app 'quizing', 100%
--   - Abonnement Tiquiz          -> source_app 'tiquiz',  40% récurrent
--
-- Accès : ces tables sont alimentées par les webhooks (service role) et lues
-- côté serveur par le dashboard (filtré sur le sa de l'élève). RLS activée
-- SANS policy publique -> aucun accès client direct, le service role bypasse.

-- 1. Clics (stats, IP jamais stockée en clair côté client).
create table if not exists affiliate_clicks (
  id bigint generated always as identity primary key,
  sa text not null,
  page_url text,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_sa_idx on affiliate_clicks (sa);

-- 2. Conversions (email <-> affilié). Sert à attribuer une vente quand le
--    payload de vente ne porte pas le sa (fenêtre d'attribution 90j).
create table if not exists affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  sa text not null,
  page_url text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_conversions_email_idx on affiliate_conversions (email, created_at desc);
create index if not exists affiliate_conversions_sa_idx on affiliate_conversions (sa);

-- 3. Commissions (source de vérité du suivi des gains).
create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  sa text not null,
  sio_order_id text not null,
  source_app text not null check (source_app in ('quizing', 'tiquiz')),
  customer_email text not null,
  conversion_id uuid references affiliate_conversions(id) on delete set null,
  product_name text,
  sale_amount_cents integer not null default 0,
  commission_rate numeric(5,4) not null,
  commission_cents integer not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'cancelled', 'rejected')),
  sale_at timestamptz not null default now(),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Idempotence : un retry de webhook Systeme.io sur la même commande est ignoré.
  unique (source_app, sio_order_id)
);
create index if not exists affiliate_commissions_sa_idx on affiliate_commissions (sa);
create index if not exists affiliate_commissions_status_idx on affiliate_commissions (status);

alter table affiliate_clicks enable row level security;
alter table affiliate_conversions enable row level security;
alter table affiliate_commissions enable row level security;

notify pgrst, 'reload schema';
