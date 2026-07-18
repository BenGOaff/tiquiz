"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RichContent } from "@/components/RichContent";
import { cn } from "@/lib/utils";
import type { Answer, Question } from "@/lib/types";

type Draft = { value_text: string; value_choice: string };

function toDraft(a?: Answer): Draft {
  return { value_text: a?.value_text ?? "", value_choice: a?.value_choice ?? "" };
}

export function QuizRunner({
  dayNumber,
  questions,
  initialAnswers,
  alreadyCompleted,
  resultHtml,
  nextDayNumber,
  isBonus = false,
}: {
  dayNumber: number;
  questions: Question[];
  initialAnswers: Record<string, Answer>;
  alreadyCompleted: boolean;
  resultHtml: string | null;
  nextDayNumber: number | null;
  isBonus?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"quiz" | "result">(
    alreadyCompleted ? "result" : "quiz",
  );
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const d: Record<string, Draft> = {};
    for (const q of questions) d[q.id] = toDraft(initialAnswers[q.id]);
    return d;
  });

  const total = questions.length;
  const q = questions[step];
  const draft = q ? drafts[q.id] : null;

  const isChoice = useMemo(
    () => !!q && q.type !== "action" && q.options.length > 0,
    [q],
  );

  const hasValue =
    !!draft && (isChoice ? draft.value_choice.trim() !== "" : draft.value_text.trim() !== "");
  const canContinue = !q?.required || hasValue;

  function setDraft(questionId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  }

  async function saveAnswer(question: Question): Promise<boolean> {
    const d = drafts[question.id];
    // Rien à sauver si optionnelle et vide.
    if (!d || (!d.value_text.trim() && !d.value_choice.trim())) return true;
    try {
      const res = await fetch(`/api/days/${dayNumber}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          value_text: question.type === "action" ? d.value_text : null,
          value_choice: isChoiceType(question) ? d.value_choice : null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      return true;
    } catch {
      toast.error("Ta réponse n'a pas pu être enregistrée. Réessaie.");
      return false;
    }
  }

  function isChoiceType(question: Question): boolean {
    return question.type !== "action" && question.options.length > 0;
  }

  async function handleNext() {
    if (!q) return;
    if (!canContinue) {
      toast.error("Réponds à cette question pour continuer.");
      return;
    }
    setSaving(true);
    const ok = await saveAnswer(q);
    setSaving(false);
    if (!ok) return;

    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const res = await fetch(`/api/days/${dayNumber}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("complete failed");
      const data = (await res.json().catch(() => ({}))) as {
        newBadges?: { code: string; label: string }[];
      };
      setPhase("result");
      // Celebration : badge(s) nouvellement debloque(s).
      for (const b of data.newBadges ?? []) {
        toast.success(`Badge débloqué : ${b.label}`, { icon: "🏅", duration: 5000 });
      }
      router.refresh(); // met à jour la progression du dashboard
    } catch {
      toast.error("Impossible de valider le jour. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  }

  // ── Écran de résultat / fin de jour ──
  if (phase === "result") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="font-semibold">{isBonus ? "Bonus terminé" : `Jour ${dayNumber} validé`}</span>
          </div>
          {resultHtml ? (
            <RichContent html={resultHtml} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Bravo, tu as bouclé le jour. On enchaîne quand tu veux.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {nextDayNumber !== null ? (
              <Button asChild size="lg">
                <Link href={`/jour/${nextDayNumber}`}>
                  Débloquer le jour {nextDayNumber}
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/dashboard">Retour au parcours</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setStep(0);
                setPhase("quiz");
              }}
            >
              <RotateCcw />
              Revoir mes réponses
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Pas de quiz pour ce jour ──
  if (total === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          <p className="text-sm text-muted-foreground">Pas de quiz pour ce jour.</p>
          <Button onClick={handleComplete} disabled={saving} size="lg">
            Marquer comme terminé
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Flux du quiz, question par question ──
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
              <h2 className="font-display text-lg font-semibold leading-snug">{q.prompt}</h2>
              {q.help_text && <p className="text-sm text-muted-foreground">{q.help_text}</p>}
            </div>

            {isChoice ? (
              <div className="flex flex-col gap-2">
                {q.options.map((opt) => {
                  const selected = draft?.value_choice === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft(q.id, { value_choice: opt.value })}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Textarea
                value={draft?.value_text ?? ""}
                onChange={(e) => setDraft(q.id, { value_text: e.target.value })}
                placeholder="Écris ta réponse ici..."
                rows={4}
                autoFocus
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft />
            Retour
          </Button>
          <Button onClick={handleNext} disabled={saving}>
            {saving
              ? "Un instant..."
              : step + 1 < total
                ? "Continuer"
                : "Valider le jour"}
            {!saving && <ArrowRight />}
          </Button>
        </div>

        {!q?.required && (
          <p className="text-center text-xs text-muted-foreground">
            Cette question est optionnelle.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
