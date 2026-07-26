-- 0010_funnel_assets.sql
-- Chantier B : le funnel "done-for-you". On stocke la campagne generee
-- pour l'eleve (sequences email + kit de lancement), une ligne par eleve.
-- Genere a partir de son carnet + persona. Lecture par le proprietaire ;
-- ecriture par la service_role (route de generation).

create table if not exists funnel_assets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  assets       jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

alter table funnel_assets enable row level security;

drop policy if exists "own funnel read" on funnel_assets;
create policy "own funnel read" on funnel_assets
  for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';
