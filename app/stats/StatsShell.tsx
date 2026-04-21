"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Eye, Play, CheckCircle, Users, Share2, TrendingUp, Sparkles, Loader2,
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

export default function StatsShell({ userEmail }: { userEmail: string }) {
  const tNav = useTranslations("nav");
  const t = useTranslations("stats");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

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
  const leadRate = totals.starts > 0 ? Math.round((totals.leads / totals.starts) * 100) : 0;

  async function runAiAnalysis() {
    setAnalyzingAi(true);
    try {
      const statsPayload = quizzes.map((q) => ({
        title: q.title,
        views: q.views_count,
        starts: q.starts_count,
        completions: q.completions_count,
        leads: q.leads_count ?? 0,
        shares: q.shares_count,
      }));

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze_stats",
          stats: statsPayload,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
        setAiAnalysis(text);
      }
    } catch {
      setAiAnalysis(t("aiUnavailable"));
    } finally {
      setAnalyzingAi(false);
    }
  }

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
        <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty")}</h3>
            <p className="text-muted-foreground">{t("emptyDesc")}</p>
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
                  <span className="font-semibold">{leadRate}%</span>
                </div>
                <Progress value={leadRate} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">{t("funnel.leadRateDetail", { leads: totals.leads, starts: totals.starts })}</p>
              </div>
            </CardContent>
          </Card>

          {/* Per-quiz stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t("perQuiz.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quizzes.map((quiz) => {
                  const qLeadRate = quiz.starts_count > 0
                    ? Math.round(((quiz.leads_count ?? 0) / quiz.starts_count) * 100)
                    : 0;
                  return (
                    <div key={quiz.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{quiz.title}</span>
                          <Badge variant={quiz.status === "active" ? "default" : "secondary"} className="text-xs">
                            {quiz.status === "active" ? t("statusActive") : t("statusDraft")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span><Eye className="inline h-3 w-3 mr-1" />{quiz.views_count}</span>
                          <span><Play className="inline h-3 w-3 mr-1" />{quiz.starts_count}</span>
                          <span><CheckCircle className="inline h-3 w-3 mr-1" />{quiz.completions_count}</span>
                          <span><Users className="inline h-3 w-3 mr-1" />{quiz.leads_count ?? 0}</span>
                          <span><Share2 className="inline h-3 w-3 mr-1" />{quiz.shares_count}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary">{qLeadRate}%</p>
                        <p className="text-xs text-muted-foreground">{t("perQuiz.conversion")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("ai.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiAnalysis ? (
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    {t("ai.intro")}
                  </p>
                  <Button onClick={runAiAnalysis} disabled={analyzingAi}>
                    {analyzingAi ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("ai.analyzing")}</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />{t("ai.analyze")}</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
