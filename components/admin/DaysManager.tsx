"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Copy, Trash2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AdminDayRow {
  id: string;
  day_number: number;
  title: string;
  subtitle: string | null;
  status: "draft" | "published";
  sort_order: number;
  is_bonus: boolean;
}

export function DaysManager({ initialDays }: { initialDays: AdminDayRow[] }) {
  const router = useRouter();
  const [days, setDays] = useState<AdminDayRow[]>(initialDays);
  const [busy, setBusy] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newTitle, setNewTitle] = useState("");

  async function createDay(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(newNumber, 10);
    if (!Number.isFinite(n) || !newTitle.trim()) {
      toast.error("Donne un numéro de jour et un titre.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_number: n, title: newTitle.trim() }),
    });
    setBusy(false);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.reason === "duplicate_day_number" ? "Ce numéro de jour existe déjà." : "Création impossible.");
      return;
    }
    router.push(`/admin/jours/${json.id}`);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= days.length) return;
    const reordered = [...days];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setDays(reordered);
    setBusy(true);
    const res = await fetch("/api/admin/days/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((d) => d.id) }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Réordonnancement impossible.");
      router.refresh();
    }
  }

  async function togglePublish(d: AdminDayRow) {
    const next = d.status === "published" ? "draft" : "published";
    setBusy(true);
    const res = await fetch(`/api/admin/days/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Changement de statut impossible.");
      return;
    }
    setDays((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: next } : x)));
  }

  async function duplicate(d: AdminDayRow) {
    setBusy(true);
    const res = await fetch(`/api/admin/days/${d.id}/duplicate`, { method: "POST" });
    setBusy(false);
    const json = await res.json();
    if (!res.ok) {
      toast.error("Duplication impossible.");
      return;
    }
    router.push(`/admin/jours/${json.id}`);
  }

  async function remove(d: AdminDayRow) {
    if (!confirm(`Supprimer le jour ${d.day_number} "${d.title}" et ses questions ? Cette action est définitive.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/days/${d.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Suppression impossible.");
      return;
    }
    setDays((prev) => prev.filter((x) => x.id !== d.id));
    toast.success("Jour supprimé.");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="py-5">
          <form onSubmit={createDay} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex w-24 flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Jour n°</label>
              <Input
                type="number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="2"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Titre</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Objectif et cible"
              />
            </div>
            <Button type="submit" disabled={busy}>
              <Plus />
              Créer
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {days.map((d, i) => (
          <Card key={d.id}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Monter"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={busy || i === days.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Descendre"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {d.is_bonus ? "Bonus" : `Jour ${d.day_number}`}
                  </span>
                  {d.is_bonus && <Badge variant="secondary">Bonus</Badge>}
                  <Badge variant={d.status === "published" ? "success" : "muted"}>
                    {d.status === "published" ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
                <p className="truncate font-medium">{d.title}</p>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => togglePublish(d)} disabled={busy}>
                  {d.status === "published" ? "Dépublier" : "Publier"}
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label="Éditer">
                  <Link href={`/admin/jours/${d.id}`}>
                    <Pencil />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => duplicate(d)} disabled={busy} aria-label="Dupliquer">
                  <Copy />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(d)} disabled={busy} aria-label="Supprimer">
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {days.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun jour pour le moment. Crée le premier ci-dessus.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
