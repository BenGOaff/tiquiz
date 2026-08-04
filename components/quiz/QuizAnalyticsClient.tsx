"use client";

// Per-quiz analytics dashboard.
//
// Surface the metrics the solopreneur cares about when they think
// "is my quiz actually pulling its weight":
//   - visiteurs / leads / taux de capture / taux d'export Systeme.io
//   - distribution des résultats (où atterrissent les leads)
//   - évolution quotidienne des leads (graph aire)
//
// All data flows through /api/quiz/[id]/analytics — period switcher
// triggers a refetch; everything else is just rendering. No DB
// migration needed; counters live on quizzes.views_count and the
// distribution is GROUP BY on the existing leads table.
//
// What's missing : drop-off per question. Needs a quiz_question_events
// table — flagged as v2.

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Eye,
  Info,
  Loader2,
  Pencil,
  Send,
  TrendingDown,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { stripHtml } from "@/lib/richText";
import { projectBackHref } from "@/lib/nav/projectBack";
import QuizInsightsPanel from "@/components/quiz/QuizInsightsPanel";
import { readFunnelSignal, stepLoss } from "@/lib/quiz/funnelSignal";

type Period = "7" | "30" | "90" | "all";

interface FunnelStep {
  questionIndex: number;
  views: number;
  answers: number;
  /** % of visitors lost compared to the previous question */
  dropFromPrevious: number;
  /** false = question vivante mais sans aucun event (ajoutée après coup,
   *  ou jamais atteinte). On ne l'affiche pas comme "0 visiteur". */
  hasData?: boolean;
}

interface AnalyticsResponse {
  ok: boolean;
  quiz: { id: string; title: string; created_at: string };
  period: Period;
  metrics: {
    viewsCount: number;
    completionsCount: number;
    leadsCount: number;
    exportedSioCount: number;
    // null = vues incomplètes pour ce quiz → on n'affiche pas un faux taux.
    captureRate: number | null;
    // false = ce quiz a capté des leads sans vue trackée (embarqué/funnel/
    // antérieur au tracking) → le taux de capture n'est pas fiable.
    viewsReliable?: boolean;
    exportRate: number;
  };
  resultDistribution: { title: string; count: number; pct: number }[];
  // count = inscrits du jour, views = visites du jour (source quiz_events).
  leadsByDay: { date: string; count: number; views?: number }[];
  funnel?: FunnelStep[];
  /** Questions supprimées depuis : leurs events sont exclus du funnel. */
  funnelRemovedQuestions?: number;
  totalFunnelSessions?: number;
  error?: string;
}


// Pie palette — 6 colors that read well stacked. We loop if the user
// has more buckets than colors (rare, but happens for very segmented
// quizzes).
const PIE_COLORS = [
  "#5D6CDB",
  "#22C55E",
  "#F97316",
  "#EC4899",
  "#0EA5E9",
  "#EAB308",
];

interface Props {
  quizId: string;
  /** Optionnel : si fourni, la page rend immédiatement sans flash de
   *  spinner. Sinon (cas par défaut depuis le fix Gwenn 19 mai 2026),
   *  le client fetch les données au mount. */
  initial?: AnalyticsResponse;
  /** quizzes.hide_response_counts : masque les nombres bruts dans la
   *  distribution par résultat (garde les %). N'affecte pas les exports. */
  hideCounts?: boolean;
}

// Placeholder vide qui satisfait le shape AnalyticsResponse pour le
// premier rendu quand on n'a pas de pré-fetch SSR. Le client fetch
// immédiatement et remplace ce placeholder ; tous les charts gèrent
// déjà des tableaux vides correctement.
const EMPTY_DATA: AnalyticsResponse = {
  ok: true,
  quiz: { id: "", title: "", created_at: new Date(0).toISOString() },
  period: "30",
  metrics: {
    viewsCount: 0,
    completionsCount: 0,
    leadsCount: 0,
    exportedSioCount: 0,
    captureRate: 0,
    viewsReliable: true,
    exportRate: 0,
  },
  resultDistribution: [],
  leadsByDay: [],
  funnel: [],
  totalFunnelSessions: 0,
};

