// lib/pilotage/serieEmpilee.ts
//
// LE GRAPHIQUE SUIT LA PÉRIODE, JOUR PAR JOUR (Béné, 29 août 2026).
//
// "Je t'ai demandé mille fois de t'inspirer de Systeme.io qui donne les
// ventes chaque jour. Une barre toute seule, tu veux que j'en fasse
// quoi ?"
//
// Elle a raison et la cause est bête : le graphique agrégeait toujours
// par MOIS. Sur "30 derniers jours", ça donne une seule colonne, c'est à
// dire un nombre déguisé en dessin. Un graphique sert à voir un RYTHME ;
// une barre unique n'a aucun rythme à montrer.
//
// -- LE PAS SUIT LA PÉRIODE, ET IL EST CALCULÉ ------------------------
//
//   période courte (jusqu'à 92 jours)  ->  un point PAR JOUR
//   période longue                      ->  un point par mois
//
// 92 jours couvre exactement ses choix courts (7j, 30j, ce mois, mois
// dernier, 90j). Au delà, 400 barres quotidiennes ne se lisent pas, et
// c'est la tendance qui compte.
//
// -- LES JOURS À ZÉRO RESTENT, LES MOIS VIDES DE TÊTE PARTENT ---------
//
// Ce n'est pas une incohérence, ce sont deux questions différentes. En
// quotidien, un jour sans vente EST l'information : c'est le creux du
// week-end, c'est le lendemain d'un email. Les retirer donnerait un
// graphique qui ment sur le rythme. En mensuel, sept colonnes vides
// avant la première vente n'apprennent rien et mangent l'écran ; les
// trous DU MILIEU, eux, restent.
//
// PUR : ni horloge interne ni composant. `maintenant` est un paramètre,
// sinon le test dépend de l'heure et finit par clignoter.

import { moisDe, moisLabel } from "@/lib/admin/adminStats";
import { readSaleProduct, type Produit } from "@/lib/admin/saleProduct";
import type { Periode } from "@/lib/pilotage/periode";
import type { Sale } from "@/lib/checkout/sales";

/** L'ordre des produits, FIXE. Une couleur suit une entité, jamais un rang. */
export const PRODUITS_ORDRE: readonly Produit[] = ["tiquiz", "atelier", "inconnu"];

export type Pas = "jour" | "mois";

/**
 * Au delà de cette durée, on passe au mois.
 *
 * 92 jours : ça couvre "90 derniers jours" avec la marge d'un mois de
 * 31 jours, donc tous ses choix courts tombent en quotidien.
 */
export const SEUIL_PAS_JOUR = 92;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Le jour d'un instant, en AAAA-MM-JJ, en UTC. */
function jourDe(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export interface PointEmpile {
  /** `2026-08-12` en quotidien, `2026-08` en mensuel. */
  cle: string;
  /** Ce qui s'écrit sous la colonne. */
  label: string;
  /** Un montant par produit, dans l'ordre de PRODUITS_ORDRE. */
  parProduit: Record<Produit, number>;
  totalCents: number;
}

export type SerieEmpilee =
  | {
      fiable: true;
      pas: Pas;
      points: PointEmpile[];
      totalCents: number;
      /** Combien de ventes sont chiffrées au tarif du plan, pas au montant réel. */
      estimees: number;
      /** Les produits qui ont vraiment quelque chose : les autres n'ont pas de légende. */
      presents: Produit[];
    }
  | { fiable: false; raison: "aucune-donnee" | "montants-absents"; concernees: number };

/** Le libellé d'un jour, court : c'est écrit sous une colonne étroite. */
function labelJour(j: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${j}T00:00:00Z`));
}

/** Le libellé complet d'un jour, pour l'infobulle. */
export function labelJourLong(j: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${j}T00:00:00Z`));
}

