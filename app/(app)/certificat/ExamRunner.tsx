"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Award, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PublicExamQuestion } from "@/lib/certification";

type Phase = "exam" | "failed";

export function ExamRunner({ questions }: { questions: PublicExamQuestion[] }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("exam");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; total: number } | null>(null);

  const total = questions.length;
  const q = questions[step];
  const selected = q ? answers[q.id] : undefined;
  const isLast = step + 1 >= total;

  function choose(value: string) {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/certificat/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        passed?: boolean;
        score?: number;
        total?: number;
        token?: string;
        reason?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error("Impossible de valider l'examen. Réessaie dans un instant.");
        return;
      }
      if (data.passed && data.token) {
        toast.success("Félicitations, certificat obtenu !", { icon: "🏅" });
        router.push(`/cert/${data.token}`);
        return;
      }
      setLastResult({ score: data.score ?? 0, total: data.total ?? total });
      setPhase("failed");
    } catch {
      toast.error("Problème réseau. Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setLastResult(null);
    setPhase("exam");
  }

  function next() {
    if (!selected) {
      toast.error("Choisis une réponse pour continuer.");
      return;
    }
    if (isLast) {
      void submit();
    } else {
      setStep((s) => s + 1);
    }
  }

  // ── Echec : score insuffisant ──
  if (phase === "failed" && lastResult) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <XCircle className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold">
              Presque ! {lastResult.score}/{lastResult.total}
            </p>
            <p className="text-sm text-muted-foreground">
              Il te manque quelques bonnes réponses. Revois les jours concernés
              et retente l'examen, tu y es presque.
            </p>
          </div>
          <Button onClick={restart} size="lg">
            <RotateCcw className="size-4" />
            Repasser l'examen
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Examen, question par question ──
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {step + 1} sur {total}
          </span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-5 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        {q && (
          <div key={q.id} className="flex animate-quiz-step-in flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-semibold leading-snug">
                {q.prompt}
              </h2>
              {q.help && <p className="text-sm text-muted-foreground">{q.help}</p>}
            </div>

            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const isSelected = selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(opt.value)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
          >
            <ArrowLeft />
            Retour
          </Button>
          <Button onClick={next} disabled={submitting}>
            {submitting ? (
              "Correction..."
            ) : isLast ? (
              <>
                <Award className="size-4" />
                Valider l'examen
              </>
            ) : (
              <>
                Continuer
                <ArrowRight />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
