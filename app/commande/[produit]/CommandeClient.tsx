"use client";

// app/commande/[produit]/CommandeClient.tsx
//
// LE FORMULAIRE DE PAIEMENT, DANS NOTRE PAGE.
//
// Stripe s'affiche à l'intérieur, dans un cadre isolé qui reçoit le
// numéro de carte sans qu'il passe jamais par notre serveur. Tout ce qui
// l'entoure est à nous : le prix, la garantie, la promesse.
//
// -- UN ÉCHEC PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN -----------------
//
// Règle du 3 août. Ici elle compte double : quelqu'un qui veut payer et
// qui voit un cadre vide ne se dit pas "le serveur a un problème", il se
// dit "ça ne marche pas" et il part. Chaque raison renvoyée par le
// serveur a donc sa phrase, en français, avec ce qu'il y a à faire.

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

import { readSaFromBrowser } from "@/lib/affiliate/sa";

/** Les raisons du serveur, traduites ici et nulle part ailleurs. */
const RAISONS: Record<string, string> = {
  not_found: "Ce bon de commande n'est pas ouvert.",
  unknown_product: "Ce produit n'existe pas.",
  not_configured:
    "Le paiement n'est pas encore branché sur ce serveur. Rien n'a été débité.",
  tax_not_enabled:
    "La TVA automatique n'est pas activée sur le compte Stripe. Rien n'a été débité.",
  stripe_refused: "Stripe a refusé d'ouvrir le paiement. Rien n'a été débité.",
  network: "La connexion a coupé avant d'ouvrir le paiement. Rien n'a été débité.",
  live_without_webhook:
    "Le paiement en conditions réelles est bloqué tant que l'ouverture automatique des accès n'est pas branchée. Rien n'a été débité.",
  invalid_body: "Requête illisible.",
};

export default function CommandeClient({
  produit,
  cle,
  clePublique,
  modesDiscordants = false,
}: {
  produit: string;
  cle: string;
  clePublique: string | null;
  /** Clé secrète et clé publiable pas dans le même monde (live vs test). */
  modesDiscordants?: boolean;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

  // La clé publiable est indispensable au navigateur. Sans elle, le cadre
  // resterait vide sans dire pourquoi : on le dit, et on distingue les
  // deux causes, parce qu'elles n'appellent pas le même geste.
  useEffect(() => {
    if (modesDiscordants) {
      setErreur(
        "Les deux clés Stripe de ce serveur ne sont pas du même type : l'une est en conditions réelles, l'autre en test. Le formulaire reste fermé tant que les deux ne concordent pas.",
      );
      return;
    }
    if (!clePublique) {
      setErreur(
        "La clé publique Stripe n'est pas posée sur ce serveur. Le formulaire ne peut pas s'afficher.",
      );
    }
  }, [clePublique, modesDiscordants]);

  // ── L'AFFILIÉE QUI A ENVOYÉ CETTE ACHETEUSE ──
  //
  // Lu AU MOMENT DE L'APPEL, pas dans un `useEffect`, et c'est le coeur
  // du sujet.
  //
  // Un effet de CE composant s'exécute APRÈS les effets de ses enfants :
  // le fournisseur Stripe aurait donc déjà appelé `fetchClientSecret`
  // avant que l'identifiant soit connu, et la commission serait perdue
  // sans que rien ne s'affiche de travers. Et le mettre dans un état
  // changerait l'identité de la fonction, donc remonterait le formulaire
  // de paiement au premier rendu.
  const refAffiliee = useCallback(
    () => readSaFromBrowser(window.location.search, document.cookie) ?? undefined,
    [],
  );

  const fetchClientSecret = useCallback(async () => {
    const r = await fetch("/api/commande/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produit, k: cle, ref: refAffiliee() }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      clientSecret?: string;
      reason?: string;
      mode?: string;
    };
    if (!data.ok || !data.clientSecret) {
      const phrase = RAISONS[data.reason ?? ""] ?? "Le paiement n'a pas pu s'ouvrir.";
      setErreur(phrase);
      // Stripe attend une promesse résolue : on lève pour ne pas monter
      // un formulaire vide par dessus le message d'erreur.
      throw new Error(data.reason ?? "checkout_failed");
    }
    if (data.mode) setMode(data.mode);
    return data.clientSecret;
  }, [produit, cle, refAffiliee]);

  // `loadStripe` rend une NOUVELLE promesse a chaque appel. Appelee dans
  // le JSX, elle en fabriquerait une par rendu, et le fournisseur Stripe
  // se remonterait a chaque fois : formulaire qui clignote, champs vides
  // au milieu d'une saisie. On la garde stable.
  const stripePromise = useMemo(
    () => (clePublique ? loadStripe(clePublique) : null),
    [clePublique],
  );

  if (erreur) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
        <p className="font-semibold">Le paiement n&apos;a pas pu s&apos;ouvrir.</p>
        <p className="mt-1">{erreur}</p>
      </div>
    );
  }

  if (!clePublique) return null;

  return (
    <div>
      {mode === "test" && (
        <p className="mb-3 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          Mode test : aucun argent ne circule, aucune carte n&apos;est débitée.
        </p>
      )}
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