export function QuizAnalyticsClient({ quizId, initial, hideCounts = false }: Props) {
  const t = useTranslations("quizAnalytics");
  const locale = useLocale();
  const PERIOD_LABELS: Record<Period, string> = {
    "7": t("period7"),
    "30": t("period30"),
    "90": t("period90"),
    all: t("periodAll"),
  };
  const [period, setPeriod] = useState<Period>(initial?.period ?? "30");
  const [data, setData] = useState<AnalyticsResponse>(initial ?? EMPTY_DATA);
  const [loading, setLoading] = useState(!initial);
  // Tracks fetch failure so we show an error state at top of page rather
  // than silently displaying zeros (Gwenn 19 mai 2026 : "données toutes
  // à zéro" — le fetch silencieux failait sans aucun signal visuel).
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/quiz/${encodeURIComponent(quizId)}/analytics?period=${period}&tz=${new Date().getTimezoneOffset()}`,
          { credentials: "include" },
        );
        const json = (await res.json().catch(() => ({ ok: false, error: "Invalid JSON" }))) as
          { ok: boolean; error?: string } & Partial<AnalyticsResponse>;
        if (cancelled) return;
        if (json.ok) {
          setData(json as AnalyticsResponse);
        } else {
          // Visible error so the user knows the page failed loading
          // (instead of trusting the placeholder zeros)
          setFetchError(
            json.error
              ? `${res.status} : ${json.error}`
              : `HTTP ${res.status}`,
          );
        }
      } catch (e) {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : "Network error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const m = data.metrics;
  // On n'affiche la ligne "vues" + la conversion par jour QUE si les vues
  // sont fiables pour ce quiz (sinon = vues incomplètes → trompeur).
  const showViews = m.viewsReliable !== false;

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <span className="font-medium">{t("loadError")}</span>
          <span className="font-mono text-xs opacity-80">({fetchError})</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* La flèche remonte à Mes projets (cf. lib/nav/projectBack.ts).
              Elle pointait vers l'éditeur, dont la flèche revenait ici :
              on tournait en boucle entre les deux écrans sans pouvoir en
              sortir (retour Gwenn, 1er août 2026). L'éditeur reste à un
              clic, par le lien nommé "Modifier" ci-dessous. */}
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={projectBackHref("analytics")}
              aria-label={t("backToProjects")}
            >
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2 min-w-0">
              <BarChart3 className="size-5 text-primary shrink-0" />
              <span className="truncate">{stripHtml(data.quiz.title)}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("statsHeader")} · {PERIOD_LABELS[data.period]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
        {/* Navigation LATÉRALE vers l'éditeur : nommée et explicite,
            jamais portée par la flèche retour. */}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/quiz/${quizId}`}>
            <Pencil className="size-3.5 mr-1.5" />
            {t("openEditor")}
          </Link>
        </Button>
        <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
          {(["7", "30", "90", "all"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              disabled={loading}
              className={`px-2.5 py-1 text-xs rounded-sm transition ${
                period === p
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "all" ? t("periodShortAll") : t("periodShortDays", { n: p })}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Eye className="size-4" />}
          label={t("kpiViews")}
          value={m.viewsCount.toLocaleString(locale)}
          hint={t("kpiViewsHint")}
        />
        <KpiCard
          icon={<Users className="size-4" />}
          label={t("kpiLeads")}
          value={m.leadsCount.toLocaleString(locale)}
          hint={t("kpiLeadsHint", { count: m.exportedSioCount })}
        />
        <KpiCard
          icon={<Activity className="size-4" />}
          label={t("kpiCaptureRate")}
          // Taux honnête : si les vues sont incomplètes (captureRate null),
          // on affiche "—" et un hint explicite plutôt qu'un faux 100%.
          value={m.captureRate === null ? "—" : `${m.captureRate}%`}
          hint={
            m.captureRate === null
              ? t("kpiCaptureRateUnreliable")
              : t("kpiCaptureRateHint")
          }
          accent="primary"
        />
        <KpiCard
          icon={<Send className="size-4" />}
          label={t("kpiExportSio")}
          value={`${m.exportRate}%`}
          hint={t("kpiExportSioHint")}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-sm font-semibold">{t("leadsEvolutionTitle")}</h2>
            <div className="flex items-center gap-3">
              {showViews && (
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: "#94A3B8" }} />
                    {t("seriesViews")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: "#5D6CDB" }} />
                    {t("seriesLeads")}
                  </span>
                </div>
              )}
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            </div>
          </div>
          {data.leadsByDay.length === 0 ? (
            <EmptyState message={t("emptyLeadsPeriod")} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.leadsByDay} margin={{ top: 4, left: -12, right: 8 }}>
                <defs>
                  <linearGradient id="qaLeadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5D6CDB" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5D6CDB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="qaViewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(s: string) => shortDate(s, locale)}
                  fontSize={10}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={10}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<DayTooltip showViews={showViews} />} />
                {/* Vues en fond (gris) — visible seulement si les vues sont
                    fiables pour ce quiz. Les inscrits par-dessus (indigo). */}
                {showViews && (
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    fill="url(#qaViewFill)"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#5D6CDB"
                  strokeWidth={2}
                  fill="url(#qaLeadFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">{t("distributionTitle")}</h2>
          {data.resultDistribution.length === 0 ? (
            <EmptyState message={t("emptyResults")} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data.resultDistribution}
                    dataKey="count"
                    nameKey="title"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data.resultDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ResultTooltip hideCounts={hideCounts} />} />
                  {/* La légende recharts a été retirée (Béné 2 juin 2026) :
                      elle chevauchait visuellement la liste custom ci-dessous,
                      surtout quand les titres de profils sont longs. La <ul>
                      qui suit suffit à identifier chaque tranche. */}
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1 text-xs">
                {data.resultDistribution.map((r, i) => (
                  <li
                    key={r.title}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="truncate">{stripHtml(r.title)}</span>
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {hideCounts ? `${r.pct}%` : `${r.count} · ${r.pct}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <FunnelSection
        funnel={data.funnel ?? []}
        totalSessions={data.totalFunnelSessions ?? 0}
      />

      {/* Analyse IA strategique de ce quiz (funnel + capture + profils +
          axes d'amelioration + actions). Gatee par plan cote endpoint. */}
      <QuizInsightsPanel quizId={quizId} />
    </div>
  );
}

function FunnelSection({
  funnel,
  totalSessions,
}: {
  funnel: FunnelStep[];
  totalSessions: number;
}) {
  const t = useTranslations("quizAnalytics");
  if (funnel.length === 0) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <TrendingDown className="size-4 text-primary" />
          {t("funnelTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("funnelEmpty")}
        </p>
      </Card>
    );
  }

  const tracked = funnel.filter((f) => f.hasData !== false);
  if (tracked.length === 0) {
    return (
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <TrendingDown className="size-4 text-primary" />
          {t("funnelTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("funnelEmpty")}</p>
      </Card>
    );
  }
  const baseline = tracked[0]!.views;
  // Le point chaud, ses seuils et surtout la question qu'il DÉSIGNE
  // vivent dans lib/quiz/funnelSignal.ts. Avant, ce composant calculait
  // lui-même un "pire drop" sans seuil d'échantillon, et nommait la
  // question SUIVANTE : celle que les partants n'avaient jamais vue
  // (drame Jocelyne, 4 août 2026).
  const signal = readFunnelSignal(funnel);
  const hotspotIndex = signal.hotspot?.questionIndex ?? -1;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="size-4 text-primary" />
            {t("funnelTitle")}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("funnelSubtitle")}
          </p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {t("sessionsStarted", { count: totalSessions })}
        </div>
      </div>

      {signal.kind === "hotspot" && signal.hotspot ? (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-100">
            {t.rich(
              signal.hotspot.shape === "on-question"
                ? "hotspotOnQuestion"
                : signal.hotspot.shape === "after-answer"
                  ? "hotspotAfterAnswer"
                  : "hotspotUnknown",
              {
                q: signal.hotspot.questionIndex + 1,
                lost: signal.hotspot.lost,
                sample: signal.hotspot.sample,
                bold: (chunks) => <span className="font-bold">{chunks}</span>,
              },
            )}
          </p>
        </div>
      ) : signal.kind === "too-few" ? (
        <div className="rounded-md bg-muted/50 border px-3 py-2 flex items-start gap-2">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {t("funnelTooFew", { needed: signal.needed, best: signal.bestSample })}
          </p>
        </div>
      ) : signal.kind === "steady" ? (
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2 flex items-start gap-2">
          <Info className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-900 dark:text-emerald-100">
            {t("funnelSteady")}
            {signal.readableUntil >= 0 && signal.readableUntil < tracked.length - 1
              ? " " + t("funnelReadableUntil", { q: signal.readableUntil + 1 })
              : ""}
          </p>
        </div>
      ) : null}

      {/* Le protocole de mesure. Jocelyne a enchaîné les modifications
          (question, réponses, ordre) en attendant trois personnes entre
          chaque : aucun effet n'était mesurable, et rien ne le lui
          disait. */}
      {signal.kind !== "no-data" ? (
        <div className="space-y-1">
          {/* Perdre du monde n'est PAS un échec. Sans cette phrase, une
              créatrice lit chaque départ comme une faute à corriger et
              se met à réécrire un quiz qui va bien. */}
          <p className="text-[11px] text-muted-foreground">{t("funnelNormalLoss")}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("funnelProtocol", { needed: signal.needed })}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        {tracked.map((step, i) => {
          const ratio = baseline > 0 ? step.views / baseline : 0;
          const isWorst = step.questionIndex === hotspotIndex;
          // La perte est portée par la question qui la SUBIT (ceux qui
          // l'ont vue sans atteindre la suivante), pas par la suivante.
          const loss = stepLoss(funnel, i);
          const widthPct = Math.max(6, ratio * 100);
          const completionPct =
            baseline > 0 ? Math.round(ratio * 1000) / 10 : 0;
          return (
            <div
              key={step.questionIndex}
              className="flex items-center gap-3 text-xs"
            >
              <div className="w-20 shrink-0 text-muted-foreground tabular-nums">
                Q{step.questionIndex + 1}
              </div>
              <div className="flex-1 relative h-7 rounded-md bg-muted/40 overflow-hidden">
                <div
                  className={`h-full ${
                    isWorst
                      ? "bg-amber-400/70"
                      : i === 0
                        ? "bg-primary/70"
                        : "bg-primary/40"
                  } transition-all`}
                  style={{ width: `${widthPct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 font-medium tabular-nums">
                  {step.views} ({completionPct}%)
                </span>
              </div>
              <div className="w-28 shrink-0 text-right tabular-nums">
                {loss ? (
                  <span
                    className={
                      isWorst
                        ? "text-amber-700 dark:text-amber-300 font-semibold"
                        : "text-muted-foreground"
                    }
                  >
                    {t("funnelStepLoss", { pct: loss.pct, lost: loss.lost })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ───────── Bits ─────────

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: "primary";
}) {
  return (
    <Card className={`p-4 ${accent === "primary" ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={accent === "primary" ? "text-primary" : ""}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[180px] grid place-items-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function shortDate(s: string, locale: string): string {
  // 2026-05-07 → 7 mai
  try {
    const d = new Date(s);
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  } catch {
    return s;
  }
}

type TooltipEntry = { value?: number; dataKey?: string; payload?: Record<string, unknown> };
type TooltipProps = { active?: boolean; label?: string; payload?: TooltipEntry[] };

function DayTooltip({ active, payload, label, showViews }: TooltipProps & { showViews?: boolean }) {
  const t = useTranslations("quizAnalytics");
  const locale = useLocale();
  if (!active || !payload?.length) return null;
  // payload contient les séries présentes ce jour-là. On lit par dataKey
  // pour ne pas dépendre de l'ordre de rendu.
  const byKey: Record<string, number> = {};
  for (const p of payload) if (p.dataKey) byKey[p.dataKey] = Number(p.value) || 0;
  const leads = byKey.count ?? 0;
  const views = byKey.views ?? 0;
  // Conversion du jour : inscrits / vues. Seulement si fiable (vues >= leads
  // et vues > 0) — sinon on n'invente pas un taux faux.
  const conv = showViews && views > 0 && views >= leads ? Math.round((leads / views) * 1000) / 10 : null;
  return (
    <div className="rounded-md border bg-background shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold">{shortDate(label ?? "", locale)}</div>
      {showViews && (
        <div className="tabular-nums" style={{ color: "#64748B" }}>
          {t("tooltipViews", { count: views })}
        </div>
      )}
      <div className="tabular-nums" style={{ color: "#5D6CDB" }}>
        {t("leadsCount", { count: leads })}
      </div>
      {conv !== null && (
        <div className="mt-0.5 font-medium tabular-nums">{t("tooltipConversion", { pct: conv })}</div>
      )}
    </div>
  );
}

function ResultTooltip({ active, payload, hideCounts }: TooltipProps & { hideCounts?: boolean }) {
  const t = useTranslations("quizAnalytics");
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  const row = p.payload ?? {};
  return (
    <div className="rounded-md border bg-background shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold">{stripHtml(String(row.title ?? ""))}</div>
      <div className="text-muted-foreground tabular-nums">
        {hideCounts
          ? `${Number(row.pct ?? 0)}%`
          : t("leadsCountWithPct", { count: p.value ?? 0, pct: Number(row.pct ?? 0) })}
      </div>
    </div>
  );
}
