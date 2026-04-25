"use client";

// Per-quiz Systeme.io key picker. Self-contained: fetches the user's keys
// + the quiz's current sio_api_key_id, lets the creator pick which key
// this quiz will sync to, and PATCHes /api/quiz/[quizId] directly. No
// changes to the parent editor are required.
//
// UX: "Default key" is always the first option so a creator who only has
// one client never has to think about it.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SioKey {
  id: string;
  name: string;
  is_default: boolean;
  last4: string | null;
}

interface Props {
  quizId: string;
}

export default function QuizSioKeyPicker({ quizId }: Props) {
  const t = useTranslations("quizSioKey");
  const [keys, setKeys] = useState<SioKey[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/sio-api-keys").then((r) => r.json()),
      fetch(`/api/quiz/${quizId}`).then((r) => r.json()),
    ])
      .then(([keysRes, quizRes]) => {
        if (keysRes.ok) setKeys(keysRes.keys ?? []);
        if (quizRes.ok && quizRes.quiz) {
          setSelectedId(quizRes.quiz.sio_api_key_id ?? "");
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, [quizId]);

  async function handleChange(value: string) {
    const next = value || null;
    setSelectedId(value);
    setSaving(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sio_api_key_id: next }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(t("saved"));
    } catch {
      toast.error(t("errSave"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (keys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/settings?tab=systemeio" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
            {t("emptyCta")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>
    );
  }

  const defaultKey = keys.find((k) => k.is_default);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label>{t("label")}</Label>
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background"
          >
            <option value="">
              {defaultKey
                ? t("useDefaultWithName", { name: defaultKey.name })
                : t("useDefault")}
            </option>
            {keys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}{k.last4 ? ` (••••${k.last4})` : ""}
              </option>
            ))}
          </select>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </CardContent>
    </Card>
  );
}
