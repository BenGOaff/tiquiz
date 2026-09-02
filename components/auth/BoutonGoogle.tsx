"use client";

// components/auth/BoutonGoogle.tsx
//
// LE BOUTON GOOGLE, ET LES DEUX CHOSES QU'IL DOIT EMPORTER AVEC LUI.
//
// L'aller-retour par Google quitte notre domaine. Deux choses doivent
// être encore là au retour, et aucune ne peut voyager dans l'URL :
// Supabase ajoute son `?code=` à l'adresse de retour, et rien ne dit ce
// que leur serveur fait d'une query déjà présente.
//
//   - le `?ref=` affilié vit déjà dans le cookie `tq_ref`, posé par le
//     middleware pour un an. Il survit sans qu'on fasse rien ;
//   - le quiz de la démo n'a pas de cookie : on lui en pose un ICI,
//     juste avant de partir.
//
// MESURÉ dans Chromium, le trajet exact d'un aller-retour OAuth (notre
// domaine -> un site tiers -> retour chez nous en premier niveau) :
//
//   au retour de premier niveau : tq_reprise=abc123
//   sur une requête tierce      : (aucun)
//
// C'est exactement ce qu'on veut des deux côtés : le cookie revient avec
// la personne, et il n'est jamais envoyé quand un autre site déclenche
// une requête vers nous en arrière plan.
//
// ET ON REVIENT SUR L'ORIGINE D'OÙ L'ON EST PARTI (`urlRetourGoogle`) :
// partir de `tiquiz.fr` et revenir sur `quiz.tipote.com` sont deux
// sites différents, donc le cookie serait perdu, et le quiz avec.

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ligneCookieReprise, urlRetourGoogle, FOURNISSEUR_GOOGLE } from "@/lib/auth/google";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

/** Le logo officiel, en SVG : une police d'icônes pour un seul bouton
 *  coûterait plus cher que le bouton (leçon de la page de vente). */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-4 shrink-0" aria-hidden focusable="false">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.9 41.2 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.7 28.3c-.4-1.3-.7-2.7-.7-4.3s.2-2.9.7-4.3v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.9l7.4-5.6z" />
      <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4 29.9 2 24 2 15.4 2 7.9 6.8 4.3 13.9l7.4 5.7c1.7-5.2 6.6-9 12.3-9z" />
    </svg>
  );
}

export default function BoutonGoogle({
  namespace,
  jetonQuiz,
}: {
  /** `loginPage` ou `signupPage` : les deux portent les mêmes clés. */
  namespace: "loginPage" | "signupPage";
  /** Le quiz de la démo, s'il y en a un. Validé côté serveur. */
  jetonQuiz?: string | null;
}) {
  const t = useTranslations(namespace);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function partir() {
    setErreur(null);
    setEnCours(true);
    try {
      if (jetonQuiz) {
        // Posé AVANT le départ, et pas au retour : au retour on n'a plus
        // que ce que le navigateur a bien voulu garder.
        document.cookie = ligneCookieReprise(jetonQuiz, window.location.protocol === "https:");
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: FOURNISSEUR_GOOGLE,
        options: { redirectTo: urlRetourGoogle(window.location.origin) },
      });
      if (error) throw error;
      // Pas de `setEnCours(false)` : le navigateur part chez Google, et
      // rendre le bouton cliquable pendant la navigation invite à
      // double-cliquer.
    } catch {
      // UN ÉCHEC PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN, et il dit
      // l'autre chemin : le formulaire est juste en dessous.
      setErreur(t("googleErreur"));
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={partir}
        disabled={enCours}
      >
        <LogoGoogle />
        <span className="ml-2">{t("googleContinuer")}</span>
      </Button>

      {erreur && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erreur}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("googleOu")}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    </div>
  );
}
