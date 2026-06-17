-- 20260617_partner_connections.sql
-- Pont cross-app : permet a FormaQuiz de lire (en lecture seule) les
-- metriques agregees d'un compte Tiquiz, apres consentement explicite de
-- l'utilisateur (flux OAuth-leger).
--
-- Deux tables internes, accessibles UNIQUEMENT via la service_role
-- (RLS activee, aucune policy) :
--   partner_auth_codes  : codes a usage unique (echange contre un token)
--   partner_connections : tokens durables (lecture des metriques)
--
-- Aucune donnee perso ici : juste des hash de jetons + le user_id Tiquiz.

create table if not exists partner_auth_codes (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null unique,
  user_id     uuid not null references auth.users(id) on delete cascade,
  partner     text not null default 'formaquiz',
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists partner_connections (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  user_id      uuid not null references auth.users(id) on delete cascade,
  partner      text not null default 'formaquiz',
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists idx_partner_connections_user on partner_connections (user_id);

alter table partner_auth_codes enable row level security;
alter table partner_connections enable row level security;
-- Pas de policy : tables internes, accessibles seulement via service_role.

notify pgrst, 'reload schema';
