// lib/pilotage/serieEmpilee.ts
//
// UN SEUL GRAPHIQUE, AVEC UN CODE COULEUR (Béné, 29 août 2026).
//
// "Des infos pourraves genre graphique sans courbe, avec des mois dont
// on se fiche, c'est écrit en tout petit illisible, tout entassé les uns
// sur les autres alors qu'on pourrait tout avoir sur un seul graphique
// avec des codes couleurs par exemple."
//
// Les trois reproches sont exacts, et les trois ont une cause :
//
// 1. LE GRAPHIQUE SANS BARRES. Ce n'était pas un manque de données : la
//    hauteur de chaque barre était un POURCENTAGE, et son conteneur
//    direct une colonne flex sans hauteur propre. Un pourcentage calculé
//    sur une hauteur indéfinie ne vaut rien, donc la barre s'écrasait à
//    zéro. Les montants s'écrivaient, les barres n'existaient pas.
//    -> Ici les hauteurs sont en PIXELS, calculées sur une hauteur de
//    tracé donnée. Plus aucune chaîne de pourcentages à casser.
//
// 2. LES MOIS DONT ON SE FICHE. La fenêtre était "les 12 derniers mois"
//    quelle que soit la donnée, donc 7 colonnes vides occupaient la
//    moitié de la largeur. -> On COUPE ce qui précède le premier mois
//    qui porte quelque chose. Les trous À L'INTÉRIEUR restent : un mois
//    creux entre deux mois pleins est une information.
//
// 3. TROIS GRAPHIQUES EMPILÉS. -> Un seul, empilé par produit.
//
// PUR : ni horloge ni composant. La date de fin est un PARAMÈTRE, sinon
// le test dépend de l'heure et finit par clignoter (leçon du 1er août).

import { moisDe, derniersMois, moisLabel } from "@/lib/admin/adminStats";
import { readSaleProduct, type Produit } from "@/lib/admin/saleProduct";
import type { Sale } from "@/lib/checkout/sales";

/** L'ordre des produits, FIXE. Une couleur suit une entité, jamais un rang. */
export const PRODUITS_ORDRE: readonly Produit[] = ["tiquiz", "atelier", "inconnu"];

export interface MoisEmpile {
  mois: string;
  /** Un montant par produit, dans l'ordre de PRODUITS_ORDRE. */
  parProduit: Record<Produit, number>;
  totalCents: number;
}

export type SerieEmpilee =
  | {
      fiable: true;
      mois: MoisEmpile[];
      totalCents: number;
      /** Combien de ventes sont chiffrées au tarif du plan, pas au montant réel. */
      estimees: number;
      /** Les produits qui ont vraiment quelque chose : les autres n'ont pas de légende. */
      presents: Produit[];
    }
  | { fiable: false; raison: "aucune-donnee" | "montants-absents"; concernees: number };

/**
 * L'encaissé par mois, réparti par produit.
 *
 * Mêmes garanties d'honnêteté que `serieEncaissee`, et pour les mêmes
 * raisons : une vente dont on ne connaît AUCUN montant retire le
 * graphique (la somme serait fausse), un montant venu du tarif du plan
 * compte mais se dit, et une vente à 0 € est légitime (code de
 * réduction à 100 %) donc ne se teste pas avec `<= 0`.
 */
