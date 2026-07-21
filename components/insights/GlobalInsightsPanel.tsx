"use client";

// components/insights/GlobalInsightsPanel.tsx (Tiquiz)
//
// Analyse IA STRATÉGIQUE GLOBALE : compte-rendu de pilotage sur tous les
// quiz/sondages du user (ce qui marche, ce qui bloque, quoi lancer/
// modifier ensuite). Endpoint /api/insights/global. Gatee par plan.

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Sparkles, Loader2, RefreshCw, Lock, CheckCircle2, AlertTriangle, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GlobalReport {
  summary: string;
  whatWorks: string[];
  toFix: string[];
  nextMoves: string[];
  generated_at?: string;
}

interface PanelState {
  analysis: GlobalReport | null;
  analysisAt: string | null;
  hasEnough: boolean;
  minLeads: number;
  eligible: boolean;
  showUpsell: boolean;
}

export default function GlobalInsightsPanel() {
  const [state, setState] = useState<PanelState | null>(null);
  const [generating, setGenerating] = useState(false);
  const t = useTranslations("insights");
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/insights/global`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setState({
          analysis: d.analysis ?? null,
          analysisAt: d.analysisAt ?? null,
          hasEnough: !!d.hasEnough,
          minLeads: d.minLeads ?? 5,
          eligible: !!d.eligible,
          showUpsell: !!d.showUpsell,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/insights/global`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.error === "NOT_ENOUGH_DATA" || data?.error === "NO_PROJECTS")
          toast.error(data.message ?? t("errNotEnough"));
        else if (data?.error === "PLAN_REQUIRED") toast.error(data.message ?? t("errPlan"));
        else toast.error(t("errGeneric"));
        return;
      }
      setState((prev) => (prev ? { ...prev, analysis: data.analysis, analysisAt: data.analysisAt } : prev));
      toast.success(t("globalReady"));
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setGenerating(false);
    }
  }, []);

  const a = state?.analysis ?? null;

  return (
    <Card className="p-5 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("globalTitle")}</h3>
      </div>

      {state && !state.eligible && !a ? (
        <div className="mt-1 space-y-2">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{t("globalLock")}</p>
          </div>
          {state.showUpsell ? (
            <p className="text-sm text-foreground pl-6">{t("globalUpsell")}</p>
          ) : (
            <p className="text-sm text-muted-foreground pl-6 italic">{t("comingSoon")}</p>
          )}
        </div>
      ) : state && !state.hasEnough && !a ? (
        <p className="text-sm text-muted-foreground mt-1">
          {t("globalNotEnough", { minLeads: state.minLeads })}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">{t("globalIntro")}</p>

          {a && (
            <div className="space-y-3 mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("globalSectionState")}
                </p>
                <p className="text-sm mt-1">{a.summary}</p>
              </div>
              <ReportList
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label={t("globalSectionWorks")}
                items={a.whatWorks}
                accent="text-emerald-600 dark:text-emerald-400"
              />
              <ReportList
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                label={t("globalSectionFix")}
                items={a.toFix}
                accent="text-amber-600 dark:text-amber-400"
              />
              <ReportList
                icon={<Rocket className="w-3.5 h-3.5" />}
                label={t("globalSectionNext")}
                items={a.nextMoves}
                accent="text-primary"
                numbered
              />
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
                {t("globalBtnRun")}
              </>
            )}
          </Button>
          {a?.generated_at && (
            <p className="text-[11px] text-muted-foreground mt-2">
              {t("lastRun")} {new Date(a.generated_at).toLocaleString(locale)}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function ReportList({
  icon,
  label,
  items,
  accent,
  numbered,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  accent: string;
  numbered?: boolean;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <span className={accent}>{icon}</span>
        {label}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            {numbered ? (
              <span className={`mt-0.5 shrink-0 font-medium ${accent}`}>{i + 1}.</span>
            ) : (
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${accent.replace("text-", "bg-")}`} />
            )}
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
