-- 0011_sio_templates.sql
-- Modeles Systeme.io a importer en 1 clic : Bene cree un modele dans SIO
-- (sequence email, tunnel...), colle son URL de partage ici, et l'eleve
-- l'importe sur son compte en 1 clic. Lecture par les enrolles (modeles
-- actives) ; ecriture par la service_role (admin).

create table if not exists sio_templates (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  kind        text not null default 'autre',  -- 'sequence' | 'tunnel' | 'autre'
  url         text not null,
  description text,
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table sio_templates enable row level security;

drop policy if exists "sio_templates read enrolled" on sio_templates;
create policy "sio_templates read enrolled" on sio_templates
  for select using (enabled and fq_has_active_enrollment(auth.uid()));

notify pgrst, 'reload schema';
