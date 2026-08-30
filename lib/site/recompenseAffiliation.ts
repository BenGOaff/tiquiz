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

import { OWNER_CATALOG, type OwnerProductId } from "@/lib/checkout/catalog";
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

export interface Simulation {
  filleuls: number;
  tauxPct: number;
  remisePct: number;
  /** Option 1 : le taux majoré, sur 12 mois, en centimes. */
  option1Cents: number;
  /** Option 2 : commissions au taux de base + remise sur son abo. */
  option2Cents: number;
  /** La part "remise" de l'option 2, pour l'expliquer. */
  economieCents: number;
  /** Les commissions au taux de base, part commune de l'option 2. */
  baseCents: number;
  /** Laquelle rapporte le plus. */
  gagnante: "taux" | "remise" | "egalite" | "aucune";
  /** L'écart entre les deux, en centimes. */
  ecartCents: number;
}

/**
 * LES DEUX OPTIONS, CALCULÉES SUR 12 MOIS.
 *
 * C'est une FENÊTRE DE CALCUL, pas une prévision : elle suppose que les
 * filleuls restent abonnés toute l'année. Le dire est obligatoire, et
 * l'écran le dit. Promettre un revenu serait exactement ce que Béné
 * interdit.
 */
export function simuler(args: {
  /** Le palier que prennent ses filleuls. */
  filleuls: number;
  planFilleul: OwnerProductId;
  /** Son propre abonnement : il sert à chiffrer la remise. */
  planPerso: OwnerProductId;
}): Simulation {
  const n = filleuls(args.filleuls);
  const tauxPct = tauxCommissionPct(n);
  const remisePct = remiseAbonnementPct(n);
  const parAn = echeancesParAn(args.planFilleul);

  const option1Cents = n * commissionCentsAuTaux(args.planFilleul, tauxPct) * parAn;
  const baseCents = n * commissionCentsAuTaux(args.planFilleul, COMMISSION_BASE_PCT) * parAn;

  const prixPerso = OWNER_CATALOG[args.planPerso].amountCents;
  const economieCents = Math.round(
    prixPerso * (remisePct / 100) * echeancesParAn(args.planPerso),
  );
  const option2Cents = baseCents + economieCents;

  let gagnante: Simulation["gagnante"] = "egalite";
  if (n === 0) gagnante = "aucune";
  else if (option1Cents > option2Cents) gagnante = "taux";
  else if (option2Cents > option1Cents) gagnante = "remise";

  return {
    filleuls: n,
    tauxPct,
    remisePct,
    option1Cents,
    option2Cents,
    economieCents,
    baseCents,
    gagnante,
    ecartCents: Math.abs(option1Cents - option2Cents),
  };
}

/** La TVA retenue, réexportée pour que l'écran puisse l'expliquer. */
export { TVA };
