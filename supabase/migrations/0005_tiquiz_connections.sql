-- 0005_tiquiz_connections.sql
-- Lien entre un eleve L'Atelier du Quiz et son compte Tiquiz (apres consentement
-- 1-clic). Stocke le token de lecture durable + un snapshot des metriques.
-- Table interne : RLS activee, AUCUNE policy (le token ne doit jamais
-- arriver au navigateur ; on lit toujours via la service_role cote serveur).

create table if not exists tiquiz_connections (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  tiquiz_user_id text,
  token          text not null,
  connected_at   timestamptz not null default now(),
  last_synced_at timestamptz,
  metrics        jsonb not null default '{}'::jsonb
);

alter table tiquiz_connections enable row level security;
-- Pas de policy : acces service_role uniquement.

notify pgrst, 'reload schema';
