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
//    ouvrait un accès par repli, donc au bon endroit, mais taggée au
//    mauvais palier.
// 2. Donner un ORDRE DE GRANDEUR au montant d'une vente quand le
//    payload ne le porte pas, ce qui est le cas aujourd'hui sur toutes
//    les ventes Systeme.io.
//
// -- CE MONTANT COMPTE, ET IL EST MARQUÉ (décision Béné, 22 août) ------
//
// J'avais d'abord exclu ces montants du chiffre d'affaires : le prix du
// plan n'est pas la somme encaissée, et son compte porte 54 codes de
// réduction actifs. Elle a tranché : "pour les prix, tu les as dans les
// tunnels, avec les codes promo donc pas besoin de chercher un truc de
// fou".
//
// Elle a raison sur le fond : un tableau de bord qui refuse d'afficher
// le moindre euro parce qu'une remise est théoriquement possible ne sert
// à rien. Ces montants entrent donc dans les totaux.
//
// Ce qui reste, et qui suffit : ils portent `amountSource: "plan"`,
// l'écran écrit `~` devant, et il dit combien de ventes du total sont
// estimées. On donne le chiffre, on dit ce qu'il vaut, et elle décide.

import type { TiquizPlan } from "./webhookInference";

export interface PricePlan {
  /** Le nom tel qu'il est écrit dans son compte. */
  nom: string;
  /**
   * DE QUEL PRODUIT ON PARLE.
   *
   * Béné, 22 août : "je vois mal les différences entre Tiquiz et
   * l'Atelier, partout, dans les ventes, les stats". Deux produits qui
   * se vendent par le même Systeme.io, encaissés sur le même Stripe : à
   * l'écran, plus rien ne les séparait.
   *
   * `"autre"` est arrivé le 1er septembre, et c'est le plus important
   * des trois. Son compte Systeme.io ne vend pas QUE Tiquiz et
   * l'Atelier : Tipote, Le Pacte, StoryCash, HackTube, Reddit Business,
   * QuizCash, les packs de droits de revente... Une vente sur l'un
   * d'eux arrivait chez nous en "produit inconnu", donc dans le repli
   * payant, donc **elle ouvrait un compte Tiquiz mensuel**. Voir
   * `estUnAutreProduit` dans `webhookInference.ts`.
   */
  produit: "tiquiz" | "atelier" | "autre";
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
  "3375217": { produit: "tiquiz", nom: "NV tiquiz mensuel", montantCents: 1700, devise: "eur", plan: "monthly" },
  "3375221": { produit: "tiquiz", nom: "NV Tiquiz annuel", montantCents: 17000, devise: "eur", plan: "yearly" },
  "3278876": { produit: "tiquiz", nom: "Tiquiz mensuel PLUS", montantCents: 2900, devise: "eur", plan: "monthly_plus" },
  "3278878": { produit: "tiquiz", nom: "Tiquiz annuel PLUS", montantCents: 29000, devise: "eur", plan: "yearly_plus" },

  // ── TIQUIZ, PRIX HISTORIQUES ──
  // Gardés : les ventes passées portent ces ids, et le tableau de bord
  // relit l'historique.
  // 🚨 CE PLAN N'EXISTE PLUS DANS SON COMPTE (mesuré le 1er septembre
  // 2026 : une recherche "Tiquiz" rend neuf plans, et celui là n'y est
  // pas). Ses abonnés historiques à 9 €/mois sont toujours prélevés
  // dessus, et Systeme.io affiche encore "Tiquiz mensuel" sur leurs
  // factures. On le GARDE : l'historique porte cet id, et le tableau de
  // bord relit l'historique.
  "3198235": { produit: "tiquiz", nom: "Tiquiz mensuel", montantCents: 900, devise: "eur", plan: "monthly" },
  "3198261": { produit: "tiquiz", nom: "Tiquiz annuel", montantCents: 9000, devise: "eur", plan: "yearly" },
  "3198280": { produit: "tiquiz", nom: "Tiquiz Beta", montantCents: 5700, devise: "eur", plan: "lifetime" },

  // ── TIQUIZ EN DOLLARS ──
  // Ils existent dans son compte et manquaient au routage. Une vente
  // dessus ouvrait un accès par repli (donc le client entrait bien),
  // mais était rangée au mauvais palier.
  "3211596": { produit: "tiquiz", nom: "tiquiz monthly", montantCents: 900, devise: "usd", plan: "monthly" },
  "3211612": { produit: "tiquiz", nom: "tiquiz annual", montantCents: 9000, devise: "usd", plan: "yearly" },
  "3211578": { produit: "tiquiz", nom: "Tiquiz Beta (USD)", montantCents: 5700, devise: "usd", plan: "lifetime" },

