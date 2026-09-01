"use client";

// Per-quiz Systeme.io key picker. Self-contained: fetches the user's keys
// + the quiz's current sio_api_key_id, lets the creator pick which key
// this quiz will sync to, and PATCHes /api/quiz/[quizId] directly. No
// changes to the parent editor required.
//
// Strings hardcoded FR for now — i18n later under quizSioKey.* namespace.

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
  /**
   * OÙ le sélecteur est rendu, et c'est un PARAMÈTRE, jamais deviné.
   *
   * Béné, 1er septembre 2026 : "en réorganisant la sidebar on a viré le
   * choix de la clé Systeme io du coup j'ai une erreur. Il faut remettre
   * ça dans Gestion du quiz, avec même style, même taille que le reste."
   *
   * Il n'avait pas été viré : il n'a JAMAIS été dans la colonne. Il
   * vivait dans l'onglet Partager, et pire, à l'intérieur du bloc gaté
   * par `virality_enabled`. Une créatrice qui ne propose pas de bonus de
   * partage n'avait donc AUCUN moyen de choisir sa clé, et rien ne le
   * disait.
   *
   * `"carte"` garde l'allure d'origine ; `"colonne"` prend l'idiome de
   * la colonne de réglages (un titre, une phrase, un select pleine
   * largeur), parce qu'une carte au milieu de sept sections plates se
   * voit comme une pièce rapportée.
   */
  variante?: "carte" | "colonne";
}

/** Le titre et la phrase d'aide, à l'identique des autres réglages. */
function EnTeteColonne({ t }: { t: (cle: string) => string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5 text-primary" />
        {t("title")}
      </h3>
      <p className="text-[11px] text-muted-foreground leading-snug">{t("description")}</p>
    </div>
  );
}

export default function QuizSioKeyPicker({ quizId, variante = "carte" }: Props) {
  const t = useTranslations("sio.keyPicker");
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
      toast.success(t("toastUpdated"));
    } catch {
      toast.error(t("toastUpdateError"));
    } finally {
      setSaving(false);
    }
  }

  const colonne = variante === "colonne";

  if (loading) {
    if (colonne) {
      return (
        <section className="space-y-2">
          <EnTeteColonne t={t} />
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("loading")}
          </p>
        </section>
      );
    }
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
    if (colonne) {
      return (
        <section className="space-y-2">
          <EnTeteColonne t={t} />
          <a
            href="/settings?tab=systemeio"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            {t("configureFirst")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      );
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
        <CardContent>
          <a href="/settings?tab=systemeio" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
            {t("configureFirst")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>
    );
  }

  const defaultKey = keys.find((k) => k.is_default);

  const options = (
    <>
      <option value="">
        {defaultKey ? t("optionDefaultNamed", { name: defaultKey.name }) : t("optionDefault")}
      </option>
      {keys.map((k) => (
        <option key={k.id} value={k.id}>
          {k.name}{k.last4 ? ` (••••${k.last4})` : ""}
        </option>
      ))}
    </>
  );

  if (colonne) {
    // MÊME idiome que les autres réglages de la colonne : un `<h3>` à
    // la même taille, la phrase d'aide en `text-[11px]`, et le select
    // pleine largeur. Recopier une carte ici ferait une pièce
    // rapportée au milieu de sept sections plates.
    return (
      <section className="space-y-2">
        <EnTeteColonne t={t} />
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="w-full text-sm bg-background border border-input rounded-md px-2 py-1.5 cursor-pointer"
            aria-label={t("selectLabel")}
          >
            {options}
          </select>
          {saving && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{t("hint")}</p>
      </section>
    );
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
      <CardContent className="space-y-2">
        <Label>{t("selectLabel")}</Label>
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background"
          >
            <option value="">
              {defaultKey ? t("optionDefaultNamed", { name: defaultKey.name }) : t("optionDefault")}
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
