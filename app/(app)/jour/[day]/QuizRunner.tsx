"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, RotateCcw, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RichContent } from "@/components/RichContent";
import { celebrate } from "@/lib/celebrate";
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
  isFinalDay = false,
}: {
  dayNumber: number;
  questions: Question[];
  initialAnswers: Record<string, Answer>;
  alreadyCompleted: boolean;
  resultHtml: string | null;
  nextDayNumber: number | null;
  isBonus?: boolean;
  isFinalDay?: boolean;
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
  // Multi-select : l'élève peut cocher plusieurs options (Jour 1 objectifs).
  // Les valeurs choisies sont stockées jointes par des virgules dans
  // value_choice, comme un quiz Tiquiz qui vise plusieurs objectifs.
  const isMulti = !!q?.multi && isChoice;
  const selectedValues = useMemo(
    () => new Set((draft?.value_choice ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
    [draft?.value_choice],
  );

  const hasValue =
    !!draft && (isChoice ? draft.value_choice.trim() !== "" : draft.value_text.trim() !== "");
  const canContinue = !q?.required || hasValue;

  function setDraft(questionId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  }

  // Coche/décoche une valeur en mode multi-select ; on garde l'ordre de clic
  // et on re-sérialise en chaîne "a,b,c".
  function toggleMultiChoice(questionId: string, value: string) {
    setDrafts((prev) => {
      const current = (prev[questionId]?.value_choice ?? "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: { ...prev[questionId], value_choice: next.join(",") } };
    });
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
      // Signale au coach que l'eleve avance : desamorce le nudge proactif.
      window.dispatchEvent(new CustomEvent("coach:activity"));
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
      const badges = data.newBadges ?? [];
      // Fete le jalon reel : jour valide. Plus gros si un badge tombe ou si
      // c'est le DERNIER jour du parcours (fin de l'Atelier = gros jalon).
      celebrate({ intensity: badges.length > 0 || isFinalDay ? "huge" : "normal" });
      for (const b of badges) {
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

          {/* Fin de l'Atelier : on met en avant le certificat de reussite. */}
          {isFinalDay && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-gradient-to-br from-surface-soft to-card p-5 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                <Award className="size-7" />
              </div>
              <p className="font-display text-lg font-bold">
                Bravo, tu as terminé L'Atelier du Quiz !
              </p>
              <p className="text-sm text-muted-foreground">
                Tu peux récupérer ton certificat de réussite : télécharge-le,
                partage-le pour célébrer tes nouvelles compétences, et sers-t'en
                même pour vendre une prestation de création de quiz à tes propres
                clients.
              </p>
              <Button asChild size="lg" className="mx-auto w-fit">
                <Link href="/certificat">
                  <Award />
                  Récupérer mon certificat
                </Link>
              </Button>
            </div>
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
              {isMulti && (
                <p className="text-xs font-medium text-primary">Plusieurs choix possibles.</p>
              )}
            </div>

            {isChoice ? (
              <div className="flex flex-col gap-2">
                {q.options.map((opt) => {
                  const selected = isMulti
                    ? selectedValues.has(opt.value)
                    : draft?.value_choice === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        isMulti
                          ? toggleMultiChoice(q.id, opt.value)
                          : setDraft(q.id, { value_choice: opt.value })
                      }
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                      )}
                    >
                      {isMulti && (
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                            selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                          )}
                        >
                          {selected && <CheckCircle2 className="size-3" />}
                        </span>
                      )}
                      <span>{opt.label}</span>
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

            {/* Revelation douce : apparait une fois l'eleve a repondu.
                Renforce la memoire sans jamais recaler. */}
            {q.reveal_html && hasValue && (
              <div className="flex animate-quiz-step-in gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    À retenir
                  </span>
                  <RichContent html={q.reveal_html} />
                </div>
              </div>
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
