// lib/support/produit.ts
//
// DE QUEL PRODUIT PARLE CE TICKET.
//
// Béné, 23 août : "un service de ticketing dans le centre d'aide commun
// à toutes les app, essentiellement pour Tiquiz et L'Atelier qui sont
// vendus en ce moment."
//
// La valeur arrive d'une query string ou d'un formulaire public, donc de
// n'importe qui : elle est validée contre une liste, jamais écrite
// telle quelle. Une valeur inconnue retombe sur `tiquiz`, qui est le
// défaut de la colonne et l'app d'où viennent tous les tickets
// existants : un ticket mal taggé reste lisible, un ticket refusé est
// une cliente qui n'a pas de réponse.

export const PRODUITS_SUPPORT = ["tiquiz", "atelier", "tipote"] as const;
export type ProduitSupport = (typeof PRODUITS_SUPPORT)[number];

/** Ce que la file d'attente et la fiche client affichent. */
export const NOM_PRODUIT: Readonly<Record<ProduitSupport, string>> = {
  tiquiz: "Tiquiz",
  atelier: "L'Atelier du Quiz",
  tipote: "Tipote",
};

/**
 * Normalise ce qu'on reçoit. Accepte la casse libre et les alias que
 * quelqu'un écrira forcément un jour ("formaquiz" est le nom du dépôt,
 * "quizing" son ancien sous-domaine).
 */
export function normaliserProduit(raw: unknown): ProduitSupport {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "tiquiz";
  if (v === "atelier" || v === "formaquiz" || v === "quizing" || v === "atelier-du-quiz") {
    return "atelier";
  }
  if (v === "tipote") return "tipote";
  return "tiquiz";
}

/** Le libellé affichable, sans jamais planter sur une valeur inconnue. */
export function nomProduit(raw: unknown): string {
  const v = String(raw ?? "").trim();
  return NOM_PRODUIT[normaliserProduit(v)] ?? v ?? "Tiquiz";
}
