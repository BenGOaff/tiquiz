-- ════════════════════════════════════════════════════════════════
-- FORMAQUIZ - verification : tout le SQL est-il applique ?
-- ════════════════════════════════════════════════════════════════
-- Colle CE bloc dans Studio FormaQuiz -> SQL Editor -> Run.
-- Chaque ligne doit afficher ok = true. Si une ligne est false, la
-- migration correspondante n'est pas passee : applique-la.

select * from (
  -- 0001 (socle)
  select 1 as ordre, '0001 table days'            as verif, (select count(*) from information_schema.tables  where table_schema='public' and table_name='days')=1 as ok
  union all select 1, '0001 table badges',          (select count(*) from information_schema.tables  where table_schema='public' and table_name='badges')=1
  union all select 1, '0001 table enrollments',     (select count(*) from information_schema.tables  where table_schema='public' and table_name='enrollments')=1
  union all select 1, '0001 table webhook_logs',    (select count(*) from information_schema.tables  where table_schema='public' and table_name='webhook_logs')=1
  -- 0002 (coach)
  union all select 2, '0002 table coach_knowledge', (select count(*) from information_schema.tables  where table_schema='public' and table_name='coach_knowledge')=1
  union all select 2, '0002 table coach_settings',  (select count(*) from information_schema.tables  where table_schema='public' and table_name='coach_settings')=1
  -- 0003
  union all select 3, '0003 profiles.diagnostic_completed_at', (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='diagnostic_completed_at')=1
  -- 0004
  union all select 4, '0004 days.is_bonus',         (select count(*) from information_schema.columns where table_schema='public' and table_name='days' and column_name='is_bonus')=1
  -- 0005
  union all select 5, '0005 table tiquiz_connections', (select count(*) from information_schema.tables where table_schema='public' and table_name='tiquiz_connections')=1
  -- 0006
  union all select 6, '0006 profiles.avatar_url',   (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url')=1
  union all select 6, '0006 profiles.tiquiz_autolink_optout', (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='tiquiz_autolink_optout')=1
  union all select 6, '0006 tiquiz_connections.tiquiz_email', (select count(*) from information_schema.columns where table_schema='public' and table_name='tiquiz_connections' and column_name='tiquiz_email')=1
  union all select 6, '0006 bucket avatars',        (select count(*) from storage.buckets where id='avatars')=1
  -- 0007
  union all select 7, '0007 profiles.activity_type',(select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='activity_type')=1
  union all select 7, '0007 profiles.maturity',     (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='maturity')=1
  union all select 7, '0007 profiles.monetization', (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='monetization')=1
  union all select 7, '0007 profiles.ads_budget',   (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='ads_budget')=1
  -- 0008
  union all select 8, '0008 table persona_vocab',   (select count(*) from information_schema.tables where table_schema='public' and table_name='persona_vocab')=1
  union all select 8, '0008 table day_persona_examples', (select count(*) from information_schema.tables where table_schema='public' and table_name='day_persona_examples')=1
  -- 0009
  union all select 9, '0009 days.pepite_html',      (select count(*) from information_schema.columns where table_schema='public' and table_name='days' and column_name='pepite_html')=1
) t
order by ordre, verif;
