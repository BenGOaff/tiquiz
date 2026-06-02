// GET /api/quiz/[quizId]/analytics?period=7|30|90|all
//
// Aggregates the metrics for a quiz the caller owns. Read-only — all
// counters live on the quizzes table (views_count, completions_count)
// or are derived from the leads table on the fly. No new tables, no
// migration : we leverage what's already wired by the public quiz
// endpoint and the lead capture flow.
//
// Drop-off per question isn't computable yet (needs a quiz_session
// events table). Tracked as a follow-up.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { dateKeyForOffset, parseTzOffset } from "@/lib/dateKeys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PeriodKey = "7" | "30" | "90" | "all";

function parsePeriod(raw: string | null): { key: PeriodKey; sinceISO: string | null } {
  const k = (raw ?? "30").toLowerCase();
  if (k === "7" || k === "30" || k === "90") {
    const days = Number(k);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return { key: k as PeriodKey, sinceISO: d.toISOString() };
  }
  return { key: "all", sinceISO: null };
}

interface LeadRow {
  created_at: string;
  result_title: string | null;
  sio_synced: boolean | null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const reqUrl = new URL(req.url);
  const period = parsePeriod(reqUrl.searchParams.get("period"));
  // Fuseau du client pour bucketiser le graphe sur son jour local.
  const tzOffset = parseTzOffset(reqUrl.searchParams.get("tz"));

