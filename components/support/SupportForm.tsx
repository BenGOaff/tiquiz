"use client";

// components/support/SupportForm.tsx
//
// LE CHEMIN VERS UN HUMAIN, DEPUIS TIQUIZ.
//
// Le centre d'aide existe (57 articles) et il est lié juste au dessus du
// formulaire : la plupart des questions y ont déjà leur réponse, et une
// réponse tout de suite vaut mieux qu'une réponse demain.
//
// -- POURQUOI CE FORMULAIRE MARCHE SANS ÊTRE CONNECTÉE -----------------
//
// Parce que la personne qui a le plus besoin du support est celle qui
// n'arrive PAS à se connecter. L'adresse est pré-remplie quand on la
// connaît, et modifiable : quelqu'un peut écrire pour l'adresse d'une
// autre (une revendeuse pour sa cliente, par exemple).
//
// -- UN ÉCHEC PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN -----------------
//
// Règle du 3 août. Un formulaire de support qui échoue en silence est le
// pire endroit possible pour un échec silencieux : la personne écrit
// déjà parce que quelque chose ne marche pas.

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, LifeBuoy, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { helpUrl } from "@/lib/help";

/** Le serveur rend une RAISON, l'écran écrit la phrase. */
const CLES_RAISON: Record<string, string> = {
  message_trop_court: "errShort",
  invalid_email: "errEmail",
  trop_de_demandes: "errTooMany",
};

export default function SupportForm({
  emailConnecte,
  nomConnecte,
}: {
  emailConnecte?: string | null;
  nomConnecte?: string | null;
}) {
  const t = useTranslations("supportForm");
  const locale = useLocale();

  const [email, setEmail] = useState(emailConnecte ?? "");
  const [nom, setNom] = useState(nomConnecte ?? "");
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: nom,
          subject: sujet,
          message,
          // D'ou elle ecrit : un support qui sait sur quel ecran la
          // personne etait bloquee repond en une fois au lieu de trois.
          page: typeof window !== "undefined" ? window.location.href : "",
          locale,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        setEnvoye(true);
        setMessage("");
        setSujet("");
      } else {
        const cle = CLES_RAISON[j.reason ?? ""] ?? "errFailed";
        setErreur(t(cle));
      }
    } catch {
      setErreur(t("errFailed"));
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <p className="text-lg font-semibold">{t("sent")}</p>
          <Button variant="outline" onClick={() => setEnvoye(false)}>
            {t("again")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <a
          href={helpUrl(locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline"
        >
          <LifeBuoy className="size-4" /> {t("helpCenter")}
        </a>

        <form onSubmit={envoyer} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              {t("email")}
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("name")}
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="mt-1"
                autoComplete="given-name"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            {t("subject")}
            <Input value={sujet} onChange={(e) => setSujet(e.target.value)} className="mt-1" />
          </label>

          <label className="block text-sm font-medium">
            {t("message")}
            <textarea
              required
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {t("messageHint")}
            </span>
          </label>

          {erreur && (
            <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              {erreur}
            </p>
          )}

          <Button type="submit" disabled={envoi}>
            {envoi ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {envoi ? t("sending") : t("send")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
