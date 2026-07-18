-- 0012_feedback_digest.sql
-- Chantier D : auto-amelioration + relance douce.
--   feedback   : ce qui bloque l'eleve (collecte pour corriger le contenu)
--   digest_log : anti double-envoi du recap hebdo (1 par eleve et par jour)

create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_number  integer,                       -- jour concerne (nullable)
  kind        text not null default 'blocage', -- 'blocage' | 'idee' | 'autre'
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "own feedback insert" on feedback;
create policy "own feedback insert" on feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "own feedback read" on feedback;
create policy "own feedback read" on feedback
  for select using (auth.uid() = user_id);
-- L'admin lit tout via la service_role (pas de policy necessaire).

create table if not exists digest_log (
  user_id   uuid not null references auth.users(id) on delete cascade,
  sent_on   date not null,
  kind      text not null default 'weekly_recap',
  created_at timestamptz not null default now(),
  primary key (user_id, sent_on, kind)
);

alter table digest_log enable row level security;
-- Aucune policy : table interne (cron via service_role uniquement).

notify pgrst, 'reload schema';