  // Ownership + base counters in one shot
  const { data: quiz, error: quizErr } = await supabase
    .from("quizzes")
    .select("id, title, views_count, completions_count, created_at")
    .eq("id", quizId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (quizErr || !quiz) {
    return NextResponse.json(
      { ok: false, error: "Quiz introuvable" },
      { status: 404 },
    );
  }

  // Pull all leads for this quiz. SOURCE = `quiz_leads` (avec quiz_id
  // direct), pas la table `leads` qui a un schéma différent (source,
  // source_id, user_id) et qui n'est JAMAIS populée pour les quizzes
  // — donc la page analytics affichait tout à zéro (Gwenn 19 mai 2026).
  //
  // Period filter : on garde le filtre sur created_at pour la
  // time-series + pour la distribution par résultat (afin qu'elles
  // soient cohérentes avec le sélecteur de période). Les KPI lifetime
  // (viewsCount, completionsCount) restent sur les compteurs quizzes
  // car ils sont auto-bumpés par trigger et incluent l'historique
  // pré-migration tracking.
  let leadsQuery = supabase
    .from("quiz_leads")
    .select("created_at, result_title, sio_synced")
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: true })
    .limit(5000);
  if (period.sinceISO) leadsQuery = leadsQuery.gte("created_at", period.sinceISO);

  const { data: leadsRaw, error: leadsErr } = await leadsQuery;
  if (leadsErr) {
    return NextResponse.json(
      { ok: false, error: leadsErr.message },
      { status: 400 },
    );
  }

  const leads = (leadsRaw ?? []) as LeadRow[];
  const leadsCount = leads.length;
  const exportedSio = leads.filter((l) => l.sio_synced === true).length;

  // ── Vues + complétions : recompte DIRECT depuis quiz_events ──
  //
  // BUG GWENN 2 juin 2026 : son quiz affichait 270 leads pour 34 vues =
  // 794% de taux de capture, mathématiquement impossible. Cause : on
  // lisait `quiz.views_count` (compteur dénormalisé bumpé par trigger
  // sur quiz_events), qui avait DRIFT chez elle — soit reset par
  // accident, soit trigger qui a raté des events. Le compteur peut
  // diverger silencieusement de la table source.
  //
  // FIX : on recompte TOUJOURS depuis quiz_events qui est la source de
  // vérité. Légèrement plus cher (1 query head:true par KPI) mais
  // garantit que viewsCount >= leadsCount (= mathématiquement valide).
  //
  // INCLUT les events backfillés (session_id LIKE 'backfill_%') :
  // l'utilisateur attend "depuis le début" = lifetime complet, donc
  // on garde l'historique pré-refonte tracking (19 mai 2026).
  const [viewsCountRes, completionsCountRes] = await Promise.all([
    supabaseAdmin
      .from("quiz_events")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("event_type", "view"),
    supabaseAdmin
      .from("quiz_events")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("event_type", "complete"),
  ]);
  // Fallback sur le compteur dénormalisé si la query échoue (résilience).
  const viewsCount = viewsCountRes.error
    ? quiz.views_count ?? 0
    : viewsCountRes.count ?? 0;
  const completionsCount = completionsCountRes.error
    ? quiz.completions_count ?? 0
    : completionsCountRes.count ?? 0;
  // Garde-fou : si on a plus de leads que de vues (ex. quiz historique
  // avec vues server-side non backfillées), viewsCount = max(leads).
  // Évite les ratios > 100% qui n'ont aucun sens.
  const viewsCountSafe = Math.max(viewsCount, leadsCount);

  // Aggregate per result title — strip empty titles into a single
  // "Sans résultat" bucket so the pie chart isn't full of "(null)".
  const byResult = new Map<string, number>();
  for (const l of leads) {
    const key = (l.result_title ?? "").trim() || "Sans résultat";
    byResult.set(key, (byResult.get(key) ?? 0) + 1);
  }
  const resultDistribution = Array.from(byResult.entries())
    .map(([title, count]) => ({
      title,
      count,
      pct: leadsCount > 0 ? Math.round((count / leadsCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Daily series. Bucketing en jour LOCAL du créateur (tzOffset) — clés
  // ET leads — pour que "aujourd'hui" ne soit jamais vide à cause d'un
  // décalage UTC (bug Adeline 24/05). Fill des jours manquants à 0.
  const dayMap = new Map<string, number>();
  for (const l of leads) {
    const k = dateKeyForOffset(new Date(l.created_at), tzOffset);
    dayMap.set(k, (dayMap.get(k) ?? 0) + 1);
  }
  const leadsByDay = (() => {
    if (leads.length === 0) return [];
    const start = period.sinceISO
      ? new Date(period.sinceISO)
      : new Date(leads[0]!.created_at);
    const out: { date: string; count: number }[] = [];
    const endKey = dateKeyForOffset(new Date(), tzOffset);
    // Itère en pas de 24h ; dateKeyForOffset donne le jour local.
    let t = start.getTime();
    let seen = "";
    // Garde-fou : +1 jour pour ne pas tronquer le dernier bucket local.
    const guard = Date.now() + 24 * 3600 * 1000;
    while (t <= guard) {
      const k = dateKeyForOffset(new Date(t), tzOffset);
      if (k !== seen) {
        out.push({ date: k, count: dayMap.get(k) ?? 0 });
        seen = k;
      }
      if (k === endKey) break;
      t += 24 * 3600 * 1000;
    }
    // Cap at 365 days for "all time" with very old quizzes — recharts
    // would still render but the x-axis would be unreadable.
    return out.slice(-365);
  })();

  // captureRate utilise viewsCountSafe (= max(views réelles, leads)) →
  // mathématiquement borné à 100%, plus jamais de 794%.
  const captureRate =
    viewsCountSafe > 0
      ? Math.round((leadsCount / viewsCountSafe) * 1000) / 10
      : 0;
  const exportRate =
    leadsCount > 0
      ? Math.round((exportedSio / leadsCount) * 1000) / 10
      : 0;

  // ── Funnel: drop-off per question ──
  // We count distinct sessions that VIEWED each question. Drop-off
  // between Q[n] and Q[n+1] = (views[n] - views[n+1]) / views[n].
  // The ratio is enough to flag the worst-performing question; we
  // expose absolute counts too so the UI can show "47% on Q3".
  let funnel: {
    questionIndex: number;
    views: number;
    answers: number;
    dropFromPrevious: number;
  }[] = [];
  let totalSessions = 0;
  try {
    // Ordre par created_at DESC (et NON par question_index) : si on plafonne
    // à 50000 lignes en triant par question_index croissant, ce sont les
    // questions de FIN qui sont tronquées en premier → le funnel s'arrête aux
    // 1res questions. En triant par récence, la troncature éventuelle retire
    // les events les plus vieux, uniformément sur toutes les questions.
    let qEventsQuery = supabaseAdmin
      .from("quiz_question_events")
      .select("question_index, session_id, event")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: false })
      .limit(50000);
    if (period.sinceISO) qEventsQuery = qEventsQuery.gte("created_at", period.sinceISO);

    const { data: qEvents } = await qEventsQuery;
    const rows = (qEvents ?? []) as {
      question_index: number;
      session_id: string;
      event: "view" | "answer";
    }[];

    // Per session : la question la PLUS LOIN atteinte (max index vu). Le
    // funnel se déduit ensuite par count(session.maxQ >= N). Garantit une
    // courbe monotone décroissante : un visiteur arrivé à Q5 a forcément
    // passé Q1-Q4, même si l'event d'une question intermédiaire a été
    // perdu (réseau) ou exclu par le filtre de période (session démarrée
    // hors fenêtre, qui continue dedans). Avant, on comptait directement
    // les sessions distinctes par question_index → Q3 pouvait afficher
    // 24 sessions là où Q1 en affichait 23 (cf. rapport Gwenn 27 mai 2026).
    const sessionMaxView = new Map<string, number>();
    const answersByQ = new Map<number, Set<string>>();
    const allQsSet = new Set<number>();
    for (const r of rows) {
      allQsSet.add(r.question_index);
      if (r.event === "answer") {
        let bucket = answersByQ.get(r.question_index);
        if (!bucket) {
          bucket = new Set();
          answersByQ.set(r.question_index, bucket);
        }
        bucket.add(r.session_id);
      } else {
        const prev = sessionMaxView.get(r.session_id);
        if (prev === undefined || r.question_index > prev) {
          sessionMaxView.set(r.session_id, r.question_index);
        }
      }
    }

    const allQs = Array.from(allQsSet).sort((a, b) => a - b);

    let prevViews = 0;
    for (const qIdx of allQs) {
      let v = 0;
      for (const maxQ of sessionMaxView.values()) {
        if (maxQ >= qIdx) v++;
      }
      const a = answersByQ.get(qIdx)?.size ?? 0;
      const drop =
        qIdx === allQs[0] || prevViews === 0
          ? 0
          : Math.round(((prevViews - v) / prevViews) * 1000) / 10;
      funnel.push({
        questionIndex: qIdx,
        views: v,
        answers: a,
        dropFromPrevious: Math.max(0, drop),
      });
      prevViews = v;
    }
    totalSessions = funnel[0]?.views ?? 0;
  } catch (e) {
    // Table might not exist yet on a fresh deploy — fail-open with
    // an empty funnel rather than 500 the whole analytics endpoint.
    console.warn("[quiz/analytics] funnel build failed:", e);
  }

  return NextResponse.json({
    ok: true,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      created_at: quiz.created_at,
    },
    period: period.key,
    metrics: {
      // viewsCount/completionsCount viennent de quiz_events (source de
      // vérité), pas de quiz.views_count qui peut drift (bug Gwenn).
      viewsCount: viewsCountSafe,
      completionsCount,
      leadsCount,
      exportedSioCount: exportedSio,
      captureRate,
      exportRate,
    },
    resultDistribution,
    leadsByDay,
    funnel,
    totalFunnelSessions: totalSessions,
  });
}
