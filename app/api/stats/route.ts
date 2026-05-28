// app/api/stats/route.ts
// Time-aware stats endpoint. Returns four bundles for a given date
// range:
//
//   1. eventsByDay   — daily counts of view / start / complete / share
//                      (from quiz_events table, only events that
//                      happened inside the range)
//   2. leadsByDay    — daily count of NEW leads in the range
//                      (from quiz_leads.created_at)
//   3. totals        — sums of the above for the range, plus the
//                      previous-period equivalents so the UI can show
//                      "+18 % vs. semaine dernière" style deltas
//   4. perQuiz       — the same metrics broken down per quiz
//
// Why a dedicated endpoint instead of fetching raw events on the
// client: the existing /api/leads pulls every lead row and the client
// would have to also hit /api/quiz × N — 5–10 round-trips on a
// dashboard load. Aggregating server-side keeps the UI snappy and the
// math single-source-of-truth.
//
// Backwards compatibility: quiz_events only fills up from the migration
// onward. Older quizzes still have lifetime counters on the quizzes
// table; the stats UI surfaces both — "this period" pulls from events,
// "lifetime" from counters — so creators don't lose visibility on
// pre-migration data.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { dateKeyForOffset, parseTzOffset } from "@/lib/dateKeys";

export const dynamic = "force-dynamic";

// "Cumulative" types are the four funnel events that have a column on
// quizzes (views_count, starts_count, etc.) — they go into the daily
// time-series + KPI tiles. "question_view" is per-question retention
// only and is handled separately further down.
type CumulativeEventType = "view" | "start" | "complete" | "share";
type EventType = CumulativeEventType | "question_view";
const EVENT_TYPES: CumulativeEventType[] = ["view", "start", "complete", "share"];

type EventRow = {
  quiz_id: string;
  event_type: EventType;
  created_at: string;
  meta?: { q?: number } | null;
};
type LeadRow = { quiz_id: string; created_at: string };

/** Day key (YYYY-MM-DD) dans le fuseau LOCAL du créateur (offset passé
 * par le client). Avant on slicait l'ISO en UTC → le dashboard et le
 * graphe du quiz pouvaient afficher des jours différents. Désormais
 * tout est bucketisé sur le même jour local. Cf. lib/dateKeys. */
function toDayKey(iso: string, tzOffset: number): string {
  return dateKeyForOffset(new Date(iso), tzOffset);
}

/** Range presets we accept on the query string. "all" = no lower bound. */
type Range = "7d" | "30d" | "90d" | "all";

function rangeToWindow(range: Range): { from: Date | null; durationDays: number | null } {
  if (range === "all") return { from: null, durationDays: null };
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from, durationDays: days };
}

/** Fill a Map<dayKey, count> with zeros for every LOCAL day (tzOffset)
 * in [start, end] so the resulting array has no gaps — important for
 * the line chart. Les clés sont en jour local du créateur, cohérent
 * avec toDayKey. */
