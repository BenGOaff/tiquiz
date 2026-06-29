"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import DashboardLayout from "@/components/DashboardLayout";
import { Greeting } from "@/components/ui/greeting";
import { WeeklyGoalCard } from "@/components/ui/weekly-goal-card";
import { WallOfWins } from "@/components/dashboard/WallOfWins";
import { MilestoneToastListener } from "@/components/dashboard/MilestoneToastListener";
import { pickWeeklyGoal } from "@/lib/weekly-goal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FirstQuizOnboarding } from "@/components/dashboard/FirstQuizOnboarding";
import { InsightsList } from "@/components/ui/insights-card";
import { SocialProofCounter } from "@/components/SocialProofCounter";
import { computeInsights } from "@/lib/insights";
import { stripHtml } from "@/lib/richText";
import {
  Plus, Eye, Users, TrendingUp, ClipboardList, Target, BarChart3,
  Sparkles, Mail, Link2, ArrowUpRight, Download,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Quiz = {
  id: string;
  title: string;
  status: string;
  views_count: number;
  starts_count: number;
  completions_count: number;
  shares_count: number;
  created_at: string;
  leads_count?: number;
  // Latest `quiz_leads.created_at` — drives the "your project went
  // quiet for N days" insight. Using `created_at` of the QUIZ itself
  // produced false positives (Adeline 2026-05-17: card said "14 jours
  // sans nouvelle réponse" while she'd just collected new leads).
  last_lead_at?: string | null;
};

// ---------------------------------------------------------------------------
// Chart colors matching the Tiquiz design system
// ---------------------------------------------------------------------------

const COLORS = {
  primary: "hsl(233, 64%, 61%)",       // #5D6CDB
  primaryLight: "hsl(233, 64%, 80%)",   // light indigo
  turquoise: "hsl(194, 79%, 52%)",      // #20BBE6
  navy: "hsl(230, 41%, 28%)",           // dark navy
  muted: "hsl(236, 16%, 50%)",          // muted gray
  light: "hsl(0, 0%, 87%)",             // light gray
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardClient({ userEmail }: { userEmail?: string }) {
  const t = useTranslations("dashboard");
  const tn = useTranslations("nav");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    try {
      // `/api/quiz` renvoie désormais `leads_count` et `last_lead_at` par
      // quiz, agrégés en SQL (fiables à tout volume). Plus de fetch par
      // quiz (N+1) ni de comptage plafonné à 1000 (bug Gwenn gros volume).
      const res = await fetch("/api/quiz");
      const data = await res.json();
      if (data.ok && Array.isArray(data.quizzes)) {
        setQuizzes(
          data.quizzes.map((quiz: Quiz) => ({
            ...quiz,
            leads_count: typeof quiz.leads_count === "number" ? quiz.leads_count : 0,
            last_lead_at: quiz.last_lead_at ?? null,
          })),
        );
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------

  const totals = useMemo(() => {
    // Réconciliation PAR QUIZ avant d'additionner (Béné 2 juin 2026 —
    // retour Gwenn) : sur chaque ligne, vues >= starts >= completions
    // >= leads. Sans ça, un quiz à 44 vues / 276 leads tirait le total
    // de vues vers le bas et le taux global devenait incohérent.
    let views = 0, starts = 0, completions = 0, leads = 0;
    for (const q of quizzes) {
      const qLeads = q.leads_count ?? 0;
      const qCompletions = Math.max(q.completions_count, qLeads);
      const qStarts = Math.max(q.starts_count, qCompletions);
      const qViews = Math.max(q.views_count, qStarts);
      views += qViews;
      starts += qStarts;
      completions += qCompletions;
      leads += qLeads;
    }
    // Conversion : on préfère leads/starts (vrai funnel) mais on
    // retombe sur leads/views quand `starts` n'a jamais été tracké
    // (quiz pré-migration tracking 21 mai 2026 où le start n'était
    // pas loggé). Cap à 100 % au cas où leads > denom (peut arriver
    // si quiz_leads contient des entrées issues d'un import / d'un
    // ancien flow qui ne passait pas par le tracking front).
    const denom = starts > 0 ? starts : views;
    const conversionRate = denom > 0
      ? Math.min(100, Math.round((leads / denom) * 100))
      : 0;
    return { views, starts, completions, leads, conversionRate, quizCount: quizzes.length };
  }, [quizzes]);

  // Weekly goal — pure derivation from existing dashboard data, no
  // extra fetch. Picks one (or null) most-relevant next-step goal.
  const weeklyGoal = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const recentLeads = quizzes.reduce((s, q) => {
      // We don't track per-day leads on the dashboard — approximate by
      // counting quizzes created in the last 7d as "recent activity".
      return s + (new Date(q.created_at).getTime() > sevenDaysAgo ? (q.leads_count ?? 0) : 0);
    }, 0);
    return pickWeeklyGoal({
      publishedCount: quizzes.filter((q) => q.status === "active").length,
      totalLeads: totals.leads,
      activeSurveyCount: 0, // Tiquiz dashboard groups quiz + survey rows together; refine when listings split
      leadsLastWeek: recentLeads,
    });
  }, [quizzes, totals.leads]);

  // Smart insights — rule-based, no LLM call. Detects situations like
  // "your project is quiet for 7+ days" or "high traffic + low capture
  // = funnel leak" and surfaces them as actionable cards. Up to 3.
  const insights = useMemo(() => {
    const now = Date.now();
    return computeInsights({
      activeProjects: quizzes
        .filter((q) => q.status === "active")
        .map((q) => ({
          id: q.id,
          // Le titre est édité via RichTextEdit → peut contenir des
          // `<span style="color:…">`. Pour l'affichage en texte plat
          // (cartes insight, dropdowns, charts), on strip les tags.
          title: stripHtml(q.title),
          starts_count: q.starts_count,
          leads_count: q.leads_count ?? 0,
          shares_count: q.shares_count,
          // "Last activity" = most recent lead capture. Falls back to
          // null when the quiz has no leads yet, so the quietProject
          // rule (which requires leads_count > 0) self-disables.
          daysSinceActive: q.last_lead_at
            ? Math.max(
                0,
                Math.floor((now - new Date(q.last_lead_at).getTime()) / 86400000),
              )
            : null,
          mode: null,
        })),
      totalLeads: totals.leads,
      draftProjectCount: quizzes.filter((q) => q.status === "draft").length,
    });
  }, [quizzes, totals.leads]);

  // Prospects donut data : on prend `starts` comme dénominateur quand
  // dispo, sinon `views` (cf. fallback de la card conversion). Les
  // 3 segments restent : leads (capturés), completed-sans-lead, et
  // abandoned (= dénom - completions). Quand starts=0 mais views>0 +
  // leads>0, on synthétise un funnel views=base / leads / abandoned
  // (le reste des vues qui n'ont pas converti).
  const prospectsData = useMemo(() => {
    const leads = Math.max(totals.leads, 0);
    const completedNonLead = Math.max(totals.completions - leads, 0);
    // Si starts a été tracké, on utilise vraiment le funnel.
    // Sinon : fallback sur views pour avoir au moins 2 segments.
    const denom = totals.starts > 0 ? totals.starts : totals.views;
    const abandoned = Math.max(denom - totals.completions - leads, 0);
    return [
      { name: t("leads"), value: leads, color: COLORS.primary },
      { name: t("completions"), value: completedNonLead, color: COLORS.primaryLight },
      { name: t("abandoned"), value: abandoned, color: COLORS.navy },
    ].filter((d) => d.value > 0);
  }, [totals, t]);

  // Placeholder donut for when there's no data
  const placeholderDonut = [
    { name: t("leads"), value: 45, color: COLORS.primary },
    { name: t("completions"), value: 30, color: COLORS.primaryLight },
    { name: t("abandoned"), value: 25, color: COLORS.navy },
  ];

  // Traffic chart data — per quiz, with placeholder if empty
  const trafficData = useMemo(() => {
    if (quizzes.length === 0) return [];
    return quizzes.map((q) => {
      const plain = stripHtml(q.title);
      return {
        name: plain.length > 15 ? plain.slice(0, 15) + "\u2026" : plain,
        [t("views")]: q.views_count,
        [t("leads")]: q.leads_count ?? 0,
      };
    });
  }, [quizzes, t]);

  const placeholderTraffic = [
    { name: t("month1"), [t("views")]: 0, [t("leads")]: 0 },
    { name: t("month2"), [t("views")]: 0, [t("leads")]: 0 },
    { name: t("month3"), [t("views")]: 0, [t("leads")]: 0 },
    { name: t("month4"), [t("views")]: 0, [t("leads")]: 0 },
    { name: t("month5"), [t("views")]: 0, [t("leads")]: 0 },
    { name: t("month6"), [t("views")]: 0, [t("leads")]: 0 },
  ];

  const hasRealTraffic = trafficData.length > 0;
  const chartTrafficData = hasRealTraffic ? trafficData : placeholderTraffic;
  // Le donut s'affiche dès qu'il y a une vue ou un lead — pas seulement
  // un "start". Sinon les quizzes pré-migration tracking (starts=0)
  // restent à "Pas encore de données" alors que des leads existent
  // (Gwenn 19 mai 2026 : 34 vues + 8 leads → donut vide à tort).
  const hasRealProspects = totals.starts > 0 || totals.views > 0 || totals.leads > 0;
  const chartProspectsData = hasRealProspects ? prospectsData : placeholderDonut;

  // ---------------------------------------------------------------------------
  // KPI definitions
  // ---------------------------------------------------------------------------

  const KPI_CARDS = [
    {
      label: t("quizzesCreated"),
      value: totals.quizCount,
      sub: t("quizzesCreatedSub"),
      icon: ClipboardList,
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-500",
    },
    {
      label: t("leadsCaptured"),
      value: totals.leads,
      sub: t("leadsCapturedSub"),
      icon: Users,
      bgColor: "bg-violet-50",
      iconColor: "text-violet-500",
    },
    {
      label: t("totalViews"),
      value: totals.views,
      sub: t("totalViewsSub"),
      icon: Eye,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: t("conversionRate"),
      value: `${totals.conversionRate}%`,
      sub: t("conversionRateSub"),
      icon: TrendingUp,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
  ];

  // ---------------------------------------------------------------------------
  // Suggestion cards
  // ---------------------------------------------------------------------------

  const SUGGESTIONS = [
    {
      title: t("sug1Title"),
      description: t("sug1Desc"),
      icon: Sparkles,
      href: "/quiz/new",
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      title: t("sug2Title"),
      description: t("sug2Desc"),
      icon: Mail,
      href: "/quizzes",
      iconColor: "text-pink-500",
      bgColor: "bg-pink-50",
    },
    {
      title: t("sug3Title"),
      description: t("sug3Desc"),
      icon: Link2,
      href: "/settings",
      iconColor: "text-cyan-500",
      bgColor: "bg-cyan-50",
    },
  ];

  // ---------------------------------------------------------------------------
  // Custom Tooltip
  // ---------------------------------------------------------------------------

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-1.5">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout
      title={tn("dashboard")}
      userEmail={userEmail}
    >
      {loading ? (
        /* Shimmer skeletons (replaces the static animate-pulse stand-ins
           with the design-system Skeleton primitive — same shape, nicer
           loading effect, coordinated across the page). */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="py-5 px-5 space-y-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="py-8">
                  <Skeleton className="h-[200px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Personalised hero — replaces the static welcome card. Uses the
              user's first name when available; rotates a friendly subtitle
              once a day so returning users don't see the same line. */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <Greeting subtitle />
            <div className="flex items-center gap-3 flex-wrap">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-primary text-primary hover:bg-primary/5"
            >
              <Link href="/leads">
                <Download className="h-4 w-4 mr-1.5" />
                {t("downloadLeads")}
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full"
            >
              <Link href="/quiz/new">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("newQuiz")}
              </Link>
            </Button>
            </div>
          </div>

          {/* Toasts de milestones débloqués (port phase 1). Lu client-side
              au mount, fire-and-forget, jamais bloquant. */}
          <MilestoneToastListener />

          {/* Wall of Wins — port phase 2 rétention. Auto-caché si aucun
              résultat sur la période (règle Béné "motivant ou rien").
              Fetch indépendant, non bloquant. */}
          <WallOfWins />

          {/* Weekly goal — picks the most relevant next-step automatically.
              Renders nothing when the user has hit every milestone we
              track. Soft tinted card so it feels like guidance, not a
              billboard. */}
          {weeklyGoal && <WeeklyGoalCard goal={weeklyGoal} />}

          {/* Rule-based smart insights — quiet projects, leaky funnels,
              top performers, surveys to launch. Renders nothing when
              no rule matches, so it's never noise. */}
          {insights.length > 0 && <InsightsList insights={insights} />}

          {/* Premier quiz : onboarding avec 6 templates phares (1 clic =
              quiz prêt à éditer). Remplace l'ancien bandeau générique
              "Créer mon premier quiz" qui envoyait vers /quiz/new vide
              (friction inutile maintenant qu'on a 15 templates V2). */}
          {quizzes.length === 0 && <FirstQuizOnboarding />}

          {/* Row 3: KPI stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI_CARDS.map(({ label, value, sub, icon: Icon, bgColor, iconColor }) => (
              <Card key={label} className="hover:shadow-md transition-shadow">
                <CardContent className="py-5 px-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tabular-nums leading-none mb-1">
                    {value}
                  </p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Row 3: Charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Prospects Donut */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Prospects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center relative">
                  {!hasRealProspects && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-background/90 backdrop-blur-sm rounded-xl px-5 py-3 text-center shadow-sm border">
                        <p className="text-sm font-medium text-foreground">{t("noDataYet")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("noDataYetDesc")}</p>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chartProspectsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartProspectsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            opacity={hasRealProspects ? 1 : 0.2}
                          />
                        ))}
                      </Pie>
                      {hasRealProspects && <Tooltip content={<CustomTooltip />} />}
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {(hasRealProspects ? prospectsData : placeholderDonut).map((d) => (
                      <span key={d.name} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: d.color, opacity: hasRealProspects ? 1 : 0.4 }}
                        />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {!hasRealTraffic && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-background/90 backdrop-blur-sm rounded-xl px-5 py-3 text-center shadow-sm border">
                        <p className="text-sm font-medium text-foreground">{t("noDataYet")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("noDataYetDesc")}</p>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart
                      data={chartTrafficData}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                      barGap={2}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      {hasRealTraffic && <Tooltip content={<CustomTooltip />} />}
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Bar
                        dataKey={t("views")}
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                        opacity={hasRealTraffic ? 1 : 0.2}
                      />
                      <Bar
                        dataKey={t("leads")}
                        fill={COLORS.turquoise}
                        radius={[4, 4, 0, 0]}
                        opacity={hasRealTraffic ? 1 : 0.2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Suggestion cards */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("suggestionsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUGGESTIONS.map((s) => (
                <Card key={s.title} className="hover:shadow-md transition-shadow group">
                  <CardContent className="py-5 px-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg ${s.bgColor} flex items-center justify-center`}
                      >
                        <s.icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {s.description}
                    </p>
                    <Button asChild variant="outline" size="sm" className="rounded-full">
                      <Link href={s.href}>{t("learnMore")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Preuve sociale globale Tiquiz, en bandeau de fin (Béné 3 juin
              2026 — auparavant placé entre les insights et les KPI perso,
              ce qui prêtait à confusion avec les stats de l'user). Ici, ça
              ferme la session sur un encouragement communautaire. */}
          <SocialProofCounter variant="hero" />
        </div>
      )}
    </DashboardLayout>
  );
}
