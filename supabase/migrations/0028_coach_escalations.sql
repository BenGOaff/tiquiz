-- 0028_coach_escalations.sql
-- Escalade admin du coach IA : quand le coach ne sait pas repondre a partir
-- du contenu fourni, OU quand l'eleve signale un bug / probleme qui demande
-- Bene, on enregistre une escalade ici et on previent Bene par email.
--
-- Table INTERNE (admin only) : aucune policy select/insert cote eleve.
-- Seul le service_role (route /api/coach en ecriture, pages/routes /api/admin
-- en lecture) y accede. Un eleve ne doit JAMAIS lire ni ecrire cette table.

create table if not exists coach_escalations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  student_email  text,                                  -- email de l'eleve (snapshot)
  thread_id      uuid references coach_threads(id) on delete set null,
  day_number     integer,                               -- jour concerne (nullable)
  question       text not null,                         -- dernier message de l'eleve
  reason         text not null,                         -- motif court (marqueur du coach)
  resolved       boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table coach_escalations enable row level security;
-- Aucune policy : table interne. La RLS activee sans policy = personne ne
-- lit/ecrit via la cle anon. Seul le service_role bypasse la RLS.

-- Escalades ouvertes, les plus recentes d'abord (dashboard admin).
create index if not exists idx_coach_escalations_open
  on coach_escalations (created_at desc)
  where resolved = false;

-- Anti-spam : derniere escalade d'un eleve (throttle des emails).
create index if not exists idx_coach_escalations_user
  on coach_escalations (user_id, created_at desc);

notify pgrst, 'reload schema';
