-- 014_storage_any_user_folder.sql
-- Generalize storage RLS on public-assets: allow uploads to ANY first-level
-- folder (logos, bonus, covers, …) as long as the second folder equals the
-- auth.uid(). Before this migration the policy only allowed `logos/<uid>/...`,
-- so the quiz bonus image upload (`bonus/<uid>/<quiz>-<ts>.ext`) failed with
-- "new row violates row-level security policy".
--
-- Security invariant preserved: auth.uid() is always the second path segment,
-- so a user can still only upload/update/delete files they own. The bucket
-- stays public-read (public-assets).

drop policy if exists "public-assets: user upload own logo" on storage.objects;
drop policy if exists "public-assets: user update own logo" on storage.objects;
drop policy if exists "public-assets: user delete own logo" on storage.objects;

create policy "public-assets: user upload own file"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "public-assets: user update own file"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "public-assets: user delete own file"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
