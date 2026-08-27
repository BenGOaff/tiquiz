"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import LegalFooterLinks from "@/components/legal/LegalFooterLinks";

import type { Parrainage } from "@/lib/affiliate/accueilParrain";
import { Gift } from "lucide-react";

export default function SignupForm({ parrainage }: { parrainage?: Parrainage }) {
  const t = useTranslations("signupPage");
  // Le serveur renvoie une RAISON, l'ecran sait comment la dire. Chacune
  // nomme l'action a faire : "erreur lors de la creation" laisse devant
  // un mur, "tu as deja un compte" envoie se connecter.
  const RAISONS_SIGNUP: Record<string, string> = {
    already_registered: t("errAlreadyRegistered"),
    email_failed: t("errEmailFailed"),
    weak_password: t("errPasswordMin"),
    invalid_email: t("errFillAll"),
  };

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail || !password || !cleanName) {
      setError(t("errFillAll"));
      return;
    }
    if (password.length < 6) {
      setError(t("errPasswordMin"));
      return;
    }

    setLoading(true);
    try {
      // NOTRE route, pas `supabase.auth.signUp`.
      //
      // `signUp` depuis le navigateur declenche l'email de SUPABASE, avec
      // son gabarit : la toute premiere chose qu'une nouvelle inscrite
      // recevait de Tiquiz etait un email au nom de Tipote (22 aout). Et
      // c'est le seul email qu'elle est OBLIGEE d'ouvrir pour entrer.
      //
      // Le domaine du lien est decide par le serveur, a partir de
      // l'origine de la requete : c'est la seule source qui ne peut pas
      // se tromper.
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: cleanName,
          locale: document.documentElement.lang || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string };

      if (!data.ok) {
        // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN, et
        // chaque raison a SA phrase : "erreur lors de la creation" ne dit
        // pas quoi faire, alors que "tu as deja un compte" si.
        setError(RAISONS_SIGNUP[data.reason ?? ""] ?? t("errSignup"));
        setLoading(false);
        return;
      }

      setSuccess(t("successCheckEmail"));
    } catch {
      setError(t("errSignup"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/tiquiz-logo (2).png" alt="Tiquiz" className="h-12 w-auto mx-auto mb-2" />
          <p className="text-muted-foreground mt-2">{t("desc")}</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">{t("title")}</CardTitle>
            <CardDescription className="text-center">{t("desc")}</CardDescription>
          </CardHeader>

          {/* QUELQU'UN L'ENVOIE, ON LE DIT (Bene, 27 aout 2026).
              "Jocelyne te propose de tester Tiquiz gratuitement alors
              n'hesite pas ! En plus grace a son lien tu profiteras d'un
              mois gratuit a l'abonnement de ton choix."

              La decision vient de `readParrainage`, jamais d'un test
              recopie ici : ce bandeau annonce un CADEAU, et le cadeau est
              refuse par `essaiPourCeCheckout` sur une affiliee inconnue,
              en pause ou exclue. Deux endroits qui decideraient chacun de
              leur cote finiraient par promettre ce que le checkout ne
              donnera pas, au pire moment : la carte a la main. */}
          {parrainage?.affiche && (
            <div className="px-6 pb-4">
              <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
                <Gift className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold">
                    {parrainage.prenom
                      ? t("parrainTitre", { prenom: parrainage.prenom })
                      : t("parrainTitreSansNom")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("parrainCadeau", { jours: parrainage.joursOfferts })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">{t("labelName")}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t("placeholderName")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("labelEmail")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("placeholderEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("labelPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("submitting") : (
                  <>
                    {t("submit")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground mb-3">{t("hasAccount")}</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">{t("login")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <LegalFooterLinks className="mt-4" />
      </div>
    </div>
  );
}
