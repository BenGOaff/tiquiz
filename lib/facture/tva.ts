// lib/facture/tva.ts
//
// QUEL TAUX, ET POURQUOI CE TAUX LÀ.
//
// Une facture doit porter un taux de TVA et, quand il est à zéro, la
// raison légale de ce zéro. C'est la seule partie de la facturation qui
// demande une VRAIE décision : tout le reste est de la recopie.
//
// LES QUATRE CAS, ET ILS SONT EXHAUSTIFS
// ---------------------------------------
// 1. acheteur en FRANCE -> TVA française, 20 %. Un numéro de TVA ne
//    change RIEN : l'autoliquidation n'existe pas entre deux entreprises
//    du même pays. C'est le piège classique, et il coûte un redressement.
// 2. acheteur dans l'UE AVEC un numéro de TVA -> autoliquidation, 0 %.
// 3. acheteur dans l'UE SANS numéro de TVA -> le taux de SON pays
//    (guichet unique OSS), parce qu'un service électronique est taxé là
//    où le client consomme, pas là où le vendeur est établi.
// 4. acheteur HORS UE -> hors champ de la TVA française, 0 %.
//
// LE PRIX EST TTC, DONC LA TVA SE CALCULE À L'INTÉRIEUR
// ------------------------------------------------------
// Béné, 12 août : "je facture toujours TTC". Un client belge et un
// client français paient le même montant ; c'est la part de TVA qui
// change dedans. Le HT est donc `total / (1 + taux)`, jamais
// `total * taux` ajouté par dessus. C'est déjà ce que fait Stripe avec
// `tax_behavior: "inclusive"` : les deux chemins doivent dire la même
// chose, sinon une vente PayPal et une vente carte ne se déclarent pas
// pareil.
//
// CE QUE CE MODULE NE FAIT PAS, ET IL FAUT LE SAVOIR
// ---------------------------------------------------
// Il vérifie la FORME d'un numéro de TVA, pas son EXISTENCE. Seul VIES
// (le service de la Commission européenne) peut dire qu'un numéro est
// valide et actif, et c'est un appel réseau qui tombe régulièrement.
// Un numéro bien formé mais inexistant produirait une autoliquidation
// injustifiée, donc de la TVA à notre charge. Tant que VIES n'est pas
// branché, ces factures sont MARQUÉES (`a_completer`), et l'admin les
// voit. Mieux vaut une liste courte à vérifier qu'une confiance aveugle.

/** Le pays du vendeur. Tout est écrit de son point de vue. */
export const PAYS_VENDEUR = "FR";

/**
 * LES TAUX STANDARD DE L'UNION, EN POINTS DE BASE.
 *
 * `2000` = 20,00 %. En points de base parce que la Finlande est à 25,5 %
 * et que l'arrondir à 25 ou 26 fausserait chaque facture finlandaise.
 *
 * **CETTE TABLE SE PÉRIME.** Un État change son taux quand il veut, et
 * ça arrive plusieurs fois par an dans l'Union (la Slovaquie est passée
 * de 20 à 23 % en 2025, la Roumanie de 19 à 21 %). D'où la date
 * ci-dessous : un taux faux ne se voit sur aucun écran, il se voit à la
 * déclaration. À revérifier au moins une fois par an sur la liste
 * officielle de la Commission (« VAT rates applied in the Member
 * States »).
 */
export const TAUX_MAJ = "2026-08-24";

export const TAUX_UE: Readonly<Record<string, number>> = {
  AT: 2000, BE: 2100, BG: 2000, CY: 1900, CZ: 2100, DE: 1900, DK: 2500,
  EE: 2400, ES: 2100, FI: 2550, FR: 2000, GR: 2400, HR: 2500, HU: 2700,
  IE: 2300, IT: 2200, LT: 2100, LU: 1700, LV: 2100, MT: 1800, NL: 2100,
  PL: 2300, PT: 2300, RO: 2100, SE: 2500, SI: 2200, SK: 2300,
} as const;

export const PAYS_UE: readonly string[] = Object.keys(TAUX_UE);

