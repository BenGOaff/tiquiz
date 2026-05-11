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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("sio.keysManager");
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
      toast.error(t("toastLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newKey.trim()) {
      toast.error(t("errorNameAndKeyRequired"));
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
          INVALID_KEY: t("errorInvalidKey"),
          RATE_LIMITED: t("errorRateLimited"),
          SIO_DOWN: t("errorSioDown"),
          NETWORK_ERROR: t("errorNetwork"),
          SERVER_MISCONFIGURED: t("errorServerMisconfigured"),
          NAME_TAKEN: t("errorNameTaken"),
          NAME_REQUIRED: t("errorNameAndKeyRequired"),
          KEY_REQUIRED: t("errorNameAndKeyRequired"),
          VALIDATION_FAILED: t("errorValidationFailed"),
        };
        toast.error(errMap[data.error] ?? t("errorGeneric"));
        return;
      }
      toast.success(t("toastCreated"));
      setNewName("");
      setNewKey("");
      setAdding(false);
      await load();
    } catch {
      toast.error(t("errorNetworkGeneric"));
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
      toast.success(t("toastSetDefault"));
      await load();
    } catch {
      toast.error(t("errorGeneric"));
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
        toast.error(data.error === "NAME_TAKEN" ? t("errorNameTaken") : t("errorGeneric"));
        return;
      }
      toast.success(t("toastRenamed"));
      setEditingId(null);
      await load();
    } catch {
      toast.error(t("errorNetworkGeneric"));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t("confirmDelete", { name }))) return;
    try {
      const res = await fetch(`/api/sio-api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(t("toastDeleted"));
      await load();
    } catch {
      toast.error(t("errorGeneric"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
            {t("emptyState")}
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
                          {t("defaultBadge")}
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
                        title={t("setDefaultTitle")}
                        onClick={() => handleSetDefault(k.id)}
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("renameTitle")}
                      onClick={() => { setEditingId(k.id); setEditName(k.name); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title={t("deleteTitle")}
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
              <Label>{t("nameLabel")}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="mt-1.5"
                maxLength={80}
              />
            </div>
            <div>
              <Label>{t("keyLabel")}</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                className="mt-1.5 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("keyHelper")}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(""); setNewKey(""); }} disabled={submitting}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting} className="rounded-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                {t("add")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("addKey")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
