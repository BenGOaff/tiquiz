"use client";

// components/analytics/GoogleAnalytics.tsx
//
// La mesure d'audience Google, chargée UNIQUEMENT là où elle a du sens,
// et UNIQUEMENT après accord de la personne.
//
// Composant CLIENT, et ce n'est pas un détail : la décision a besoin du
// chemin que le NAVIGATEUR voit. Le middleware ne pose aucun en-tête de
// chemin, donc un repli côté serveur aurait chargé la mesure sur les
// quiz publics de nos clientes, en silence (cf. lib/analytics/google.ts).
//
// L'hôte, lui, reste décidé côté SERVEUR et arrive en prop : c'est la
// seule source qui ne peut pas être contournée depuis le navigateur.
//
// Il ne reste vrai que sur `tiquiz.fr` : Béné ne veut mesurer que la
// vente, et les quiz ont déjà le tracking de leur créatrice
// (`lib/effectivePixels.ts`).
//
// -- LE CONSENTEMENT (26 août 2026) -----------------------------------
//
// La page de vente porte le bandeau cookies de Béné, qui range le choix
// dans `aq_consent_v1`. La balise se chargeait sans le lire : un
// bandeau qui demande la permission et une mesure qui l'ignore, c'est
// un bandeau qui ment à la personne qui vient de cliquer "refuser".
//
// On relit donc son choix, et on ATTEND. Le bandeau n'émet aucun
// événement et l'événement `storage` ne se déclenche pas dans l'onglet
// qui écrit : on se raccroche au clic, puisqu'un consentement est
// toujours donné par un clic. L'écouteur se retire dès qu'il a sa
// réponse, il ne tourne pas en fond.

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

import {
  chargerAnalytics,
  consentementMesure,
  CLE_CONSENTEMENT,
  GA_MEASUREMENT_ID,
} from "@/lib/analytics/google";

function lireConsentement(): boolean {
  try {
    return consentementMesure(window.localStorage.getItem(CLE_CONSENTEMENT));
  } catch {
    // Navigation privée, stockage bloqué : on ne mesure pas. Le doute
    // ne profite jamais à la mesure.
    return false;
  }
}

export default function GoogleAnalytics({ estHoteDeVente }: { estHoteDeVente: boolean }) {
  const pathname = usePathname() ?? "/";
  const [consenti, setConsenti] = useState(false);

  useEffect(() => {
    if (lireConsentement()) {
      setConsenti(true);
      return;
    }

    const surClic = () => {
      // Après le clic, le bandeau écrit puis pose ses scripts. On relit
      // au tour de boucle suivant pour lire ce qu'il vient d'écrire.
      setTimeout(() => {
        if (lireConsentement()) {
          setConsenti(true);
          document.removeEventListener("click", surClic, true);
        }
      }, 0);
    };

    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, []);

  if (!chargerAnalytics({ estHoteDeVente, pathname, consentementDonne: consenti })) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
