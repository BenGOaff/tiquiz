-- ════════════════════════════════════════════════════════════════
-- QUIZING — certificats de fin de formation
-- ════════════════════════════════════════════════════════════════
--
-- Un eleve qui reussit l'examen de fin de parcours obtient un certificat
-- partageable (lien public + image OpenGraph). Une ligne par eleve
-- (unique user_id) : repasser l'examen met a jour le score, le token
-- de partage reste stable.
--
-- Conventions Bene : IF NOT EXISTS partout, RLS activee, NOTIFY pgrst.
-- La lecture publique par token NE passe PAS par une policy publique :
-- la page /cert/[token] lit via la service_role cote serveur, ce qui
-- evite d'exposer la table aux requetes anonymes directes.

create table if not exists certificates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique,
  -- Snapshot du nom au moment de la delivrance (le certificat ne change
  -- pas si l'eleve renomme son profil ensuite).
  full_name   text,
  score       integer not null,
  total       integer not null,
  issued_at   timestamptz not null default now(),
  unique (user_id)
);

alter table certificates enable row level security;

-- L'eleve lit son propre certificat (espace membre). L'ecriture et la
-- lecture publique par token passent par la service_role.
drop policy if exists "own certificate read" on certificates;
create policy "own certificate read" on certificates
  for select using (auth.uid() = user_id);

create index if not exists idx_certificates_token on certificates (share_token);

-- Recharge le cache de schema PostgREST.
notify pgrst, 'reload schema';
