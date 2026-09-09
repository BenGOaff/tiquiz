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
// -- LA PORTE A DÉMÉNAGÉ (9 septembre 2026) ---------------------------
//
// Les cinq événements du parcours (`lib/analytics/parcours.ts`) partent
// d'un GESTE, pas d'un montage de composant : un clic dans le quiz du
// hero, la fin d'une génération, une inscription. Ce composant portait
// alors la seule décision d'envoi du dépôt, et la recopier à côté aurait
// fabriqué la deuxième porte que son propre commentaire interdit.
//
// Elle vit donc dans `lib/analytics/envoi.ts`, et ce composant n'est
// plus qu'un appelant. Il garde ce qui lui est propre : l'événement
// arrive en prop, et il ne part qu'une fois par montage.
//
// -- UNE SEULE FOIS PAR MONTAGE ---------------------------------------
//
// React remonte un composant à la moindre raison (Strict Mode en
// développement, une navigation qui revient). Un `purchase` poussé deux
// fois se verrait dans ses rapports ; `transaction_id` protège déjà côté
// GA4, et ce garde-fou protège en amont, y compris `begin_checkout` qui
// n'a pas d'identifiant pour se dédupliquer.

import { useEffect, useRef } from "react";

import { envoyerEvenement } from "@/lib/analytics/envoi";
import type { EvenementGa4 } from "@/lib/analytics/conversions";

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
  const remis = useRef(false);

  useEffect(() => {
    if (!evenement || remis.current) return;
    // ON MARQUE À LA REMISE, PAS À L'ENVOI.
    //
    // `envoyerEvenement` garde l'événement quand l'accord n'est pas
    // encore donné et le vide au clic du bandeau. Attendre l'envoi pour
    // marquer ferait remettre le même événement à chaque re-rendu, donc
    // le compterait plusieurs fois le jour où il part enfin.
    remis.current = true;
    // `estHoteDeVente` est IMPOSÉ : la page serveur le connaît déjà (la
    // liste vit dans `lib/sales/salesHosts.ts`), et le laisser deviner
    // au navigateur mettrait deux réponses possibles sur la même
    // question.
    envoyerEvenement(evenement, { estHoteDeVente });
  }, [estHoteDeVente, evenement]);

  return null;
}
