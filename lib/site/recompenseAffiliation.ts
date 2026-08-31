// lib/site/recompenseAffiliation.ts
//
// LA RÉCOMPENSE DE L'AFFILIÉ, POUR L'AFFICHER SANS MENTIR.
//
// Béné, 30 août 2026 : "pourquoi t'as pas remis le calculateur c'était
// vachement bien ?" Elle a raison, et je ne l'avais pas vu parce que je
// n'avais pas lu sa page avant de la remplacer.
//
// -- LES RÈGLES VIENNENT DU CODE, PAS DE LA PAGE DE VENTE --------------
//
// Sa page Systeme.io et `lib/affiliate/recompense.ts` (dépôt Tipote, le
// seul qui PAIE) ne disaient pas la même chose, relevé le 30 août :
//
//   | | sa page | le code |
//   | taux majoré | 45 % à partir de 10 filleuls | 45 % dès le 1er |
//   | remise abo  | 1 % par filleul | par marches de 10 (9 -> 0 %) |
//   | plafond 70 %| à 60 filleuls | à 51 |
//
// Un simulateur qui suivrait la page annoncerait "5 % de remise" à
// quelqu'un qui en touchera 0. On suit donc le CODE, et l'écart est
// signalé à Béné pour qu'elle tranche.
//
// -- LA DUPLICATION EST ASSUMÉE ET SURVEILLÉE --------------------------
//
// Ces constantes vivent dans Tipote. Les importer d'ici est impossible
// (deux dépôts), les recopier fait diverger. Le test
// `simulateur-affiliation.test.mts` les FIGE : tout changement de barème
// doit être porté des deux côtés, et le test rougit si un seul bouge.

import { OWNER_CATALOG, OWNER_PRODUCT_ORDER, type OwnerProductId } from "@/lib/checkout/catalog";
import { TAUX, TVA, horsTaxes } from "@/lib/site/programmeAffiliation";

/** Une marche tous les 10 filleuls. */
export const PALIER_FILLEULS = 10;
/** À 100 filleuls, l'abonnement est offert. */
export const REMISE_ABO_MAX_PCT = 100;
export const COMMISSION_BASE_PCT = Math.round(TAUX.tiquiz * 100);
export const COMMISSION_MAX_PCT = 70;
export const COMMISSION_PAS_PCT = 5;

function filleuls(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0;
}

/**
 * La remise sur SON abonnement, en pourcentage.
 *
 * Par marches de 10 : 10 filleuls -10 %, 20 -20 %, 100 et plus =
 * gratuit. Entre deux marches, rien ne bouge.
 */
export function remiseAbonnementPct(filleulsActifs: unknown): number {
  const n = filleuls(filleulsActifs);
  return Math.min(REMISE_ABO_MAX_PCT, Math.floor(n / PALIER_FILLEULS) * PALIER_FILLEULS);
}

/**
 * Son taux de commission, en pourcentage.
 *
 * ATTENTION, LES DEUX ÉCHELLES NE SE DÉCOUPENT PAS PAREIL, et c'est
 * voulu : ici la marche s'ouvre au PREMIER filleul (1 suffit pour 45 %),
 * alors que la remise attend le DIXIÈME (9 filleuls = 0 %). Ce sont les
 * deux formulations de Béné du 25 août, et les aligner de force
 * reviendrait à changer un chiffre qu'elle a donné.
 */
export function tauxCommissionPct(filleulsActifs: unknown): number {
  const n = filleuls(filleulsActifs);
  return Math.min(
    COMMISSION_MAX_PCT,
    COMMISSION_BASE_PCT + Math.ceil(n / PALIER_FILLEULS) * COMMISSION_PAS_PCT,
  );
}

/** Ce que rapporte UNE échéance de ce palier, en centimes, à ce taux. */
export function commissionCentsAuTaux(produit: OwnerProductId, tauxPct: number): number {
  return Math.round(horsTaxes(OWNER_CATALOG[produit].amountCents) * (tauxPct / 100));
}

/** Combien de fois par an ce palier est encaissé. */
export function echeancesParAn(produit: OwnerProductId): number {
  return OWNER_CATALOG[produit].interval === "year" ? 1 : 12;
}

