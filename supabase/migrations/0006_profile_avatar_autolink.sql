-- 0006_profile_avatar_autolink.sql
-- Avatar / photo de profil + opt-out d'auto-connexion Tiquiz.

alter table profiles
  add column if not exists avatar_url text,
  -- Quand l'eleve deconnecte manuellement son Tiquiz, on ne le
  -- reconnecte plus automatiquement par email (cas "mauvais compte").
  add column if not exists tiquiz_autolink_optout boolean not null default false;

-- Email du compte Tiquiz connecte, pour que l'eleve repere un mauvais compte.
alter table tiquiz_connections
  add column if not exists tiquiz_email text;

-- Bucket de stockage des avatars (lecture publique, ecriture par le
-- proprietaire sur son propre dossier <uid>/...).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
