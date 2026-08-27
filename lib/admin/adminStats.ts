// lib/admin/adminStats.ts
//
// LES COURBES DU TABLEAU DE BORD, ET LA RÈGLE QUI DÉCIDE DE LES MONTRER.
//
// Béné, 22 août : "un onglet statistiques aussi pour suivre mes ventes,
// visuellement (uniquement de manière fiable aussi...)".
//
// Les parenthèses sont la vraie commande. Un graphique est plus
// convaincant qu'un tableau, donc il ment plus fort : une courbe de
// chiffre d'affaires plate à zéro pendant six mois se lit "je ne vends
// rien" alors qu'elle veut dire "je ne connais pas les montants". C'est
// la règle du 8 juin, la plus ancienne de ce dépôt : **on n'affiche pas
// un total dont le dénominateur ment.**
//
// D'où la forme de ce module : une série n'est pas un tableau de
// nombres, c'est un tableau de nombres OU une raison de ne rien
// afficher. Le type oblige l'écran à traiter les deux cas ; il ne peut
// pas dessiner une courbe sans avoir répondu à "est-ce que je sais ?".
//
// -- CE QU'ON SAIT, ET CE QU'ON NE SAIT PAS ---------------------------
//
//   FIABLE     le NOMBRE de comptes créés, de ventes, de départs, et la
//              répartition par palier. Ce sont des lignes qu'on compte.
//   PAS FIABLE les EUROS des ventes Systeme.io : le montant payé ne nous
//              est pas transmis là où on le lit (constaté le 22 août sur
//              47 ventes affichées à 0,00 €).
//
// Le jour où le montant remonte, la série devient fiable toute seule :
// la règle regarde la donnée, elle n'est pas câblée sur une date.

import type { Person } from "./people";
import { buildMrr, serieChurn, type Mrr, type PointChurn } from "@/lib/admin/mrr";
import type { Sale } from "@/lib/checkout/sales";
import { readSaleProduct, totauxParProduit, type Produit, type TotalProduit } from "./saleProduct";

/** Un point de la courbe : un mois, et sa valeur. */
export interface PointMois {
  /** `2026-08`, pour trier et comparer sans ambiguïté de fuseau. */
  mois: string;
  valeur: number;
}

/** Une série qu'on peut dessiner. */
export interface SerieFiable {
  fiable: true;
  points: PointMois[];
  /**
   * Combien de ventes de la période sont chiffrées au TARIF DU PLAN.
   *
   * Béné a tranché le 22 août : ces montants comptent. On dit juste
   * combien ils sont, pour qu'un écart avec sa banque ne reste pas
   * mystérieux. Zéro sur les séries qui comptent des lignes.
   */
  estimees?: number;
  /** Le total DE LA FENÊTRE, jamais le total global : sinon la somme des barres ne fait pas le total affiché. */
  total: number;
  /** Des lignes qu'on n'a pas pu dater, donc absentes des barres. */
  sansDate: number;
}

/** Une série qu'on refuse de dessiner, et pourquoi. */
export interface SerieIndisponible {
  fiable: false;
  raison: "montants-absents" | "aucune-donnee";
  /** Combien de lignes posent le problème, pour que la phrase soit précise. */
  concernees: number;
}

export type Serie = SerieFiable | SerieIndisponible;

