// lib/site/programmeAffiliation.ts
//
// LES CHIFFRES DU PROGRAMME D'AFFILIATION, CALCULÉS ET NON TAPÉS.
//
// Béné, 30 août 2026 : "il faut tout mettre à jour, les prix, le
// fonctionnement qui bascule de systeme io vers notre propre serveur,
// le nouveau programme d'affi sur tiquiz et l'atelier."
//
// -- POURQUOI UN MODULE, ET PAS DES NOMBRES DANS LE JSX ----------------
//
// Sa ligne rouge numéro un, c'est le chiffre faux. Une page de vente
// qui annonce "5,67 € par mois" en dur continue de l'annoncer le jour
// où le prix de Tiquiz change, et personne ne s'en aperçoit avant
// qu'un affilié ne compte son versement. Les exemples sont donc
// DÉRIVÉS du catalogue (`lib/checkout/catalog.ts`), qui est déjà la
// seule source des prix affichés sur le bon de commande.
//
// -- LES TAUX VIVENT DANS TIPOTE, ET C'EST ASSUMÉ ----------------------
//
// `COMMISSION_RATES` est dans `lib/affiliate/commission.ts` du dépôt
// Tipote, qui est celui qui PAIE. Ce dépôt ne fait que vendre. Les
// recopier ici est une duplication, et une duplication finit toujours
// par diverger : le test `programme-affiliation.test.mts` fige donc les
// valeurs, et tout changement de taux doit être porté DES DEUX CÔTÉS.
// Mieux vaut une duplication qui crie qu'une page qui ment.

import { OWNER_CATALOG, formatCents, type OwnerProductId } from "@/lib/checkout/catalog";

/**
 * Les taux, tels que `lib/affiliate/commission.ts` (Tipote) les applique.
 * Vérifiés dans le code le 30 août 2026, pas déduits d'une page.
 */
export const TAUX = {
  tiquiz: 0.4,
  atelier: 0.7,
} as const;

/** Le prix public de l'Atelier du Quiz, en centimes. */
export const PRIX_ATELIER_CENTS = 4700;

/**
 * LE TAUX DE TVA RETENU POUR PASSER DU PRIX AFFICHÉ AU MONTANT HT.
 *
 * La commission Tiquiz se calcule sur le HT : `commissionBaseCents`
 * retire la TVA avant d'envoyer la vente à Tipote, avec `base: "ht"`.
 * Annoncer une commission calculée sur le TTC gonflerait l'exemple de
 * 20 %, et l'affilié verrait la différence sur son premier versement.
 */
export const TVA = 0.2;

/** Le montant hors taxes d'un prix affiché. */
export function horsTaxes(ttcCents: number): number {
  return Math.round(ttcCents / (1 + TVA));
}

/** Ce que rapporte UNE vente de ce palier, à chaque échéance. */
export function commissionCents(produit: OwnerProductId): number {
  return Math.round(horsTaxes(OWNER_CATALOG[produit].amountCents) * TAUX.tiquiz);
}

/**
 * "PLUS" EN CAPITALES, C'EST SA CONVENTION DE MARQUE.
 *
 * Le catalogue écrit "Tiquiz mensuel Plus" : ce libellé sert aussi le
 * bon de commande et les factures, on n'y touche pas depuis ici. La
 * mise en forme de marque est une décision d'AFFICHAGE, elle vit donc
 * dans la fonction qui affiche.
 */
function libellePublic(label: string): string {
  return label.replace(/\bPlus\b/g, "PLUS");
}

export interface LigneGain {
  palier: string;
  /** Le prix payé par le client, tel qu'affiché sur le bon de commande. */
  prix: string;
  /** Ce que touche l'affilié, à chaque échéance. */
  gain: string;
  /** "par mois" ou "par an", pour que personne ne confonde les deux. */
  rythme: string;
}

/**
 * Le tableau des gains, dans l'ordre du catalogue.
 *
 * `rythme` n'est pas décoratif : 56,67 € sur l'annuel et 5,67 € sur le
 * mensuel ne se comparent pas, et une colonne qui les mettrait côte à
 * côte sans le dire ferait croire que l'annuel rapporte dix fois plus.
 */
