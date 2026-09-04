"use client";

// components/analytics/ConversionGa4.tsx
//
// L'ENVOI D'UN ÉVÉNEMENT DE CONVERSION, ET AUCUNE DÉCISION.
//
// L'événement est CONSTRUIT CÔTÉ SERVEUR (`lib/analytics/conversions.ts`,
// depuis le catalogue) et arrive en prop. Ce composant ne fait que le
// pousser, une fois, au bon moment.
//
// -- MÊME PORTE QUE LA MESURE, ET C'EST LE POINT ----------------------
//
// Il rappelle `chargerAnalytics`, exactement comme `GoogleAnalytics` :
// le domaine de vente, le chemin, ET le consentement de la personne. Une
// conversion envoyée après un "refuser" serait pire qu'une visite
// mesurée sans accord, parce qu'elle porte un montant et une référence
// de commande.
//
// Deux portes qui décideraient chacune de leur côté finiraient par ne
// plus dire la même chose : c'est le défaut sorti six fois dans ce
// dépôt. D'où la même fonction, et pas une condition recopiée.
//
// -- UNE SEULE FOIS PAR MONTAGE ---------------------------------------
//
// React remonte un composant à la moindre raison (Strict Mode en
// développement, une navigation qui revient). Un `purchase` poussé deux
// fois se verrait dans ses rapports ; `transaction_id` protège déjà côté
// GA4, et ce garde-fou protège en amont, y compris `begin_checkout` qui
// n'a pas d'identifiant pour se dédupliquer.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  chargerAnalytics,
  consentementMesure,
  CLE_CONSENTEMENT,
} from "@/lib/analytics/google";
import type { EvenementGa4 } from "@/lib/analytics/conversions";

function lireConsentement(): boolean {
  try {
    return consentementMesure(window.localStorage.getItem(CLE_CONSENTEMENT));
  } catch {
    // Navigation privée, stockage bloqué : on ne mesure pas. Le doute ne
    // profite jamais à la mesure.
    return false;
  }
}

export default function ConversionGa4({
  estHoteDeVente,
  evenement,
}: {
  estHoteDeVente: boolean;
  /**
   * `null` quand il n'y a rien à compter : produit inconnu, ou paiement
   * que le fournisseur n'a pas confirmé. Le composant se tait alors, il
   * n'invente pas de conversion.
   */
  evenement: EvenementGa4 | null;
}) {
  const pathname = usePathname() ?? "/";
  const envoye = useRef(false);

  useEffect(() => {
    if (!evenement || envoye.current) return;

    const pousser = () => {
      if (envoye.current) return false;
      if (!chargerAnalytics({ estHoteDeVente, pathname, consentementDonne: lireConsentement() })) {
        return false;
      }
      // ON POUSSE UN OBJET `arguments`, EXACTEMENT COMME LE SHIM DE
      // GOOGLE (`function gtag(){dataLayer.push(arguments);}`, cf.
      // `GoogleAnalytics.tsx`). Un tableau ordinaire lui RESSEMBLE et
      // n'est documenté nulle part : je n'ai aucun moyen de vérifier
      // d'ici ce que gtag.js en ferait, et une conversion ignorée en
      // silence est exactement le genre de panne qu'on ne découvre qu'en
      // regardant un rapport vide des semaines plus tard.
      //
      // On ne suppose pas non plus que `gtag` existe déjà : la balise se
      // charge en `afterInteractive`, donc elle peut arriver après nous.
      // `dataLayer` est une FILE : ce qu'on y pousse avant le chargement
      // est traité au chargement, rien n'est perdu.
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      const file = w.dataLayer;
      const gtag: (...args: unknown[]) => void = function () {
        // eslint-disable-next-line prefer-rest-params
        file.push(arguments);
      };
      gtag("event", evenement.name, evenement.params);
      envoye.current = true;
      return true;
    };

    if (pousser()) return;

    // PAS ENCORE D'ACCORD : on attend le clic du bandeau, comme la
    // balise elle même. Quelqu'un qui accepte après avoir atterri ici
    // doit être compté ; l'écouteur se retire dès qu'il a sa réponse, il
    // ne tourne pas en fond.
    const surClic = () => {
      setTimeout(() => {
        if (pousser()) document.removeEventListener("click", surClic, true);
      }, 0);
    };
    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, [estHoteDeVente, pathname, evenement]);

  return null;
}
