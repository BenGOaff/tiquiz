"use client";

// app/stats/StatsShell.tsx
// Entrepreneur-grade stats dashboard.
//
// Why this rewrite was needed: the previous version showed lifetime
// counters only — no date filter, no trend, no time series. A creator
// running paid acquisition campaigns or AB-testing a new welcome page
// could not answer "how am I doing this week?". This page now:
//
//   - Lets the user pick a window (7 / 30 / 90 days, or all-time).
//   - Calls /api/stats which aggregates quiz_events + quiz_leads
//     server-side and returns per-day buckets + previous-period
//     totals so we can render real "+18 % vs. semaine dernière" deltas.
//   - Renders a daily acquisition chart (Recharts) so trends are
//     visible at a glance.
//   - Surfaces the lifetime cumulative funnel separately, since the
//     historical counters on `quizzes` predate the events table and
//     only those are reliable for projects published before the
//     migration.
//   - Drops a soft "data fills in over time" notice when no events
//     have been logged yet, so the creator knows the page isn't
//     broken — it's just waiting for new visits.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Mascot } from "@/components/ui/mascot";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  BarChart3, Eye, Play, CheckCircle, Users, Share2, TrendingUp, TrendingDown,
  Sparkles, ArrowRight, Info,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

type Range = "7d" | "30d" | "90d" | "all";

type StatsResponse = {
  ok: boolean;
  range: Range;
  eventsByDay: Array<{ day: string; view: number; start: number; complete: number; share: number }>;
  leadsByDay: Array<{ day: string; count: number }>;
  totals: {
    period: { views: number; starts: number; completions: number; shares: number; leads: number; conversionPct: number };
    previous: { views: number; starts: number; completions: number; shares: number; leads: number; conversionPct: number };
    lifetime: { views: number; starts: number; completions: number; shares: number };
  };
  perQuiz: Array<{
    id: string;
    title: string;
    status: string;
    mode: string | null;
    views: number;
    starts: number;
    completions: number;
    shares: number;
    leads: number;
    lifetimeViews: number;
    lifetimeStarts: number;
    lifetimeCompletions: number;
    lifetimeShares: number;
  }>;
  questionFunnels: Array<{
    quizId: string;
    title: string;
    questions: Array<{ index: number; views: number }>;
  }>;
  hasEventData: boolean;
};

/** Defensive conversion math — same as /api/stats route, repeated here
 * so per-quiz cards stay accurate even when the row's `starts` for the
 * period is 0 but leads were captured (typically pre-migration data
 * with lifetime counters but no events yet). */
function leadRate(starts: number, views: number, leads: number): { pct: number; basis: "starts" | "views" } | null {
  if (starts > 0) return { pct: Math.min(100, Math.round((leads / starts) * 100)), basis: "starts" };
  if (views > 0 && leads > 0) return { pct: Math.min(100, Math.round((leads / views) * 100)), basis: "views" };
  return null;
}

/** Pretty signed % delta — null when previous = 0 to avoid division by
 * zero and meaningless "+∞" badges on cold-starts. */
