"use client";

// Settings → Systeme.io tab. Lets a user register N Systeme.io API keys
// (one per client they manage), name them, mark one as default, rename or
// remove them. Adding a key live-validates against the SIO API so a wrong
// key is rejected at save time instead of silently failing on every lead
// sync. The plaintext is never round-tripped from the server: list calls
// only return last4 + name + is_default.

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
  const t = useTranslations("settings");
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
      toast.error(t("sioKeysLoadErr"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newKey.trim()) {
      toast.error(t("sioKeysFillBoth"));
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
          INVALID_KEY: t("sioKeysErrInvalid"),
          NAME_TAKEN: t("sioKeysErrNameTaken"),
          NAME_REQUIRED: t("sioKeysFillBoth"),
          KEY_REQUIRED: t("sioKeysFillBoth"),
          VALIDATION_FAILED: t("sioKeysErrValidation"),
        };
        toast.error(errMap[data.error] ?? t("sioKeysErrGeneric"));
        return;
      }
      toast.success(t("sioKeysAdded"));
      setNewName("");
      setNewKey("");
      setAdding(false);
      await load();
    } catch {
      toast.error(t("sioKeysErrNetwork"));
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
      toast.success(t("sioKeysSetDefault"));
      await load();
    } catch {
      toast.error(t("sioKeysErrGeneric"));
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
        toast.error(data.error === "NAME_TAKEN" ? t("sioKeysErrNameTaken") : t("sioKeysErrGeneric"));
        return;
      }
      toast.success(t("sioKeysRenamed"));
      setEditingId(null);
      await load();
    } catch {
      toast.error(t("sioKeysErrNetwork"));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t("sioKeysConfirmDelete", { name }))) return;
    try {
      const res = await fetch(`/api/sio-api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(t("sioKeysDeleted"));
      await load();
    } catch {
      toast.error(t("sioKeysErrGeneric"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          {t("sioKeysTitle")}
        </CardTitle>
        <CardDescription>{t("sioKeysDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("sioKeysLoading")}
          </div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
            {t("sioKeysEmpty")}
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
                          {t("sioKeysDefault")}
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
                        title={t("sioKeysMakeDefault")}
                        onClick={() => handleSetDefault(k.id)}
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("sioKeysRename")}
                      onClick={() => { setEditingId(k.id); setEditName(k.name); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title={t("sioKeysDelete")}
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
              <Label>{t("sioKeysNameLabel")}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("sioKeysNamePh")}
                className="mt-1.5"
                maxLength={80}
              />
            </div>
            <div>
              <Label>{t("sioKeysKeyLabel")}</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                className="mt-1.5 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">{t("sioKeysValidateHint")}</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(""); setNewKey(""); }} disabled={submitting}>
                {t("sioKeysCancel")}
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting} className="rounded-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                {t("sioKeysAdd")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-1.5" />
            {t("sioKeysAddBtn")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
