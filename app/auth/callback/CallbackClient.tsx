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

/**
 * Les effets de bord d'une première entrée, appelés APRÈS que la session
 * soit ouverte. Ne jette jamais et ne bloque rien : la session compte,
 * l'accueil compte moins.
 */
async function accueillir(): Promise<void> {
  try {
    await fetch("/api/auth/accueil", { method: "POST" });
  } catch {
    /* le tableau de bord passe avant */
  }
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
          // `signup` en fait partie : c'est le lien de confirmation
          // d'inscription, que NOUS envoyons maintenant (22 aout). Sans
          // lui dans cette liste, la nouvelle inscrite cliquait sur son
          // email et tombait sur "lien invalide".
          const otpType = (type || "magiclink") as
            | "magiclink"
            | "recovery"
            | "invite"
            | "signup";
          const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw error;
          // Lien recovery ("mot de passe oublié") : on enchaîne sur le choix
          // du nouveau mot de passe, pas sur le dashboard.
          router.replace(otpType === "recovery" ? "/auth/reset-password" : "/dashboard");
          return;
        }

        // PKCE flow (?code=...) — c'est par là que revient Google.
        //
        // ON N'ÉCHANGE PAS LE CODE NOUS MÊMES EN PREMIER, et c'est tout
        // le correctif (retour Béné, 2 septembre 2026 : "PKCE code
        // verifier not found in storage", à chaque essai, y compris sur
        // un compte fraîchement supprimé).
        //
        // MESURÉ dans node_modules, pas déduit :
        //   createBrowserClient.js:40  detectSessionInUrl: … ?? isBrowser()
        //   GoTrueClient.js:283        si detectSessionInUrl et ?code= →
        //                              _getSessionFromURL() échange le code
        //   GoTrueClient.js:654/666    …et RETIRE le `-code-verifier`
        //   GoTrueClient.js:2221       getSession() attend initializePromise
        //
        // Le client de `@supabase/ssr` échange donc le code TOUT SEUL au
        // montage, et consomme le vérificateur au passage. Notre appel
        // arrivait forcément APRÈS (il attend la même initialisation) et
        // ne trouvait plus rien : `AuthPKCECodeVerifierMissingError`.
        //
        // Ce n'était donc pas une panne : la session était OUVERTE, et on
        // affichait une erreur par dessus. C'est le pire des deux mondes,
        // parce que le message accuse le navigateur ("storage was
        // cleared") et envoie chercher très loin de la vraie cause.
        //
        // On demande donc la session D'ABORD. L'échange manuel reste en
        // REPLI, pour le jour où la détection automatique serait coupée :
        // le retirer marcherait aujourd'hui et casserait ce jour là.
        if (code) {
          let session = (await supabase.auth.getSession()).data.session;
          if (!session) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            session = (await supabase.auth.getSession()).data.session;
          }
          if (!session) throw new Error(t("errUnknown"));
          // CE QU'UNE INSCRIPTION DOIT FAIRE, MÊME SANS FORMULAIRE.
          //
          // `signInWithOAuth` crée le compte DANS Supabase, sans passer
          // par `/api/auth/signup` : sans cet appel, l'affiliée n'est
          // jamais rattachée, aucun contact n'est créé chez Systeme.io
          // (donc aucune campagne ne part), et le quiz de la démo reste
          // orphelin. Aucun des trois ne produit d'erreur visible.
          //
          // La route est le garde-fou, pas cet appel : elle ne tourne
          // qu'une fois par compte et ne pose jamais `free` sur un
          // compte qui paie. Elle est donc sans danger sur les autres
          // liens qui arrivent aussi en `?code=`.
          //
          // Best-effort : un accueil qui échoue ne doit pas laisser
          // quelqu'un devant un écran de connexion alors que sa session
          // est ouverte.
          await accueillir();
          router.replace("/dashboard");
          return;
        }

        // Implicit hash (#access_token=...&refresh_token=...)
        const hashParams = parseHashParams(window.location.hash || "");
        const access_token = (hashParams["access_token"] || "").trim();
        const refresh_token = (hashParams["refresh_token"] || "").trim();
        const hashType = (hashParams["type"] || "").trim().toLowerCase();

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch { /* ignore */ }
          // Les liens recovery (generateLink "mot de passe oublié") arrivent
          // ici avec type=recovery dans le hash : direction le formulaire de
          // nouveau mot de passe.
          router.replace(hashType === "recovery" ? "/auth/reset-password" : "/dashboard");
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
      // NOTRE route, comme le formulaire de connexion. Avec
      // `signInWithOtp`, c'est Supabase qui ecrit l'email, et son
      // gabarit disait "Connexion Tipote" sur un bouton Tiquiz
      // (22 aout). Deux boutons qui envoient deux emails differents,
      // c'est exactement la moitie de correction qu'on repete.
      await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale: document.documentElement.lang || null }),
      });
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
