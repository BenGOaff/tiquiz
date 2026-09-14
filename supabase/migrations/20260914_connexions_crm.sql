-- 14 septembre 2026 : les leads d'un quiz partent vers l'outil que la
-- créatrice a choisi, et plus seulement vers Systeme.io.
--
-- POURQUOI. Un client (une agence, plusieurs sous-comptes) travaille sur
-- GoHighLevel et n'a pas Systeme.io. Tout ce que Tiquiz sait faire
-- après une capture (le contact, ses champs, le tag du profil, les tags
-- par réponse, les tags de score, le tag de partage) ne dépend en rien
-- de Systeme.io : ce sont des NOMS de tags, et tous ces outils
-- déclenchent une automatisation sur "tag ajouté".
--
-- CE QUI NE BOUGE PAS. `sio_api_keys` et les colonnes `sio_*` de
-- `quizzes`, `quiz_results` et `quiz_leads` restent telles quelles :
-- `sio_tag_names` porte des noms de tags qui valent pour n'importe quel
-- outil, et les renommer ferait bouger tous les quiz en ligne pour rien.
-- Une connexion Systeme.io continue de vivre dans `sio_api_keys`.
--
-- UNE CONNEXION = UN JETON + LES RÉGLAGES DE L'OUTIL. Pour GoHighLevel,
-- `config` porte le `locationId` (le sous-compte). Une agence qui gère
-- dix sous-comptes a dix lignes : c'est ce qui permet à chaque quiz de
-- pointer sur le bon.
create table if not exists public.connexions_crm (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  -- 'gohighlevel', et les suivants ('brevo', 'clickfunnels'...). Jamais
  -- 'systemeio' : celui-là vit dans sio_api_keys.
  fournisseur text not null,
  nom text not null,
  -- Le jeton, chiffré avec la même enveloppe que les clés Systeme.io
  -- (lib/sio/keyCrypto.ts). Jamais en clair.
  secret_chiffre text not null,
  secret_last4 text,
  config jsonb not null default '{}'::jsonb,
  -- La synchro peut être mise en PAUSE sans supprimer la connexion : un
  -- quiz qui la vise garde son réglage, et rien ne part tant que c'est
  -- en pause.
  actif boolean not null default true,
  est_defaut boolean not null default false,
  -- 'ok' ou 'deconnecte'. Un 401/403 du fournisseur passe la connexion
  -- en 'deconnecte' et prévient la créatrice par email, UNE fois
  -- (alerte_deconnexion_le). Une validation réussie la remet en 'ok'.
  etat text not null default 'ok' check (etat in ('ok', 'deconnecte')),
  derniere_erreur text,
  deconnecte_le timestamptz,
  alerte_deconnexion_le timestamptz,
  derniere_validation_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fournisseur, nom)
);

create index if not exists connexions_crm_user_idx on public.connexions_crm(user_id);
create index if not exists connexions_crm_projet_idx on public.connexions_crm(project_id) where project_id is not null;

-- Au plus UNE connexion par défaut par projet, tenue par la base : deux
-- requêtes simultanées ne peuvent pas la poser toutes les deux.
create unique index if not exists connexions_crm_un_defaut_par_projet
  on public.connexions_crm(user_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where est_defaut = true;

alter table public.connexions_crm enable row level security;

-- Le quiz pointe sur UNE connexion. NULL = la cascade d'avant (clé
-- Systeme.io du quiz, puis défaut du projet). ON DELETE SET NULL :
-- supprimer une connexion n'orpheline jamais un quiz.
alter table public.quizzes
  add column if not exists connexion_id uuid references public.connexions_crm(id) on delete set null;
create index if not exists quizzes_connexion_id_idx on public.quizzes(connexion_id) where connexion_id is not null;

-- La même pause et la même alerte pour les clés Systeme.io, sinon
-- l'écran Connexions offrirait un interrupteur à un outil et pas à
-- l'autre.
alter table public.sio_api_keys
  add column if not exists actif boolean not null default true,
  add column if not exists deconnecte_le timestamptz,
  add column if not exists alerte_deconnexion_le timestamptz;

-- Quel outil a reçu ce lead. NULL sur les lignes d'avant = Systeme.io
-- (c'était le seul).
alter table public.quiz_leads
  add column if not exists sync_fournisseur text;

notify pgrst, 'reload schema';