  // ── L'ATELIER DU QUIZ ──
  // Ce ne sont PAS des paliers Tiquiz : ils n'ouvrent aucun accès ici,
  // d'où `plan: null`. Ils sont là pour que le tableau de bord sache
  // nommer et chiffrer une vente de l'Atelier au lieu de l'afficher en
  // "inconnu".
  "3316702": { produit: "atelier", nom: "Atelier du Quiz", montantCents: 4700, devise: "eur", plan: null },
  "3371197": { produit: "atelier", nom: "Atelier du Quiz simple", montantCents: 700, devise: "eur", plan: null },
  "3371202": { produit: "atelier", nom: "Atelier du Quiz augmenté", montantCents: 4700, devise: "eur", plan: null },
  "3372762": { produit: "atelier", nom: "Atelier du Quiz augmenté", montantCents: 3700, devise: "eur", plan: null },

  // ── TOUT LE RESTE DE SON CATALOGUE (relevé le 1er septembre 2026) ──
  //
  // 🚨 CES LIGNES NE SONT PAS DÉCORATIVES : elles EMPÊCHENT d'ouvrir un
  // accès Tiquiz. Sans elles, une vente sur l'un de ces plans tombait
  // dans le repli payant du webhook et ouvrait un compte Tiquiz
  // mensuel, sur un produit qui n'a rien à voir.
  //
  // Et le repli par MONTANT est pire encore, parce qu'il a l'air de
  // trancher : "Youtube Influence sans DR" vaut 1700, comme le mensuel
  // Tiquiz ; "Reddit Business PREMIUM 29€" vaut 2900, comme le mensuel
  // PLUS ; "Reddit Assistant BASIC" vaut 900, comme l'ancien mensuel.
  // Ces trois là n'ouvraient pas un accès au hasard : ils ouvraient un
  // palier PRÉCIS et FAUX.
  //
  // La liste vient de son compte, elle n'est pas devinée. Elle n'a pas
  // besoin d'être exhaustive pour protéger : une offre inconnue reste
  // traitée comme avant (Béné, 7 août : "il a payé, il doit recevoir ses
  // accès"). Ce qu'elle ferme, c'est ce qu'on SAIT ne pas être Tiquiz.
  "2502221": { produit: "autre", nom: "Le Pacte™ mensuel", montantCents: 2000, devise: "eur", plan: null },
  "2502223": { produit: "autre", nom: "Le Pacte™ annuel", montantCents: 20000, devise: "eur", plan: null },

  // Tipote, qui n'est pas en vente publique mais dont les plans existent.
  "3330096": { produit: "autre", nom: "Tipote offre spéciale mensuelle", montantCents: 1900, devise: "eur", plan: null },
  "3330098": { produit: "autre", nom: "Tipote offre spéciale annuelle", montantCents: 19000, devise: "eur", plan: null },
  "3134002": { produit: "autre", nom: "Tipote basic mensuel", montantCents: 1900, devise: "eur", plan: null },
  "3103584": { produit: "autre", nom: "Tipote basic annuel", montantCents: 19000, devise: "eur", plan: null },
  "3103586": { produit: "autre", nom: "Tipote pro mensuel", montantCents: 4900, devise: "eur", plan: null },
  "3103591": { produit: "autre", nom: "Tipote pro annuel", montantCents: 49000, devise: "eur", plan: null },
  "3103592": { produit: "autre", nom: "Tipote elite mensuel", montantCents: 9900, devise: "eur", plan: null },
  "3103593": { produit: "autre", nom: "Tipote elite annuel", montantCents: 99000, devise: "eur", plan: null },
  "3064431": { produit: "autre", nom: "Tipote Bêta", montantCents: 9700, devise: "eur", plan: null },
  "3066719": { produit: "autre", nom: "Tipote beta 2x", montantCents: 4900, devise: "eur", plan: null },
  "3057068": { produit: "autre", nom: "25 crédits Tipote", montantCents: 300, devise: "eur", plan: null },
  "3057070": { produit: "autre", nom: "Pack 100 crédits Tipote", montantCents: 1000, devise: "eur", plan: null },
  "3057072": { produit: "autre", nom: "Pack 250 crédits Tipote", montantCents: 2200, devise: "eur", plan: null },

