"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
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

        <div className="flex flex-wrap gap-1.5">
          {PERSONAS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPersona(p.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                persona === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
                byPersona[p.value]?.trim() && persona !== p.value && "border-primary/40 text-primary",
              )}
            >
              {p.label}
            </button>
          ))}
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
