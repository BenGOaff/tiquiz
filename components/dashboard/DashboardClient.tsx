"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Eye, Play, CheckCircle, Users, Share2, Pencil, Trash2, Copy,
  BarChart3, TrendingUp, Target, ClipboardList, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
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

  async function handleDelete(quizId: string) {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/quiz/${quizId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
        toast.success(t("quizDeleted"));
      }
    } catch {
      toast.error("Error");
    }
  }

  function copyLink(quizId: string) {
    const url = `${window.location.origin}/q/${quizId}`;
    navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  }

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------

  const totals = useMemo(() => {
    const views = quizzes.reduce((s, q) => s + q.views_count, 0);
    const starts = quizzes.reduce((s, q) => s + q.starts_count, 0);
    const completions = quizzes.reduce((s, q) => s + q.completions_count, 0);
    const leads = quizzes.reduce((s, q) => s + (q.leads_count ?? 0), 0);
    const shares = quizzes.reduce((s, q) => s + q.shares_count, 0);
    const conversionRate = starts > 0 ? Math.round((leads / starts) * 100) : 0;
    return { views, starts, completions, leads, shares, conversionRate };
  }, [quizzes]);

  // Prospects donut data
  const prospectsData = useMemo(() => {
    const leads = totals.leads;
    const completed = totals.completions - leads; // completed but didn't convert
    const abandoned = totals.starts - totals.completions; // started but didn't finish
    return [
      { name: t("leads"), value: Math.max(leads, 0), color: "hsl(233, 64%, 61%)" },
      { name: t("completions"), value: Math.max(completed, 0), color: "hsl(233, 64%, 80%)" },
      { name: "Abandon", value: Math.max(abandoned, 0), color: "hsl(230, 41%, 28%)" },
    ].filter((d) => d.value > 0);
  }, [totals, t]);

  // Traffic chart data — per quiz
  const trafficData = useMemo(() => {
    return quizzes.map((q) => ({
      name: q.title.length > 20 ? q.title.slice(0, 20) + "…" : q.title,
      vues: q.views_count,
      leads: q.leads_count ?? 0,
    }));
  }, [quizzes]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const KPI_CARDS = [
    { label: t("views"), value: totals.views, icon: Eye, color: "text-blue-500" },
    { label: t("starts"), value: totals.starts, icon: Play, color: "text-indigo-500" },
    { label: t("leads"), value: totals.leads, icon: Users, color: "text-primary" },
    { label: t("conversionRate"), value: `${totals.conversionRate}%`, icon: TrendingUp, color: "text-emerald-500" },
  ];

  return (
    <DashboardLayout title={tn("dashboard")} userEmail={userEmail}>
      {/* Page banner */}
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{tn("dashboard")}</h2>
          <p className="text-sm text-white/70">{t("subtitle")}</p>
        </div>
        <Button asChild variant="secondary" className="shrink-0">
          <Link href="/quiz/new"><Plus className="h-4 w-4 mr-2" />{t("createQuiz")}</Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">...</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("noQuizzes")}</h3>
            <p className="text-muted-foreground mb-6">{t("noQuizzesDesc")}</p>
            <Button asChild>
              <Link href="/quiz/new"><Plus className="h-4 w-4 mr-2" />{t("createQuiz")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row */}
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
                          contentStyle={{ borderRadius: "8px", fontSize: "13px", border: "1px solid hsl(var(--border))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {prospectsData.map((d) => (
                        <span key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
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
                    <AreaChart data={trafficData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", fontSize: "13px", border: "1px solid hsl(var(--border))" }}
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
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quiz list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                {t("title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {quizzes.map((quiz) => {
                  const leads = quiz.leads_count ?? 0;
                  const rate = quiz.starts_count > 0
                    ? Math.round((leads / quiz.starts_count) * 100)
                    : 0;

                  return (
                    <div key={quiz.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <Link
                            href={`/quiz/${quiz.id}`}
                            className="font-semibold hover:underline truncate"
                          >
                            {quiz.title}
                          </Link>
                          <Badge variant={quiz.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {quiz.status === "active" ? "Active" : "Draft"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{quiz.views_count}</span>
                          <span className="flex items-center gap-1"><Play className="h-3 w-3" />{quiz.starts_count}</span>
                          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{quiz.completions_count}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{leads}</span>
                          <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{quiz.shares_count}</span>
                          {rate > 0 && (
                            <span className="font-medium text-foreground">{rate}%</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(quiz.id)} title={t("copyLink")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/quiz/${quiz.id}`} title={t("editQuiz")}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(quiz.id)} title={t("deleteQuiz")}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
