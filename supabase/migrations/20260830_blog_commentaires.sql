-- 20260830_blog_commentaires.sql
--
-- LES COMMENTAIRES DU BLOG (Béné, 30 août 2026).
--
-- "y'a pas de proposition de partage de l'article, ni de commentaires :
-- dommage ça aide à ranker."
--
-- -- CE QUE LA TABLE GARANTIT ----------------------------------------
--
-- 1. RIEN N'EST PUBLIC PAR DÉFAUT. `statut` vaut 'en_attente' à
--    l'insertion, et la page ne lit que 'publie'. Un lien vendu publié
--    automatiquement sur le domaine de Béné coûterait plus cher que le
--    délai de modération.
-- 2. L'ADRESSE EMAIL NE SORT JAMAIS. Elle sert à répondre. Aucune
--    lecture publique ne la sélectionne (cf. lib/blog/commentairesStore.ts).
-- 3. AUCUNE POLITIQUE RLS EN LECTURE ANONYME. La table n'est jamais
--    interrogée depuis un navigateur : le serveur lit avec la clé de
--    service, au build. RLS reste activé pour que la clé anon ne puisse
--    RIEN, ni lire ni écrire, même si une route se trompait de client.

create table if not exists public.blog_commentaires (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  auteur text not null,
  message text not null,
  -- Facultative, jamais affichée, jamais renvoyée à un navigateur.
  email text,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'publie', 'refuse')),
  -- L'adresse est HACHÉE, jamais stockée en clair : elle sert à repérer
  -- un envoi en rafale, pas à identifier quelqu'un.
  ip_hash text,
  cree_le timestamptz not null default now(),
  modere_le timestamptz,
  modere_par text
);

-- La lecture publique est toujours "les commentaires publiés de CET
-- article, du plus ancien au plus récent" : une conversation se lit dans
-- l'ordre où elle s'est tenue.
create index if not exists blog_commentaires_slug_idx
  on public.blog_commentaires (slug, statut, cree_le);

-- La file de modération est "ce qui attend, le plus ancien d'abord".
-- Trier du plus récent enterrerait ceux qu'on a déjà fait attendre
-- (même règle que la file du support).
create index if not exists blog_commentaires_attente_idx
  on public.blog_commentaires (statut, cree_le);

alter table public.blog_commentaires enable row level security;

-- Aucune policy : personne ne passe par la clé anon. Le serveur utilise
-- la clé de service, qui contourne RLS par construction. Écrire une
-- policy "permissive en lecture" ouvrirait les adresses email à qui
-- interrogerait la table depuis un navigateur.

notify pgrst, 'reload schema';
