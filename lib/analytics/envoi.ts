"use client";

// lib/analytics/envoi.ts
//
// LA SEULE PORTE PAR LAQUELLE UN ÉVÉNEMENT SORT.
//
// Il y avait déjà un envoi (`components/analytics/ConversionGa4.tsx`,
// 4 septembre) et il gardait sa décision pour lui : le consentement, le
// domaine, le chemin, et la façon de pousser dans `dataLayer`. Les cinq
// événements du parcours (9 septembre) partent, eux, d'un GESTE : un
// clic dans le quiz du hero, la fin d'une génération, une inscription.
//
// **Deux portes qui décideraient chacune de leur côté finiraient par ne
// plus dire la même chose**, et c'est le défaut sorti six fois dans ce
// dépôt. La décision vit donc ICI, une fois, et les deux appellent.
//
// ── LE CONSENTEMENT SE LIT ICI, ET LE DOUTE NE PROFITE JAMAIS À LA
//    MESURE ──────────────────────────────────────────────────────────
//
// Le bandeau de Béné écrit `{mesure, pub, video, t}` dans
// `aq_consent_v1` et oublie le choix au bout de `CFG.memoire` jours. On
// relit SA règle (`consentementMesure`), sinon on mesurerait encore
// quelqu'un dont l'accord a expiré de son côté.
//
// ── ET LA FILE D'ATTENTE N'EST PAS UN CONFORT ────────────────────────
//
// Le cas qui la rend nécessaire : le bandeau s'affiche, le visiteur ne
// répond pas tout de suite, il joue au quiz, PUIS il accepte. Sans file,
// `quiz_demarre` serait perdu et `quiz_termine` envoyé : un entonnoir
// avec plus d'arrivées que de départs, c'est à dire un tableau de bord
// qu'on n'ouvre plus.
//
// On garde donc les événements DANS L'ORDRE et on les vide quand
// l'accord arrive. Le prix est assumé et il se dit : ils portent alors
// l'horodatage du vidage, pas celui du geste. L'ordre du parcours est
// juste, la seconde exacte ne l'est pas.
//
// Un refus, lui, ne vide RIEN : la file meurt avec l'onglet.

import {
  CLE_CONSENTEMENT,
  chargerAnalytics,
  consentementMesure,
} from "@/lib/analytics/google";
import { estHoteDeVenteClient } from "@/lib/analytics/parcours";

import type { EvenementGa4 } from "@/lib/analytics/conversions";

/**
 * La file, bornée.
 *
 * Cinq événements par session, 20 est large. Au delà on ARRÊTE
 * d'empiler au lieu de jeter les plus anciens : jeter le premier ferait
 * exactement l'inversion que cette file existe pour empêcher.
 */
const FILE_MAX = 20;
let file: EvenementGa4[] = [];
let ecouteurPose = false;

function consentementDonne(): boolean {
  try {
    return consentementMesure(window.localStorage.getItem(CLE_CONSENTEMENT));
  } catch {
    // Navigation privée, stockage bloqué : on ne mesure pas.
    return false;
  }
}

/**
 * On pousse un objet `arguments`, EXACTEMENT comme le shim de Google
 * (`function gtag(){dataLayer.push(arguments);}`, cf. `google.ts`). Un
 * tableau ordinaire lui RESSEMBLE et n'est documenté nulle part : je
 * n'ai aucun moyen de vérifier d'ici ce que gtag.js en ferait, et une
 * conversion ignorée en silence est le genre de panne qu'on ne découvre
 * qu'en regardant un rapport vide des semaines plus tard.
 *
 * On ne suppose pas que `gtag` existe déjà : la balise se charge en
 * `afterInteractive`, donc elle peut arriver après nous. `dataLayer` est
 * une FILE : ce qu'on y pousse avant le chargement est traité au
 * chargement, rien n'est perdu.
 */
function pousserDansDataLayer(evenement: EvenementGa4) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  const dl = w.dataLayer;
  const gtag: (...args: unknown[]) => void = function () {
    // eslint-disable-next-line prefer-rest-params
    dl.push(arguments);
  };
  gtag("event", evenement.name, evenement.params);
}

/**
 * La porte : le domaine de vente, le chemin, et l'accord de la personne.
 *
 * `estHoteDeVente` peut être IMPOSÉ par l'appelant (une page serveur le
 * connaît déjà et le passe en prop) ; sinon on le lit sur le navigateur,
 * avec la MÊME table que le serveur (`estHoteDeVenteClient` lit
 * `SALES_HOSTS`, il n'en écrit pas une deuxième).
 */
function laPorteEstOuverte(estHoteDeVente?: boolean): boolean {
  if (typeof window === "undefined") return false;
  const hote = estHoteDeVente ?? estHoteDeVenteClient(window.location.hostname);
  return chargerAnalytics({
    estHoteDeVente: hote,
    pathname: window.location.pathname || "/",
    consentementDonne: consentementDonne(),
  });
}

function viderLaFile(estHoteDeVente?: boolean): boolean {
  if (!laPorteEstOuverte(estHoteDeVente)) return false;
  const aEnvoyer = file;
  file = [];
  for (const evenement of aEnvoyer) pousserDansDataLayer(evenement);
  return true;
}

/**
 * PAS ENCORE D'ACCORD : on attend le clic du bandeau, comme la balise
 * elle même. Le bandeau n'émet aucun événement, et `storage` ne se
 * déclenche pas dans l'onglet qui écrit : on se raccroche au clic,
 * puisqu'un consentement est toujours donné par un clic. L'écouteur se
 * retire dès qu'il a sa réponse, il ne tourne pas en fond.
 */
function attendreLAccord(estHoteDeVente?: boolean) {
  if (ecouteurPose || typeof document === "undefined") return;
  ecouteurPose = true;
  const surClic = () => {
    setTimeout(() => {
      if (viderLaFile(estHoteDeVente)) {
        document.removeEventListener("click", surClic, true);
        ecouteurPose = false;
      }
    }, 0);
  };
  document.addEventListener("click", surClic, true);
}

/**
 * Envoie un événement, ou le garde jusqu'à l'accord.
 *
 * `null` est accepté et ne fait RIEN : les constructeurs rendent parfois
 * `null` (un produit inconnu, un paiement non confirmé), et l'appelant
 * ne doit pas avoir à s'en occuper.
 */
export function envoyerEvenement(
  evenement: EvenementGa4 | null,
  options?: { estHoteDeVente?: boolean },
) {
  if (!evenement || typeof window === "undefined") return;
  if (file.length >= FILE_MAX) return;
  file.push(evenement);
  if (viderLaFile(options?.estHoteDeVente)) return;
  attendreLAccord(options?.estHoteDeVente);
}

/** Pour les tests : remet la file et l'écouteur à zéro. */
export function __reinitialiserPourTest() {
  file = [];
  ecouteurPose = false;
}
