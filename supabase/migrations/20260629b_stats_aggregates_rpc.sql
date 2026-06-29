-- ═══════════════════════════════════════════
-- TIQUIZ — RPCs d'agrégation pour /api/stats (dashboard global)
-- ═══════════════════════════════════════════
--
-- Pourquoi : /api/stats récupérait jusqu'ici les events et les leads
-- LIGNE PAR LIGNE puis agrégeait côté Node. Or PostgREST plafonne par
-- défaut à 1000 lignes : au-delà de 1000 events (ou 1000 leads) dans la
-- fenêtre, les totaux période, le graphe quotidien et le détail par quiz
-- étaient SILENCIEUSEMENT sous-comptés. Pour un SaaS premium avec des
-- quiz qui peuvent devenir viraux, c'est inacceptable.
--
-- On déplace donc TOUTE l'agrégation dans Postgres (GROUP BY), qui
-- renvoie une poignée de lignes quel que soit le volume (1k, 1M, 10M).
-- Aucun plafond. Les compteurs lifetime (quizzes.*_count) restent la
-- source des totaux "à vie" et ne sont pas touchés ici.
--
-- Bucketing jour-local : identique à lib/dateKeys.ts dateKeyForOffset.
-- (created_at - p_tz_offset minutes) AT TIME ZONE 'UTC' puis ::date.
-- p_tz_offset suit la convention JS getTimezoneOffset (positif = derrière
-- UTC). Exclusion backfill : session_id NOT LIKE 'backfill_%' (identique
-- au filtre PostgREST .not('session_id','like','backfill_%') d'origine,
-- les session_id NULL étant exclus comme avant).

-- A) Events par jour LOCAL et par type (fenêtre [p_since, +inf)).
CREATE OR REPLACE FUNCTION stats_events_daily(
  p_quiz_ids UUID[],
  p_tz_offset INT DEFAULT 0,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(day DATE, event_type TEXT, n BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ((created_at - make_interval(mins => p_tz_offset)) AT TIME ZONE 'UTC')::date AS day,
    event_type,
    count(*)::bigint AS n
  FROM quiz_events
  WHERE quiz_id = ANY(p_quiz_ids)
    AND event_type IN ('view', 'start', 'complete', 'share')
    AND session_id NOT LIKE 'backfill_%'
    AND (p_since IS NULL OR created_at >= p_since)
  GROUP BY 1, 2;
$$;

-- B) Leads par jour LOCAL (fenêtre [p_since, +inf)).
CREATE OR REPLACE FUNCTION stats_leads_daily(
  p_quiz_ids UUID[],
  p_tz_offset INT DEFAULT 0,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(day DATE, n BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ((created_at - make_interval(mins => p_tz_offset)) AT TIME ZONE 'UTC')::date AS day,
    count(*)::bigint AS n
  FROM quiz_leads
  WHERE quiz_id = ANY(p_quiz_ids)
    AND (p_since IS NULL OR created_at >= p_since)
  GROUP BY 1;
$$;

-- C) Events comptés par quiz et par type sur [p_since, p_until).
--    Sommé côté Node = totaux période globaux ; lu tel quel = détail
--    par quiz. p_since/p_until NULL = pas de borne de ce côté.
CREATE OR REPLACE FUNCTION stats_events_counts(
  p_quiz_ids UUID[],
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(quiz_id UUID, event_type TEXT, n BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT quiz_id, event_type, count(*)::bigint AS n
  FROM quiz_events
  WHERE quiz_id = ANY(p_quiz_ids)
    AND event_type IN ('view', 'start', 'complete', 'share')
    AND session_id NOT LIKE 'backfill_%'
    AND (p_since IS NULL OR created_at >= p_since)
    AND (p_until IS NULL OR created_at < p_until)
  GROUP BY 1, 2;
$$;

-- D) Leads comptés par quiz sur [p_since, p_until). Fenêtre courante,
--    précédente (deltas), ou NULL/NULL = leads lifetime par quiz.
CREATE OR REPLACE FUNCTION stats_leads_counts(
  p_quiz_ids UUID[],
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(quiz_id UUID, n BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT quiz_id, count(*)::bigint AS n
  FROM quiz_leads
  WHERE quiz_id = ANY(p_quiz_ids)
    AND (p_since IS NULL OR created_at >= p_since)
    AND (p_until IS NULL OR created_at < p_until)
  GROUP BY 1;
$$;

-- E) Funnel par question, monotone (sessions distinctes ayant ATTEINT
--    chaque question). Pour chaque session on prend l'index max atteint,
--    puis views(N) = nb de sessions dont max_q >= N. Reproduit exactement
--    la logique JS précédente, mais sans plafond de 100000 lignes.
CREATE OR REPLACE FUNCTION stats_question_funnel(
  p_quiz_ids UUID[],
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(quiz_id UUID, question_index INT, views BIGINT)
LANGUAGE sql
STABLE
AS $$
  WITH evs AS (
    SELECT quiz_id, question_index, session_id
    FROM quiz_question_events
    WHERE quiz_id = ANY(p_quiz_ids)
      AND event = 'view'
      AND (p_since IS NULL OR created_at >= p_since)
  ),
  session_max AS (
    SELECT quiz_id, session_id, max(question_index) AS max_q
    FROM evs
    GROUP BY quiz_id, session_id
  ),
  -- Sessions par (quiz, max_q) — au plus ~200 lignes par quiz : évite de
  -- rescanner les events pour chaque question (views = SUM des sessions
  -- dont max_q >= N).
  maxdist AS (
    SELECT quiz_id, max_q, count(*) AS c FROM session_max GROUP BY quiz_id, max_q
  ),
  qs AS (
    SELECT DISTINCT quiz_id, question_index FROM evs
  )
  SELECT
    qs.quiz_id,
    qs.question_index,
    COALESCE((SELECT sum(c) FROM maxdist m
       WHERE m.quiz_id = qs.quiz_id AND m.max_q >= qs.question_index), 0)::bigint AS views
  FROM qs
  ORDER BY qs.quiz_id, qs.question_index;
$$;

NOTIFY pgrst, 'reload schema';