  // Les plans en marque blanche (revendeurs).
  "3280962": { produit: "autre", nom: "Webinaire mensuel", montantCents: 4900, devise: "eur", plan: null },
  "3280963": { produit: "autre", nom: "Webinaire annuel", montantCents: 49000, devise: "eur", plan: null },
  "3280964": { produit: "autre", nom: "Illimité mensuel", montantCents: 9900, devise: "eur", plan: null },
  "3280965": { produit: "autre", nom: "Illimité annuel", montantCents: 99000, devise: "eur", plan: null },
  "3151804": { produit: "autre", nom: "Startup mensuel", montantCents: 1700, devise: "eur", plan: null },
  "3151805": { produit: "autre", nom: "Startup annuel", montantCents: 17000, devise: "eur", plan: null },
  "3151806": { produit: "autre", nom: "Webinaire mensuel", montantCents: 4700, devise: "eur", plan: null },
  "3151807": { produit: "autre", nom: "Webinaire annuel", montantCents: 47000, devise: "eur", plan: null },
  "3151808": { produit: "autre", nom: "Illimité mensuel", montantCents: 9700, devise: "eur", plan: null },
  "3151809": { produit: "autre", nom: "Illimité annuel", montantCents: 97000, devise: "eur", plan: null },
  "3151816": { produit: "autre", nom: "Tipote crm basic", montantCents: 1900, devise: "eur", plan: null },
  "3151817": { produit: "autre", nom: "Tipote crm basic annuel", montantCents: 19000, devise: "eur", plan: null },
  "3151820": { produit: "autre", nom: "Webinaire mensuel", montantCents: 4900, devise: "eur", plan: null },
  "3151821": { produit: "autre", nom: "Webinaire annuel", montantCents: 49000, devise: "eur", plan: null },
  "3151824": { produit: "autre", nom: "Illimité mensuel", montantCents: 9900, devise: "eur", plan: null },
  "3151825": { produit: "autre", nom: "Illimité annuel", montantCents: 99000, devise: "eur", plan: null },

