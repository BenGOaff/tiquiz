"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";

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

export default function CallbackClient() {
  const t = useTranslations("callbackPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const ranRef = useRef(false);

  // "expired" : le lien a expiré ou est invalide (Supabase renvoie une erreur
  // dans le hash, ex. #error=access_denied&error_code=otp_expired). On propose
  // alors de renvoyer un lien, au lieu d'un 404 / cul-de-sac.
  const [status, setStatus] = useState<"loading" | "error" | "expired">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Formulaire "renvoyer un lien" (état expiré).
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");

  const code = useMemo(() => (searchParams?.get("code") || "").trim(), [searchParams]);
  const tokenHash = useMemo(() => (searchParams?.get("token_hash") || "").trim(), [searchParams]);
  const type = useMemo(() => (searchParams?.get("type") || "").trim().toLowerCase(), [searchParams]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Lien expiré / invalide : Supabase pose l'erreur dans le hash SANS
        // access_token. On bascule sur l'écran "renvoyer un lien" au lieu de
        // tenter une consommation qui échouerait (ou d'un cul-de-sac 404).
        const errHash = parseHashParams(window.location.hash || "");
        if (errHash["error"] || errHash["error_code"] || searchParams?.get("error")) {
          setStatus("expired");
          return;
        }

        // OTP flow (token_hash)
        if (tokenHash) {
          const otpType = (type || "magiclink") as "magiclink" | "recovery" | "invite";
          const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw error;
          router.replace("/dashboard");
          return;
        }

        // PKCE flow (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          router.replace("/dashboard");
          return;
        }

        // Implicit hash (#access_token=...&refresh_token=...)
        const hashParams = parseHashParams(window.location.hash || "");
        const access_token = (hashParams["access_token"] || "").trim();
        const refresh_token = (hashParams["refresh_token"] || "").trim();

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch { /* ignore */ }
          router.replace("/dashboard");
          return;
        }

        // Aucun jeton et aucune erreur explicite : lien incomplet, on propose
        // aussi de renvoyer un lien plutôt que de rebondir sèchement au login.
        setStatus("expired");
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("errUnknown");
        // Les erreurs typiques de jeton (expiré / déjà utilisé) basculent sur
        // l'écran "renvoyer un lien" ; le reste sur l'écran d'erreur générique.
        if (/expire|invalid|otp|token/i.test(msg)) {
          setStatus("expired");
        } else {
          setStatus("error");
          setErrorMsg(msg);
        }
      }
    })();
  }, [router, code, tokenHash, type, t, searchParams]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError("");
    const email = resendEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResendError(t("errInvalidEmail"));
      return;
    }
    setResending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setResent(true);
    } catch {
      setResendError(t("errResendFailed"));
    } finally {
      setResending(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-2xl border border-border p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">{t("loadingTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("loadingDesc")}</p>
          <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-primary/30 rounded-full animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  // Lien expiré / invalide : message clair + formulaire pour recevoir un
  // nouveau lien (le drame Cath du 20 juil 2026 : lien invitation périmé qui
  // tombait sur une page 404 inexistante).
  if (status === "expired") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border p-8">
          <h1 className="text-xl font-semibold mb-2 text-center">{t("errorHeading")}</h1>
          {resent ? (
            <p className="text-sm text-emerald-600 text-center">{t("successResent")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">{t("errExpired")}</p>
              <p className="text-sm text-muted-foreground text-center mt-1">{t("resendInfo")}</p>
              <form onSubmit={handleResend} className="mt-6 space-y-3">
                <label className="block text-sm font-medium" htmlFor="resend-email">{t("labelEmail")}</label>
                <input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder={t("placeholderEmail")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {resendError && <p className="text-sm text-destructive">{resendError}</p>}
                <Button type="submit" className="w-full" disabled={resending}>
                  {resending ? t("sending") : t("sendLink")}
                </Button>
              </form>
            </>
          )}
          <Button className="mt-4 w-full" variant="ghost" onClick={() => router.replace("/login")}>
            {t("backToLogin")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">{t("errorHeading")}</h1>
        <p className="text-sm text-muted-foreground break-words">{errorMsg || t("errUnknown")}</p>
        <Button className="mt-6 w-full" variant="outline" onClick={() => router.replace("/login")}>
          {t("backToLogin")}
        </Button>
      </div>
    </main>
  );
}
