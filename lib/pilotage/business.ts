// lib/pilotage/business.ts
//
// L'ÉQUILIBRE ENTRE CE QUI RENTRE ET CE QUI SORT (Béné, 29 août 2026).
//
// "Business : équilibre entre ventes (ce qui rentre) et affiliation (ce
// qui sort), churn, revenu récurrent (abonnés). Je dois voir facilement
// ce que je vais rentrer et sortir tous les mois sur toutes les app."
//
// -- CE QUI SORT N'EST PAS UN SEUL CHIFFRE, ET C'EST LE POINT ---------
//
// Trois montants qui n'ont pas le même statut :
//   dues            gagné, garantie passée, ça part au prochain lot
//   sous garantie   gagné, mais la vente peut encore être remboursée
//   versé           déjà parti
//
// Les additionner donnerait un coût qui a l'air juste et qui ne veut
// rien dire : "versé" concerne des ventes d'avant, "sous garantie"
// n'est peut être jamais dû. Le NET du mois se calcule sur ce qui est
// vraiment engagé : l'encaissé moins les commissions dues et sous
// garantie, parce que les deux sont des promesses faites sur les ventes
// de cette période là.
//
// -- ET ON NE MÉLANGE PAS LE RÉCURRENT AVEC L'ENCAISSÉ ----------------
//
// Le revenu récurrent est une PROJECTION (ce qui se renouvellera), pas
// une recette. Les additionner ferait compter deux fois le même argent.
// Deux blocs, deux titres.
//
// PUR : ni horloge ni base.

export interface CoutAffiliation {
  duesCents: number;
  sousGarantieCents: number;
  verseesCents: number;
  annuleesCents: number;
  autresDevises: number;
  tronque: boolean;
}

export const COUT_INCONNU: CoutAffiliation = {
  duesCents: 0,
  sousGarantieCents: 0,
  verseesCents: 0,
  annuleesCents: 0,
  autresDevises: 0,
  tronque: false,
};

export interface Balance {
  entreCents: number;
  /** Ce qui est ENGAGÉ sur les ventes de la période : dû + sous garantie. */
  sortCents: number;
  netCents: number;
  /** Part de l'encaissé qui part en commissions, ou `null` si rien n'est rentré. */
  partPct: number | null;
}

/**
 * La balance d'une période.
 *
 * `sortCents` ne compte QUE ce qui est engagé sur les ventes de cette
 * période : le déjà versé concerne des ventes d'avant, l'ajouter
 * ferait payer deux fois le même mois.
 */
export function balance(
  encaisseCents: number,
  cout: CoutAffiliation,
): Balance {
  const entre = Math.max(0, Number(encaisseCents) || 0);
  const sort = (Number(cout.duesCents) || 0) + (Number(cout.sousGarantieCents) || 0);
  return {
    entreCents: entre,
    sortCents: sort,
    netCents: entre - sort,
    // UN POURCENTAGE SUR ZÉRO N'EST PAS ZÉRO, c'est rien. Afficher
    // "0 %" sur un mois sans vente ferait croire que l'affiliation ne
    // coûte pas, alors qu'il n'y a simplement rien à mesurer.
    partPct: entre > 0 ? Math.round((sort / entre) * 1000) / 10 : null,
  };
}

/**
 * CE QU'ON DOIT VRAIMENT, ET QUAND.
 *
 * Béné, 29 août : "on tracke les commissions, donc on peut estimer en
 * temps réel les commissions à verser ? À ajuster en fonction du délai
 * de 30 jours et des remboursements, mais sinon y'a pas de surprises."
 *
 * Elle a raison, et c'est mieux que ce qu'il y avait avant : le premier
 * jet EXTRAPOLAIT le mois prochain en appliquant à l'abonnement
 * récurrent le pourcentage observé sur la période. Un taux moyen
 * appliqué à un autre mois donne un chiffre précis et faux : il suffit
 * qu'une grosse vente affiliée tombe dans la période pour que le
 * prévisionnel double sans qu'aucun abonné n'ait bougé.
 *
 * On n'extrapole donc plus rien. Les trois montants existent DÉJÀ,
 * commission par commission, dans l'espace affilié :
 *
 *   à verser        garantie de 30 jours passée, ça part au prochain lot
 *   sous garantie   gagné, mais la vente peut encore être remboursée
 *   déjà versé      parti, plus rien à décider
 *
 * "Pas de surprises" est exact à une chose près, et elle la nomme
 * elle même : un remboursement pendant la garantie annule sa
 * commission. C'est pour ça que les deux premiers montants restent
 * SÉPARÉS et ne s'additionnent jamais en un seul "à payer".
 */
