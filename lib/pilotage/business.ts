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
 * Ce que le mois prochain devrait rapporter, net.
 *
 * Le récurrent moins la part qui repartira en commissions, estimée sur
 * la part observée de la période. C'est une PROJECTION et elle le dit :
 * personne ne doit la lire comme une recette.
 *
 * Rend `null` quand on n'a pas de part observée : inventer un taux
 * donnerait un prévisionnel faux qui a l'air précis.
 */
export function previsionnel(mrrCents: number, partPct: number | null): number | null {
  if (partPct === null) return null;
  const mrr = Math.max(0, Number(mrrCents) || 0);
  return Math.round(mrr * (1 - partPct / 100));
}