/**
 * Les bornes réellement dessinées.
 *
 * Une période ouverte ("tout", ou seulement une date de fin) n'a pas de
 * début : on prend celui de la première vente. Partir d'une date
 * arbitraire dessinerait des colonnes vides avant que quoi que ce soit
 * n'existe.
 */
function bornes(
  sales: readonly Sale[],
  p: Periode,
  maintenant: Date,
): { debut: string; fin: string } | null {
  const fin = p.fin ?? jourDe(maintenant.getTime());
  if (p.debut) return { debut: p.debut, fin };
  const jours = sales
    .map((v) => String(v.paidAt ?? "").slice(0, 10))
    .filter((j) => /^\d{4}-\d{2}-\d{2}$/.test(j) && j <= fin);
  if (jours.length === 0) return null;
  return { debut: jours.reduce((a, b) => (a < b ? a : b)), fin };
}

/** Combien de jours la période couvre, bornes incluses. */
export function joursCouverts(debut: string, fin: string): number {
  const d = Date.parse(`${debut}T00:00:00Z`);
  const f = Date.parse(`${fin}T00:00:00Z`);
  if (!Number.isFinite(d) || !Number.isFinite(f)) return 1;
  return Math.max(1, Math.round((f - d) / JOUR_MS) + 1);
}

/**
 * Un point par jour, ou un point par mois ?
 *
 * La décision est ICI et nulle part ailleurs : le composant qui la
 * recalculerait finirait par dessiner autre chose que ce que la légende
 * annonce (sixième fois que ce défaut sort dans ce dépôt).
 */
export function choisirPas(debut: string, fin: string): Pas {
  return joursCouverts(debut, fin) <= SEUIL_PAS_JOUR ? "jour" : "mois";
}

