"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SioTemplate } from "@/lib/types";

const KINDS = [
  { value: "sequence", label: "Séquence email" },
  { value: "tunnel", label: "Tunnel" },
  { value: "autre", label: "Autre" },
];

export function SioTemplatesManager() {
  const [rows, setRows] = useState<SioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ label: "", kind: "sequence", url: "", description: "" });

  async function load() {
    const res = await fetch("/api/admin/sio-templates");
    const json = await res.json();
    setRows((json.rows ?? []) as SioTemplate[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim()) {
      toast.error("Donne au moins un nom et l'URL de partage.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/sio-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label.trim(),
        kind: form.kind,
        url: form.url.trim(),
        description: form.description.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Création impossible (vérifie l'URL).");
      return;
    }
    setForm({ label: "", kind: "sequence", url: "", description: "" });
    toast.success("Modèle ajouté.");
    load();
  }

  async function toggle(t: SioTemplate) {
    await fetch(`/api/admin/sio-templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !t.enabled }),
    });
    setRows((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !x.enabled } : x)));
  }

  async function remove(t: SioTemplate) {
    if (!confirm(`Supprimer le modèle "${t.label}" ?`)) return;
    await fetch(`/api/admin/sio-templates/${t.id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((x) => x.id !== t.id));
    toast.success("Modèle supprimé.");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="py-5">
          <form onSubmit={create} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="label">Nom du modèle</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Séquence de bienvenue (5 emails)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kind">Type</Label>
                <select
                  id="kind"
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">URL de partage Systeme.io</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://systeme.io/share/..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc">Description (optionnel)</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Ce que l'élève obtient en important ce modèle."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                <Plus />
                Ajouter le modèle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun modèle pour le moment. Crée ton modèle dans Systeme.io, copie son URL de partage,
            et ajoute-le ici.
          </CardContent>
        </Card>
      ) : (
        rows.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.label}</p>
                {t.description && (
                  <p className="truncate text-sm text-muted-foreground">{t.description}</p>
                )}
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Ouvrir l'URL
                </a>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggle(t)}>
                {t.enabled ? "Visible" : "Masqué"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(t)} aria-label="Supprimer">
                <Trash2 />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
