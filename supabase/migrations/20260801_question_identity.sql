-- 20260801_question_identity.sql
--
-- Identité stable des questions dans les statistiques.
--
-- Le problème (retour Adeline, 1er août 2026) : les événements de
-- tracking ne connaissent la question que par sa POSITION
-- (`question_index`). Supprimer ou insérer une question au milieu
-- décale toutes les positions suivantes, et l'historique se retrouve
-- attribué à la mauvaise question. Le pansement précédent (recaler sur
-- le nombre de questions actuel) supprimait la question fantôme mais ne
-- pouvait pas réaligner quoi que ce soit.
--
-- La vraie correction tient en trois pièces :
--   1. `quiz_questions.id` devient DURABLE : la sauvegarde d'un quiz
--      conserve l'identifiant de chaque question au lieu de tout
--      supprimer puis réinsérer (cf. PATCH /api/quiz/[quizId]).
--   2. Les événements portent `question_id` en plus de l'index.
--   3. Les agrégats traduisent `question_id` en position ACTUELLE, et
--      ne retombent sur l'index que pour l'historique antérieur.
--
-- Compatibilité : `question_id` est nullable. Les millions de lignes
-- déjà écrites continuent d'être lues par leur index, exactement comme
-- avant. Aucune donnée n'est réécrite ni perdue.

alter table public.quiz_question_events
  add column if not exists question_id uuid;

create index if not exists idx_qqe_quiz_question_id
  on public.quiz_question_events (quiz_id, question_id);

-- ── Funnel d'un quiz ───────────────────────────────────────────────
-- Renvoie, par position ACTUELLE : views (sessions ayant atteint la
-- question, monotone) et answers (sessions distinctes ayant répondu).
--
-- Ligne spéciale `question_index = -1` : nombre de questions distinctes
-- présentes dans l'historique mais absentes du quiz d'aujourd'hui.
-- L'interface s'en sert pour dire honnêtement "1 question a été
-- supprimée depuis", au lieu de faire disparaître des chiffres sans
-- explication.
create or replace function quiz_question_funnel_detail(
  p_quiz_id uuid,
  p_since timestamptz default null
)
returns table(question_index int, views bigint, answers bigint)
language sql
stable
as $$
  with live as (
    select id, (row_number() over (order by sort_order, id) - 1)::int as pos
    from quiz_questions
    where quiz_id = p_quiz_id
  ),
  live_count as (select count(*)::int as cnt from live),
  raw as (
    select
      e.question_id,
      e.question_index,
      e.session_id,
      e.event,
      case
        -- Événement récent : on suit l'identité, donc les réordonnancements.
        when e.question_id is not null then l.pos
        -- Événement historique : la position vaut ce qu'elle vaut, on la
        -- garde tant qu'elle désigne une question qui existe encore.
        when e.question_index < (select cnt from live_count) then e.question_index
        else null
      end as pos
    from quiz_question_events e
    left join live l on l.id = e.question_id
    where e.quiz_id = p_quiz_id
      and e.event in ('view', 'answer')
      and (p_since is null or e.created_at >= p_since)
  ),
  evs as (select * from raw where pos is not null),
  session_max as (
    select session_id, max(pos) as max_q
    from evs where event = 'view' group by session_id
  ),
  maxdist as (
    select max_q, count(*) as c from session_max group by max_q
  ),
  ans as (
    select pos, count(distinct session_id) as a
    from evs where event = 'answer' group by pos
  ),
  qs as (select distinct pos from evs),
  removed as (
    select count(distinct coalesce(question_id::text, 'idx:' || question_index))::bigint as n
    from raw where pos is null
  )
  select
    qs.pos as question_index,
    coalesce((select sum(c) from maxdist m where m.max_q >= qs.pos), 0)::bigint as views,
    coalesce((select a from ans where ans.pos = qs.pos), 0)::bigint as answers
  from qs
  union all
  select -1, (select n from removed), 0::bigint
  where (select n from removed) > 0
  order by 1;
$$;