export function serieEmpilee(
  sales: readonly Sale[],
  fin: Date,
  nbMois: number,
): SerieEmpilee {
  const fenetreOrdonnee = derniersMois(fin, nbMois);
  const fenetre = new Set(fenetreOrdonnee);
  const dedans = sales.filter((v) => {
    const m = moisDe(v.paidAt);
    return m != null && fenetre.has(m);
  });

  if (dedans.length === 0) return { fiable: false, raison: "aucune-donnee", concernees: 0 };

  const sansMontant = dedans.filter(
    (v) => !v.refundedAt && v.amountSource === "inconnu",
  ).length;
  if (sansMontant > 0) {
    return { fiable: false, raison: "montants-absents", concernees: sansMontant };
  }

  const vide = (): Record<Produit, number> => ({ tiquiz: 0, atelier: 0, inconnu: 0 });
  const index = new Map<string, Record<Produit, number>>(
    fenetreOrdonnee.map((m) => [m, vide()]),
  );

  for (const v of dedans) {
    if (v.refundedAt) continue;
    const m = moisDe(v.paidAt);
    if (!m) continue;
    const ligne = index.get(m);
    if (!ligne) continue;
    ligne[readSaleProduct(v)] += Number(v.amountCents) || 0;
  }

  const tous: MoisEmpile[] = fenetreOrdonnee.map((mois) => {
    const parProduit = index.get(mois) ?? vide();
    return {
      mois,
      parProduit,
      totalCents: PRODUITS_ORDRE.reduce((s, p) => s + parProduit[p], 0),
    };
  });

  // ON COUPE LE VIDE DE TÊTE, JAMAIS LES TROUS DU MILIEU. Un mois creux
  // entre deux mois pleins dit quelque chose ; sept colonnes vides avant
  // la première vente ne disent rien et mangent la moitié de l'écran.
  const premier = tous.findIndex((m) => m.totalCents > 0);
  const mois = premier < 0 ? [] : tous.slice(premier);

  const presents = PRODUITS_ORDRE.filter((p) => mois.some((m) => m.parProduit[p] > 0));

  return {
    fiable: true,
    mois,
    totalCents: mois.reduce((s, m) => s + m.totalCents, 0),
    estimees: dedans.filter((v) => !v.refundedAt && v.amountSource === "plan").length,
    presents,
  };
}

/** Un segment prêt à dessiner : sa couleur et sa hauteur, en pixels. */
export interface SegmentDessin {
  produit: Produit;
  cents: number;
  hauteurPx: number;
}

/**
 * La géométrie d'une colonne, EN PIXELS.
 *
 * En pixels et pas en pourcentage, parce que c'est précisément la
 * chaîne de pourcentages qui a produit un graphique sans barres. Une
 * hauteur en pixels ne dépend d'aucun parent.
 *
 * `hauteurTracePx` est la hauteur du tracé, `maxCents` le plus haut
 * total de la série (l'échelle). Un segment non nul garde `minPx` :
 * sans ça, une vente à 9 € à côté d'un mois à 1197 € donnerait un trait
 * invisible, et le mois passerait pour vide.
 */
export function segmentsDessin(
  m: MoisEmpile,
  maxCents: number,
  hauteurTracePx: number,
  minPx = 3,
): SegmentDessin[] {
  const max = Math.max(1, maxCents);
  return PRODUITS_ORDRE.filter((p) => m.parProduit[p] > 0).map((produit) => {
    const cents = m.parProduit[produit];
    const brut = (cents / max) * hauteurTracePx;
    return { produit, cents, hauteurPx: Math.max(minPx, Math.round(brut)) };
  });
}

/**
 * La période VRAIMENT couverte, écrite en toutes lettres.
 *
 * Béné, 29 août : "encaissé sur la période : quelle période ?" La
 * question est juste, et un chiffre dont on ne sait pas ce qu'il couvre
 * ne sert à rien : il ne se compare à rien, pas même au relevé de
 * banque. On nomme donc les mois RÉELLEMENT lus, pas la fenêtre
 * demandée : la fenêtre fait douze mois, la donnée en couvre cinq.
 */
export function libellePeriode(serie: SerieEmpilee): string {
  if (!serie.fiable || serie.mois.length === 0) return "";
  const premier = serie.mois[0].mois;
  const dernier = serie.mois[serie.mois.length - 1].mois;
  if (premier === dernier) return `en ${moisLabel(dernier)}`;
  return `de ${moisLabel(premier)} à ${moisLabel(dernier)}`;
}
