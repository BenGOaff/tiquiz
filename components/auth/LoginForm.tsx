"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import LegalFooterLinks from "@/components/legal/LegalFooterLinks";

// Le domaine du lien magique n'est plus decide ici : c'est la route
// /api/auth/magic-link qui construit le lien, avec `resolveAppUrl` et
// l'origine de la requete. Le garde-fou du 2 aout (jamais un lien vers
// la machine de celui qui recoit l'email) vit donc a UN seul endroit,
// partage avec le mot de passe oublie.

type Mode = "password" | "magic";

function parseHashParams(hash: string): Record<string, string> {
  const h = (hash || "").replace(/^#/, "").trim();
  const out: Record<string, string> = {};
  if (!h) return out;
  for (const part of h.split("&")) {
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

export default function LoginForm() {
  const t = useTranslations("loginPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);

  const [emailPassword, setEmailPassword] = useState("");
  const [password, setPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  const [emailMagic, setEmailMagic] = useState("");
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [errorMagic, setErrorMagic] = useState<string | null>(null);
  const [successMagic, setSuccessMagic] = useState<string | null>(null);

  const authError = searchParams.get("auth_error");

  const bannerMessage = useMemo(() => {
    if (authError === "missing_code") return t("bannerMissingCode");
    if (authError === "invalid_code") return t("bannerInvalidCode");
    if (authError === "unexpected") return t("bannerUnexpected");
    if (authError === "not_authenticated") return t("bannerNotAuth");
    return null;
  }, [authError, t]);

  // Redirect to /auth/callback if Supabase sends hash tokens to login page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const hp = parseHashParams(hash);
    if (hp.access_token && hp.refresh_token) {
      router.replace(`/auth/callback${hash}`);
      return;
    }
    const code = (searchParams.get("code") || "").trim();
    if (code) {
      router.replace(`/auth/callback?${searchParams.toString()}`);
    }
  }, [router, searchParams]);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorPassword(null);
    const cleanEmail = emailPassword.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorPassword(t("errFillCredentials"));
      return;
    }
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        setErrorPassword(t("errInvalidCredentials"));
        setLoadingPassword(false);
        return;
      }
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch {
      setErrorPassword(t("errUnexpected"));
      setLoadingPassword(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErrorMagic(null);
    setSuccessMagic(null);
    const cleanEmail = emailMagic.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMagic(t("errFillEmail"));
      return;
    }
    setLoadingMagic(true);
    try {
      // NOTRE route, pas `signInWithOtp`.
      //
      // Avec `signInWithOtp`, c'est SUPABASE qui ecrit l'email, avec le
      // gabarit de son tableau de bord. Le 22 aout, ce gabarit disait
      // encore "Connexion Tipote", signe "Bene - Tipote", sur un bouton
      // Tiquiz. Aucun code ne pouvait le corriger : la seule parade est
      // de ne plus lui confier l'envoi.
      //
      // La route repond TOUJOURS ok : elle ne dit jamais si une adresse
      // a un compte ou non.
      await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, locale: document.documentElement.lang || null }),
      });
      setSuccessMagic(t("successMagic"));
    } catch {
      // Seule une panne reseau arrive ici : la route, elle, ne renvoie
      // jamais d'erreur.
      setErrorMagic(t("errUnexpected"));
    } finally {
      setLoadingMagic(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/tiquiz-logo (2).png" alt="Tiquiz" className="h-12 w-auto mx-auto mb-2" />
          <p className="text-muted-foreground mt-2">{t("tagline")}</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              {mode === "password" ? t("titlePassword") : t("titleMagic")}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === "password" ? t("descPassword") : t("descMagic")}
            </CardDescription>
            {bannerMessage && (
              <div className="mt-3 flex gap-2 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                <span>{bannerMessage}</span>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {mode === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {errorPassword && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {errorPassword}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="emailPassword">{t("labelEmail")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emailPassword"
                      type="email"
                      placeholder={t("placeholderEmail")}
                      className="pl-10"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("labelPassword")}</Label>
                    <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? t("ariaHide") : t("ariaShow")}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loadingPassword}>
                  {loadingPassword ? t("signingIn") : (
                    <>
                      {t("signIn")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("magic")}>
                  {t("magicLink")}
                </Button>
              </form>
            )}

            {mode === "magic" && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                {errorMagic && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {errorMagic}
                  </div>
                )}
                {successMagic && (
                  <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
                    {successMagic}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="emailMagic">{t("labelEmail")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emailMagic"
                      type="email"
                      placeholder={t("placeholderEmail")}
                      className="pl-10"
                      value={emailMagic}
                      onChange={(e) => setEmailMagic(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loadingMagic}>
                  {loadingMagic ? t("sending") : (
                    <>
                      {t("sendLink")}
                      <Mail className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("password")}>
                  {t("backToLogin")}
                </Button>

                <p className="text-xs text-muted-foreground text-center">{t("magicLinkInfo")}</p>
              </form>
            )}

            {mode === "password" && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-center text-sm text-muted-foreground mb-3">{t("noAccount")}</p>
                {/* L'INSCRIPTION SE FAIT CHEZ NOUS depuis le 26 août 2026.
                    Béné : "sur notre page on doit pouvoir s'inscrire sur
                    la page de login."

                    Un LIEN INTERNE, et c'est ce qui fait tenir la chaîne
                    affiliée : le cookie `tq_ref` est posé par le
                    middleware sur l'hôte où la personne est arrivée
                    (`tiquiz.fr`), et il ne voyage pas vers un autre
                    domaine. La renvoyer chez Systeme.io lui faisait
                    perdre son affiliée en route. */}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/signup">{t("createAccount")}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
        <LegalFooterLinks className="mt-2" />
      </div>
    </div>
  );
}