function pctDelta(curr: number, prev: number): number | null {
  if (prev <= 0) return curr > 0 ? null : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export default function StatsShell({ userEmail }: { userEmail: string }) {
  const tNav = useTranslations("nav");
  const t = useTranslations("stats");
  const locale = useLocale();

  const [data, setData] = useState<StatsResponse | null>(null);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?range=${range}`)
      .then((r) => r.json())
      .then((j: StatsResponse) => { if (j.ok) setData(j); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  // Pretty day labels for the chart x-axis (locale-aware short dates)
  const dateFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
    } catch {
      return new Intl.DateTimeFormat("fr", { month: "short", day: "numeric" });
    }
  }, [locale]);

  // Best-day insight — small but high-signal callout for entrepreneurs:
  // "your best lead day was Tue Mar 12 (24 leads)". Reuses leadsByDay
  // so we don't double-fetch.
  const bestDay = useMemo(() => {
    if (!data?.leadsByDay?.length) return null;
    let best = data.leadsByDay[0];
    for (const d of data.leadsByDay) if (d.count > best.count) best = d;
    if (best.count === 0) return null;
    return best;
  }, [data?.leadsByDay]);

  return (
    <AppShell userEmail={userEmail} headerTitle={tNav("stats")}>
      {/* Banner */}
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="text-sm text-white/70">{t("subtitle")}</p>
        </div>
      </div>

      {/* Range selector — first thing an entrepreneur reaches for */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">{t("rangeLabel")}</span>
        {(["7d", "30d", "90d", "all"] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              range === r
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {t(`ranges.${r}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard className="h-[120px]" />
          <SkeletonCard className="h-[280px]" />
        </div>
      ) : !data || data.perQuiz.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center flex flex-col items-center gap-3">
            <Mascot expression="search" size={88} tone="soft" />
            <h3 className="text-lg font-semibold">{t("empty")}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{t("emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI cards with vs-previous-period deltas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label={t("kpis.leads")}
              value={data.totals.period.leads}
              delta={pctDelta(data.totals.period.leads, data.totals.previous.leads)}
              icon={Users}
              tone="primary"
              range={range}
              periodLabel={t(`ranges.${range}`)}
            />
            <KpiCard
              label={t("kpis.conversion")}
              value={`${data.totals.period.conversionPct}%`}
              delta={pctDelta(data.totals.period.conversionPct, data.totals.previous.conversionPct)}
              deltaUnit="pt"
              icon={TrendingUp}
              tone="emerald"
              range={range}
              periodLabel={t(`ranges.${range}`)}
            />
            <KpiCard
              label={t("kpis.views")}
              value={data.totals.period.views}
              delta={pctDelta(data.totals.period.views, data.totals.previous.views)}
              icon={Eye}
              tone="sky"
              range={range}
              periodLabel={t(`ranges.${range}`)}
            />
            <KpiCard
              label={t("kpis.shares")}
              value={data.totals.period.shares}
              delta={pctDelta(data.totals.period.shares, data.totals.previous.shares)}
              icon={Share2}
              tone="amber"
              range={range}
              periodLabel={t(`ranges.${range}`)}
            />
          </div>

          {/* Lead acquisition timeline — the chart an entrepreneur looks
              at first when checking a campaign. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("acquisition.title")}
                </span>
                {bestDay && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {t("acquisition.bestDay", {
                      date: dateFormatter.format(new Date(bestDay.day)),
                      count: bestDay.count,
                    })}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.leadsByDay.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.leadsByDay.map((d) => ({
                        ...d,
                        // Pre-format here so the axis tick labels stay
                        // light — Recharts re-runs tick formatters
                        // every render otherwise.
                        label: dateFormatter.format(new Date(d.day)),
                      }))}
                      margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        // Don't render every label — gets noisy beyond
                        // ~14 days. Recharts picks an interval if we
                        // don't fix one, but the auto-pick is
                        // inconsistent across viewport widths.
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                        width={32}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        formatter={(v: number) => [`${v}`, t("kpis.leads")]}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#leadFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">{t("acquisition.empty")}</p>
              )}
            </CardContent>
          </Card>

          {/* Honest disclaimer when no events at all — pre-migration
              accounts only see lifetime counters until activity comes
              in. Soft tone, not alarming. */}
          {!data.hasEventData && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200/60 dark:border-sky-900/40 text-sm text-sky-900 dark:text-sky-200">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{t("eventsNoticeDesc")}</p>
            </div>
          )}

          {/* Per-question drop-off — the actionable insight that
              tells creators "the funnel collapses at Q3, rewrite that
              one". Only shows for quizzes that have received
              question_view events; older projects render nothing
              until visitors start coming through post-migration. */}
          {data.questionFunnels.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  {t("questionFunnel.title")}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.questionFunnels.map((qf) => (
                  <QuestionFunnelCard
                    key={qf.quizId}
                    title={qf.title || t("untitled")}
                    questions={qf.questions}
                    questionLabel={t("questionFunnel.questionLabel")}
                    visitorsLabel={t("questionFunnel.visitors")}
                    droppedLabel={t("questionFunnel.dropped")}
                    keptLabel={t("questionFunnel.kept")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lifetime funnel — same as before, kept around so creators
              don't lose visibility on cumulative progress. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {t("lifetime.title")}
                <Badge variant="outline" className="font-normal text-[10px]">
                  {t("lifetime.badge")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FunnelStat
                label={t("kpis.views")}
                value={data.totals.lifetime.views}
                icon={Eye}
                tone="text-sky-600 dark:text-sky-300"
                bg="bg-sky-100 dark:bg-sky-900/30"
              />
              <FunnelStat
                label={t("kpis.starts")}
                value={data.totals.lifetime.starts}
                icon={Play}
                tone="text-indigo-600 dark:text-indigo-300"
                bg="bg-indigo-100 dark:bg-indigo-900/30"
              />
              <FunnelStat
                label={t("kpis.completions")}
                value={data.totals.lifetime.completions}
                icon={CheckCircle}
                tone="text-emerald-600 dark:text-emerald-300"
                bg="bg-emerald-100 dark:bg-emerald-900/30"
              />
              <FunnelStat
                label={t("kpis.shares")}
                value={data.totals.lifetime.shares}
                icon={Share2}
                tone="text-amber-600 dark:text-amber-300"
                bg="bg-amber-100 dark:bg-amber-900/30"
              />
            </CardContent>
          </Card>

          {/* Per-quiz cards for the selected period */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {t("perQuiz.title")} <span className="text-muted-foreground font-normal text-sm">— {t(`ranges.${range}`)}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.perQuiz
                .slice()
                .sort((a, b) => b.leads - a.leads)
                .map((q) => {
                  // Show period figures by default. When the period is
                  // "all" or there's no event data yet, fall back to
                  // lifetime so the card is never blank.
                  const useLifetime = !data.hasEventData || range === "all";
                  const views = useLifetime ? q.lifetimeViews : q.views;
                  const starts = useLifetime ? q.lifetimeStarts : q.starts;
                  const completions = useLifetime ? q.lifetimeCompletions : q.completions;
                  const shares = useLifetime ? q.lifetimeShares : q.shares;
                  const leads = q.leads;
                  const rate = leadRate(starts, views, leads);
                  const isActive = q.status === "active";
                  return (
                    <Card key={q.id} className="hover:shadow-card-hover transition-shadow">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate text-foreground" title={q.title}>
                              {q.title || t("untitled")}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                              <Badge variant={isActive ? "default" : "secondary"} className="text-[11px]">
                                {isActive ? t("statusActive") : t("statusDraft")}
                              </Badge>
                              {rate ? (
                                <span className="text-muted-foreground">
                                  {rate.basis === "starts" ? t("perQuiz.basisStarts") : t("perQuiz.basisViews")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{t("perQuiz.noData")}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-center">
                            {rate ? (
                              <ConversionRing percent={rate.pct} />
                            ) : (
                              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted/50">
                                <span className="text-sm font-semibold text-muted-foreground">—</span>
                              </div>
                            )}
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                              {t("perQuiz.conversion")}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                          <MetricTile icon={<Eye className="h-3.5 w-3.5" />} value={views} label={t("kpis.views")} tone="blue" />
                          <MetricTile icon={<Play className="h-3.5 w-3.5" />} value={starts} label={t("kpis.starts")} tone="indigo" />
                          <MetricTile icon={<CheckCircle className="h-3.5 w-3.5" />} value={completions} label={t("kpis.completions")} tone="green" />
                          <MetricTile icon={<Users className="h-3.5 w-3.5" />} value={leads} label={t("kpis.leads")} tone="primary" highlight />
                          <MetricTile icon={<Share2 className="h-3.5 w-3.5" />} value={shares} label={t("kpis.shares")} tone="teal" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// KPI card with vs-previous-period delta
// ---------------------------------------------------------------------------

const KPI_TONES = {
  primary: { bg: "bg-primary/10", fg: "text-primary" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", fg: "text-emerald-600 dark:text-emerald-300" },
  sky: { bg: "bg-sky-100 dark:bg-sky-900/30", fg: "text-sky-600 dark:text-sky-300" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/30", fg: "text-amber-600 dark:text-amber-300" },
} as const;

function KpiCard({
  label,
  value,
  delta,
  deltaUnit = "%",
  icon: Icon,
  tone,
  range,
  periodLabel,
}: {
  label: string;
  value: number | string;
  delta: number | null;
  deltaUnit?: "%" | "pt";
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof KPI_TONES;
  range: Range;
  periodLabel: string;
}) {
  const t = KPI_TONES[tone];
  // We don't show a delta on "all" since the previous-period concept
  // doesn't apply to lifetime.
  const showDelta = range !== "all" && delta !== null;
  const positive = (delta ?? 0) > 0;
  const negative = (delta ?? 0) < 0;
  const TrendIcon = positive ? TrendingUp : negative ? TrendingDown : ArrowRight;
  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardContent className="py-4 px-4 flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", t.bg, t.fg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">{label}</p>
          {showDelta && (
            <p
              className={cn(
                "text-[11px] mt-1 flex items-center gap-0.5 font-medium",
                positive ? "text-emerald-600 dark:text-emerald-400"
                  : negative ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground",
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {delta! > 0 ? "+" : ""}{delta}{deltaUnit === "pt" ? " pt" : "%"}
              <span className="text-muted-foreground font-normal ml-0.5 truncate">vs. {periodLabel}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Conversion ring + Metric tile + Funnel row (same primitives as before,
// kept inline to keep the page self-contained — they're not re-used
// elsewhere)
// ---------------------------------------------------------------------------

function ConversionRing({ percent }: { percent: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  const tone = percent >= 30 ? "stroke-emerald-500 text-emerald-600"
    : percent >= 10 ? "stroke-primary text-primary"
    : "stroke-amber-500 text-amber-600";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          strokeWidth={stroke} strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-500", tone.split(" ")[0])}
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-sm font-bold tabular-nums", tone.split(" ")[1])}>{percent}%</span>
      </div>
    </div>
  );
}

const TILE_TONES = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  primary: "bg-primary/10 text-primary",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300",
} as const;

function MetricTile({
  icon, value, label, tone, highlight,
}: { icon: React.ReactNode; value: number; label: string; tone: keyof typeof TILE_TONES; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg bg-muted/30 px-2 py-2.5 flex flex-col items-center text-center gap-1",
      highlight ? "ring-1 ring-primary/30" : "",
    )}>
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", TILE_TONES[tone])}>{icon}</div>
      <p className="text-sm font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-none truncate w-full" title={label}>{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionFunnelCard — per-question retention bars.
//
// Shows each question as a horizontal bar whose width = (this question's
// views / first question's views). The drop-off between questions is
// implicit but glaring: when a bar is noticeably shorter than the one
// above it, that question is where visitors leave. We also surface the
// biggest single-step drop as a callout so the creator's eye lands on
// the worst offender immediately.
// ---------------------------------------------------------------------------

function QuestionFunnelCard({
  title,
  questions,
  questionLabel,
  visitorsLabel,
  droppedLabel,
  keptLabel,
}: {
  title: string;
  questions: Array<{ index: number; views: number }>;
  questionLabel: string;
  visitorsLabel: string;
  droppedLabel: string;
  keptLabel: string;
}) {
  if (questions.length === 0) return null;
  const base = questions[0]?.views ?? 0;

  // Biggest single-step drop — between question N and question N+1.
  // Surfaces the question where the funnel leaks the most so the
  // creator can target their copy fix.
  let biggestDrop: { from: number; to: number; pct: number } | null = null;
  for (let i = 0; i < questions.length - 1; i++) {
    const a = questions[i].views;
    const b = questions[i + 1].views;
    if (a <= 0) continue;
    const lostPct = Math.round(((a - b) / a) * 100);
    if (lostPct <= 0) continue;
    if (!biggestDrop || lostPct > biggestDrop.pct) {
      biggestDrop = { from: questions[i].index, to: questions[i + 1].index, pct: lostPct };
    }
  }

  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <h3 className="font-semibold truncate text-foreground" title={title}>{title}</h3>
          {biggestDrop && (
            <Badge variant="secondary" className="shrink-0 self-start text-[11px] bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-0">
              {droppedLabel} {biggestDrop.pct}% Q{biggestDrop.from + 1}→Q{biggestDrop.to + 1}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {questions.map((q, i) => {
            const widthPct = base > 0 ? Math.max(4, Math.round((q.views / base) * 100)) : 0;
            const retentionPct = base > 0 ? Math.round((q.views / base) * 100) : 0;
            const prev = i > 0 ? questions[i - 1].views : null;
            const stepDrop = prev !== null && prev > 0
              ? Math.round(((prev - q.views) / prev) * 100)
              : 0;
            // Color the bar progressively warmer as retention degrades —
            // visual signal even before reading numbers.
            const barTone = retentionPct >= 80 ? "bg-emerald-400 dark:bg-emerald-500"
              : retentionPct >= 50 ? "bg-primary"
              : retentionPct >= 30 ? "bg-amber-400 dark:bg-amber-500"
              : "bg-rose-400 dark:bg-rose-500";
            return (
              <div key={q.index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground tabular-nums">
                    {questionLabel} {q.index + 1}
                  </span>
                  <span className="font-medium tabular-nums">
                    {q.views} {visitorsLabel}
                    {i > 0 && stepDrop > 0 && (
                      <span className="ml-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                        −{stepDrop}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", barTone)}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {keptLabel} {questions[questions.length - 1].views} / {base}
        </p>
      </CardContent>
    </Card>
  );
}

function FunnelStat({
  label, value, icon: Icon, tone, bg,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string; bg: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", bg, tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-base font-bold tabular-nums">{value}</span>
      </div>
    </div>
  );
}
