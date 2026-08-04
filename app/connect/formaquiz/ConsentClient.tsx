"use client";

import { useState } from "react";
import { ATELIER_BASE_URL, ATELIER_NAME } from "@/lib/partner/atelierUrl";
import { BarChart3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ConsentClient({ state, email }: { state: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function authorize() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/partner/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const json = await res.json();
      if (json?.redirect) {
        window.location.href = json.redirect as string;
        return;
      }
      throw new Error("no redirect");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  /**
   * Changer de compte SANS quitter le parcours.
   *
   * On ferme la session Tiquiz et on repart sur l'écran de connexion, avec
   * le retour vers ce consentement déjà armé et le `state` conservé. Sans
   * ça, il fallait comprendre tout seul que cet écran lit la session du
   * navigateur, aller se déconnecter ailleurs, puis revenir. Personne ne
   * devine ça.
   */
  async function switchAccount() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/partner/switch-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const json = await res.json();
      if (json?.next) {
        window.location.href = json.next as string;
        return;
      }
      throw new Error("no next");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="flex flex-col gap-5 py-7">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">Connecter ton compte à {ATELIER_NAME}</h1>
              <p className="text-sm text-muted-foreground">
                {ATELIER_NAME} pourra lire tes statistiques Tiquiz pour suivre ta progression
                (leads captés, vues, complétions, partages). En lecture seule.
              </p>
            </div>

            {/* LE COMPTE AVANT TOUT (drame Jocelyne, 4 aout 2026).
                Elle a passe six semaines reliee a un compte Tiquiz vide, cree
                sous son autre adresse. Chaque chiffre remontait a zero et rien
                ne le disait. L'email etait deja affiche ici, en petit, au
                milieu d'un paragraphe rassurant sur la confidentialite : on ne
                lit pas une adresse quand on cherche a etre rassure. */}
            <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Tu connectes ce compte Tiquiz
              </span>
              <strong className="break-all text-base">{email}</strong>
              <button
                type="button"
                onClick={switchAccount}
                disabled={busy}
                className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                Tes quiz ne sont pas sur ce compte ? Utiliser une autre adresse
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Aucune donnée personnelle de tes leads n'est partagée, seulement des compteurs.
              </span>
            </div>

            {error && (
              <p className="text-sm text-destructive">
                Un souci est survenu. Réessaie dans un instant.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={authorize} disabled={busy} size="lg">
                {busy ? "Un instant..." : "Autoriser et connecter"}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href={`${ATELIER_BASE_URL}/dashboard`}>Annuler</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
