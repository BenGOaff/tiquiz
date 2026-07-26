"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PERSONAS,
  GLOSSARY_TERMS,
  PERSONA_VOCAB,
  type Persona,
  type Vocab,
} from "@/lib/personas";

export function PersonaVocabManager() {
  const [vocabs, setVocabs] = useState<Record<string, Vocab>>({});
  const [loading, setLoading] = useState(true);
  const [savingPersona, setSavingPersona] = useState<Persona | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/persona-vocab");
        const json = await res.json();
        const map: Record<string, Vocab> = {};
        // Base sur le seed code, surcharge par la DB.
        for (const p of PERSONAS) map[p.value] = { ...PERSONA_VOCAB[p.value] };
        for (const r of json.rows ?? []) {
          map[r.persona] = { ...map[r.persona], ...(r.vocab ?? {}) };
        }
        setVocabs(map);
      } catch {
        toast.error("Chargement impossible.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(persona: Persona) {
    setSavingPersona(persona);
    try {
      const res = await fetch("/api/admin/persona-vocab", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, vocab: vocabs[persona] }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Vocabulaire enregistré.");
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSavingPersona(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="flex flex-col gap-4">
      {PERSONAS.map((p) => (
        <Card key={p.value}>
          <CardContent className="flex flex-col gap-3 py-5">
            <h2 className="font-display font-semibold">{p.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {GLOSSARY_TERMS.map((term) => (
                <div key={term} className="flex flex-col gap-1.5">
                  <Label htmlFor={`${p.value}-${term}`}>{`{${term}}`}</Label>
                  <Input
                    id={`${p.value}-${term}`}
                    value={vocabs[p.value]?.[term] ?? ""}
                    onChange={(e) =>
                      setVocabs((prev) => ({
                        ...prev,
                        [p.value]: { ...prev[p.value], [term]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => save(p.value)} disabled={savingPersona === p.value}>
                <Save />
                {savingPersona === p.value ? "..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
