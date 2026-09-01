// lib/admin/saleProduct.ts
//
// TIQUIZ OU L'ATELIER : LA QUESTION QU'AUCUN ÉCRAN NE RÉPONDAIT.
//
// Béné, 22 août : "je vois mal les différences entre Tiquiz et l'Atelier,
// partout, dans les ventes, les stats".
//
// Elle a raison, et la cause est structurelle : les deux produits se
// vendent par le même Systeme.io, s'encaissent sur le même compte
// Stripe, et atterrissent dans la même table `webhook_logs`. Rien ne les
// séparait à l'arrivée, donc l'écran mélangeait un abonnement à 17 € et
// une formation à 47 € dans la même barre.
//
// Trois indices, du plus sûr au moins sûr, et le premier qui parle
// gagne. Aucun n'est deviné : ils viennent tous de la façon dont la
// donnée est écrite chez nous.

import { PRICE_PLANS } from "@/lib/sio/pricePlans";
import type { Sale } from "@/lib/checkout/sales";

export type Produit = "tiquiz" | "atelier" | "autre" | "inconnu";

/** Les paliers Tiquiz, tels qu'ils sont écrits dans `productId`. */
const PALIERS_TIQUIZ = new Set([
  "free",
  "monthly",
  "monthly_plus",
  "yearly",
  "yearly_plus",
  "lifetime",
  "beta",
]);

/**
 * De quel produit vient cette vente.
 *
 * 1. **La référence** : `atelier:...`, posé par `lib/admin/atelier.ts`
 *    quand il rapatrie les ventes de l'Atelier. C'est le plus sûr,
 *    parce que c'est nous qui l'écrivons.
 * 2. **Le produit** : `atelier`, `atelier-quelquechose` d'un côté ; un
 *    palier Tiquiz de l'autre.
 * 3. **Le plan tarifaire Systeme.io**, quand `productId` porte encore
 *    l'identifiant brut.
 *
 * `inconnu` est une vraie réponse, pas un échec : une vente qu'on ne
 * sait pas rattacher doit se voir, pas être rangée au hasard dans la
 * colonne la plus probable.
 *
 * `autre` est arrivé le 1er septembre 2026, sur une capture de Béné :
 * son tableau de bord affichait "Produit non identifié" sur des ventes
 * que Systeme.io nomme très bien ("Le Pacte™ - 24€/mois"). Son compte
 * ne vend pas que Tiquiz et l'Atelier, et un produit qu'on SAIT ne pas
 * être le nôtre n'est pas un produit inconnu : il a un nom, et l'écran
 * le dit. `nomProduitVendu` rend ce nom.
 */
export function readSaleProduct(sale: Pick<Sale, "ref" | "productId">): Produit {
  const ref = String(sale.ref ?? "").toLowerCase();
  if (ref.startsWith("atelier:")) return "atelier";

  const produit = String(sale.productId ?? "").trim().toLowerCase();
  if (!produit) return "inconnu";
  if (produit === "atelier" || produit.startsWith("atelier-") || produit.startsWith("atelier ")) {
    return "atelier";
  }
  if (PALIERS_TIQUIZ.has(produit)) return "tiquiz";

  const plan = PRICE_PLANS[produit.replace(/^offer-price-/, "")];
  if (plan) return plan.produit;

  return "inconnu";
}

/**
 * LE NOM À AFFICHER SUR UNE LIGNE DE VENTE.
 *
 * Pour Tiquiz et l'Atelier, le nom de la famille suffit : c'est ce que
 * Béné lit. Pour un AUTRE produit, c'est son nom propre qui compte
 * ("Le Pacte™ mensuel") : dire "Autre produit" sur une ligne que
 * Systeme.io sait nommer, c'est reproduire le "non identifié" avec un
 * mot de plus.
 */
export function nomProduitVendu(sale: Pick<Sale, "ref" | "productId">): string {
  const famille = readSaleProduct(sale);
  if (famille !== "autre") return NOM_PRODUIT[famille];
  const brut = String(sale.productId ?? "").trim().toLowerCase().replace(/^offer-price-/, "");
  return PRICE_PLANS[brut]?.nom ?? NOM_PRODUIT.autre;
}

export interface TotalProduit {
  produit: Produit;
  ventes: number;
  totalCents: number;
  /** Combien de ces ventes ont un montant venu du tarif du plan. */
  estimees: number;
}

/**
 * Les ventes réparties par produit.
 *
 * Les remboursements ne comptent pas dans le total encaissé, mais la
 * vente reste comptée : elle a eu lieu, et l'effacer ferait un écart
 * inexplicable avec le journal des appels.
 */
export function totauxParProduit(sales: readonly Sale[]): TotalProduit[] {
  const par = new Map<Produit, TotalProduit>();
  for (const v of sales) {
    const produit = readSaleProduct(v);
    const agg = par.get(produit) ?? { produit, ventes: 0, totalCents: 0, estimees: 0 };
    agg.ventes += 1;
    if (v.amountSource === "plan") agg.estimees += 1;
    if (!v.refundedAt) agg.totalCents += Number(v.amountCents) || 0;
    par.set(produit, agg);
  }
  const ordre: Produit[] = ["tiquiz", "atelier", "autre", "inconnu"];
  return [...par.values()].sort((a, b) => ordre.indexOf(a.produit) - ordre.indexOf(b.produit));
}

/** Le mot affiché. L'écran décide de la phrase, le code rend le code. */
export const NOM_PRODUIT: Record<Produit, string> = {
  tiquiz: "Tiquiz",
  atelier: "Atelier du Quiz",
  autre: "Autre produit",
  inconnu: "Produit non identifié",
};
