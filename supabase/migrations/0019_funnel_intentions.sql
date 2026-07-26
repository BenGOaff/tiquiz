-- 0019_funnel_intentions.sql
-- Emails par profil : intention de campagne choisie par l'eleve pour chaque
-- profil de resultat de son quiz (rassurer, valeur, vendre, rdv, lead
-- magnet). Prime sur le CTA reel du resultat, et sert de repli quand le
-- profil n'a pas de CTA. Une ligne par eleve, map { titre profil -> intention }.
-- Lecture ET ecriture par le proprietaire (l'eleve regle ses intentions).

create table if not exists funnel_intentions (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  intentions  jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table funnel_intentions enable row level security;

drop policy if exists "own intentions read" on funnel_intentions;
create policy "own intentions read" on funnel_intentions
  for select using (auth.uid() = user_id);

drop policy if exists "own intentions upsert" on funnel_intentions;
create policy "own intentions upsert" on funnel_intentions
  for insert with check (auth.uid() = user_id);

drop policy if exists "own intentions update" on funnel_intentions;
create policy "own intentions update" on funnel_intentions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
