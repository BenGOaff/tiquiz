-- ═══════════════════════════════════════════
-- TIQUIZ — RPCs d'agrégation pour les surfaces stats restantes
-- ═══════════════════════════════════════════
--
-- Audit fiabilité 29 juin 2026 : plusieurs surfaces comptaient encore en
-- tirant les lignes (plafonnées à 1000 / 5000). On agrège en SQL.
--   - survey_answer_totals     : totaux par (question, option) d'un sondage
--   - survey_response_count    : nb de répondants (leads avec answers array)
--   - wall_top_quiz_completes  : top quiz par complétions sur une fenêtre
-- (Les comptages leads/quiz du dashboard et des métriques partenaire
--  réutilisent stats_leads_counts, déjà créée en 20260629b.)

-- Totaux des réponses de sondage par (question_index, option_index).
-- Reproduit EXACTEMENT la logique JS d'aggregate-responses :
--   - multi-select (option_indices[]) : +1 par option cochée
--   - single (option_index scalaire)  : +1, SEULEMENT si pas de tableau
-- answers = JSONB array de { question_index, option_index?, option_indices? }.
CREATE OR REPLACE FUNCTION survey_answer_totals(p_quiz_id UUID)
RETURNS TABLE(question_index INT, option_index INT, n BIGINT)
LANGUAGE sql
STABLE
AS $$
  WITH ans AS (
    SELECT jsonb_array_elements(answers) AS a
    FROM quiz_leads
    WHERE quiz_id = p_quiz_id AND jsonb_typeof(answers) = 'array'
  ),
  multi AS (
    SELECT (a->>'question_index')::int AS qi, oi.val::int AS oi
    FROM ans
    CROSS JOIN LATERAL jsonb_array_elements_text(a->'option_indices') AS oi(val)
    WHERE jsonb_typeof(a->'option_indices') = 'array'
      AND (a->>'question_index') ~ '^-?\d+$'
      AND oi.val ~ '^-?\d+$'
  ),
  single AS (
    SELECT (a->>'question_index')::int AS qi, (a->>'option_index')::int AS oi
    FROM ans
    WHERE jsonb_typeof(a->'option_indices') IS DISTINCT FROM 'array'
      AND (a->>'question_index') ~ '^-?\d+$'
      AND (a->>'option_index') ~ '^-?\d+$'
  )
  SELECT qi AS question_index, oi AS option_index, count(*)::bigint AS n
  FROM (SELECT qi, oi FROM multi UNION ALL SELECT qi, oi FROM single) u
  GROUP BY qi, oi;
$$;

-- Nombre de répondants = leads dont answers est un tableau JSON.
CREATE OR REPLACE FUNCTION survey_response_count(p_quiz_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::bigint
  FROM quiz_leads
  WHERE quiz_id = p_quiz_id AND jsonb_typeof(answers) = 'array';
$$;

-- Top quiz par complétions sur [p_since, p_until) depuis business_events.
-- Renvoie une seule ligne (le quiz gagnant) + son titre snapshot le plus
-- récent disponible dans le payload (le code Node garde le fallback vers
-- quizzes.title si le snapshot est vide).
CREATE OR REPLACE FUNCTION wall_top_quiz_completes(
  p_user_id UUID,
  p_since TIMESTAMPTZ,
  p_until TIMESTAMPTZ
)
RETURNS TABLE(quiz_id TEXT, completes BIGINT, quiz_title TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    payload->>'quizId' AS quiz_id,
    count(*)::bigint AS completes,
    (array_agg(payload->>'quizTitle')
       FILTER (WHERE COALESCE(payload->>'quizTitle', '') <> ''))[1] AS quiz_title
  FROM business_events
  WHERE user_id = p_user_id
    AND kind = 'quiz_complete'
    AND occurred_at >= p_since
    AND occurred_at < p_until
    AND COALESCE(payload->>'quizId', '') <> ''
  GROUP BY payload->>'quizId'
  ORDER BY completes DESC
  LIMIT 1;
$$;

-- Récap leads par quiz : count + date du dernier lead. Sert au dashboard
-- (compteur leads/quiz + insight "X jours sans nouvelle réponse") en UN
-- appel, au lieu d'un fetch /api/quiz/[id] par quiz (N+1) qui plafonnait
-- en plus les leads à 1000.
CREATE OR REPLACE FUNCTION quiz_leads_summary(p_quiz_ids UUID[])
RETURNS TABLE(quiz_id UUID, n BIGINT, last_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
AS $$
  SELECT quiz_id, count(*)::bigint AS n, max(created_at) AS last_at
  FROM quiz_leads
  WHERE quiz_id = ANY(p_quiz_ids)
  GROUP BY quiz_id;
$$;

NOTIFY pgrst, 'reload schema';