export function tableauDesGains(locale = "fr-FR"): LigneGain[] {
  const rythmes: Record<OwnerProductId, string> = {
    mensuel: "chaque mois",
    "mensuel-plus": "chaque mois",
    annuel: "chaque année",
    "annuel-plus": "chaque année",
  };
  return (Object.keys(OWNER_CATALOG) as OwnerProductId[]).map((id) => ({
    palier: libellePublic(OWNER_CATALOG[id].label),
    prix: formatCents(OWNER_CATALOG[id].amountCents, OWNER_CATALOG[id].currency, locale),
    gain: formatCents(commissionCents(id), OWNER_CATALOG[id].currency, locale),
    rythme: rythmes[id],
  }));
}

/**
 * Ce que rapporte une vente de l'Atelier du Quiz.
 *
 * SUR LE HORS TAXES, comme Tiquiz. Le premier jet calculait 70 % du
 * TTC, soit 32,90 €, et c'était faux : sa propre page d'affiliation
 * annonce 27,42 €, qui est bien 70 % du HT (47 / 1,2 x 0,7). Annoncer
 * un montant plus élevé que celui qui sera versé est la pire erreur
 * possible sur une page d'affiliation : l'affilié le découvre à son
 * premier virement.
 */
export function gainAtelier(locale = "fr-FR"): { prix: string; gain: string } {
  return {
    prix: formatCents(PRIX_ATELIER_CENTS, "eur", locale),
    gain: formatCents(Math.round(horsTaxes(PRIX_ATELIER_CENTS) * TAUX.atelier), "eur", locale),
  };
}

/**
 * LES RÈGLES DU PROGRAMME, DANS LEUR FORMULATION PUBLIQUE.
 *
 * Chacune correspond à une constante du code, citée à côté : c'est ce
 * qui permet de vérifier qu'on n'annonce rien qui ne soit implémenté.
 * Béné, 26 août : "je dois être sûre que tu as bien tout compris et
 * pris en compte avant d'envoyer le moindre code."
 */
export const REGLES: readonly { titre: string; texte: string }[] = [
  {
    titre: "Le cookie dure 1 an",
    texte:
      "Quelqu'un clique sur ton lien en janvier, il achète en juin : la vente est à toi. C'est REF_MAX_AGE_SECONDS, et c'est la même durée que chez Systeme.io.",
  },
  {
    titre: "Une inscription gratuite te le rattache à vie",
    texte:
      "S'il crée un compte gratuit par ton lien, il reste ton filleul même s'il paie deux ans plus tard, cookie expiré ou pas. Et c'est le PREMIER rattachement qui gagne, jamais le dernier : un contact appartient à celui qui l'a amené.",
  },
  {
    titre: "Tu es payé à chaque échéance",
    texte:
      "Pas une fois. Chaque mois où ton filleul reste abonné, tu touches ta commission. S'il arrête, ça s'arrête, c'est tout.",
  },
  {
    titre: "Versable 30 jours après le paiement",
    texte:
      "Le temps que le délai de remboursement passe. Un virement parti ne se reprend pas, donc on attend d'être sûr.",
  },
  {
    titre: "Virement entre le 10 et le 13 du mois",
    texte:
      "Dès 20 € accumulés (Systeme.io demandait 50 €). En dessous, l'argent reste acquis et part au versement suivant : rien ne se perd.",
  },
  {
    titre: "Ta facture, on l'écrit pour toi",
    texte:
      "Tu remplis tes coordonnées et ton statut une fois, et on émet l'autofacture chaque mois pour ta compta. Tu n'as rien à nous envoyer.",
  },
  {
    titre: "PayPal ou virement, au choix",
    texte:
      "Ton adresse PayPal ou ton IBAN, dans ton espace affilié. L'IBAN est chiffré et ne ressort jamais en clair, même pour toi : tu vois un masque, tu le ressaisis pour le changer.",
  },
  {
    titre: "Un remboursement annule la commission",
    texte:
      "Uniquement l'échéance remboursée. Les mois déjà encaissés sont gagnés et restent acquis.",
  },
] as const;
