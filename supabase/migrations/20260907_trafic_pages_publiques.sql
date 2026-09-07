-- 20260907_trafic_pages_publiques.sql
--
-- COMBIEN DE MONDE ARRIVE, ET COMBIEN ACHÈTE (Béné, 4 septembre 2026).
--
-- "1. begin_checkout au clic sur un palier ; 2. purchase sur la page de
-- remerciement ; 3. seulement après : un écran dans l'admin qui montre
-- les deux ensemble."
--
-- Les points 1 et 2 sont faits et déployés. Il manquait le
-- DÉNOMINATEUR : combien de personnes arrivent sur le site public. Ce
-- chiffre n'existait NULLE PART côté serveur (relevé le 7 septembre :
-- aucune table de ce dépôt ne porte du trafic, `quiz_events` compte les
-- quiz des créatrices, pas nos pages).
--
-- -- POURQUOI PAS GA4 -------------------------------------------------
--
-- GA4 est posé et il reçoit les conversions. Mais il ne compte QUE les
-- gens qui ont accepté le bandeau cookies, et pas ceux qui ont un
-- bloqueur. Son trafic est donc SOUS-compté, alors que nos ventes sont
-- exactes : diviser l'un par l'autre donnerait un taux de conversion
-- trop beau, affiché comme un fait. "Un chiffre gonflé dans un tableau
-- de bord est pire qu'une absence de chiffre" (22 août).
--
-- -- AUCUNE DONNÉE PERSONNELLE, ET C'EST LA CONDITION -----------------
--
-- Ni IP, ni cookie, ni identifiant, ni empreinte. On incrémente un
-- compteur par (jour, hôte, chemin, source). Rien ici ne désigne une
-- personne, donc rien n'y demande de consentement, donc le compteur
-- voit AUSSI ceux qui refusent le bandeau. C'est ça qui le rend plus
-- juste que GA4, et c'est le choix, pas un effet de bord.
--
-- Corollaire assumé : sans cookie, on ne distingue pas une personne
-- d'une page. On compte des VUES DE PAGE, et l'écran écrit "vues",
-- jamais "visiteurs".
--
-- -- POURQUOI UNE FONCTION ET PAS UN UPSERT DEPUIS L'APP --------------
--
-- Deux vues simultanées sur la même ligne, lues puis réécrites par
-- l'app, en perdraient une. `compter_vue_trafic` fait l'incrément DANS
-- Postgres, en une instruction : c'est atomique par construction, et le
-- compteur ne peut pas dériver vers le bas sans que rien ne le dise.

create table if not exists public.trafic_jour (
  jour   date    not null,
  hote   text    not null,
  chemin text    not null,
  source text    not null,
  vues   integer not null default 0,
  primary key (jour, hote, chemin, source)
);

-- L'écran lit toujours "les N derniers jours", jamais un chemin précis.
create index if not exists trafic_jour_jour_idx on public.trafic_jour (jour desc);

create or replace function public.compter_vue_trafic(
  p_jour   date,
  p_hote   text,
  p_chemin text,
  p_source text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.trafic_jour (jour, hote, chemin, source, vues)
  values (p_jour, p_hote, p_chemin, p_source, 1)
  on conflict (jour, hote, chemin, source)
  do update set vues = public.trafic_jour.vues + 1;
$$;

-- PERSONNE NE LIT CETTE TABLE DEPUIS UN NAVIGATEUR.
--
-- RLS active sans aucune politique : tout accès par la clé anon est
-- refusé. Seule la clé de service (le serveur) écrit et lit, et le seul
-- écran qui l'affiche est le centre de pilotage, derrière son compte
-- admin. Ce ne sont pas des données sensibles, mais le trafic d'un site
-- est une information commerciale : elle n'a rien à faire dans une
-- réponse publique.
alter table public.trafic_jour enable row level security;

-- La fonction est appelée par le serveur avec la clé de service. On ne
-- l'ouvre PAS à `anon` : sinon n'importe qui pourrait gonfler les
-- compteurs depuis un navigateur, et un tableau de bord qu'on peut
-- remplir de l'extérieur ne vaut rien.
revoke all on function public.compter_vue_trafic(date, text, text, text) from public;
revoke all on function public.compter_vue_trafic(date, text, text, text) from anon;

notify pgrst, 'reload schema';
