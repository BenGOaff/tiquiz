// lib/checkout/avantages.ts
//
// CE QUE CHAQUE PALIER CONTIENT, ÉCRIT UNE SEULE FOIS.
//
// Béné, 2 septembre 2026 : "tu n'as pas ajouté les nouvelles
// fonctionnalités dans les blocs tarifs il me semble (pense aussi à les
// ajouter sur les bons de commande)."
//
// -- POURQUOI UN MODULE, ET PAS DEUX LISTES ---------------------------
//
// Elle demande la même liste à DEUX endroits : la grille tarifaire de la
// page de vente, et le bon de commande. Deux listes de la même chose
// finissent toujours par diverger, et c'est le défaut le plus cher de ce
// dépôt : les prix du blog contre le catalogue, `PRICING_PLUS` contre
// `OWNER_CATALOG`, la liste des réseaux de partage réécrite dans
// l'aperçu. Ici la divergence serait pire que d'habitude : elle vivrait
// sur l'écran où quelqu'un sort sa carte.
//
// Alors il n'y a qu'une liste. Le bon de commande l'affiche, et
// `npm run vente:v2` INJECTE ce qui manque dans la grille capturée. Un
// test compare les deux : ce qui est promis sur la page de vente doit
// être promis sur le bon de commande, au mot près.
//
// -- ET UNE LIGNE NE S'ÉCRIT QUE SI ELLE EST VRAIE ---------------------
//
// Chaque avantage cite le module qui le rend vrai. Sans ça, la liste
// devient un argumentaire, et un argumentaire sur un écran de paiement
// est une promesse qu'on découvre fausse après avoir payé.

import { OWNER_CATALOG, type OwnerProductId } from "@/lib/checkout/catalog";

export interface Avantage {
  /** La ligne courte, celle de la grille tarifaire. */
  readonly texte: string;
  /**
   * La précision, sur le bon de commande seulement.
   *
   * DEUX RENDUS, UNE SOURCE : la grille tarifaire a six colonnes et ne
   * supporte pas une phrase de deux lignes ; le bon de commande, lui,
   * est lu par quelqu'un qui hésite et qui veut le détail. Écrire deux
   * listes pour ça serait exactement la divergence qu'on répare.
   */
  readonly detail?: string;
  /**
   * Où ça vit dans le code. Jamais affiché : c'est pour le prochain
   * passage, pour qu'il puisse vérifier au lieu de croire.
   */
  readonly source: string;
}

/**
 * Ce que TOUS les paliers contiennent, gratuit compris.
 *
 * L'ordre est celui de la grille tarifaire capturée, pour que
 * l'injection tombe au bon endroit sans réordonner la colonne.
 */
export const AVANTAGES_COMMUNS: readonly Avantage[] = [
  { texte: "Génération IA des questions et résultats", source: "lib/prompts/quiz/" },
  { texte: "Connexion native Systeme.io", source: "app/api/quiz/[quizId]/public/route.ts" },
  { texte: "Capture de leads automatique avec tags", source: "app/api/quiz/[quizId]/public/route.ts" },
  { texte: "Design professionnel et responsive", source: "components/quiz/PublicQuizClient.tsx" },
  { texte: "Personnalisation du branding (logo, couleurs)", source: "lib/quiz/introLayout.ts" },
  { texte: "Lien partageable et intégration embed", source: "lib/quiz/urlPublique.ts" },
  { texte: "Statistiques de complétion", source: "lib/quiz/funnel.ts" },
] as const;

/**
 * LES TROIS NOUVEAUTÉS, ajoutées le 2 septembre 2026.
 *
 * Elles existent depuis un moment et n'étaient annoncées NULLE PART :
 * ni sur la page de vente, ni sur le bon de commande. Une fonctionnalité
 * qu'on ne montre pas n'existe pas pour la cliente (leçon Jocelyne,
 * 3 août), et celle-là ne se découvre même pas en cherchant.
 *
 * AUCUNE des trois n'est réservée à un palier : vérifié dans
 * `lib/planLimits.ts`, aucun `canUse…` ne les garde.
 */
