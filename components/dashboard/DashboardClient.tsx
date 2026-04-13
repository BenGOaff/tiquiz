"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Eye, Users, TrendingUp, ClipboardList, Target, BarChart3,
  Sparkles, Mail, Link2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
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
  }

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------

  const totals = useMemo(() => {
    const views = quizzes.reduce((s, q) => s + q.views_count, 0);
    const starts = quizzes.reduce((s, q) => s + q.starts_count, 0);
    const completions = quizzes.reduce((s, q) => s + q.completions_count, 0);
    const leads = quizzes.reduce((s, q) => s + (q.leads_count ?? 0), 0);
    const conversionRate = starts > 0 ? Math.round((leads / starts) * 100) : 0;
    return { views, starts, completions, leads, conversionRate, quizCount: quizzes.length };
  }, [quizzes]);

  // Prospects donut data
  const prospectsData = useMemo(() => {
    const leads = totals.leads;
    const completed = totals.completions - leads;
    const abandoned = totals.starts - totals.completions;
    return [
      { name: t("leads"), value: Math.max(leads, 0), color: "hsl(233, 64%, 61%)" },
      { name: t("completions"), value: Math.max(completed, 0), color: "hsl(233, 64%, 80%)" },
      { name: "Abandon", value: Math.max(abandoned, 0), color: "hsl(230, 41%, 28%)" },
    ].filter((d) => d.value > 0);
  }, [totals, t]);

  // Traffic chart data — per quiz
  const trafficData = useMemo(() => {
    return quizzes.map((q) => ({
      name: q.title.length > 20 ? q.title.slice(0, 20) + "\u2026" : q.title,
      vues: q.views_count,
      leads: q.leads_count ?? 0,
    }));
  }, [quizzes]);

  // ---------------------------------------------------------------------------
  // KPI definitions
  // ---------------------------------------------------------------------------

  const KPI_CARDS = [
    {
      label: "Quiz cr\u00e9\u00e9s",
      value: totals.quizCount,
      icon: ClipboardList,
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-500",
    },
    {
      label: "Leads captur\u00e9s",
      value: totals.leads,
      icon: Users,
      bgColor: "bg-violet-50",
      iconColor: "text-violet-500",
    },
    {
      label: "Nombre de visiteurs",
      value: totals.views,
      icon: Eye,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: t("conversionRate"),
      value: `${totals.conversionRate}%`,
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
      title: "Optimise tes quiz",
      description: "Ajoute des questions engageantes pour am\u00e9liorer ton taux de compl\u00e9tion.",
      icon: Sparkles,
      href: "/quiz/new",
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      title: "Capture plus de leads",
      description: "Active la capture d\u2019email et configure un bonus de partage.",
      icon: Mail,
      href: "/quizzes",
      iconColor: "text-pink-500",
      bgColor: "bg-pink-50",
    },
    {
      title: "Connecte Systeme.io",
      description: "Synchronise automatiquement tes leads avec ton compte Systeme.io.",
      icon: Link2,
      href: "/settings",
      iconColor: "text-cyan-500",
      bgColor: "bg-cyan-50",
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout title={tn("dashboard")} userEmail={userEmail}>
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">...</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("noQuizzes")}</h3>
            <p className="text-muted-foreground mb-6">{t("noQuizzesDesc")}</p>
            <Button asChild>
              <Link href="/quiz/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("createQuiz")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Row 2: KPI stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI_CARDS.map(({ label, value, icon: Icon, bgColor, iconColor }) => (
              <Card key={label}>
                <CardContent className="py-5 px-5">
                  <div
                    className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center mb-3`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold tabular-nums leading-none mb-1">
                    {value}
                  </p>
                  <p className="text-sm text-muted-foreground">{label}</p>
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
                {prospectsData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={prospectsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {prospectsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            fontSize: "13px",
                            border: "1px solid hsl(var(--border))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {prospectsData.map((d) => (
                        <span key={d.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: d.color }}
                          />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donn\u00e9e
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Traffic Area Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trafficData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart
                      data={trafficData}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          fontSize: "13px",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="vues"
                        name={t("views")}
                        stroke="hsl(233, 64%, 61%)"
                        fill="hsl(233, 64%, 61%)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        name={t("leads")}
                        stroke="hsl(233, 64%, 80%)"
                        fill="hsl(233, 64%, 80%)"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donn\u00e9e
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Suggestion cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUGGESTIONS.map((s) => (
              <Card key={s.title}>
                <CardContent className="py-5 px-5">
                  <div
                    className={`w-9 h-9 rounded-lg ${s.bgColor} flex items-center justify-center mb-3`}
                  >
                    <s.icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {s.description}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={s.href}>En savoir plus</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