/** Les `n` derniers mois, du plus ancien au plus récent, en `AAAA-MM`. */
export function derniersMois(fin: Date, n: number): string[] {
  const out: string[] = [];
  const annee = fin.getUTCFullYear();
  const mois = fin.getUTCMonth();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(annee, mois - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Le mois d'une date ISO, ou `null` si elle est illisible. */
export function moisDe(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Compte des dates par mois, sur une fenêtre fixe.
 *
 * `sansDate` compte les lignes qu'on n'a pas pu placer. Les taire
 * donnerait une somme de barres inférieure au total réel, sans que rien
 * ne le dise : c'est exactement la mécanique du funnel fantôme d'Adeline.
 * Une date ANTÉRIEURE à la fenêtre n'est pas un problème, elle est juste
 * hors cadre : elle ne compte ni dans les barres ni dans `sansDate`.
 */
export function serieParMois(
  dates: readonly (string | null | undefined)[],
  fin: Date,
  nbMois: number,
): SerieFiable {
  const fenetre = derniersMois(fin, nbMois);
  const index = new Map(fenetre.map((m) => [m, 0]));
  let sansDate = 0;

  for (const iso of dates) {
    const m = moisDe(iso);
    if (!m) {
      sansDate += 1;
      continue;
    }
    const vu = index.get(m);
    if (vu !== undefined) index.set(m, vu + 1);
  }

  const points = fenetre.map((mois) => ({ mois, valeur: index.get(mois) ?? 0 }));
  return {
    fiable: true,
    points,
    total: points.reduce((s, p) => s + p.valeur, 0),
    sansDate,
  };
}

/**
 * LES EUROS PAR MOIS, OU LA RAISON DE NE PAS LES MONTRER.
 *
 * Une seule vente sans montant suffit à rendre la courbe fausse, et une
 * courbe fausse est pire qu'une absence de courbe parce qu'elle a l'air
 * juste. On ne dessine donc que si on a le montant de TOUTES les ventes
 * de la fenêtre.
 *
 * Les remboursements ne comptent pas : ce n'est pas de l'argent gardé.
 */
export function serieEncaissee(
  sales: readonly Sale[],
  fin: Date,
  nbMois: number,
): Serie {
  const fenetre = new Set(derniersMois(fin, nbMois));
  const dansLaFenetre = sales.filter((v) => {
    const m = moisDe(v.paidAt);
    return m != null && fenetre.has(m);
  });

  if (dansLaFenetre.length === 0) {
    return { fiable: false, raison: "aucune-donnee", concernees: 0 };
  }

  // ON NE REFUSE DE DESSINER QUE CE QU'ON NE SAIT PAS DU TOUT.
  //
  // Un montant venu du tarif du plan compte (décision Béné, 22 août) :
  // il est simplement DÉNOMBRÉ, et l'écran écrit "dont N estimées".
  // Seule une vente dont on n'a aucun montant retire la courbe, parce
  // que là, la somme serait vraiment fausse.
  //
  // Et on ne teste pas `<= 0` : une vente à 0 € est légitime (un code de
  // réduction à 100 %), et la compter comme manquante ferait mentir
  // l'avertissement dans l'autre sens.
  const sansMontant = dansLaFenetre.filter(
    (v) => !v.refundedAt && v.amountSource === "inconnu",
  ).length;
  if (sansMontant > 0) {
    return { fiable: false, raison: "montants-absents", concernees: sansMontant };
  }

  const index = new Map(derniersMois(fin, nbMois).map((m) => [m, 0]));
  for (const v of dansLaFenetre) {
    if (v.refundedAt) continue;
    const m = moisDe(v.paidAt);
    if (!m) continue;
    const vu = index.get(m);
    if (vu !== undefined) index.set(m, vu + (Number(v.amountCents) || 0));
  }
  const points = [...index.entries()].map(([mois, valeur]) => ({ mois, valeur }));
  return {
    fiable: true,
    points,
    total: points.reduce((s, p) => s + p.valeur, 0),
    sansDate: 0,
    estimees: dansLaFenetre.filter((v) => !v.refundedAt && v.amountSource === "plan").length,
  };
}

/**
 * La répartition par palier, telle qu'elle est AUJOURD'HUI.
 *
 * On ne compte que les gens qui ont vraiment un compte Tiquiz : un élève
 * de l'Atelier sans compte n'a pas de palier, et le ranger en "free"
 * gonflerait le gratuit d'un chiffre qui ne veut rien dire.
 */
export function repartitionParPlan(
  people: readonly Person[],
): { plan: string; count: number }[] {
  const par = new Map<string, number>();
  for (const p of people) {
    if (!p.hasTiquizAccount) continue;
    const plan = String(p.plan ?? "").trim() || "inconnu";
    par.set(plan, (par.get(plan) ?? 0) + 1);
  }
  return [...par.entries()]
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan));
}

/**
 * TOUT CE QUE L'ONGLET STATISTIQUES AFFICHE, CALCULÉ D'UN COUP.
 *
 * `maintenant` est un PARAMÈTRE, jamais un `Date.now()` interne : un
 * test qui dépend de l'horloge est un test qui clignote, et un test qui
 * clignote est pire que pas de test (leçon du 1er août).
 */
export interface StatsAdmin {
  mois: string[];
  comptesCrees: SerieFiable;
  ventes: SerieFiable;
  departs: SerieFiable;
  encaisse: Serie;
  plans: { plan: string; count: number }[];
  /** Ce que ses clientes ont produit. Des lignes comptées, donc fiable. */
  quiz: number;
  leads: number;
  /**
   * TIQUIZ ET L'ATELIER, SÉPARÉS.
   *
   * Béné, 22 août : "je vois mal les différences entre Tiquiz et
   * l'Atelier, partout, dans les ventes, les stats". Un abonnement à
   * 17 € et une formation à 47 € dans la même barre ne veulent rien
   * dire : ni le nombre, ni le total.
   */
  parProduit: TotalProduit[];
  /** Les ventes du mois en cours, par produit. */
  ventesParProduit: { produit: Produit; valeur: number }[];
  /**
   * LE REVENU RÉCURRENT ET LE CHURN (Béné, 27 août 2026).
   *
   * "Oui je veux mon MRR et mon churn facilement trouvables."
   *
   * Ils vivent ICI et pas dans le composant, comme le reste de cet
   * écran : un tableau de bord qui recalcule ce que le serveur a déjà
   * calculé finit toujours par mentir. La règle est dans
   * `lib/admin/mrr.ts`, testée.
   */
  mrr: Mrr;
  churn: PointChurn[];
}

export function buildAdminStats(
  people: readonly Person[],
  maintenant: Date,
  nbMois = 12,
): StatsAdmin {
  // Les ventes vivent SUR les personnes : les relire ici depuis la même
  // source évite d'avoir deux notions de "vente" dans le même écran.
  const ventes = people.flatMap((p) => p.sales);

  return {
    mois: derniersMois(maintenant, nbMois),
    comptesCrees: serieParMois(
      people.filter((p) => p.hasTiquizAccount).map((p) => p.createdAt),
      maintenant,
      nbMois,
    ),
    ventes: serieParMois(ventes.map((v) => v.paidAt), maintenant, nbMois),
    departs: serieParMois(
      people.map((p) => p.churn?.cancelledAt).filter((d) => d != null),
      maintenant,
      nbMois,
    ),
    encaisse: serieEncaissee(ventes, maintenant, nbMois),
    plans: repartitionParPlan(people),
    quiz: people.reduce((s, p) => s + (Number(p.quizCount) || 0), 0),
    leads: people.reduce((s, p) => s + (Number(p.leadCount) || 0), 0),
    parProduit: totauxParProduit(ventes),
    mrr: buildMrr(people),
    // La MÊME fenêtre que les autres séries : deux fenêtres calculées
    // séparément donneraient deux axes différents sur le même écran.
    churn: serieChurn(people, derniersMois(maintenant, nbMois)),
    ventesParProduit: (["tiquiz", "atelier", "inconnu"] as Produit[])
      .map((produit) => ({
        produit,
        valeur: serieParMois(
          ventes.filter((v) => readSaleProduct(v) === produit).map((v) => v.paidAt),
          maintenant,
          nbMois,
        ).points.at(-1)?.valeur ?? 0,
      }))
      .filter((p) => p.valeur > 0),
  };
}

/** `2026-08` -> `août 26`. Affichage seulement. */
export function moisLabel(mois: string, locale = "fr-FR"): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mois);
  if (!m) return mois;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return d.toLocaleDateString(locale, { month: "short", year: "2-digit", timeZone: "UTC" });
}
