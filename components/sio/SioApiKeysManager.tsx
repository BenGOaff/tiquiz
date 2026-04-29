"use client";

// Settings → Systeme.io tab. Lets a user register N Systeme.io API keys
// (one per client they manage), name them, mark one as default, rename or
// remove them. Adding a key live-validates against the SIO API so a wrong
// key is rejected at save time instead of silently failing on every lead
// sync.
//
// Strings are hardcoded FR for now — i18n can be added later by lifting
// these to messages/*.json under the `settings.sioKeys*` namespace.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Star, StarOff, Trash2, KeyRound, ShieldCheck, ShieldAlert, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface SioKey {
  id: string;
  name: string;
  is_default: boolean;
  last4: string | null;
  last_validated_at: string | null;
  validation_status: string | null;
  created_at: string;
}

export default function SioApiKeysManager() {
  const [keys, setKeys] = useState<SioKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/sio-api-keys");
      const data = await res.json();
      if (data.ok) setKeys(data.keys ?? []);
    } catch {
      toast.error("Impossible de charger tes clés.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newKey.trim()) {
      toast.error("Renseigne le nom et la clé.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sio-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), apiKey: newKey.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        const errMap: Record<string, string> = {
          INVALID_KEY: "Clé refusée par Systeme.io. Régénère-la depuis ton compte SIO et réessaie.",
          RATE_LIMITED: "Systeme.io te demande de patienter (trop de requêtes). Réessaie dans 1 minute.",
          SIO_DOWN: "Systeme.io est momentanément indisponible. Réessaie dans quelques minutes.",
          NETWORK_ERROR: "Connexion impossible à Systeme.io. Vérifie ta connexion ou réessaie.",
          SERVER_MISCONFIGURED: "Erreur de configuration côté serveur. Contacte le support.",
          NAME_TAKEN: "Tu as déjà une clé avec ce nom.",
          NAME_REQUIRED: "Renseigne le nom et la clé.",
          KEY_REQUIRED: "Renseigne le nom et la clé.",
          VALIDATION_FAILED: "La validation a échoué. Réessaie dans quelques instants.",
        };
        toast.error(errMap[data.error] ?? "Une erreur est survenue.");
        return;
      }
      toast.success("Clé ajoutée et validée.");
      setNewName("");
      setNewKey("");
      setAdding(false);
      await load();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/sio-api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success("Clé définie par défaut.");
      await load();
    } catch {
      toast.error("Une erreur est survenue.");
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/sio-api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error === "NAME_TAKEN" ? "Tu as déjà une clé avec ce nom." : "Une erreur est survenue.");
        return;
      }
      toast.success("Clé renommée.");
      setEditingId(null);
      await load();
    } catch {
      toast.error("Erreur réseau.");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la clé « ${name} » ? Les quiz qui l'utilisaient basculeront sur ta clé par défaut.`)) return;
    try {
      const res = await fetch(`/api/sio-api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success("Clé supprimée.");
      await load();
    } catch {
      toast.error("Une erreur est survenue.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Clés API Systeme.io
        </CardTitle>
        <CardDescription>
          Connecte plusieurs comptes Systeme.io (un par client). Tu choisis ensuite quelle clé chaque quiz utilise.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
            Aucune clé enregistrée.
          </div>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 border rounded-lg p-3">
                <div className="shrink-0">
                  {k.validation_status === "validated" || k.validation_status === "legacy_migrated" ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === k.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(k.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRename(k.id)}>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{k.name}</span>
                      {k.is_default && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Star className="h-3 w-3 mr-0.5" />
                          Par défaut
                        </Badge>
                      )}
                      {k.last4 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          ••••{k.last4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {editingId !== k.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    {!k.is_default && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Définir par défaut"
                        onClick={() => handleSetDefault(k.id)}
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Renommer"
                      onClick={() => { setEditingId(k.id); setEditName(k.name); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Supprimer"
                      onClick={() => handleDelete(k.id, k.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div>
              <Label>Nom (mémo)</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex : Mon compte, Client Marie"
                className="mt-1.5"
                maxLength={80}
              />
            </div>
            <div>
              <Label>Clé API</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                className="mt-1.5 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                On vérifie la clé auprès de Systeme.io avant de l&apos;enregistrer.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(""); setNewKey(""); }} disabled={submitting}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting} className="rounded-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Ajouter
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter une clé
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
