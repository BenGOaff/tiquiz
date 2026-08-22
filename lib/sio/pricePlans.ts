// lib/sio/pricePlans.ts
//
// LES PLANS TARIFAIRES DE SYSTEME.IO, LUS DANS SON COMPTE.
//
// Béné, 22 août : "vu que tu es connecté à Systeme.io en MCP maintenant,
// tu ne peux pas récupérer toutes les infos qu'il nous manque ?"
//
// En partie oui, et cette table en est le résultat. Elle n'est pas
// devinée : elle a été LUE dans son compte le 22 août 2026. C'est
// exactement ce qui manquait le 7 août, quand la vente d'Ivan a été
// refusée sur un `pricePlan.id` que personne n'avait dans sa liste.
//
// -- CE QUE SYSTEME.IO N'EXPOSE PAS ------------------------------------
//
// Ni les commandes, ni les ventes, ni l'affiliation. Il n'y a pas
// d'endpoint pour ça. L'historique des ventes ne peut donc PAS être
// rapatrié : il vit dans leur tableau de bord, et chez nous seulement
// depuis le 7 août, dans `webhook_logs`. Le dire est plus utile que de
// laisser croire qu'un import viendra le combler un jour.
//
// -- CE QU'ELLE SERT À FAIRE -------------------------------------------
//
// 1. Compléter le routage : trois plans Tiquiz en dollars existaient
//    dans son compte et manquaient à `OFFER_TO_PLAN`. Une vente dessus
//    ouvrait un accès par repli, donc au bon endroit, mais étiquetée au
//    mauvais palier.
// 2. Donner un ORDRE DE GRANDEUR au montant d'une vente quand le
//    payload ne le porte pas, ce qui est le cas aujourd'hui sur toutes
//    les ventes Systeme.io.
//
// -- ET POURQUOI CE MONTANT RESTE UNE ESTIMATION -----------------------
//
// C'est le prix AFFICHÉ du plan, pas la somme encaissée. Son compte
// porte 54 codes de réduction actifs, dont plusieurs à 50, 80 et même
// 100 %. Une vente remisée vaudrait donc moins que ce qui est écrit
// ici, et un chiffre d'affaires calculé là dessus serait GONFLÉ.
//
// Un chiffre gonflé dans un tableau de bord est pire qu'une absence de
// chiffre : il fait prendre des décisions. Ce montant est donc marqué
// `"plan"`, il s'affiche comme un ordre de grandeur, et il n'entre
// JAMAIS dans la courbe du chiffre d'affaires (cf. `serieEncaissee`).

import type { TiquizPlan } from "./webhookInference";

export interface PricePlan {
  /** Le nom tel qu'il est écrit dans son compte. */
  nom: string;
  /** Le prix AFFICHÉ, en centimes. Jamais forcément la somme encaissée. */
  montantCents: number;
  devise: "eur" | "usd";
  /** Le palier Tiquiz que ce plan ouvre, ou `null` s'il n'en ouvre aucun. */
  plan: TiquizPlan | null;
}

/**
 * Relevé le 22 août 2026 via l'API de Systeme.io.
 *
 * **Quand un tarif change, Systeme.io crée un NOUVEAU plan, donc un
 * nouvel id, donc une ligne à ajouter ici et dans `OFFER_TO_PLAN`.**
 * C'est une modification de code déguisée en réglage, et c'est ce qui a
 * coûté une journée et un client le 7 août.
 */
export const PRICE_PLANS: Record<string, PricePlan> = {
  // ── TIQUIZ, PRIX ACTUELS (depuis le 6 août 2026) ──
  "3375217": { nom: "NV tiquiz mensuel", montantCents: 1700, devise: "eur", plan: "monthly" },
  "3375221": { nom: "NV Tiquiz annuel", montantCents: 17000, devise: "eur", plan: "yearly" },
  "3278876": { nom: "Tiquiz mensuel PLUS", montantCents: 2900, devise: "eur", plan: "monthly_plus" },
  "3278878": { nom: "Tiquiz annuel PLUS", montantCents: 29000, devise: "eur", plan: "yearly_plus" },

  // ── TIQUIZ, PRIX HISTORIQUES ──
  // Gardés : les ventes passées portent ces ids, et le tableau de bord
  // relit l'historique.
  "3198235": { nom: "Tiquiz mensuel", montantCents: 900, devise: "eur", plan: "monthly" },
  "3198261": { nom: "Tiquiz annuel", montantCents: 9000, devise: "eur", plan: "yearly" },
  "3198280": { nom: "Tiquiz Beta", montantCents: 5700, devise: "eur", plan: "lifetime" },

  // ── TIQUIZ EN DOLLARS ──
  // Ils existent dans son compte et manquaient au routage. Une vente
  // dessus ouvrait un accès par repli (donc le client entrait bien),
  // mais était rangée au mauvais palier.
  "3211596": { nom: "tiquiz monthly", montantCents: 900, devise: "usd", plan: "monthly" },
  "3211612": { nom: "tiquiz annual", montantCents: 9000, devise: "usd", plan: "yearly" },
  "3211578": { nom: "Tiquiz Beta (USD)", montantCents: 5700, devise: "usd", plan: "lifetime" },

  // ── L'ATELIER DU QUIZ ──
  // Ce ne sont PAS des paliers Tiquiz : ils n'ouvrent aucun accès ici,
  // d'où `plan: null`. Ils sont là pour que le tableau de bord sache
  // nommer et chiffrer une vente de l'Atelier au lieu de l'afficher en
  // "inconnu".
  "3316702": { nom: "Atelier du Quiz", montantCents: 4700, devise: "eur", plan: null },
  "3371197": { nom: "Atelier du Quiz simple", montantCents: 700, devise: "eur", plan: null },
  "3371202": { nom: "Atelier du Quiz augmenté", montantCents: 4700, devise: "eur", plan: null },
  "3372762": { nom: "Atelier du Quiz augmenté", montantCents: 3700, devise: "eur", plan: null },
};

/**
 * Le plan tarifaire derrière un identifiant reçu.
 *
 * Tolérant aux formes que Systeme.io envoie (`3375217`,
 * `offer-price-3375217`), comme `inferPlanFromOfferId`.
 */
export function readPricePlan(offerId: string | null | undefined): PricePlan | null {
  if (offerId == null) return null;
  const brut = String(offerId).trim().toLowerCase();
  if (!brut) return null;
  if (brut in PRICE_PLANS) return PRICE_PLANS[brut]!;
  const chiffres = brut.match(/(\d{5,})/);
  if (chiffres && chiffres[1] in PRICE_PLANS) return PRICE_PLANS[chiffres[1]!]!;
  return null;
}
