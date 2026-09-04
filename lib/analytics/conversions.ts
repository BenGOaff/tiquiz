// lib/analytics/conversions.ts
//
// LES DEUX ÉVÉNEMENTS DE CONVERSION, ET LEUR MONTANT.
//
// Béné, 2 septembre 2026 : "dans mon admin : je peux tracker les visites
// sur nos deux pages de vente ? Mesurer les conversions etc ?"
//
// Mesuré ce jour là : les VISITES oui (GA4 `G-N6LQDRDMDB`, sur les
// domaines de vente uniquement), les CONVERSIONS **non**. Il n'y avait
// dans tout le dépôt que le `gtag('config')` de la page vue. Google
// voyait donc le trafic et ne pouvait RIEN en faire : impossible de
// savoir quelle source, quelle page ou quelle publicité avait produit
// une vente.
//
// -- CE MODULE NE PARLE À PERSONNE, ET C'EST VOULU ---------------------
//
// Il construit les événements, il ne les envoie pas. `gtag` vit dans le
// navigateur, donc une décision enfermée à côté de lui ne serait pas
// testable (règle du 1er août). L'envoi vit dans
// `components/analytics/ConversionGa4.tsx`, et il ne décide rien.
//
// -- LE MONTANT VIENT DU CATALOGUE, JAMAIS D'AILLEURS ------------------
//
// Ni d'un payload, ni d'une valeur écrite à la main, ni de ce que le
// navigateur envoie. C'est la règle de tout ce dépôt (les prix vivent
// dans `OWNER_CATALOG`), et elle compte double ici : un montant recopié
// deviendrait faux au premier changement de tarif, et Béné prendrait des
// décisions de publicité sur un chiffre d'affaires inventé.
//
// Un chiffre gonflé dans un tableau de bord est pire qu'une absence de
// chiffre : il fait dépenser (règle du 22 août).

import { findOwnerProduct } from "@/lib/checkout/catalog";

/** Un événement GA4, prêt à pousser. */
export interface EvenementGa4 {
  name: string;
  params: Record<string, unknown>;
}

/**
 * GA4 attend le montant DANS L'UNITÉ de la devise, pas en centimes.
 *
 * Le catalogue est en centimes (c'est ce que Stripe encaisse) : envoyer
 * `1700` au lieu de `17` multiplierait le chiffre d'affaires par cent
 * dans ses rapports, et rien ne le signalerait.
 */
function enUnites(centimes: number): number {
  return Math.round(centimes) / 100;
}

/** La ligne d'article, la même pour les deux événements. */
function article(produitId: string) {
  const produit = findOwnerProduct(produitId);
  if (!produit) return null;
  return {
    devise: produit.currency.toUpperCase(),
    valeur: enUnites(produit.amountCents),
    item: {
      item_id: produit.id,
      item_name: produit.label,
      price: enUnites(produit.amountCents),
      quantity: 1,
    },
  };
}

/**
 * ÉTAPE 1 : IL ENTRE DANS LE BON DE COMMANDE.
 *
 * Sa consigne dit "au clic sur un palier". L'événement part à l'ARRIVÉE
 * sur `/commande/<produit>`, et c'est un choix, pas un raccourci :
 *
 *   - la page de vente est une CAPTURE reconstruite par
 *     `npm run vente:v2`. Instrumenter ses boutons voudrait dire patcher
 *     un HTML capturé, donc recommencer à chaque capture, sur une page
 *     qui porte plus de cent liens ;
 *   - l'arrivée sur le bon de commande EST l'étape que GA4 appelle
 *     `begin_checkout`, et c'est elle qui fait tenir le tunnel
 *     `page_view -> begin_checkout -> purchase`.
 *
 * **Ce que ça ne mesure PAS, et il faut le dire :** un clic sur un
 * bouton qui part chez Systeme.io (les tunnels historiques laissés en
 * place, `SALES_LINKS_LEFT_ALONE`) n'arrive jamais ici, donc il ne
 * comptera pas. Ces ventes là se lisent dans `/admin`, pas dans Google.
 *
 * Un produit inconnu ne rend AUCUN événement : mieux vaut un tunnel
 * incomplet qu'une conversion sans montant, qui polluerait le rapport
 * sans qu'on sache d'où elle vient.
 */
export function evenementBeginCheckout(produitId: string | null | undefined): EvenementGa4 | null {
  const a = article(String(produitId ?? ""));
  if (!a) return null;
  return {
    name: "begin_checkout",
    params: { currency: a.devise, value: a.valeur, items: [a.item] },
  };
}

/**
 * ÉTAPE 2 : IL A PAYÉ.
 *
 * -- LA RÉFÉRENCE EST OBLIGATOIRE, ET C'EST LE GARDE-FOU --------------
 *
 * `transaction_id` est ce qui permet à GA4 de DÉDUPLIQUER. La page de
 * retour est une adresse comme une autre : elle se rafraîchit, se
 * partage, se rouvre le lendemain. Sans référence, chaque ouverture
 * compterait une vente de plus, et le chiffre d'affaires de ses rapports
 * grossirait tout seul.
 *
 * Pas de référence -> AUCUN événement. C'est la même règle que l'accès :
 * cette page affiche, elle ne décide pas, et ici elle ne compte pas non
 * plus tant que le fournisseur n'a rien confirmé.
 *
 * La référence vient de Stripe (`session_id`) ou de PayPal
 * (`subscription_id`), relue CÔTÉ SERVEUR par la page avant d'arriver
 * ici : une valeur prise telle quelle dans l'URL laisserait n'importe
 * qui fabriquer une conversion en inventant un identifiant.
 */
export function evenementPurchase(a: {
  produitId: string | null | undefined;
  reference: string | null | undefined;
}): EvenementGa4 | null {
  const reference = String(a.reference ?? "").trim();
  if (!reference) return null;
  const art = article(String(a.produitId ?? ""));
  if (!art) return null;
  return {
    name: "purchase",
    params: {
      transaction_id: reference,
      currency: art.devise,
      value: art.valeur,
      items: [art.item],
    },
  };
}
