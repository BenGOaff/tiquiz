-- 008_storage_public_assets.sql
-- Creates the "public-assets" bucket used by /settings logo upload
-- (components/settings/SettingsClient.tsx::handleLogoUpload) and the quiz editor.
-- Bucket is public-read (so <img src={getPublicUrl(...)}> works without auth) and
-- authenticated users can upload/replace ONLY files under their own user-id prefix.

-- 1) Create the bucket as public (or flip it public if it already existed as private).
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = true;

-- 2) Row-level security policies on storage.objects.
-- We scope writes to the path prefix "logos/<auth.uid>/" so every user can only
-- manage their own files.

-- Anyone (including anonymous visitors of public quiz pages) can read the logos.
drop policy if exists "public-assets: public read" on storage.objects;
create policy "public-assets: public read"
  on storage.objects for select
  using (bucket_id = 'public-assets');

-- Authenticated user can insert only under logos/<their-uid>/
drop policy if exists "public-assets: user upload own logo" on storage.objects;
create policy "public-assets: user upload own logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Same rule for updates (upsert: true path)
drop policy if exists "public-assets: user update own logo" on storage.objects;
create policy "public-assets: user update own logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- And for deletions
drop policy if exists "public-assets: user delete own logo" on storage.objects;
create policy "public-assets: user delete own logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
