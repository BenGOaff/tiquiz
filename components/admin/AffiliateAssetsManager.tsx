"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Trash2, Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export interface AssetRow {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  url: string;
  file_type: string | null;
  created_at: string;
}

const KINDS = ["visuel", "banniere", "logo", "mockup"];

export function AffiliateAssetsManager({ initialRows }: { initialRows: AssetRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AssetRow[]>(initialRows);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("visuel");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choisis un fichier.");
      return;
    }
    if (!title.trim()) {
      toast.error("Donne un titre au visuel.");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("kind", kind);
    try {
      const res = await fetch("/api/admin/affiliate-assets", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        toast.error(
          json.reason === "too_large"
            ? "Fichier trop lourd (10 Mo max)."
            : "Upload impossible. Réessaie.",
        );
        return;
      }
      setRows((prev) => [json.asset as AssetRow, ...prev]);
      setTitle("");
      setDescription("");
      setKind("visuel");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Visuel ajouté.");
      router.refresh();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(row: AssetRow) {
    if (!confirm(`Supprimer "${row.title}" ? Les affiliés ne le verront plus.`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch("/api/admin/affiliate-assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Visuel supprimé.");
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  const isImage = (r: AssetRow) => (r.file_type ?? "").startsWith("image/");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="py-5">
          <form onSubmit={upload} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-title">Titre</Label>
              <Input
                id="asset-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bannière Instagram 1080x1080"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-desc">Description (optionnel)</Label>
              <Input
                id="asset-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Format carré, fond bleu, à poster tel quel"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asset-kind">Catégorie</Label>
                <select
                  id="asset-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="asset-file">Fichier (10 Mo max)</Label>
                <Input id="asset-file" ref={fileRef} type="file" accept="image/*,.pdf,.zip" />
              </div>
              <Button type="submit" disabled={uploading} className="shrink-0">
                <UploadCloud className="size-4" />
                {uploading ? "Envoi..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                {isImage(r) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.url} alt={r.title} className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.kind}</p>
                  {r.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => remove(r)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={r.url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="size-4" />
                  Ouvrir / télécharger
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun visuel pour le moment. Dépose ton premier fichier ci-dessus.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
