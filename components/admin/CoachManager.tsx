"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  sort_order: number;
}

export function CoachManager({
  initialInstruction,
  initialDocs,
}: {
  initialInstruction: string;
  initialDocs: KnowledgeDoc[];
}) {
  const router = useRouter();
  const [instruction, setInstruction] = useState(initialInstruction);
  const [savingInstr, setSavingInstr] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function saveInstruction() {
    setSavingInstr(true);
    const res = await fetch("/api/admin/coach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });
    setSavingInstr(false);
    if (!res.ok) {
      toast.error("Sauvegarde impossible.");
      return;
    }
    toast.success("Instruction du coach enregistrée.");
  }

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/coach/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    setAdding(false);
    if (!res.ok) {
      toast.error("Ajout impossible.");
      return;
    }
    setNewTitle("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Instruction / personnalité */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex flex-col gap-1">
            <Label>Instruction du coach (sa personnalité, ses règles)</Label>
            <p className="text-xs text-muted-foreground">
              C'est le coeur du coach. Garde les garde-fous (répond seulement à partir du contenu,
              tutoiement, pas de promesse chiffrée, pas de tiret long).
            </p>
          </div>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={12}
            className="font-mono text-xs leading-relaxed"
          />
          <div className="flex justify-end">
            <Button onClick={saveInstruction} disabled={savingInstr}>
              <Save />
              {savingInstr ? "Enregistrement..." : "Enregistrer l'instruction"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents de connaissance */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold">Documents de référence</h2>
          <p className="text-xs text-muted-foreground">
            Colle ici tes articles, méthodes, FAQ, pépites... Le coach les consulte automatiquement.
            Décoche un document pour le mettre de côté sans le supprimer.
          </p>
        </div>

        {initialDocs.map((doc) => (
          <DocEditor key={doc.id} doc={doc} />
        ))}

        {initialDocs.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun document pour le moment.</p>
        )}

        <Card>
          <CardContent className="py-4">
            <form onSubmit={addDoc} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titre du document (ex. Ma méthode des 3 couches)"
                className="flex-1"
              />
              <Button type="submit" disabled={adding}>
                <Plus />
                Ajouter un document
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DocEditor({ doc }: { doc: KnowledgeDoc }) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [enabled, setEnabled] = useState(doc.enabled);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/coach/knowledge/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, enabled }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Sauvegarde impossible.");
      return;
    }
    toast.success("Document enregistré.");
  }

  async function remove() {
    if (!confirm(`Supprimer le document "${title}" ?`)) return;
    const res = await fetch(`/api/admin/coach/knowledge/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Suppression impossible.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Colle ici le contenu (texte). Le coach s'appuiera dessus pour répondre."
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 accent-primary"
            />
            Actif (consulté par le coach)
          </label>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer">
              <Trash2 />
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save />
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