// L'ANCIEN SIMULATEUR A ÉTÉ RETIRÉ, PAS DÉSACTIVÉ (31 août 2026).
//
// `simuler()` rendait des totaux sur 12 mois et ARBITRAIT entre les deux
// récompenses ("ce que tu as intérêt à choisir"), ce qui l'obligeait à
// demander au visiteur SON abonnement avant de lui montrer le moindre
// chiffre. Béné : "le visiteur doit voir que ça existe mais là on
// l'aide à être séduit par le programme c'est tout."
//
// Le laisser exporté sans appelant en aurait fait un piège : le prochain
// passage l'aurait rebranché en croyant réparer, et l'arbitrage serait
// revenu. Une fonction morte se retire.

/** La TVA retenue, réexportée pour que l'écran puisse l'expliquer. */
export { TVA };

// ── COMBIEN JE GAGNE CHAQUE MOIS ─────────────────────────────────────
//
// Béné, 31 août 2026 : "la calculatrice sur la page affiliation est
// bordélique : je veux voir combien je gagne chaque mois en fonction de
// mes affiliés, et de leurs plans. Et en dessous, je veux voir
// l'option : augmenter mes commissions OU faire baisser mon abonnement.
// Le visiteur doit voir que ça existe mais là on l'aide à être séduit
// par le programme c'est tout."
//
// Trois choses clochaient, et les trois sont dans sa phrase.
//
// **1. Le simulateur ne répondait pas à la question posée.** Il rendait
// des totaux SUR 12 MOIS, et la question d'un affilié est mensuelle :
// "ma rente, c'est combien par mois ?" Il fallait diviser de tête, et
// pas par 12 pour un filleul annuel.
//
// **2. Un seul plan pour TOUS les filleuls.** Elle écrit "de LEURS
// plans", au pluriel : une audience mélange forcément du mensuel et de
// l'annuel, et c'est le mélange qui donne le vrai chiffre.
//
// **3. Il ARBITRAIT entre les deux récompenses** ("ce que tu as intérêt
// à choisir"), et pour ça il demandait le plan PERSO du visiteur avant
// même de lui montrer un chiffre. Un formulaire qui interroge quelqu'un
// sur un abonnement qu'il n'a pas encore, sur une page qui essaie de le
// convaincre, c'est une porte fermée. Le choix se fait dans l'espace
// affilié, une fois inscrit, avec ses vrais filleuls.
//
// -- LE LISSAGE MENSUEL EST DIT, JAMAIS CACHÉ -------------------------
//
// Un filleul ANNUEL paie une fois par an. Le porter dans un total
// mensuel suppose qu'on étale sa commission sur douze mois : c'est la
// seule façon d'additionner des paliers de récurrences différentes, et
// l'écran doit le dire. Annoncer 56,67 € le mois de l'échéance et 0 €
// les onze autres serait exact et inutilisable.

/** Combien de filleuls sur chaque palier. Absent = zéro. */
export type FilleulsParPlan = Partial<Record<OwnerProductId, number>>;

export interface LignePlan {
  produit: OwnerProductId;
  filleuls: number;
  /** Ce que cette ligne rapporte par mois, échéance annuelle LISSÉE. */
  mensuelCents: number;
}

export interface SimulationMensuelle {
  /** Le total des filleuls, toutes formules confondues. */
  filleuls: number;
  /** Le taux qui s'applique à ce nombre de filleuls. */
  tauxPct: number;
  /** LA réponse à la question : combien par mois. */
  mensuelCents: number;
  /** Le même calcul sur douze mois, pour qui préfère l'année. */
  annuelCents: number;
  /** Ce que le taux de base aurait donné, pour chiffrer la marche. */
  mensuelAuTauxDeBaseCents: number;
  /** Le détail, palier par palier, dans l'ordre du catalogue. */
  lignes: LignePlan[];
  /** La remise d'abonnement atteinte à ce nombre de filleuls. */
  remisePct: number;
}

