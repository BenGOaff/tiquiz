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

/**
 * Ce que les deux paliers de base contiennent en plus du gratuit.
 *
 * LES DEUX PORTENT UN `detail` DEPUIS LE 5 SEPTEMBRE, et c'est une
 * correction, pas une décoration. Béné, en relisant la grille de la
 * landing : "y'a plus de bénéfices dans le compte gratuit que le compte
 * à 17 € tu trouves ça logique et vendeur ?? Mets les bénéfices puces
 * promesses."
 *
 * Elle avait raison, et c'était mesurable : la colonne gratuite listait
 * ses TROIS limites, la colonne à 17 € ses DEUX lignes. Le palier payant
 * paraissait donc plus pauvre que le gratuit, sur l'écran où quelqu'un
 * sort sa carte.
 *
 * Une puce promesse, chez elle, c'est un BÉNÉFICE suivi de sa
 * CONSÉQUENCE concrète, et le test est "est-ce qu'on peut répondre
 * 'et alors ??' à la fin". "Réponses illimitées" appelle ce "et alors" ;
 * "ton quiz peut décoller un mardi sans qu'un seul email se floute" non.
 */
export const AVANTAGES_PAYANTS: readonly Avantage[] = [
  {
    texte: "Quiz, sondages et Popquiz illimités",
    detail: "Tu testes trois accroches sur trois quiz, au lieu d'en sacrifier deux.",
    source: "lib/planLimits.ts, FREE_LIMITS",
  },
  {
    texte: "Réponses illimitées",
    detail: "Ton quiz peut décoller un mardi sans qu'un seul email se floute.",
    source: "lib/planLimits.ts, visibleLeadsPerMonth",
  },
  {
    // Béné, 5 septembre 2026 : "pour mensuel et annuel (sans plus)
    // annonce aussi le retrait du watermark tiquiz."
    //
    // MESURÉ AVANT DE L'ÉCRIRE, dans app/api/quiz/[quizId]/public :
    // `footerAllowed = isPaidPlan(ownerPlan) || isResellerSub`, et
    // `hideBranding = footerAllowed && quiz.hide_branding`. C'est donc
    // vrai sur TOUS les paliers payants, et jamais en gratuit.
    //
    // Et la ligne manquait partout : ni sur la page de vente, ni sur le
    // bon de commande. Une fonctionnalité qu'on ne montre pas n'existe
    // pas pour la cliente, et celle là est ce qu'on remarque en premier
    // sur un quiz publié.
    texte: "Ton quiz sans la mention Tiquiz, et ton propre pied de page",
    detail: "Ton visiteur ne voit que ta marque, du début à la fin.",
    source: "app/api/quiz/[quizId]/public/route.ts, footerAllowed",
  },
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
