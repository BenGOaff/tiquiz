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

export const dynamic = "force-dynamic";

type EventType = "view" | "start" | "complete" | "share";
const EVENT_TYPES: EventType[] = ["view", "start", "complete", "share"];

type EventRow = { quiz_id: string; event_type: EventType; created_at: string };
type LeadRow = { quiz_id: string; created_at: string };

/** Local-day key (YYYY-MM-DD) so the chart doesn't lump hours in the
 * wrong day on the client. We use UTC here for determinism — the
 * client converts back to its locale. */
function toDayKey(iso: string): string {
  return iso.slice(0, 10);
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

/** Fill a Map<dayKey, count> with zeros for every day in [start, end]
 * so the resulting array has no gaps — important for the line chart. */
function fillDailyZeros(start: Date, end: Date): Map<string, number> {
  const out = new Map<string, number>();
  const cur = new Date(start);
  cur.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cur.getTime() <= last.getTime()) {
    out.set(cur.toISOString().slice(0, 10), 0);
    cur.setUTCDate(cur.getUTCDate() + 1);
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
    let eventsQ = supabaseAdmin
      .from("quiz_events")
      .select("quiz_id, event_type, created_at")
      .in("quiz_id", quizIds);
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
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const eventBuckets: Record<EventType, Map<string, number>> = {
      view: fillDailyZeros(anchorStart, today),
      start: fillDailyZeros(anchorStart, today),
      complete: fillDailyZeros(anchorStart, today),
      share: fillDailyZeros(anchorStart, today),
    };
    for (const e of events) {
      const d = toDayKey(e.created_at);
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

    const leadBuckets = fillDailyZeros(anchorStart, today);
    for (const l of leads) {
      const d = toDayKey(l.created_at);
      if (leadBuckets.has(d)) leadBuckets.set(d, (leadBuckets.get(d) ?? 0) + 1);
    }
    const leadsByDay = Array.from(leadBuckets.entries()).map(([day, count]) => ({ day, count }));

    // ── TOTALS for the period + previous-period deltas ──────────────
    const sumEvents = (rows: EventRow[]) => {
      const acc: Record<EventType, number> = { view: 0, start: 0, complete: 0, share: 0 };
      for (const e of rows) acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
      return acc;
    };
    const cur = sumEvents(events);
    const prev = sumEvents(prevEvents);

    // Same defensive math as the per-quiz card: when starts is missing
    // we fall back to views as the conversion denominator.
    const conversionRate = (e: Record<EventType, number>, leadCount: number) => {
      const denom = e.start > 0 ? e.start : e.view;
      return denom > 0 ? Math.min(100, Math.round((leadCount / denom) * 100)) : 0;
    };

    const totals = {
      // Period — what happened inside the selected window
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
      // Lifetime — from the cumulative counters on quizzes (covers
      // pre-migration data we don't have events for)
      lifetime: (quizzes ?? []).reduce(
        (acc, q) => ({
          views: acc.views + (q.views_count ?? 0),
          starts: acc.starts + (q.starts_count ?? 0),
          completions: acc.completions + (q.completions_count ?? 0),
          shares: acc.shares + (q.shares_count ?? 0),
        }),
        { views: 0, starts: 0, completions: 0, shares: 0 }
      ),
    };

    // ── PER-QUIZ breakdown for the selected range ───────────────────
    const perQuizMap = new Map<string, {
      id: string;
      title: string;
      status: string;
      mode: string | null;
      views: number;
      starts: number;
      completions: number;
      shares: number;
      leads: number;
      // Lifetime counters from quizzes
      lifetimeViews: number;
      lifetimeStarts: number;
      lifetimeCompletions: number;
      lifetimeShares: number;
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

    return NextResponse.json({
      ok: true,
      range,
      from: from?.toISOString() ?? null,
      eventsByDay,
      leadsByDay,
      totals,
      perQuiz: Array.from(perQuizMap.values()),
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
    lifetime: { views: 0, starts: 0, completions: 0, shares: 0 },
  };
}

function earliest(dates: Date[]): Date {
  let m = dates[0];
  for (const d of dates) if (d < m) m = d;
  return m;
}

// Used in EVENT_TYPES export — referenced in tests / future endpoints.
export { EVENT_TYPES };