export interface Engagement {
  /** Ce qui part au prochain lot. Ce montant là ne bougera plus. */
  aVerserCents: number;
  /** Gagné, encore annulable par un remboursement. */
  sousGarantieCents: number;
  /** Déjà parti. Ne concerne pas les ventes de la période. */
  verseesCents: number;
  /** Le total engagé sur les ventes de la période. */
  engageCents: number;
  /** Des commissions dans une autre devise, jamais additionnées. */
  autresDevises: number;
}

export function engagement(cout: CoutAffiliation | null): Engagement | null {
  // `null` traverse : "je n'ai pas pu lire" et "ça n'a rien coûté" sont
  // deux réponses différentes, et la seconde afficherait une marge
  // parfaite qui n'existe pas.
  if (!cout) return null;
  const aVerser = Math.max(0, Number(cout.duesCents) || 0);
  const sous = Math.max(0, Number(cout.sousGarantieCents) || 0);
  return {
    aVerserCents: aVerser,
    sousGarantieCents: sous,
    verseesCents: Math.max(0, Number(cout.verseesCents) || 0),
    engageCents: aVerser + sous,
    autresDevises: Math.max(0, Number(cout.autresDevises) || 0),
  };
}

/**
 * LES CHIFFRES QUI PASSENT DEVANT.
 *
 * Béné : "tu peux pas me faire ressortir des chiffres importants ?
 * Genre en haut revenus récurrents, commissions en cours."
 *
 * Quatre, pas huit : au delà, plus rien ne ressort et on est revenu au
 * tableau qu'elle trouve triste. Chacun porte une phrase qui dit ce
 * qu'il est, parce qu'un grand nombre sans légende ne se compare à rien.
 */
export type TonTuile = "neutre" | "positif" | "sortie";

export interface Tuile {
  cle: "recurrent" | "encaisse" | "commissions" | "net";
  titre: string;
  cents: number | null;
  /** La ligne sous le nombre. Jamais vide : elle dit ce qu'il contient. */
  note: string;
  ton: TonTuile;
}

export function tuiles(args: {
  mrrCents: number;
  abonnes: number;
  encaisseCents: number;
  ventes: number;
  engagement: Engagement | null;
}): Tuile[] {
  const e = args.engagement;
  const b = balance(args.encaisseCents, {
    duesCents: e?.aVerserCents ?? 0,
    sousGarantieCents: e?.sousGarantieCents ?? 0,
    verseesCents: 0,
    annuleesCents: 0,
    autresDevises: 0,
    tronque: false,
  });

  return [
    {
      cle: "recurrent",
      titre: "Revenu récurrent",
      cents: args.mrrCents,
      note: `${args.abonnes} abonnement${args.abonnes > 1 ? "s" : ""} en cours`,
      ton: "positif",
    },
    {
      cle: "encaisse",
      titre: "Encaissé sur la période",
      cents: args.encaisseCents,
      note: `${args.ventes} vente${args.ventes > 1 ? "s" : ""}`,
      ton: "neutre",
    },
    {
      cle: "commissions",
      titre: "Commissions en cours",
      cents: e ? e.engageCents : null,
      note: e
        ? `${euros(e.aVerserCents)} à verser, ${euros(e.sousGarantieCents)} sous garantie 30 jours`
        : "l'espace affilié n'a pas répondu",
      ton: "sortie",
    },
    {
      cle: "net",
      titre: "Net de la période",
      cents: e ? b.netCents : null,
      note: e
        ? b.partPct === null
          ? "rien n'est rentré sur la période"
          : `${b.partPct} % de l'encaissé part en commissions`
        : "on ne l'affiche pas tant qu'on ne sait pas ce qui sort",
      ton: "neutre",
    },
  ];
}

/** Le format des montants des notes. Écrit ici, pas dans l'écran. */
function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