/**
 * LA RENTE MENSUELLE D'UN MÉLANGE DE FILLEULS.
 *
 * Pure et testée : un barème enfermé dans un composant React n'est pas
 * testable, donc il n'est pas testé, et c'est exactement là que les
 * bugs de chiffres s'installent.
 *
 * **Le taux s'applique au TOTAL des filleuls, pas palier par palier.**
 * C'est ce que fait `attributeSale` chez Tipote (`recompense_commission_pct`
 * est posé sur l'affilié, pas sur la vente) : découper le calcul par
 * palier donnerait un taux plus bas que celui réellement versé.
 */
export function simulerParPlan(parPlan: FilleulsParPlan): SimulationMensuelle {
  const lignesBrutes = OWNER_PRODUCT_ORDER.map((produit) => ({
    produit,
    filleuls: filleuls(parPlan[produit]),
  }));
  const total = lignesBrutes.reduce((s, l) => s + l.filleuls, 0);
  const tauxPct = tauxCommissionPct(total);

  const mensuelDe = (produit: OwnerProductId, taux: number): number =>
    // Une échéance ANNUELLE est lissée sur douze mois : c'est la seule
    // façon d'additionner des paliers qui n'ont pas la même récurrence,
    // et l'écran le dit en toutes lettres.
    (commissionCentsAuTaux(produit, taux) * echeancesParAn(produit)) / 12;

  const lignes: LignePlan[] = lignesBrutes.map((l) => ({
    ...l,
    mensuelCents: Math.round(l.filleuls * mensuelDe(l.produit, tauxPct)),
  }));

  // Le total est arrondi UNE fois, sur la somme non arrondie : arrondir
  // chaque ligne puis les additionner ferait que le total affiché ne
  // serait pas la somme des lignes affichées, à un centime près. C'est
  // le genre d'écart qu'un affilié relève et qui coûte la confiance.
  const brut = lignesBrutes.reduce((s, l) => s + l.filleuls * mensuelDe(l.produit, tauxPct), 0);
  const base = lignesBrutes.reduce(
    (s, l) => s + l.filleuls * mensuelDe(l.produit, COMMISSION_BASE_PCT),
    0,
  );

  return {
    filleuls: total,
    tauxPct,
    mensuelCents: Math.round(brut),
    annuelCents: Math.round(brut * 12),
    mensuelAuTauxDeBaseCents: Math.round(base),
    lignes,
    remisePct: remiseAbonnementPct(total),
  };
}

// ── LA MARCHE SUIVANTE ───────────────────────────────────────────────
//
// Béné, 31 août 2026 : "elle prend en compte l'augmentation de palier ?
// Il faut ! [...] la calculatrice elle doit prendre en compte le taux
// suivant le nb d'affiliés."
//
// Le taux ÉTAIT bien appliqué (`simulerParPlan` appelle
// `tauxCommissionPct` sur le TOTAL), mais l'écran n'en disait rien : on
// voyait un montant sans voir la mécanique qui le fait monter. Un
// barème invisible ne motive personne à bouger un curseur.
//
// La décision vit ICI et pas dans le composant, pour la même raison que
// le reste du fichier : le seuil de la marche suivante est un calcul,
// donc il se teste.
//
// **Le seuil s'ouvre au PREMIER filleul de la dizaine** (1 -> 45 %,
// 11 -> 50 %), c'est le découpage de `tauxCommissionPct` et il ne doit
// pas être réécrit ici : deux formules pour le même barème finissent
// toujours par diverger.

export interface MarcheSuivante {
  /** À combien de filleuls la marche s'ouvre. */
  filleuls: number;
  /** Le taux qu'on atteint alors. */
  tauxPct: number;
  /** Combien il en manque depuis là où on est. */
  manque: number;
}

/** La prochaine marche de commission, ou `null` une fois au plafond. */
export function prochaineMarcheCommission(filleulsActifs: unknown): MarcheSuivante | null {
  const n = filleuls(filleulsActifs);
  if (tauxCommissionPct(n) >= COMMISSION_MAX_PCT) return null;
  const seuil = n === 0 ? 1 : PALIER_FILLEULS * Math.ceil(n / PALIER_FILLEULS) + 1;
  return { filleuls: seuil, tauxPct: tauxCommissionPct(seuil), manque: seuil - n };
}
