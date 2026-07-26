"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PERSONAS, type Persona } from "@/lib/personas";
import { cn } from "@/lib/utils";

/**
 * Editeur des encarts "Pour toi" par persona, pour un jour. Memes videos
 * et meme structure : seuls les exemples changent. Le persona "autre" sert
 * de repli quand un persona n'a pas d'exemple dedie.
 */
export function PersonaExamplesEditor({ dayId }: { dayId: string }) {
  const [persona, setPersona] = useState<Persona>(PERSONAS[0].value);
  const [byPersona, setByPersona] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/days/${dayId}/persona-examples`);
        const json = await res.json();
        const map: Record<string, string> = {};
        for (const r of json.rows ?? []) map[r.persona] = r.examples_html ?? "";
        setByPersona(map);
      } catch {
        toast.error("Chargement des exemples impossible.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dayId]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/days/${dayId}/persona-examples`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, examples_html: byPersona[persona] || null }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Exemple enregistré.");
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  // Complétude : combien de personas ont un exemple dédié pour ce jour. Sert
  // à repérer les trous (un persona sans exemple retombe sur un rendu générique
  // et perd l'effet "écrit pour moi").
  const filledCount = useMemo(
    () => PERSONAS.filter((p) => byPersona[p.value]?.trim()).length,
    [byPersona],
  );
  const total = PERSONAS.length;
  const complete = filledCount === total;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-semibold">Personnalisation par persona</h2>
          <p className="text-xs text-muted-foreground">
            Décline l'encart d'exemples pour chaque métier. Tu peux utiliser {"{prenom}"},{" "}
            {"{offre}"}, {"{client}"}, {"{audience}"}, {"{expertise}"} : ils s'adaptent au persona.
          </p>
        </div>

        {/* Complétude : coup d'oeil sur les personas couverts / manquants. */}
        {!loading && (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-lg border px-3 py-2.5",
              complete
                ? "border-success/40 bg-success/5"
                : "border-amber-300/60 bg-amber-50/60",
            )}
          >
            <span className="text-xs font-semibold">
              {complete
                ? `Complet : les ${total} profils ont un exemple dédié.`
                : `Complétude : ${filledCount} / ${total} profils ont un exemple dédié.`}
            </span>
            {!complete && (
              <span className="text-xs text-muted-foreground">
                Les profils sans exemple retombent sur un rendu générique. Clique un
                profil marqué à compléter pour l'écrire.
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {PERSONAS.map((p) => {
            const filled = Boolean(byPersona[p.value]?.trim());
            const active = persona === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPersona(p.value)}
                title={filled ? "Exemple présent" : "À compléter"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                  filled && !active && "border-primary/40 text-primary",
                  !filled && !active && "border-amber-300 text-amber-700",
                )}
              >
                {filled ? (
                  <Check className={cn("size-3.5", active ? "" : "text-success")} />
                ) : (
                  <Circle className={cn("size-3.5", active ? "" : "text-amber-500")} />
                )}
                {p.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <RichTextEditor
            value={byPersona[persona] ?? ""}
            onChange={(v) => setByPersona((prev) => ({ ...prev, [persona]: v }))}
            placeholder={`Exemple concret pour ce profil...`}
          />
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            <Save />
            {saving ? "Enregistrement..." : "Enregistrer cet exemple"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
