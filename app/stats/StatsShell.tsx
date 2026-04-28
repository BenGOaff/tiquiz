"use client";

// app/stats/StatsShell.tsx
// Stats page — totals, conversion funnel, and a per-quiz breakdown.
//
// Per-quiz cards mirror the dashboard's KPI style: each project gets its
// own panel with an icon-tinted header, a conversion ring, and a small
// grid of metric tiles (views / starts / completions / leads / shares).
//
// Conversion math: when `starts_count` is 0 but leads have been
// captured, we fall back to `views_count` as the denominator so the
// percentage doesn't lie. The funnel is monotonic (views ≥ starts ≥
// completions ≥ leads), so views is always a safe upper bound. We cap
// the displayed percentage at 100% to absorb any tracking gaps where
// leads outnumber starts.

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Mascot } from "@/components/ui/mascot";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  BarChart3, Eye, Play, CheckCircle, Users, Share2, TrendingUp, Sparkles,
} from "lucide-react";

type Quiz = {
  id: string;
  title: string;
  status: string;
  views_count: number;
  starts_count: number;
  completions_count: number;
  shares_count: number;
  leads_count?: number;
};

/**
 * Pick the most defensible "denominator" for a quiz's lead conversion.
 *
 * Preference order:
 *  1. starts_count   — true funnel entry rate
 *  2. views_count    — fallback when starts tracking is missing
 *
 * Returns null when no useful baseline exists — caller renders "—".
 */
function leadRate(q: Quiz): { pct: number; basis: "starts" | "views" } | null {
  const leads = q.leads_count ?? 0;
  if (q.starts_count > 0) {
    return {
      pct: Math.min(100, Math.round((leads / q.starts_count) * 100)),
      basis: "starts",
    };
  }
  if (q.views_count > 0 && leads > 0) {
    return {
      pct: Math.min(100, Math.round((leads / q.views_count) * 100)),
      basis: "views",
    };
  }
  return null;
}

