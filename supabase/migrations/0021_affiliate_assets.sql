-- 0021_affiliate_assets.sql
-- Bibliothèque de visuels pour les affiliés de L'Atelier du Quiz : Béné
-- dépose depuis l'admin (logos, mockups, bannières), les affiliés les
-- récupèrent depuis leur espace Affiliation (onglet Contenus).
--
-- Écritures : admin uniquement, via l'API /api/admin/affiliate-assets
-- (service role, bypass RLS). Lectures : côté serveur (service role) puis
-- passées au client. Les fichiers vivent dans un bucket storage PUBLIC
-- (affichage direct par l'URL publique). RLS activée sans policy publique
-- (aucun accès client direct à la table, comme les autres tables affiliées).

create table if not exists affiliate_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  -- Catégorie libre pour regrouper (visuel, banniere, logo, mockup...).
  kind text not null default 'visuel',
  -- URL publique du fichier (getPublicUrl du bucket).
  url text not null,
  -- Chemin dans le bucket, conservé pour pouvoir supprimer le fichier.
  storage_path text,
  file_type text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_assets_sort_idx
  on affiliate_assets (sort_order asc, created_at desc);

alter table affiliate_assets enable row level security;

-- Bucket public dédié aux visuels affiliés (idempotent).
insert into storage.buckets (id, name, public)
values ('affiliate-assets', 'affiliate-assets', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