/** Toutes les clés de l'axe, dans l'ordre, y compris celles à zéro. */
function axe(debut: string, fin: string, pas: Pas): string[] {
  if (pas === "jour") {
    const out: string[] = [];
    for (let t = Date.parse(`${debut}T00:00:00Z`); t <= Date.parse(`${fin}T00:00:00Z`); t += JOUR_MS) {
      out.push(jourDe(t));
    }
    return out;
  }
  const out: string[] = [];
  const d = new Date(`${debut}T00:00:00Z`);
  const stop = `${fin.slice(0, 7)}`;
  let cur = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  while (cur.toISOString().slice(0, 7) <= stop) {
    out.push(cur.toISOString().slice(0, 7));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return out;
}

/**
 * L'encaissé sur la période, réparti par produit.
 *
 * Mêmes garanties d'honnêteté qu'avant : une vente dont on ne connaît
 * AUCUN montant retire le graphique (la somme serait fausse), un montant
 * venu du tarif du plan compte mais se dit, et une vente à 0 € est
 * légitime (code de réduction à 100 %) donc ne se teste pas avec `<= 0`.
 */
export function serieEmpilee(
  sales: readonly Sale[],
  periode: Periode,
  maintenant: Date,
): SerieEmpilee {
  const b = bornes(sales, periode, maintenant);
  if (!b) return { fiable: false, raison: "aucune-donnee", concernees: 0 };

  const pas = choisirPas(b.debut, b.fin);
  const cleDe = (v: Sale): string | null => {
    const j = String(v.paidAt ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(j)) return null;
    if (j < b.debut || j > b.fin) return null;
    return pas === "jour" ? j : (moisDe(v.paidAt) ?? null);
  };

  const dedans = sales.filter((v) => cleDe(v) !== null);
  if (dedans.length === 0) return { fiable: false, raison: "aucune-donnee", concernees: 0 };

  const sansMontant = dedans.filter((v) => !v.refundedAt && v.amountSource === "inconnu").length;
  if (sansMontant > 0) {
    return { fiable: false, raison: "montants-absents", concernees: sansMontant };
  }

  const vide = (): Record<Produit, number> => ({ tiquiz: 0, atelier: 0, autre: 0, inconnu: 0 });
  const cles = axe(b.debut, b.fin, pas);
  const index = new Map<string, Record<Produit, number>>(cles.map((c) => [c, vide()]));

  for (const v of dedans) {
    if (v.refundedAt) continue;
    const c = cleDe(v);
    if (!c) continue;
    const ligne = index.get(c);
    if (!ligne) continue;
    ligne[readSaleProduct(v)] += Number(v.amountCents) || 0;
  }

  const tous: PointEmpile[] = cles.map((cle) => {
    const parProduit = index.get(cle) ?? vide();
    return {
      cle,
      label: pas === "jour" ? labelJour(cle) : moisLabel(cle),
      parProduit,
      totalCents: PRODUITS_ORDRE.reduce((s, p) => s + parProduit[p], 0),
    };
  });

  // EN QUOTIDIEN ON GARDE TOUT : un jour sans vente est le rythme, et
  // c'est exactement ce qu'on vient regarder. En mensuel on coupe le
  // vide DE TÊTE, jamais les trous du milieu.
  let points = tous;
  if (pas === "mois") {
    const premier = tous.findIndex((m) => m.totalCents > 0);
    points = premier < 0 ? [] : tous.slice(premier);
  }

  const presents = PRODUITS_ORDRE.filter((p) => points.some((m) => m.parProduit[p] > 0));

  return {
    fiable: true,
    pas,
    points,
    totalCents: points.reduce((s, m) => s + m.totalCents, 0),
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
 * chaîne de pourcentages qui avait produit un graphique sans barres :
 * une hauteur en pourcentage dans une colonne flex sans hauteur propre
 * s'écrase à zéro. Une hauteur en pixels ne dépend d'aucun parent.
 *
 * Un segment non nul garde `minPx` : sans ça, une vente à 9 € à côté
 * d'un jour à 1197 € donnerait un trait invisible, et le jour passerait
 * pour vide.
 */
export function segmentsDessin(
  m: PointEmpile,
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
 * QUELLES ÉTIQUETTES ON ÉCRIT SOUS L'AXE.
 *
 * Trente dates écrites côte à côte se chevauchent et ne se lisent plus.
 * On en garde une sur `n`, en gardant TOUJOURS la première et la
 * dernière : ce sont elles qui disent ce que le graphique couvre.
 */
export function etiquettesVisibles(nbPoints: number, largeurPx: number): number[] {
  if (nbPoints <= 0) return [];
  const placeParEtiquette = 58; // ce que "12 août" occupe, avec sa marge
  const max = Math.max(2, Math.floor(largeurPx / placeParEtiquette));
  if (nbPoints <= max) return Array.from({ length: nbPoints }, (_, i) => i);
  const pas = Math.ceil(nbPoints / max);
  const gardees = new Set<number>();
  for (let i = 0; i < nbPoints; i += pas) gardees.add(i);
  gardees.add(nbPoints - 1);
  return [...gardees].sort((a, b) => a - b);
}

/**
 * La période VRAIMENT couverte, écrite en toutes lettres.
 *
 * Béné : "encaissé sur la période : quelle période ?" Un chiffre dont on
 * ne sait pas ce qu'il couvre ne se compare à rien, pas même au relevé
 * de banque.
 */
export function libellePeriode(serie: SerieEmpilee): string {
  if (!serie.fiable || serie.points.length === 0) return "";
  const premier = serie.points[0];
  const dernier = serie.points[serie.points.length - 1];
  if (serie.pas === "jour") {
    if (premier.cle === dernier.cle) return `le ${labelJourLong(premier.cle)}`;
    return `du ${labelJour(premier.cle)} au ${labelJour(dernier.cle)}`;
  }
  if (premier.cle === dernier.cle) return `en ${moisLabel(dernier.cle)}`;
  return `de ${moisLabel(premier.cle)} à ${moisLabel(dernier.cle)}`;
}