export default function StatsShell({ userEmail }: { userEmail: string }) {
  const tNav = useTranslations("nav");
  const t = useTranslations("stats");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/quiz");
        const data = await res.json();
        if (data.ok) {
          const enriched: Quiz[] = [];
          for (const quiz of data.quizzes) {
            const qRes = await fetch(`/api/quiz/${quiz.id}`);
            const qData = await qRes.json();
            enriched.push({ ...quiz, leads_count: qData.leads?.length ?? 0 });
          }
          setQuizzes(enriched);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aggregate stats
  const totals = quizzes.reduce(
    (acc, q) => ({
      views: acc.views + q.views_count,
      starts: acc.starts + q.starts_count,
      completions: acc.completions + q.completions_count,
      leads: acc.leads + (q.leads_count ?? 0),
      shares: acc.shares + q.shares_count,
    }),
    { views: 0, starts: 0, completions: 0, leads: 0, shares: 0 }
  );

  const startRate = totals.views > 0 ? Math.round((totals.starts / totals.views) * 100) : 0;
  const completionRate = totals.starts > 0 ? Math.round((totals.completions / totals.starts) * 100) : 0;
  // Same robustness as per-quiz: fall back to views when starts is missing.
  const leadDenominator = totals.starts > 0 ? totals.starts : totals.views;
  const leadRateGlobal = leadDenominator > 0
    ? Math.min(100, Math.round((totals.leads / leadDenominator) * 100))
    : 0;
  const leadRateBasis: "starts" | "views" = totals.starts > 0 ? "starts" : "views";

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

      {loading ? (
        // Two SkeletonCards while data loads — keeps the page from
        // looking empty during the dashboard fetch.
        <div className="space-y-4">
          <SkeletonCard className="h-[120px]" />
          <SkeletonCard className="h-[280px]" />
        </div>
      ) : quizzes.length === 0 ? (
        // Mascot empty-state — same family as the other Tiquiz empty
        // pages, so cold-start moments feel consistent.
        <Card>
          <CardContent className="py-14 text-center flex flex-col items-center gap-3">
            <Mascot expression="search" size={88} tone="soft" />
            <h3 className="text-lg font-semibold">{t("empty")}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{t("emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: t("totals.views"), value: totals.views, icon: Eye, color: "text-blue-500" },
              { label: t("totals.starts"), value: totals.starts, icon: Play, color: "text-indigo-500" },
              { label: t("totals.completions"), value: totals.completions, icon: CheckCircle, color: "text-green-500" },
              { label: t("totals.leads"), value: totals.leads, icon: Users, color: "text-primary" },
              { label: t("totals.shares"), value: totals.shares, icon: Share2, color: "text-teal-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="py-4 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Conversion funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t("funnel.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t("funnel.startRate")}</span>
                  <span className="font-semibold">{startRate}%</span>
                </div>
                <Progress value={startRate} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">{t("funnel.startRateDetail", { starts: totals.starts, views: totals.views })}</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t("funnel.completionRate")}</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">{t("funnel.completionRateDetail", { completions: totals.completions, starts: totals.starts })}</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t("funnel.leadRate")}</span>
                  <span className="font-semibold">{leadRateGlobal}%</span>
                </div>
                <Progress value={leadRateGlobal} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {leadRateBasis === "starts"
                    ? t("funnel.leadRateDetail", { leads: totals.leads, starts: totals.starts })
                    : t("funnel.leadRateDetailViews", { leads: totals.leads, views: totals.views })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Per-quiz cards — one card per quiz, dashboard-style */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">{t("perQuiz.title")}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quizzes.map((quiz) => {
                const rate = leadRate(quiz);
                const isActive = quiz.status === "active";
                return (
                  <Card key={quiz.id} className="hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-5 space-y-4">
                      {/* Header: title + status + conversion ring */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-foreground" title={quiz.title}>
                            {quiz.title || t("untitled")}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <Badge variant={isActive ? "default" : "secondary"} className="text-[11px]">
                              {isActive ? t("statusActive") : t("statusDraft")}
                            </Badge>
                            {rate ? (
                              <span className="text-muted-foreground">
                                {rate.basis === "starts"
                                  ? t("perQuiz.basisStarts")
                                  : t("perQuiz.basisViews")}
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

                      {/* Mini metric tiles — same density as dashboard KPIs */}
                      <div className="grid grid-cols-5 gap-2">
                        <MetricTile icon={<Eye className="h-3.5 w-3.5" />} value={quiz.views_count} label={t("totals.views")} tone="blue" />
                        <MetricTile icon={<Play className="h-3.5 w-3.5" />} value={quiz.starts_count} label={t("totals.starts")} tone="indigo" />
                        <MetricTile icon={<CheckCircle className="h-3.5 w-3.5" />} value={quiz.completions_count} label={t("totals.completions")} tone="green" />
                        <MetricTile icon={<Users className="h-3.5 w-3.5" />} value={quiz.leads_count ?? 0} label={t("totals.leads")} tone="primary" highlight />
                        <MetricTile icon={<Share2 className="h-3.5 w-3.5" />} value={quiz.shares_count} label={t("totals.shares")} tone="teal" />
                      </div>

                      {/* Funnel mini-bar — visual depth for the journey */}
                      <FunnelBar
                        views={quiz.views_count}
                        starts={quiz.starts_count}
                        completions={quiz.completions_count}
                        leads={quiz.leads_count ?? 0}
                      />
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
// Conversion ring — small SVG arc with the percentage rendered inside.
// Mirrors the dashboard's KPI feel without depending on a chart lib.
// Tone shifts to emerald above 30 % (a healthy lead-capture rate) so
// the user gets a glanceable signal without reading the number.
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-500", tone.split(" ")[0])}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-sm font-bold tabular-nums", tone.split(" ")[1])}>
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric tile — compact KPI used inside per-quiz cards. Tinted icon
// circle echoes the dashboard's KPI cards but in a denser layout so we
// can fit the full 5-metric funnel in one row.
// ---------------------------------------------------------------------------

const TILE_TONES = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  primary: "bg-primary/10 text-primary",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300",
} as const;

function MetricTile({
  icon,
  value,
  label,
  tone,
  highlight,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: keyof typeof TILE_TONES;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg bg-muted/30 px-2 py-2.5 flex flex-col items-center text-center gap-1 " +
        (highlight ? "ring-1 ring-primary/30" : "")
      }
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${TILE_TONES[tone]}`}>
        {icon}
      </div>
      <p className="text-sm font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-none truncate w-full" title={label}>
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel mini-bar — five proportional segments showing how each step
// shrinks. Uses views as the 100% baseline; if views is 0 we still draw
// a flat bar so the layout doesn't jump.
// ---------------------------------------------------------------------------

function FunnelBar({
  views,
  starts,
  completions,
  leads,
}: {
  views: number;
  starts: number;
  completions: number;
  leads: number;
}) {
  // The base for the bar is the largest known step. Usually views, but
  // if tracking missed views (rare), we fall back to whichever is
  // largest so the arc still scales meaningfully.
  const base = Math.max(views, starts, completions, leads);
  const pct = (n: number) => (base > 0 ? Math.max(2, Math.round((n / base) * 100)) : 0);

  const segments: Array<{ pct: number; color: string }> = [
    { pct: pct(views), color: "bg-blue-200 dark:bg-blue-900/50" },
    { pct: pct(starts), color: "bg-indigo-300 dark:bg-indigo-800/60" },
    { pct: pct(completions), color: "bg-emerald-300 dark:bg-emerald-800/60" },
    { pct: pct(leads), color: "bg-primary/60" },
  ];

  if (base === 0) return null;

  return (
    <div className="flex items-center gap-1 h-3" aria-hidden>
      {segments.map((s, i) => (
        <div
          key={i}
          className={`${s.color} rounded-sm transition-all`}
          style={{ width: `${s.pct}%` }}
        />
      ))}
    </div>
  );
}