export const AVANTAGES_NOUVEAUX: readonly Avantage[] = [
  {
    texte: "Suivi Meta, Google Analytics et Google Ads sur tes quiz",
    detail: "Tu colles tes identifiants une fois, tu sais ce que ta pub rapporte.",
    source: "lib/effectivePixels.ts (defaut sur le profil, surchargeable par quiz)",
  },
  {
    texte: "Guide d'automatisation : les tags exacts à créer dans Systeme.io",
    detail: "Tiquiz lit ton quiz et te donne la liste, nom par nom.",
    source: "lib/automatisation/planSysteme.ts + l'onglet Automatisation",
  },
  {
    texte: "Un seul quiz que tes affiliés partagent avec leur identifiant",
    detail: "Leurs contacts sont marqués à leur nom, leur commission est comptée.",
    source: "lib/quiz/affiliateRelay.ts (demande Maurice, 27 aout 2026)",
  },
] as const;

/** Ce que les deux paliers de base contiennent en plus du gratuit. */
export const AVANTAGES_PAYANTS: readonly Avantage[] = [
  { texte: "Quiz, sondages et Popquiz illimités", source: "lib/planLimits.ts, FREE_LIMITS" },
  { texte: "Réponses illimitées", source: "lib/planLimits.ts, visibleLeadsPerMonth" },
] as const;

/**
 * Ce que les paliers PLUS ajoutent.
 *
 * `canUseAIAnalysis` les garde tous les quatre : beta, lifetime,
 * mensuel PLUS, annuel PLUS. Les annoncer ailleurs serait une déception
 * à la première ouverture du compte.
 */
export const AVANTAGES_PLUS: readonly Avantage[] = [
  {
    texte: "Multiprofils : crée autant de profils que de clients que tu accompagnes",
    detail: "Un espace par client, sans mélanger les quiz ni les leads.",
    source: "lib/planLimits.ts, canUseMultiProjects",
  },
  {
    texte: "Analyse IA des résultats : ce qui ressort de toutes les réponses",
    detail: "Leurs mots à eux, résumés, pour savoir quoi vendre ensuite.",
    source: "lib/planLimits.ts, canUseAIAnalysis",
  },
  {
    texte: "Multi-clés API Systeme.io : connecte autant de comptes que nécessaire",
    detail: "Le compte de chaque client, sans te déconnecter à chaque fois.",
    source: "lib/planLimits.ts, canConnectMultipleSioKeys",
  },
  {
    texte: "Les 3 générateurs : le bonus, la séquence d'emails, les posts de promo",
    detail: "Ils relisent ton quiz et écrivent ce qui vient après.",
    source: "lib/generateurs/ + app/api/generateurs/route.ts (canUseAIAnalysis)",
  },
] as const;

/** Un palier est-il un palier PLUS ? Lu sur le catalogue, jamais deviné. */
export function estPalierPlus(id: OwnerProductId): boolean {
  return OWNER_CATALOG[id].plan.endsWith("_plus");
}

/**
 * La liste complète d'un produit vendu, dans l'ordre d'affichage.
 *
 * Le PLUS passe en PREMIER : c'est ce qui justifie l'écart de prix, et
 * quelqu'un qui lit une liste s'arrête avant la fin.
 */
export function avantagesDuPlan(id: OwnerProductId): readonly Avantage[] {
  return [
    ...(estPalierPlus(id) ? AVANTAGES_PLUS : []),
    ...AVANTAGES_PAYANTS,
    ...AVANTAGES_COMMUNS,
    ...AVANTAGES_NOUVEAUX,
  ];
}

/** Tout ce qui peut être écrit, pour les contrôles de cohérence. */
export function tousLesAvantages(): readonly Avantage[] {
  return [...AVANTAGES_PLUS, ...AVANTAGES_PAYANTS, ...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX];
}
