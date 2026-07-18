-- 0008_persona_personalization.sql
-- Personnalisation par persona : meme parcours + memes videos, mais
-- vocabulaire (glossaire) et exemples declines par famille de metier.
--
--   persona_vocab        : 1 ligne par persona, glossaire {terme: mot}
--   day_persona_examples : encart d'exemples par (jour, persona)
--
-- Lecture : eleves enrolles (le rendu serveur applique la RLS). Ecriture :
-- service_role uniquement (admin).

create table if not exists persona_vocab (
  persona     text primary key,
  vocab       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists day_persona_examples (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references days(id) on delete cascade,
  persona       text not null,
  examples_html text,
  updated_at    timestamptz not null default now(),
  unique (day_id, persona)
);

create index if not exists idx_day_persona_examples_day on day_persona_examples (day_id);

alter table persona_vocab enable row level security;
alter table day_persona_examples enable row level security;

drop policy if exists "persona_vocab read enrolled" on persona_vocab;
create policy "persona_vocab read enrolled" on persona_vocab
  for select using (fq_has_active_enrollment(auth.uid()));

drop policy if exists "day_persona_examples read enrolled" on day_persona_examples;
create policy "day_persona_examples read enrolled" on day_persona_examples
  for select using (fq_has_active_enrollment(auth.uid()));

-- ── Seed du glossaire (modifiable ensuite dans l'admin) ──
insert into persona_vocab (persona, vocab) values
  ('freelance',   '{"offre":"ta prestation","client":"ton client","audience":"tes prospects","expertise":"ton savoir-faire"}'::jsonb),
  ('infopreneur', '{"offre":"ta formation","client":"ton élève","audience":"ton audience","expertise":"ta méthode"}'::jsonb),
  ('coach',       '{"offre":"ton accompagnement","client":"ton client","audience":"ton audience","expertise":"ta méthode"}'::jsonb),
  ('auteur',      '{"offre":"ton livre","client":"ton lecteur","audience":"ta communauté de lecteurs","expertise":"ton univers"}'::jsonb),
  ('createur',    '{"offre":"ton offre","client":"ton abonné","audience":"ta communauté","expertise":"ta ligne éditoriale"}'::jsonb),
  ('affilie',     '{"offre":"le produit que tu recommandes","client":"ton filleul","audience":"ton audience","expertise":"ta sélection"}'::jsonb),
  ('mlm',         '{"offre":"tes produits","client":"ton client","audience":"ton réseau","expertise":"ton opportunité"}'::jsonb),
  ('autre',       '{"offre":"ton offre","client":"ton client","audience":"ton audience","expertise":"ton expertise"}'::jsonb)
on conflict (persona) do nothing;

notify pgrst, 'reload schema';