-- ── Funnel multi-quiz (page Statistiques) ──────────────────────────
-- Même logique, groupée par quiz. Même ligne spéciale -1 par quiz.
create or replace function stats_question_funnel(
  p_quiz_ids uuid[],
  p_since timestamptz default null
)
returns table(quiz_id uuid, question_index int, views bigint)
language sql
stable
as $$
  with live as (
    select quiz_id, id,
           (row_number() over (partition by quiz_id order by sort_order, id) - 1)::int as pos
    from quiz_questions
    where quiz_id = any(p_quiz_ids)
  ),
  live_count as (select quiz_id, count(*)::int as cnt from live group by quiz_id),
  raw as (
    select
      e.quiz_id,
      e.question_id,
      e.question_index,
      e.session_id,
      case
        when e.question_id is not null then l.pos
        when e.question_index < coalesce(c.cnt, 0) then e.question_index
        else null
      end as pos
    from quiz_question_events e
    left join live l on l.id = e.question_id
    left join live_count c on c.quiz_id = e.quiz_id
    where e.quiz_id = any(p_quiz_ids)
      and e.event = 'view'
      and (p_since is null or e.created_at >= p_since)
  ),
  evs as (select * from raw where pos is not null),
  session_max as (
    select quiz_id, session_id, max(pos) as max_q
    from evs group by quiz_id, session_id
  ),
  maxdist as (
    select quiz_id, max_q, count(*) as c from session_max group by quiz_id, max_q
  ),
  qs as (select distinct quiz_id, pos from evs),
  removed as (
    select quiz_id,
           count(distinct coalesce(question_id::text, 'idx:' || question_index))::bigint as n
    from raw where pos is null group by quiz_id
  )
  select
    qs.quiz_id,
    qs.pos as question_index,
    coalesce((select sum(c) from maxdist m
      where m.quiz_id = qs.quiz_id and m.max_q >= qs.pos), 0)::bigint as views
  from qs
  union all
  select r.quiz_id, -1, r.n from removed r where r.n > 0
  order by 1, 2;
$$;

-- ── Totaux des réponses de sondage ─────────────────────────────────
-- Même correction côté réponses des leads : `quiz_leads.answers[]` porte
-- désormais `question_id`. Sans cette traduction, l'encart "comparé aux
-- autres participants" ré-attribuait les réponses postérieures à une
-- suppression au milieu à la mauvaise question.
--
-- Les réponses écrites avant ce chantier n'ont que `question_index` : on
-- les garde telles quelles tant que l'index désigne une question vivante.
create or replace function survey_answer_totals(p_quiz_id uuid)
returns table(question_index int, option_index int, n bigint)
language sql
stable
as $$
  with live as (
    select id, (row_number() over (order by sort_order, id) - 1)::int as pos
    from quiz_questions
    where quiz_id = p_quiz_id
  ),
  live_count as (select count(*)::int as cnt from live),
  ans as (
    select jsonb_array_elements(answers) as a
    from quiz_leads
    where quiz_id = p_quiz_id and jsonb_typeof(answers) = 'array'
  ),
  resolved as (
    select
      a,
      case
        -- Réponse récente : l'id fait foi, il suit les déplacements.
        when a->>'question_id' is not null then (
          select l.pos from live l where l.id::text = a->>'question_id'
        )
        -- Réponse historique : l'index vaut tant qu'il vise une question
        -- vivante (et tant qu'on connaît la structure).
        when (a->>'question_index') ~ '^-?\d+$'
             and (
               (select cnt from live_count) = 0
               or (a->>'question_index')::int < (select cnt from live_count)
             )
             and (a->>'question_index')::int >= 0
          then (a->>'question_index')::int
        else null
      end as qi
    from ans
  ),
  multi as (
    select r.qi, oi.val::int as oi
    from resolved r
    cross join lateral jsonb_array_elements_text(r.a->'option_indices') as oi(val)
    where r.qi is not null
      and jsonb_typeof(r.a->'option_indices') = 'array'
      and oi.val ~ '^-?\d+$'
  ),
  single as (
    select r.qi, (r.a->>'option_index')::int as oi
    from resolved r
    where r.qi is not null
      and jsonb_typeof(r.a->'option_indices') is distinct from 'array'
      and (r.a->>'option_index') ~ '^-?\d+$'
  )
  select qi as question_index, oi as option_index, count(*)::bigint as n
  from (select qi, oi from multi union all select qi, oi from single) u
  group by qi, oi;
$$;

notify pgrst, 'reload schema';