  // Les produits d'info et les packs de droits de revente. Ceux qui
  // portent un montant Tiquiz sont marqués : ce sont eux qui ouvraient
  // un palier précis et faux.
  "3040535": { produit: "autre", nom: "DR Pack 2026", montantCents: 4700, devise: "eur", plan: null },
  "3040531": { produit: "autre", nom: "Pack 2026 en 2 fois", montantCents: 2500, devise: "eur", plan: null },
  "3040528": { produit: "autre", nom: "Pack 2026", montantCents: 4700, devise: "eur", plan: null },
  "3015605": { produit: "autre", nom: "Pack 2026 en 3 fois", montantCents: 1300, devise: "eur", plan: null },
  "3015603": { produit: "autre", nom: "Pack 2026 en 2 fois", montantCents: 1900, devise: "eur", plan: null },
  "3015110": { produit: "autre", nom: "Droits de revente pack 2026", montantCents: 3700, devise: "eur", plan: null },
  "3015107": { produit: "autre", nom: "Pack 2026", montantCents: 3700, devise: "eur", plan: null },
  "3045326": { produit: "autre", nom: "Tipote test", montantCents: 100, devise: "eur", plan: null },
  "2978217": { produit: "autre", nom: "Affiliation Success™ PREMIUM 3x", montantCents: 6600, devise: "eur", plan: null },
  "2978213": { produit: "autre", nom: "Affiliation Success™ PREMIUM 2x", montantCents: 9900, devise: "eur", plan: null },
  "2974956": { produit: "autre", nom: "Affiliation Success PREMIUM 2x", montantCents: 4900, devise: "eur", plan: null },
  "2974955": { produit: "autre", nom: "Affiliation Success PREMIUM 3x", montantCents: 3300, devise: "eur", plan: null },
  "2963854": { produit: "autre", nom: "Tipote elite", montantCents: 100, devise: "eur", plan: null },
  "2963852": { produit: "autre", nom: "Tipote essential", montantCents: 100, devise: "eur", plan: null },
  "2951176": { produit: "autre", nom: "Affiliation Success™ PREMIUM", montantCents: 9900, devise: "eur", plan: null },
  "2951173": { produit: "autre", nom: "Affiliation Success™ PREMIUM", montantCents: 19700, devise: "eur", plan: null },
  "2951168": { produit: "autre", nom: "Affiliation Success™ BASIC", montantCents: 4900, devise: "eur", plan: null },
  "2951167": { produit: "autre", nom: "Affiliation Success™ BASIC", montantCents: 9700, devise: "eur", plan: null },
  "2924786": { produit: "autre", nom: "Formule R.O.C.™", montantCents: 3700, devise: "eur", plan: null },
  // 1700 = le montant du mensuel Tiquiz.
  "2924762": { produit: "autre", nom: "Youtube Influence™ sans DR", montantCents: 1700, devise: "eur", plan: null },
  "2924756": { produit: "autre", nom: "Youtube Influence™ DR inclus", montantCents: 3700, devise: "eur", plan: null },
  "2924754": { produit: "autre", nom: "Affiliation Success PREMIUM", montantCents: 9700, devise: "eur", plan: null },
  "2924751": { produit: "autre", nom: "Affiliation Success BASIC", montantCents: 3700, devise: "eur", plan: null },
  // 900 = le montant de l'ancien mensuel Tiquiz.
  "2898657": { produit: "autre", nom: "DR Objectif 300", montantCents: 900, devise: "eur", plan: null },
  "2876888": { produit: "autre", nom: "DR StoryCash™", montantCents: 6700, devise: "eur", plan: null },
  "2876885": { produit: "autre", nom: "StoryCash™", montantCents: 9700, devise: "eur", plan: null },
  "2876879": { produit: "autre", nom: "QuizCash™ Premium 2x", montantCents: 4900, devise: "eur", plan: null },
  "2876874": { produit: "autre", nom: "QuizCash™ Premium", montantCents: 19700, devise: "eur", plan: null },
  "2876872": { produit: "autre", nom: "QuizCash™ Basic", montantCents: 9700, devise: "eur", plan: null },
  "2876844": { produit: "autre", nom: "Gamizzz™", montantCents: 3700, devise: "eur", plan: null },
  "2876838": { produit: "autre", nom: "Quizcash™ PREMIUM", montantCents: 9700, devise: "eur", plan: null },
  "2876835": { produit: "autre", nom: "Templates Notion™", montantCents: 3700, devise: "eur", plan: null },
  "2876831": { produit: "autre", nom: "QuizCash™ BASIC", montantCents: 3700, devise: "eur", plan: null },
  "2860843": { produit: "autre", nom: "Infographie Money™", montantCents: 3700, devise: "eur", plan: null },
  "2860839": { produit: "autre", nom: "DR StoryCash™", montantCents: 3700, devise: "eur", plan: null },
  "2841236": { produit: "autre", nom: "Reddit Business PREMIUM", montantCents: 9700, devise: "eur", plan: null },
  "2841229": { produit: "autre", nom: "Reddit Business BASIC", montantCents: 2700, devise: "eur", plan: null },
  "2841212": { produit: "autre", nom: "Reddit Business", montantCents: 3700, devise: "eur", plan: null },
  // 2900 = le montant du mensuel PLUS.
  "2841211": { produit: "autre", nom: "Reddit Business PREMIUM", montantCents: 2900, devise: "eur", plan: null },
  "2841209": { produit: "autre", nom: "StoryCash™", montantCents: 3700, devise: "eur", plan: null },
  "2841206": { produit: "autre", nom: "Reddit Assistant BASIC", montantCents: 900, devise: "eur", plan: null },
  "2793255": { produit: "autre", nom: "Pack Rentrée™ PREMIUM 2x", montantCents: 4900, devise: "eur", plan: null },
  "2789182": { produit: "autre", nom: "Hacktube™ PREMIUM 2x", montantCents: 9900, devise: "eur", plan: null },
  "2789180": { produit: "autre", nom: "Hacktube™ PREMIUM", montantCents: 19700, devise: "eur", plan: null },
  "2789164": { produit: "autre", nom: "Hacktube™ BASIC", montantCents: 9700, devise: "eur", plan: null },
  "2786475": { produit: "autre", nom: "Pack Rentrée PREMIUM", montantCents: 19700, devise: "eur", plan: null },
  "2786466": { produit: "autre", nom: "Pack Rentrée™", montantCents: 9700, devise: "eur", plan: null },
  "2783999": { produit: "autre", nom: "InstaCash Faceless™", montantCents: 2700, devise: "eur", plan: null },
  "2783997": { produit: "autre", nom: "InstaCash Faceless™ DR", montantCents: 4700, devise: "eur", plan: null },
  "2783942": { produit: "autre", nom: "AIFluencers™", montantCents: 3700, devise: "eur", plan: null },
  "2783125": { produit: "autre", nom: "Pack Rentrée™ PREMIUM", montantCents: 9700, devise: "eur", plan: null },
  "2783119": { produit: "autre", nom: "Pack Rentrée™ BASIC", montantCents: 4700, devise: "eur", plan: null },
  "2743166": { produit: "autre", nom: "HackTube™ Premium 2x", montantCents: 4900, devise: "eur", plan: null },
  "2733124": { produit: "autre", nom: "HackTube™ Premium", montantCents: 9700, devise: "eur", plan: null },
  "2733116": { produit: "autre", nom: "Podcast Automation™", montantCents: 3700, devise: "eur", plan: null },
  "2733113": { produit: "autre", nom: "Hacktube™ BASIC", montantCents: 4700, devise: "eur", plan: null },
  "2733110": { produit: "autre", nom: "Hacktube™ Premium BAR", montantCents: 9700, devise: "eur", plan: null },
  "2733104": { produit: "autre", nom: "Hacktube™ BAR", montantCents: 4700, devise: "eur", plan: null },
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
