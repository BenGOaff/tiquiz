// lib/sio/produitVendu.ts
//
// CE QUE SYSTEME.IO VIENT DE VENDRE : Tiquiz, ou autre chose.
//
// Béné, 1er septembre 2026, en montrant son tableau de bord : "des
// ventes non identifiées sur le dashboard c'est des abonnements tiquiz
// via systeme io et un autre abonnement qui n'a rien a voir".
//
// L'autre abonnement, c'est "Le Pacte™ - 24 €/mois" (plan 2502221,
// relevé dans son compte le jour même). Et son compte n'en vend pas
// qu'un : il porte des dizaines de produits qui ne sont ni Tiquiz ni
// l'Atelier (Le Pacte, Hacktube, Reddit Business, Youtube Influence...).
//
// -- LE TROU QUE CE MODULE FERME, ET IL COÛTE DE L'ARGENT --------------
//
// Depuis le 7 août, une vente confirmée sur une offre inconnue ouvre un
// accès Tiquiz : c'est la règle de Béné ("il a payé le client, il doit
// recevoir ses accès, point barre") et elle reste juste. Mais elle a été
// écrite pour un compte qui ne vendait QUE Tiquiz et l'Atelier.
//
// Appliquée telle quelle à un compte qui vend trente autres produits,
// elle donne un abonnement Tiquiz à chaque personne qui achète Le
// Pacte, tous les mois, à chaque échéance. Et le pire est le repli par
// le MONTANT : trois de ses autres produits coûtent EXACTEMENT le prix
// d'un palier Tiquiz (1700, 2900, 900), donc `inferPlanFromAmount`
// ouvre un palier PRÉCIS et FAUX, ce qui a l'air d'un routage réussi.
//
// -- LA DISTINCTION QUI COMPTE -----------------------------------------
//
// "Je ne connais pas cette offre" et "je SAIS que ce n'est pas Tiquiz"
// sont deux réponses différentes, et une seule doit fermer la porte.
//
//   - offre inconnue        -> on ouvre, comme depuis le 7 août ;
//   - offre connue, Tiquiz  -> on ouvre au bon palier ;
//   - offre connue, AUTRE   -> on n'ouvre RIEN, et on le DIT.
//
// Le troisième cas n'est pas un refus déguisé : le client a bien reçu ce
// qu'il a acheté, chez Systeme.io. Lui ouvrir Tiquiz en plus n'est pas
// un cadeau, c'est un compte payant de plus dans les compteurs et une
// personne qui reçoit des emails d'un produit qu'elle n'a pas commandé.
//
// Ce module ne vit pas dans `webhookInference.ts` parce que
// `pricePlans.ts` importe DÉJÀ son type `TiquizPlan` : l'y mettre
// fabriquerait un cycle d'imports pour une décision de trois lignes.

import { readPricePlan } from "./pricePlans";

export type ProduitVendu = "tiquiz" | "atelier" | "autre" | "inconnu";

/**
 * De quel produit parle cet identifiant de plan tarifaire.
 *
 * `inconnu` veut dire "je n'ai pas trouvé", jamais "il n'y a rien" :
 * c'est la seule valeur sur laquelle on continue d'ouvrir un accès.
 */
export function produitDeLOffre(offerId: string | null | undefined): ProduitVendu {
  const plan = readPricePlan(offerId);
  if (!plan) return "inconnu";
  return plan.produit;
}

/**
 * Faut-il refuser d'ouvrir un accès Tiquiz sur cette vente ?
 *
 * VRAI uniquement quand on RECONNAÎT le plan tarifaire ET qu'il n'est
 * pas Tiquiz. L'Atelier en fait partie : il ouvre ses accès lui même,
 * dans son dépôt, et une vente de formation n'a jamais ouvert
 * d'abonnement ici.
 */
export function venteHorsTiquiz(offerId: string | null | undefined): boolean {
  const produit = produitDeLOffre(offerId);
  return produit === "atelier" || produit === "autre";
}

/** Le nom du produit, pour le journal et l'alerte. Jamais une phrase. */
export function nomDeLOffre(offerId: string | null | undefined): string | null {
  return readPricePlan(offerId)?.nom ?? null;
}
