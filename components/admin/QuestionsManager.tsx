"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Question, QuestionOption, QuestionType } from "@/lib/types";

const TYPE_LABELS: Record<QuestionType, string> = {
  action: "Action / saisie libre",
  decision: "Décision / choix",
  self_eval: "Auto-évaluation",
  recall: "Rappel léger",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function QuestionsManager({
  dayId,
  initialQuestions,
}: {
  dayId: string;
  initialQuestions: Question[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [newType, setNewType] = useState<QuestionType>("action");
  const [newPrompt, setNewPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrompt.trim()) {
      toast.error("Écris l'intitulé de la question.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_id: dayId, type: newType, prompt: newPrompt.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Ajout impossible.");
      return;
    }
    setNewPrompt("");
    router.refresh();
  }

  async function reorder(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index];
    const b = questions[target];
    setBusy(true);
    await Promise.all([
      fetch(`/api/admin/questions/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/questions/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);
    setBusy(false);
    router.refresh();
  }

  function removeFromState(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold">Le quiz du jour</h2>
          <p className="text-xs text-muted-foreground">
            Règle d'or : jamais de QCM de culture générale. Des questions qui font agir l'élève
            sur SON projet.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              busy={busy}
              onReorder={reorder}
              onDeleted={() => removeFromState(q.id)}
            />
          ))}
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune question pour ce jour.</p>
          )}
        </div>

        <form onSubmit={addQuestion} className="flex flex-col gap-2 border-t border-border pt-4">
          <Label>Ajouter une question</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as QuestionType)}
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <Input
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Intitulé de la question"
              className="flex-1"
            />
            <Button type="submit" disabled={busy}>
              <Plus />
              Ajouter
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionCard({
  question,
  index,
  total,
  busy,
  onReorder,
  onDeleted,
}: {
  question: Question;
  index: number;
  total: number;
  busy: boolean;
  onReorder: (index: number, dir: -1 | 1) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<QuestionType>(question.type);
  const [prompt, setPrompt] = useState(question.prompt);
  const [helpText, setHelpText] = useState(question.help_text ?? "");
  const [revealHtml, setRevealHtml] = useState(question.reveal_html ?? "");
  const [required, setRequired] = useState(question.required);
  const [options, setOptions] = useState<QuestionOption[]>(question.options);
  const [saving, setSaving] = useState(false);

  const isChoice = type !== "action";

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        prompt,
        help_text: helpText || null,
        reveal_html: revealHtml || null,
        required,
        options: isChoice ? options.filter((o) => o.label.trim()).map((o) => ({ ...o, value: o.value || slugify(o.label) })) : [],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Sauvegarde impossible.");
      return;
    }
    toast.success("Question enregistrée.");
    router.refresh();
  }

  async function remove() {
    if (!confirm("Supprimer cette question ?")) return;
    const res = await fetch(`/api/admin/questions/${question.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Suppression impossible.");
      return;
    }
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/40 p-4">
      <div className="flex items-start gap-2">
        <div className="flex flex-col pt-1">
          <button
            type="button"
            onClick={() => onReorder(index, -1)}
            disabled={busy || index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Monter"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onReorder(index, 1)}
            disabled={busy || index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Descendre"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs outline-none"
            >
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <Badge variant="muted">Q{index + 1}</Badge>
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Intitulé de la question"
          />
          <Input
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            placeholder="Aide / précision (optionnel)"
          />

          {isChoice && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Révélation après réponse (optionnel)
              </span>
              <Textarea
                value={revealHtml}
                onChange={(e) => setRevealHtml(e.target.value)}
                rows={2}
                placeholder="L'idée à retenir, montrée une fois que l'élève a répondu. Pas un score, pas un piège."
              />
            </div>
          )}

          {isChoice && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Options de réponse</span>
              {options.map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Input
                    value={o.label}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Texte de l'option"
                    className="flex-1"
                  />
                  <Input
                    value={o.tag ?? ""}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((x, k) => (k === j ? { ...x, tag: e.target.value } : x)))
                    }
                    placeholder="Tag (optionnel)"
                    className="w-32"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOptions((prev) => prev.filter((_, k) => k !== j))}
                    aria-label="Retirer l'option"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOptions((prev) => [...prev, { value: "", label: "", tag: "" }])}
                className="w-fit"
              >
                <Plus />
                Ajouter une option
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="size-4 accent-primary"
              />
              Obligatoire pour débloquer le jour suivant
            </label>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer la question">
                <Trash2 />
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save />
                {saving ? "..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
