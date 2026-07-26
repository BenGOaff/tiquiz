-- ════════════════════════════════════════════════════════════════
-- QUIZING — schéma initial
-- ════════════════════════════════════════════════════════════════
--
-- Modèle de données du cahier des charges (specs/01, section 11).
-- Conventions Béné : IF NOT EXISTS partout, RLS sur TOUTES les tables,
-- NOTIFY pgrst en fin pour recharger le cache PostgREST.
--
-- Règle d'or : un élève ne voit JAMAIS que ses propres données. Le
-- contenu (jours/questions) n'est lisible qu'avec un enrollment actif.
-- L'admin écrit via la service_role (qui bypasse la RLS), donc aucune
-- policy d'écriture "admin" n'est nécessaire ici.

-- ───────────────────────────────────────────────────────────────
-- Helper : enrollment actif ?
-- SECURITY DEFINER pour pouvoir être appelée dans les policies sans
-- boucler sur la RLS de la table enrollments elle-même.
-- ───────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────
-- 1. profiles  (1 ligne par user, miroir de auth.users)
-- ───────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  -- Segmentation issue du quiz de diagnostic d'entrée.
  niche         text,
  level         text check (level in ('debutant','intermediaire','avance')),
  objective     text,
  -- Lien optionnel vers le compte Tiquiz de l'élève (gamification v2).
  tiquiz_account_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "own profile read" on profiles;
create policy "own profile read" on profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile upsert" on profiles;
create policy "own profile upsert" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles
  for update using (auth.uid() = id);

-- ───────────────────────────────────────────────────────────────
-- 2. enrollments  (accès au L'Atelier du Quiz, créé par le webhook SIO)
-- ───────────────────────────────────────────────────────────────
create table if not exists enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','revoked')),
  source      text,                       -- 'systeme_io' | 'manual' | ...
  sio_contact_id text,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  unique (user_id)
);

alter table enrollments enable row level security;

drop policy if exists "own enrollment read" on enrollments;
create policy "own enrollment read" on enrollments
  for select using (auth.uid() = user_id);

-- Helper enrollment actif (après création de la table).
create or replace function fq_has_active_enrollment(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from enrollments e
    where e.user_id = uid and e.status = 'active'
  );
$$;