/** Le pays, normalisé, ou null si on ne sait pas de quoi on parle. */
export function normaliserPays(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

export function estDansLUnion(pays: string | null): boolean {
  return !!pays && pays in TAUX_UE;
}

/**
 * LA FORME D'UN NUMÉRO DE TVA, par pays.
 *
 * Le préfixe DOIT correspondre au pays de l'adresse : un numéro belge
 * sur une adresse française n'est pas une erreur de frappe, c'est soit
 * une adresse fausse, soit une tentative de ne pas payer la TVA. Dans
 * les deux cas on ne l'accepte pas en silence.
 */
const FORMES: Readonly<Record<string, RegExp>> = {
  AT: /^ATU\d{8}$/, BE: /^BE0?\d{9,10}$/, BG: /^BG\d{9,10}$/,
  CY: /^CY\d{8}[A-Z]$/, CZ: /^CZ\d{8,10}$/, DE: /^DE\d{9}$/,
  DK: /^DK\d{8}$/, EE: /^EE\d{9}$/, ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^FI\d{8}$/, FR: /^FR[A-Z0-9]{2}\d{9}$/, GR: /^(EL|GR)\d{9}$/,
  HR: /^HR\d{11}$/, HU: /^HU\d{8}$/, IE: /^IE(\d{7}[A-Z]{1,2}|\d[A-Z*+]\d{5}[A-Z])$/,
  IT: /^IT\d{11}$/, LT: /^LT(\d{9}|\d{12})$/, LU: /^LU\d{8}$/,
  LV: /^LV\d{11}$/, MT: /^MT\d{8}$/, NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/, PT: /^PT\d{9}$/, RO: /^RO\d{2,10}$/,
  SE: /^SE\d{12}$/, SI: /^SI\d{8}$/, SK: /^SK\d{10}$/,
};

/** Le numéro sans espaces ni points, en majuscules, ou null. */
export function normaliserNumeroTva(v: unknown): string | null {
  const s = typeof v === "string" ? v.replace(/[\s.\-]/g, "").toUpperCase() : "";
  return s.length >= 4 && s.length <= 16 ? s : null;
}

/**
 * Le numéro est-il BIEN FORMÉ pour ce pays ? (pas : existe-t-il)
 *
 * La Grèce écrit `EL` sur ses numéros et `GR` sur ses adresses : le seul
 * pays où le préfixe du numéro n'est pas le code du pays, et l'oublier
 * ferait refuser toutes les autoliquidations grecques.
 */
export function numeroTvaBienForme(numero: string | null, pays: string | null): boolean {
  if (!numero || !pays) return false;
  const forme = FORMES[pays];
  if (!forme) return false;
  return forme.test(numero);
}

export type RegimeTva =
  /** TVA du pays du vendeur (acheteur français). */
  | "france"
  /** Guichet unique : le taux du pays de l'acheteur. */
  | "oss"
  /** Entreprise de l'Union hors France : 0 %, la TVA est due par elle. */
  | "autoliquidation"
  /** Hors Union : hors champ. */
  | "hors-ue";

export interface DecisionTva {
  regime: RegimeTva;
  /** En points de base. 0 pour l'autoliquidation et le hors UE. */
  tauxBp: number;
  /** Le pays qui a servi à décider. */
  pays: string;
  /** La phrase légale à imprimer sur la facture, ou null. */
  mention: string | null;
  /**
   * CE QUI RESTE À VÉRIFIER À LA MAIN, et pourquoi on émet quand même.
   *
   * "il a payé le client, il doit recevoir ses accès, point barre"
   * (7 août) vaut aussi pour sa facture : on ne la retient pas parce
   * qu'une case est vide. On l'émet, et on dit ce qui manque.
   */
  aCompleter: string[];
}

/**
 * LA DÉCISION. Le pays et le numéro sont des PARAMÈTRES, jamais devinés
 * depuis un objet client : deux appelants qui liraient l'adresse à deux
 * endroits différents finiraient par facturer deux taux différents.
 */
export function resoudreTva(args: {
  pays: string | null | undefined;
  numeroTva?: string | null;
}): DecisionTva {
  const aCompleter: string[] = [];
  const numero = normaliserNumeroTva(args.numeroTva);
  let pays = normaliserPays(args.pays);

  // PAYS INCONNU : on facture au taux français.
  //
  // Ce n'est pas un choix par défaut, c'est le choix le moins coûteux
  // pour le client : on paie 20 % au Trésor français au lieu de deviner
  // un pays. Une facture rectificative reste possible ; un client sans
  // facture, non.
  if (!pays) {
    pays = PAYS_VENDEUR;
    aCompleter.push("pays");
  }

  if (pays === PAYS_VENDEUR) {
    // Un numéro de TVA français ne donne AUCUN droit ici.
    return {
      regime: "france",
      tauxBp: TAUX_UE[PAYS_VENDEUR],
      pays,
      mention: null,
      aCompleter,
    };
  }

  if (!estDansLUnion(pays)) {
    return {
      regime: "hors-ue",
      tauxBp: 0,
      pays,
      mention: "TVA non applicable : prestation de service électronique hors Union européenne (article 259 B du CGI).",
      aCompleter,
    };
  }

  if (numero) {
    if (numeroTvaBienForme(numero, pays)) {
      return {
        regime: "autoliquidation",
        tauxBp: 0,
        pays,
        mention: "Autoliquidation : TVA due par le preneur (article 283-2 du CGI, article 196 de la directive 2006/112/CE).",
        // Bien formé n'est pas valide : voir l'en-tête. Tant que VIES
        // n'est pas branché, chaque autoliquidation se vérifie une fois.
        aCompleter: [...aCompleter, "tva-a-valider-vies"],
      };
    }
    // Numéro donné mais illisible ou d'un autre pays : on NE FAIT PAS
    // d'autoliquidation. Facturer la TVA est réparable, l'oublier non.
    aCompleter.push("tva-numero-invalide");
  }

  return {
    regime: "oss",
    tauxBp: TAUX_UE[pays],
    pays,
    mention: "TVA du pays du preneur, déclarée via le guichet unique OSS.",
    aCompleter,
  };
}

export interface Montants {
  totalCents: number;
  htCents: number;
  tvaCents: number;
  tauxBp: number;
}

/**
 * Décompose un montant TTC. `Math.round` sur le HT, et la TVA est la
 * DIFFÉRENCE : arrondir les deux séparément donne une facture dont la
 * somme des lignes ne fait pas le total, ce qu'un comptable voit tout
 * de suite.
 */
export function decomposerTTC(totalCents: number, tauxBp: number): Montants {
  const total = Math.round(Number(totalCents) || 0);
  const bp = Math.max(0, Math.round(Number(tauxBp) || 0));
  if (bp === 0) return { totalCents: total, htCents: total, tvaCents: 0, tauxBp: 0 };
  const ht = Math.round((total * 10_000) / (10_000 + bp));
  return { totalCents: total, htCents: ht, tvaCents: total - ht, tauxBp: bp };
}

/** "20 %", "25,5 %". Le taux tel qu'il s'imprime. */
export function formatTaux(tauxBp: number, locale = "fr-FR"): string {
  const v = (Number(tauxBp) || 0) / 100;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v)} %`;
}
