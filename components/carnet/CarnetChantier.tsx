"use client";

// Le carnet comme "chantier vivant" : le livrable de l'eleve qui prend forme,
// avec edition inline de chaque reponse (upsert via /api/days/[day]/answer).
// On n'affiche que SES reponses. Zero tiret long dans le user-visible.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Gift,
  Pencil,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CarnetSynthesis, SynthItem } from "@/lib/carnet";

function isChoiceItem(item: SynthItem): boolean {
  return item.type !== "action" && item.options.length > 0;
}

/** Reponse affichable cote client (mirroir de displayAnswer serveur). */
function displayOf(item: SynthItem, valueText: string, valueChoice: string): string {
  if (item.type === "action") return valueText.trim();
  const choice = valueChoice.trim();
  if (!choice) return valueText.trim();
  if (item.multi || choice.includes(",")) {
    return choice
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => item.options.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  return item.options.find((o) => o.value === choice)?.label ?? choice;
}

interface ItemState {
  valueText: string;
  valueChoice: string;
  display: string;
  answered: boolean;
}

export function CarnetChantier({ synthesis }: { synthesis: CarnetSynthesis }) {
  // Etat local de toutes les reponses, indexe par questionId (edition optimiste).
  const initial = useMemo(() => {
    const map: Record<string, ItemState> = {};
    const all = [...synthesis.sections.flatMap((s) => s.items), ...synthesis.bonus];
    for (const it of all) {
      map[it.questionId] = {
        valueText: it.valueText,
        valueChoice: it.valueChoice,
        display: it.display,
        answered: it.answered,
      };
    }
    return map;
  }, [synthesis]);

  const [states, setStates] = useState<Record<string, ItemState>>(initial);

  // Pourcentage recalcule en direct a partir des questions cles (required)
  // du parcours, pour que la barre bouge quand l'eleve complete depuis ici.
  const { filledKey, totalKey, percent } = useMemo(() => {
    const keyItems = synthesis.sections
      .flatMap((s) => s.items)
      .filter((i) => i.required);
    const total = synthesis.totalKey;
    // Les items required visibles (jours debloques) + le reste du total
    // (jours verrouilles, jamais remplis) donnent un denominateur honnete.
    const visibleAnswered = keyItems.filter(
      (i) => states[i.questionId]?.answered,
    ).length;
    const filled = visibleAnswered;
    return {
      filledKey: filled,
      totalKey: total,
      percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  }, [states, synthesis]);

  if (!synthesis.hasAnything && synthesis.sections.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Le compteur d'avancement du livrable : honnete, motivant. */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              Ton quiz est rempli à {percent}%
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {filledKey} / {totalKey} pièces clés
            </span>
          </div>
          <Progress value={percent} />
          <p className="text-xs text-muted-foreground">
            Chaque réponse écrit un morceau de ton futur quiz. Complète, corrige,
            précise : tout se met à jour ici, en direct.
          </p>
        </CardContent>
      </Card>

      {synthesis.sections.map((section) => (
        <Card key={section.key}>
          <CardContent className="flex flex-col gap-4 py-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{section.title}</h2>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {section.items.filter((i) => states[i.questionId]?.answered).length}
                  {" / "}
                  {section.items.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{section.blurb}</p>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {section.items.map((item) => (
                <ItemRow
                  key={item.questionId}
                  item={item}
                  state={states[item.questionId]}
                  onSaved={(next) =>
                    setStates((prev) => ({ ...prev, [item.questionId]: next }))
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {synthesis.bonus.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Tes bonus explorés</h2>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {synthesis.bonus.map((item) => (
                <ItemRow
                  key={item.questionId}
                  item={item}
                  state={states[item.questionId]}
                  onSaved={(next) =>
                    setStates((prev) => ({ ...prev, [item.questionId]: next }))
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ItemRow({
  item,
  state,
  onSaved,
}: {
  item: SynthItem;
  state: ItemState | undefined;
  onSaved: (next: ItemState) => void;
}) {
  const s = state ?? {
    valueText: item.valueText,
    valueChoice: item.valueChoice,
    display: item.display,
    answered: item.answered,
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftText, setDraftText] = useState(s.valueText);
  const [draftChoice, setDraftChoice] = useState(s.valueChoice);

  const isChoice = isChoiceItem(item);
  const selected = useMemo(
    () => new Set(draftChoice.split(",").map((v) => v.trim()).filter(Boolean)),
    [draftChoice],
  );

  function openEditor() {
    setDraftText(s.valueText);
    setDraftChoice(s.valueChoice);
    setEditing(true);
  }

  function toggleMulti(value: string) {
    const current = draftChoice.split(",").map((v) => v.trim()).filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setDraftChoice(next.join(","));
  }

  async function save() {
    const nextText = draftText.trim();
    const nextChoice = draftChoice.trim();
    if (isChoice ? nextChoice === "" : nextText === "") {
      toast.error("Écris ta réponse avant d'enregistrer.");
      return;
    }
    const previous = s;
    const optimistic: ItemState = {
      valueText: isChoice ? "" : nextText,
      valueChoice: isChoice ? nextChoice : "",
      display: displayOf(item, nextText, nextChoice),
      answered: true,
    };
    // Optimiste : on met a jour tout de suite, on ferme, puis on confirme.
    onSaved(optimistic);
    setEditing(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/days/${item.dayNumber}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: item.questionId,
          value_text: item.type === "action" ? nextText : null,
          value_choice: isChoice ? nextChoice : null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Réponse enregistrée.");
    } catch {
      // Echec : on revient a l'etat precedent et on rouvre l'editeur.
      onSaved(previous);
      setEditing(true);
      toast.error("Ta réponse n'a pas pu être enregistrée. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2">
        {s.answered ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        ) : (
          <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
        )}
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">{item.prompt}</span>

          {editing ? (
            <div className="flex flex-col gap-2">
              {isChoice ? (
                <div className="flex flex-col gap-2">
                  {item.multi && (
                    <p className="text-xs font-medium text-primary">
                      Plusieurs choix possibles.
                    </p>
                  )}
                  {item.options.map((opt) => {
                    const on = item.multi
                      ? selected.has(opt.value)
                      : draftChoice === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          item.multi ? toggleMulti(opt.value) : setDraftChoice(opt.value)
                        }
                        aria-pressed={on}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          on
                            ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                        )}
                      >
                        {item.multi && (
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background",
                            )}
                          >
                            {on && <CheckCircle2 className="size-3" />}
                          </span>
                        )}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Écris ta réponse ici..."
                  rows={4}
                  autoFocus
                />
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? "Un instant..." : "Enregistrer"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <X />
                  Annuler
                </Button>
              </div>
            </div>
          ) : s.answered ? (
            <div className="flex items-start gap-2">
              <p className="flex-1 whitespace-pre-wrap rounded-lg bg-surface-soft px-3 py-2 text-sm">
                {s.display}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={openEditor}
              >
                <Pencil />
                Modifier
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Il te reste à préciser : {item.helpText ?? "ta réponse"}
              </span>
              <Button size="sm" variant="outline" onClick={openEditor}>
                <Plus />
                Compléter
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
