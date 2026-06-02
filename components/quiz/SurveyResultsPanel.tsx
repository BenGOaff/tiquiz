"use client";

// components/quiz/SurveyResultsPanel.tsx (Tiquiz)
//
// Panneau dans le tab "trends" d'un sondage : export CSV/PDF + analyse
// IA des résultats. Port adapté de Tipote :
//   - Tiquiz n'a pas de crédits → l'analyse IA est gatée par PLAN
//     (option payante d'un plan supérieur). Si non éligible, on montre
//     un encart "fonctionnalité premium" au lieu du bouton.
//   - Toast via sonner (toaster Tiquiz).

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Sparkles, Loader2, RefreshCw, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AnalysisResult {
  summary: string;
  takeaways: string[];
  actions: string[];
}

interface AnalysisState {
  analysis: AnalysisResult | null;
  totalResponses: number;
  minResponses: number;
  hasEnough: boolean;
  eligible: boolean;
  /** True pour plans monthly/yearly — affiche un CTA upgrade dédié. */
  showUpsell: boolean;
}

export default function SurveyResultsPanel({
  quizId,
  surveyTitle,
}: {
  quizId: string;
  surveyTitle: string;
}) {
  const [state, setState] = useState<AnalysisState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quiz/${quizId}/survey-analysis`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setState({
          analysis: d.analysis ?? null,
          totalResponses: d.totalResponses ?? 0,
          minResponses: d.minResponses ?? 5,
          hasEnough: !!d.hasEnough,
          eligible: !!d.eligible,
          showUpsell: !!d.showUpsell,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const handleExportCsv = useCallback(() => {
    window.location.href = `/api/quiz/${quizId}/survey-results?format=csv`;
  }, [quizId]);

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/survey-results?format=json`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error("Impossible de charger les résultats.");
        return;
      }
      // jspdf + renderer chargés en dynamic import (client-only).
      const [{ jsPDF }, { renderSurveyPdf, BRAND_TIQUIZ }] = await Promise.all([
        import("jspdf"),
        import("@/lib/survey/pdfReport"),
      ]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      renderSurveyPdf(
        doc,
        {
          title: String(data.title ?? surveyTitle),
          totalResponses: data.totalResponses ?? 0,
          questions: data.questions ?? [],
          analysis: state?.analysis ?? null,
        },
        BRAND_TIQUIZ,
      );
      const safe = String(data.title ?? "sondage").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
      doc.save(`${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("[survey pdf]", err);
      toast.error("Erreur lors de la génération du PDF.");
    } finally {
      setExportingPdf(false);
    }
  }, [quizId, surveyTitle, state?.analysis]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/survey-analysis`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.error === "NOT_ENOUGH_RESPONSES") {
          toast.error(data.message ?? "Pas assez de réponses pour une analyse pertinente.");
        } else if (data?.error === "PLAN_REQUIRED") {
          toast.error(data.message ?? "Disponible dans un plan supérieur.");
        } else {
          toast.error("L'analyse a échoué. Réessaie dans un instant.");
        }
        return;
      }
      setState((prev) => (prev ? { ...prev, analysis: data.analysis } : prev));
      toast.success("Analyse prête !");
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setGenerating(false);
    }
  }, [quizId]);

  return (
    <div className="space-y-4">
      {/* Export */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Exporter les résultats</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Au choix : CSV (réponses brutes, une ligne par participant) ou PDF
          (rapport agrégé prêt à présenter).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-1.5" />
            )}
            Export PDF
          </Button>
        </div>
      </Card>

      {/* Analyse IA */}
      <Card className="p-5 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Analyse IA des résultats</h3>
        </div>

        {state && !state.eligible && !state.analysis ? (
          <div className="mt-1 space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                L&apos;analyse IA décode ce que disent vraiment tes réponses,
                résume ce qu&apos;il faut en retenir et te propose les actions
                concrètes à mettre en place. Mises à jour gratuites.
              </p>
            </div>
            {state.showUpsell ? (
              <p className="text-sm text-foreground pl-6">
                Disponible dans les plans{" "}
                <span className="font-semibold">Tiquiz mensuel+</span> et{" "}
                <span className="font-semibold">annuel+</span>, qui incluent
                aussi les multiprofils.{" "}
                <span className="italic text-muted-foreground">
                  Les bons de commande sont en préparation — on te prévient.
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground pl-6 italic">
                Bientôt disponible dans un plan supérieur.
              </p>
            )}
          </div>
        ) : state && !state.hasEnough && !state.analysis ? (
          <p className="text-sm text-muted-foreground mt-1">
            Il n&apos;y a pas assez de réponses pour une analyse pertinente
            ({state.totalResponses}/{state.minResponses}). Reviens quand tu auras
            au moins {state.minResponses} réponses.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Ce que disent vraiment tes résultats, ce qu&apos;il faut en retenir,
              et les actions à mettre en place. Mises à jour gratuites.
            </p>

            {state?.analysis && (
              <div className="space-y-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ce que disent les résultats
                  </p>
                  <p className="text-sm mt-1">{state.analysis.summary}</p>
                </div>
                {state.analysis.takeaways.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      À retenir
                    </p>
                    <ul className="mt-1 space-y-1">
                      {state.analysis.takeaways.map((t, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {state.analysis.actions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions à mettre en place
                    </p>
                    <ul className="mt-1 space-y-1">
                      {state.analysis.actions.map((a, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="mt-0.5 text-primary shrink-0">{i + 1}.</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating || (!state?.hasEnough && !state?.analysis)}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Analyse en cours…
                </>
              ) : state?.analysis ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Mettre à jour l&apos;analyse
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Lancer l&apos;analyse
                </>
              )}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
