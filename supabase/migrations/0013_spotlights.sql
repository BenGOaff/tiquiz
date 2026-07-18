-- 0013_spotlights.sql
-- Chantier E : moteur de mise en avant. Quand un eleve atteint un cap reel
-- (paliers de leads via Tiquiz), on cree un "candidat" + un brouillon
-- d'etude de cas, et on alerte l'admin. Bene valide puis publie.
-- Table interne : RLS activee, aucune policy (admin via service_role).

create table if not exists spotlights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  milestone   text not null,                       -- 'leads_10' | 'leads_50'
  status      text not null default 'candidate',   -- candidate | published | dismissed
  draft       text,                                -- brouillon d'etude de cas (markdown)
  metrics     jsonb,                               -- snapshot au declenchement
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, milestone)
);

create index if not exists idx_spotlights_status on spotlights (status, created_at desc);

alter table spotlights enable row level security;
-- Aucune policy : table interne (admin via service_role).

notify pgrst, 'reload schema';
