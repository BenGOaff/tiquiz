-- 20260524_custom_domain_favicon.sql
--
-- Per-domain favicon (Béné, 24 mai 2026).
--
-- Replaces profiles.brand_favicon_url as the source of truth for the
-- favicon displayed in the browser tab on public routes. Rationale:
-- a single user can connect N custom domains (one per project / brand)
-- and each domain needs its own favicon. profiles.brand_favicon_url is
-- kept for backward-compat reads during the transition but the UI no
-- longer writes to it.
--
-- Backfill: copy the existing profile favicon onto the user's first
-- verified domain (best-effort — only when the row hasn't been set
-- per-domain yet). After this migration, the favicon UI lives inside
-- the CustomDomainCard, so this restores the user's last upload for
-- exactly one of their domains (most users only have 1).

alter table public.custom_domains
  add column if not exists favicon_url text;

update public.custom_domains cd
set favicon_url = p.brand_favicon_url
from public.profiles p
where cd.user_id = p.user_id
  and cd.favicon_url is null
  and p.brand_favicon_url is not null
  and cd.status = 'verified'
  and cd.id = (
    select id from public.custom_domains
    where user_id = cd.user_id and status = 'verified'
    order by verified_at asc nulls last, created_at asc
    limit 1
  );

notify pgrst, 'reload schema';