function fillDailyZeros(start: Date, end: Date, tzOffset: number): Map<string, number> {
  const out = new Map<string, number>();
  // On itère jour par jour en pas de 24h à partir de `start`. Lire la
  // clé via dateKeyForOffset garantit le même découpage que le
  // bucketing des lignes.
  let t = start.getTime();
  const endT = end.getTime();
  // Marge d'un jour pour ne pas tronquer le dernier bucket local.
  const guard = endT + 24 * 3600 * 1000;
  let seen = "";
  while (t <= guard) {
    const key = dateKeyForOffset(new Date(t), tzOffset);
    if (key !== seen) { out.set(key, 0); seen = key; }
    if (key === dateKeyForOffset(new Date(endT), tzOffset)) break;
    t += 24 * 3600 * 1000;
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const rawRange = (url.searchParams.get("range") ?? "30d") as Range;
    const range: Range = (["7d", "30d", "90d", "all"] as Range[]).includes(rawRange) ? rawRange : "30d";
    // Fuseau du client (minutes, getTimezoneOffset) pour bucketiser les
    // time-series sur SON jour local. 0 = UTC si absent.
    const tzOffset = parseTzOffset(url.searchParams.get("tz"));
    const { from, durationDays } = rangeToWindow(range);

    // Previous-period window — same length, shifted back. Used for the
    // delta indicators on the KPI cards. "all" has no previous.
    const prevFrom = from && durationDays ? new Date(from) : null;
    if (prevFrom && durationDays) prevFrom.setUTCDate(prevFrom.getUTCDate() - durationDays);
    const prevTo = from ? new Date(from) : null;

    // Owned quizzes — bound the queries to the current user's projects.
    const { data: quizzes } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, status, mode, views_count, starts_count, completions_count, shares_count, created_at")
      .eq("user_id", user.id);

    const quizIds = (quizzes ?? []).map((q) => q.id as string);
    if (quizIds.length === 0) {
      return NextResponse.json({
        ok: true,
        range,
        eventsByDay: [],
        leadsByDay: [],
        totals: emptyTotals(),
        perQuiz: [],
        quizzes: [],
      });
    }

    // ── EVENTS in current window ────────────────────────────────────
    // Pull meta along — we need it to compute the per-question
    // drop-off funnel further down.
    //
    // EXCLUDE backfilled events from period queries : ils sont datés à
    // `quiz.created_at` (cf. migration backfill 19 mai 2026) et fausse-
    // raient les filtres "7 j" / "30 j" en y agglutinant des stats
    // historiques. Le total lifetime continue de les inclure via
    // quizzes.*_count.
    let eventsQ = supabaseAdmin
      .from("quiz_events")
      .select("quiz_id, event_type, created_at, meta")
      .in("quiz_id", quizIds)
      .not("session_id", "like", "backfill_%");
    if (from) eventsQ = eventsQ.gte("created_at", from.toISOString());
    const { data: rawEvents } = await eventsQ;
    const events = (rawEvents ?? []) as EventRow[];

    // ── EVENTS in previous window (for trend deltas) ────────────────
    let prevEvents: EventRow[] = [];
    if (prevFrom && prevTo) {
      const { data: prev } = await supabaseAdmin
        .from("quiz_events")
        .select("quiz_id, event_type, created_at")
        .in("quiz_id", quizIds)
        .not("session_id", "like", "backfill_%")
        .gte("created_at", prevFrom.toISOString())
        .lt("created_at", prevTo.toISOString());
      prevEvents = (prev ?? []) as EventRow[];
    }

    // ── LEADS in current window ─────────────────────────────────────
    let leadsQ = supabaseAdmin
      .from("quiz_leads")
      .select("quiz_id, created_at")
      .in("quiz_id", quizIds);
    if (from) leadsQ = leadsQ.gte("created_at", from.toISOString());
    const { data: rawLeads } = await leadsQ;
    const leads = (rawLeads ?? []) as LeadRow[];

    // ── LEADS lifetime (total, sans filtre période) — pour la
    // conversion lifetime cohérente avec les compteurs auto-bumpés
    // par le trigger quiz_events.
    const { count: leadsAll } = await supabaseAdmin
      .from("quiz_leads")
      .select("quiz_id", { count: "exact", head: true })
      .in("quiz_id", quizIds);

    // ── LEADS in previous window ────────────────────────────────────
    let prevLeads: LeadRow[] = [];
    if (prevFrom && prevTo) {
      const { data: prev } = await supabaseAdmin
        .from("quiz_leads")
        .select("quiz_id, created_at")
        .in("quiz_id", quizIds)
        .gte("created_at", prevFrom.toISOString())
        .lt("created_at", prevTo.toISOString());
      prevLeads = (prev ?? []) as LeadRow[];
    }

    // ── TIME-SERIES (events by day, leads by day) ───────────────────
    // Use the requested window when range !== "all". For "all", anchor
    // on the earliest event/lead so the chart spans real activity.
    const anchorStart = from ?? earliest([
      ...events.map((e) => new Date(e.created_at)),
      ...leads.map((l) => new Date(l.created_at)),
      new Date(),
    ]);
    // `today` = instant courant (PAS arrondi UTC) : fillDailyZeros en
    // dérive le jour LOCAL du client via dateKeyForOffset, donc le
    // dernier bucket est bien l'aujourd'hui du créateur (et pas
    // l'aujourd'hui UTC qui peut être en retard d'un jour le soir).
    const today = new Date();

    const eventBuckets: Record<CumulativeEventType, Map<string, number>> = {
      view: fillDailyZeros(anchorStart, today, tzOffset),
      start: fillDailyZeros(anchorStart, today, tzOffset),
      complete: fillDailyZeros(anchorStart, today, tzOffset),
      share: fillDailyZeros(anchorStart, today, tzOffset),
    };
    for (const e of events) {
      // Skip question_view here — it's not cumulative funnel data,
      // it's per-question retention handled separately below.
      if (e.event_type === "question_view") continue;
      const d = toDayKey(e.created_at, tzOffset);
      const bucket = eventBuckets[e.event_type];
      if (bucket && bucket.has(d)) bucket.set(d, (bucket.get(d) ?? 0) + 1);
    }
    const eventsByDay = Array.from(eventBuckets.view.keys()).map((day) => ({
      day,
      view: eventBuckets.view.get(day) ?? 0,
      start: eventBuckets.start.get(day) ?? 0,
      complete: eventBuckets.complete.get(day) ?? 0,
      share: eventBuckets.share.get(day) ?? 0,
    }));

    const leadBuckets = fillDailyZeros(anchorStart, today, tzOffset);
    for (const l of leads) {
      const d = toDayKey(l.created_at, tzOffset);
      if (leadBuckets.has(d)) leadBuckets.set(d, (leadBuckets.get(d) ?? 0) + 1);
    }
    const leadsByDay = Array.from(leadBuckets.entries()).map(([day, count]) => ({ day, count }));

    // ── TOTALS for the period + previous-period deltas ──────────────
    const sumEvents = (rows: EventRow[]) => {
      const acc: Record<CumulativeEventType, number> = { view: 0, start: 0, complete: 0, share: 0 };
      for (const e of rows) {
        if (e.event_type === "question_view") continue;
        acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
      }
      return acc;
    };
    const cur = sumEvents(events);
    const prev = sumEvents(prevEvents);

    // ── Lifetime totals (computed once, reused below) ───────────────
    const lifetime = (quizzes ?? []).reduce(
      (acc, q) => ({
        views: acc.views + (Number(q.views_count) || 0),
        starts: acc.starts + (Number(q.starts_count) || 0),
        completions: acc.completions + (Number(q.completions_count) || 0),
        shares: acc.shares + (Number(q.shares_count) || 0),
      }),
      { views: 0, starts: 0, completions: 0, shares: 0 },
    );

    // Conversion (cumulé) : leads totaux / starts totaux (ou views à
    // défaut). On utilise les lifetime counters comme source de vérité
    // car les events backfillés sont tous datés à quiz.created_at —
    // le compteur lifetime est le seul truc cohérent quand la donnée
    // pré-migration et post-migration coexiste.
    const lifetimeLeadsTotal = (leadsAll ?? 0);
    const lifetimeConversionPct = (() => {
      const denom = lifetime.starts > 0 ? lifetime.starts : lifetime.views;
      return denom > 0 ? Math.min(100, Math.round((lifetimeLeadsTotal / denom) * 100)) : 0;
    })();

    // Conversion (période) : seulement les leads + démarrages tombés
    // dans la fenêtre — pour le delta vs période précédente. Pas
    // affiché sur les KPI principaux (qui sont lifetime maintenant).
    const conversionRate = (e: Record<CumulativeEventType, number>, leadCount: number) => {
      const denom = e.start > 0 ? e.start : e.view;
      return denom > 0 ? Math.min(100, Math.round((leadCount / denom) * 100)) : 0;
    };

    const totals = {
      // Period — what happened inside the selected window. Source de
      // vérité = quiz_events filtré sur la période, excluant les events
      // backfillés (cf. migration backfill 19 mai 2026, qui daterait
      // tous les historiques à quiz.created_at et fausserait les filtres
      // temporels). UTILISÉ POUR LES DELTAS (vs période précédente) et
      // pour la time-series des leads — PAS pour les KPI principaux.
      period: {
        views: cur.view,
        starts: cur.start,
        completions: cur.complete,
        shares: cur.share,
        leads: leads.length,
        conversionPct: conversionRate(cur, leads.length),
      },
      // Previous period — same length, shifted back
      previous: {
        views: prev.view,
        starts: prev.start,
        completions: prev.complete,
        shares: prev.share,
        leads: prevLeads.length,
        conversionPct: conversionRate(prev, prevLeads.length),
      },
      // Lifetime — SOURCE DE VÉRITÉ unique pour les KPI affichés sur le
      // dashboard et le bloc "À vie" de /stats. Toujours cohérent
      // avec les compteurs auto-bumpés par le trigger quiz_events.
      // Inclut les data pré-migration (avant 21 mai 2026) ET les
      // events backfillés.
      lifetime: {
        ...lifetime,
        leads: lifetimeLeadsTotal,
        conversionPct: lifetimeConversionPct,
      },
    };

    // ── PER-QUIZ breakdown ──────────────────────────────────────────
    // Période : events non-backfillés dans la fenêtre + leads dans
    //   la fenêtre. Utilisé pour les deltas + time-series.
    // Lifetime : compteurs auto-bumpés sur quizzes.*_count + COUNT
    //   sur quiz_leads (sans filtre période). SOURCE DE VÉRITÉ pour
    //   les KPI per-quiz affichés dans la liste.
    const perQuizMap = new Map<string, {
      id: string;
      title: string;
      status: string;
      mode: string | null;
      // Period counters (filtered, used for deltas)
      views: number;
      starts: number;
      completions: number;
      shares: number;
      leads: number;
      // Lifetime counters — affichés sur les cards quiz
      lifetimeViews: number;
      lifetimeStarts: number;
      lifetimeCompletions: number;
      lifetimeShares: number;
      lifetimeLeads: number;
    }>();
    for (const q of quizzes ?? []) {
      perQuizMap.set(q.id as string, {
        id: q.id as string,
        title: (q.title as string) ?? "",
        status: (q.status as string) ?? "draft",
        mode: (q.mode as string | null) ?? null,
        views: 0, starts: 0, completions: 0, shares: 0, leads: 0,
        lifetimeViews: (q.views_count as number) ?? 0,
        lifetimeStarts: (q.starts_count as number) ?? 0,
        lifetimeCompletions: (q.completions_count as number) ?? 0,
        lifetimeShares: (q.shares_count as number) ?? 0,
        lifetimeLeads: 0,  // rempli ci-dessous via leadsAllByQuiz
      });
    }
    for (const e of events) {
      const row = perQuizMap.get(e.quiz_id);
      if (!row) continue;
      if (e.event_type === "view") row.views++;
      else if (e.event_type === "start") row.starts++;
      else if (e.event_type === "complete") row.completions++;
      else if (e.event_type === "share") row.shares++;
    }
    for (const l of leads) {
      const row = perQuizMap.get(l.quiz_id);
      if (row) row.leads++;
    }

    // Lifetime leads par quiz (sans filtre période) — pour que les
    // cards affichent un nombre cohérent avec les compteurs lifetime.
    // Sans ça : leads=8 (période) + views=34 (lifetime) → conversion
    // visible mais incorrecte (cf. Gwenn screenshot avec 127 % en
    // conversion = leads lifetime / starts période).
    const { data: rawLeadsAllByQuiz } = await supabaseAdmin
      .from("quiz_leads")
      .select("quiz_id")
      .in("quiz_id", quizIds);
    for (const row of rawLeadsAllByQuiz ?? []) {
      const pq = perQuizMap.get((row as { quiz_id: string }).quiz_id);
      if (pq) pq.lifetimeLeads += 1;
    }

    // ── PER-QUESTION drop-off funnel ────────────────────────────────
    // For each quiz we count how many distinct visitors saw each
    // question_index. Because question_view is deduped client-side
    // per session, the count is "unique sessions that reached this
    // question". The drop-off is implicit — the stats UI just shows
    // the descending bars and the entrepreneur sees where they
    // collapse.
    //
    // Schema: questionFunnels = [{
    //   quizId, title,
    //   questions: [{ index: 0, views: 120 }, { index: 1, views: 88 }, ...]
    // }]
    //
    // Empty for projects that have not received any question_view
    // event (legacy data + projects published pre-migration).
    //
    // ⚠️ Source = `quiz_question_events` (le player y écrit les vues de
    // question). On NE lit PLUS quiz_events.meta.q : depuis la refonte
    // tracking, plus aucune ligne question_view n'atterrit dans quiz_events
    // → ce funnel était TOUJOURS vide. On compte les sessions DISTINCTES
    // par (quiz, question), cohérent avec la page analytics par quiz.
    let qqQuery = supabaseAdmin
      .from("quiz_question_events")
      .select("quiz_id, question_index, session_id")
      .in("quiz_id", quizIds)
      .eq("event", "view")
      .order("created_at", { ascending: false })
      .limit(100000);
    if (from) qqQuery = qqQuery.gte("created_at", from.toISOString());
    const { data: qqRows } = await qqQuery;

    // Funnel monotone : per session, on garde la question la PLUS LOIN
    // atteinte (max index vu). views(N) = count des sessions dont maxQ >= N.
    // Un visiteur arrivé à Q5 a forcément passé Q1-Q4, même si l'event
    // d'une question intermédiaire a été perdu (réseau) ou exclu par le
    // filtre de période. Avant on comptait les sessions distinctes par
    // question_index brut → Q3 pouvait afficher plus de sessions que Q1
    // (cf. rapport Gwenn 27 mai 2026, screenshots Q3=24 / Q1=23).
    const sessionMaxByQuiz = new Map<string, Map<string, number>>();
    const qsByQuiz = new Map<string, Set<number>>();
    for (const r of (qqRows ?? []) as { quiz_id: string; question_index: number; session_id: string }[]) {
      let sm = sessionMaxByQuiz.get(r.quiz_id);
      if (!sm) { sm = new Map(); sessionMaxByQuiz.set(r.quiz_id, sm); }
      const prev = sm.get(r.session_id);
      if (prev === undefined || r.question_index > prev) {
        sm.set(r.session_id, r.question_index);
      }
      let qs = qsByQuiz.get(r.quiz_id);
      if (!qs) { qs = new Set(); qsByQuiz.set(r.quiz_id, qs); }
      qs.add(r.question_index);
    }
    const questionFunnels = (quizzes ?? []).map((q) => {
      const qid = q.id as string;
      const qsSet = qsByQuiz.get(qid);
      const sm = sessionMaxByQuiz.get(qid);
      if (!qsSet || qsSet.size === 0 || !sm) {
        return { quizId: qid, title: (q.title as string) ?? "", questions: [] as { index: number; views: number }[] };
      }
      const sortedQs = Array.from(qsSet).sort((a, b) => a - b);
      const questions = sortedQs.map((index) => {
        let count = 0;
        for (const maxQ of sm.values()) if (maxQ >= index) count++;
        return { index, views: count };
      });
      return { quizId: qid, title: (q.title as string) ?? "", questions };
    }).filter((f) => f.questions.length > 0);

    return NextResponse.json({
      ok: true,
      range,
      from: from?.toISOString() ?? null,
      eventsByDay,
      leadsByDay,
      totals,
      perQuiz: Array.from(perQuizMap.values()),
      questionFunnels,
      // Tip: tells the UI whether quiz_events has *any* row yet, so
      // it can warn the creator that the time-series only reflects
      // post-migration activity for legacy projects.
      hasEventData: events.length > 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function emptyTotals() {
  return {
    period: { views: 0, starts: 0, completions: 0, shares: 0, leads: 0, conversionPct: 0 },
    previous: { views: 0, starts: 0, completions: 0, shares: 0, leads: 0, conversionPct: 0 },
    lifetime: { views: 0, starts: 0, completions: 0, shares: 0, leads: 0, conversionPct: 0 },
  };
}

function earliest(dates: Date[]): Date {
  let m = dates[0];
  for (const d of dates) if (d < m) m = d;
  return m;
}

// Used in EVENT_TYPES export — referenced in tests / future endpoints.
export { EVENT_TYPES };