-- ───────────────────────────────────────────────────────────────
-- 3. days  (contenu d'un jour du parcours)
-- ───────────────────────────────────────────────────────────────
create table if not exists days (
  id            uuid primary key default gen_random_uuid(),
  day_number    integer not null unique,  -- J1 = 1, J-3 = -3, etc.
  slug          text unique,
  title         text not null,
  subtitle      text,
  intro_html    text,                     -- contenu riche (fq-rich)
  -- Vidéo : soit une URL externe (youtube/url) au MVP, soit un id du
  -- pipeline auto-hébergé (table quizing_videos) une fois branché.
  video_url     text,
  video_id      uuid,
  -- Ressources téléchargeables / liens : [{label, url, type}]
  resources     jsonb not null default '[]'::jsonb,
  -- Page de résultat de fin de jour (récap, plan d'action).
  result_html   text,
  status        text not null default 'draft' check (status in ('draft','published')),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table days enable row level security;

-- Un jour publié n'est lisible que par un élève avec enrollment actif.
drop policy if exists "published days for enrolled" on days;
create policy "published days for enrolled" on days
  for select using (
    status = 'published' and fq_has_active_enrollment(auth.uid())
  );

-- ───────────────────────────────────────────────────────────────
-- 4. questions  (le quiz du jour)
-- ───────────────────────────────────────────────────────────────
create table if not exists questions (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references days(id) on delete cascade,
  -- Règle d'or : jamais de QCM trivia. Types autorisés uniquement.
  type         text not null check (type in ('action','decision','self_eval','recall')),
  prompt       text not null,
  help_text    text,
  -- Pour decision/self_eval/recall : [{value, label, tag}]
  options      jsonb not null default '[]'::jsonb,
  required     boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table questions enable row level security;

drop policy if exists "questions for enrolled" on questions;
create policy "questions for enrolled" on questions
  for select using (
    fq_has_active_enrollment(auth.uid())
    and exists (select 1 from days d where d.id = questions.day_id and d.status = 'published')
  );

-- ───────────────────────────────────────────────────────────────
-- 5. answers  (le carnet de bord : réponses de l'élève)
-- ───────────────────────────────────────────────────────────────
create table if not exists answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day_id        uuid not null references days(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  value_text    text,                     -- réponse libre (action/self_eval)
  value_choice  text,                     -- value de l'option choisie (decision/recall)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table answers enable row level security;

drop policy if exists "own answers all" on answers;
create policy "own answers all" on answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- 6. progress  (statut par jour et par élève)
-- ───────────────────────────────────────────────────────────────
create table if not exists progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  day_id       uuid not null references days(id) on delete cascade,
  status       text not null default 'in_progress'
                 check (status in ('in_progress','completed')),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, day_id)
);

alter table progress enable row level security;

drop policy if exists "own progress all" on progress;
create policy "own progress all" on progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- 7. deliverables  (livrables générés par le coach — v2)
-- ───────────────────────────────────────────────────────────────
create table if not exists deliverables (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,              -- 'brief_3_couches' | 'resultats' | 'sequences_email' ...
  content     text,
  created_at  timestamptz not null default now()
);

alter table deliverables enable row level security;

drop policy if exists "own deliverables read" on deliverables;
create policy "own deliverables read" on deliverables
  for select using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- 8. coach_threads + coach_messages  (historique du coach IA)
-- ───────────────────────────────────────────────────────────────
create table if not exists coach_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_id      uuid references days(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table coach_threads enable row level security;

drop policy if exists "own threads all" on coach_threads;
create policy "own threads all" on coach_threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists coach_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references coach_threads(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table coach_messages enable row level security;

drop policy if exists "own messages all" on coach_messages;
create policy "own messages all" on coach_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- 9. metrics  (chiffres réels : leads, partages, ventes)
-- ───────────────────────────────────────────────────────────────
create table if not exists metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('leads','shares','sales')),
  value       integer not null default 0,
  recorded_at timestamptz not null default now(),
  source      text not null default 'manual'  -- 'manual' | 'tiquiz_readonly'
);

alter table metrics enable row level security;

drop policy if exists "own metrics all" on metrics;
create policy "own metrics all" on metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- 10. badges  (jalons débloqués)
-- ───────────────────────────────────────────────────────────────
create table if not exists badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,             -- 'quiz_published' | 'first_lead' | '10_leads' | 'first_sale'
  unlocked_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table badges enable row level security;

drop policy if exists "own badges read" on badges;
create policy "own badges read" on badges
  for select using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- 11. quizing_videos  (pipeline vidéo auto-hébergé, namespace
--     "quizing" sur le même VPS que popquiz Tiquiz)
-- ───────────────────────────────────────────────────────────────
create table if not exists quizing_videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  source        text not null default 'upload'
                  check (source in ('upload','youtube','url')),
  external_url  text,
  external_id   text,
  storage_path  text,        -- quizing/raw/<uid>/<id>/source.<ext>
  hls_path      text,        -- posé par le worker de transcodage
  thumbnail_url text,
  duration_ms   integer,
  status        text not null default 'pending'
                  check (status in ('pending','transcoding','ready','failed')),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table quizing_videos enable row level security;
-- Lecture seule pour les élèves enrollés (les URLs de lecture réelles
-- sont signées côté serveur). Écriture réservée à la service_role.
drop policy if exists "videos for enrolled" on quizing_videos;
create policy "videos for enrolled" on quizing_videos
  for select using (fq_has_active_enrollment(auth.uid()));

-- ───────────────────────────────────────────────────────────────
-- 12. webhook_logs  (idempotence + audit du webhook SIO)
-- ───────────────────────────────────────────────────────────────
create table if not exists webhook_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default 'systeme_io',
  event_id    text,
  event_type  text,
  payload     jsonb,
  status      text not null,
  error       text,
  created_at  timestamptz not null default now()
);

-- Idempotence : un même event_id n'est traité qu'une fois.
create unique index if not exists idx_webhook_logs_event_id
  on webhook_logs (source, event_id) where event_id is not null;

alter table webhook_logs enable row level security;
-- Aucune policy : table interne, accessible uniquement via service_role.

-- ───────────────────────────────────────────────────────────────
-- Index utiles
-- ───────────────────────────────────────────────────────────────
create index if not exists idx_answers_user_day on answers (user_id, day_id);
create index if not exists idx_progress_user on progress (user_id);
create index if not exists idx_questions_day on questions (day_id, sort_order);
create index if not exists idx_days_published on days (status, sort_order);
create index if not exists idx_coach_messages_thread on coach_messages (thread_id, created_at);

-- ───────────────────────────────────────────────────────────────
-- Recharge le cache de schéma PostgREST (sinon les nouvelles tables
-- restent invisibles à l'API REST de Supabase).
-- ───────────────────────────────────────────────────────────────
notify pgrst, 'reload schema';
