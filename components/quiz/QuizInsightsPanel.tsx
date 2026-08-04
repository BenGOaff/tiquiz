"use client";

// components/quiz/QuizInsightsPanel.tsx (Tiquiz)
//
// Analyse IA STRATÉGIQUE d'un quiz ou sondage : diagnostic funnel +
// capture + profil des visiteurs + axes d'amelioration + actions
// ventes/captures. Endpoint /api/quiz/[quizId]/insights. Gatee par plan.
// Meme grammaire visuelle que SurveyResultsPanel (carte accent primary,
// etats plan/pas-assez-de-donnees/analyse).

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Sparkles, Loader2, RefreshCw, Lock, TrendingUp, Users, Wrench, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InsightsResult {
  summary: string;
  funnel: string;
  audience: string;
  /** LA chose à faire maintenant, une seule. Absent des rapports générés
   *  avant le 4 août 2026 : on retombe alors sur l'affichage historique
   *  (tout déplié), sans rien casser. */
  priority?: { title: string; why: string; how: string } | null;
  improvements: string[];
  actions: string[];
  generated_at?: string;
}

interface PanelState {
  analysis: InsightsResult | null;
  analysisAt: string | null;
  hasEnough: boolean;
  minLeads: number;
  minViews: number;
  eligible: boolean;
  showUpsell: boolean;
}

export default function QuizInsightsPanel({ quizId }: { quizId: string }) {
  const t = useTranslations("insights");
  const locale = useLocale();
  const [state, setState] = useState<PanelState | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quiz/${quizId}/insights`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setState({
          analysis: d.analysis ?? null,
          analysisAt: d.analysisAt ?? null,
          hasEnough: !!d.hasEnough,
          minLeads: d.minLeads ?? 5,
          minViews: d.minViews ?? 20,
          eligible: !!d.eligible,
          showUpsell: !!d.showUpsell,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/insights`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.error === "NOT_ENOUGH_DATA") toast.error(data.message ?? t("errNotEnough"));
        else if (data?.error === "PLAN_REQUIRED") toast.error(data.message ?? t("errPlan"));
        else toast.error(t("errGeneric"));
        return;
      }
      setState((prev) => (prev ? { ...prev, analysis: data.analysis, analysisAt: data.analysisAt } : prev));
      toast.success(t("ready"));
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setGenerating(false);
    }
  }, [quizId, t]);

  const a = state?.analysis ?? null;

  return (
    <Card className="p-5 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("quizTitle")}</h3>
      </div>

      {state && !state.eligible && !a ? (
        <div className="mt-1 space-y-2">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{t("quizLock")}</p>
          </div>
          {state.showUpsell ? (
            <p className="text-sm text-foreground pl-6">{t("quizUpsell")}</p>
          ) : (
            <p className="text-sm text-muted-foreground pl-6 italic">{t("comingSoon")}</p>
          )}
        </div>
      ) : state && !state.hasEnough && !a ? (
        <p className="text-sm text-muted-foreground mt-1">
          {t("quizNotEnough", { minLeads: state.minLeads, minViews: state.minViews })}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">{t("quizIntro")}</p>

          {a && (
            <div className="space-y-3 mb-3">
              <Section icon={<TrendingUp className="w-3.5 h-3.5" />} label={t("quizSectionDiag")}>
                <p className="text-sm">{a.summary}</p>
              </Section>
              {/* LA priorité, en premier et en évidence.
                  Retour Béné, 4 août 2026 : "le coach n'est pas focus, il
                  donne trop d'infos trop compliquées d'un coup. Il doit
                  donner la bonne info au bon moment pour guider l'user, pas
                  l'assommer avec toute sa connaissance." Le rapport du
                  3 août à Jocelyne alignait dix conseils : le premier était
                  le bon, elle a travaillé le deuxième pendant trois
                  semaines, sur trois personnes. */}
              {a.priority && (
                <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {t("quizSectionPriority")}
                  </p>
                  <p className="text-sm font-semibold">{a.priority.title}</p>
                  {a.priority.why && <p className="text-sm">{a.priority.why}</p>}
                  {a.priority.how && (
                    <p className="text-sm text-muted-foreground">{a.priority.how}</p>
                  )}
                </div>
              )}
              {a.funnel && (
                <Section icon={<TrendingUp className="w-3.5 h-3.5" />} label={t("quizSectionFunnel")}>
                  <p className="text-sm">{a.funnel}</p>
                </Section>
              )}
              {a.audience && (
                <Section icon={<Users className="w-3.5 h-3.5" />} label={t("quizSectionAudience")}>
                  <p className="text-sm">{a.audience}</p>
                </Section>
              )}
              {(a.improvements.length > 0 || a.actions.length > 0) && (
              <details open={!a.priority} className="rounded-lg border bg-muted/20 px-3 py-2">
                <summary className="text-xs font-medium cursor-pointer text-muted-foreground">
                  {t("quizLaterToggle")}
                </summary>
                <div className="mt-2 space-y-3">
              {a.improvements.length > 0 && (
                <Section icon={<Wrench className="w-3.5 h-3.5" />} label={t("quizSectionImprove")}>
                  <ul className="mt-1 space-y-1">
                    {a.improvements.map((t, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {a.actions.length > 0 && (
                <Section icon={<Rocket className="w-3.5 h-3.5" />} label={t("quizSectionActions")}>
                  <ul className="mt-1 space-y-1">
                    {a.actions.map((t, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="mt-0.5 text-primary shrink-0 font-medium">{i + 1}.</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
                </div>
              </details>
              )}
            </div>
          )}

          <Button size="sm" onClick={handleGenerate} disabled={generating || (!state?.hasEnough && !a)}>
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                {t("btnGenerating")}
              </>
            ) : a ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                {t("btnRefresh")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {t("btnRun")}
              </>
            )}
          </Button>
          {a?.generated_at && (
            <p className="text-[11px] text-muted-foreground mt-2">
              {t("lastRun")}{new Date(a.generated_at).toLocaleString(locale)}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
