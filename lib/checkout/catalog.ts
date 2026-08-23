// lib/checkout/catalog.ts
//
// CE QUE BÉNÉ VEND, ÉCRIT UNE SEULE FOIS.
//
// Chantier du 20 août 2026 : le paiement passe chez nous. La question à
// laquelle ce fichier répond est la seule qui compte au moment où l'argent
// rentre : **quel produit, à quel prix, et qu'est-ce que ça ouvre.**
//
// -- POURQUOI UN CATALOGUE, ET PAS TROIS CONSTANTES ---------------------
//
// Parce que les trois ont déjà vécu séparément, et que ça a coûté un
// client. Le 7 août, Ivan paie son mensuel et reste en gratuit : le prix
// avait changé côté Systeme.io (9 -> 17 €), donc l'offre vendue n'était
// plus la même, et l'identifiant de la nouvelle offre n'avait été ajouté
// nulle part. Le prix vivait chez Systeme.io, le plan ouvert vivait dans
// `OFFER_TO_PLAN`, le montant de repli dans `AMOUNT_TO_PLAN`, et le lien
// du bon de commande dans l'écran Réglages. Quatre endroits pour une
// seule décision.
//
// Ici, les trois sont sur la même ligne. Changer un tarif, c'est modifier
// UN nombre, et le test de cohérence dit tout de suite ce qui doit suivre.
//
// -- CE QUE CE FICHIER NE FAIT PAS -------------------------------------
//
// Il ne devine rien. Le routage Systeme.io est de l'INFÉRENCE (on essaie
// l'identifiant d'offre, puis l'URL, puis le montant, puis un repli),
// parce qu'on reçoit un paiement qu'on n'a pas déclenché. Avec notre
// propre paiement, cette ambiguïté disparaît : c'est nous qui créons la
// session, donc nous qui savons. Un identifiant de produit inconnu
// n'ouvre RIEN, et ce n'est pas une dureté : c'est un identifiant que
// nous n'avons jamais émis.

import type { TiquizPlan } from "@/lib/sio/webhookInference";

/** Les produits que Béné vend elle-même, par leur identifiant d'URL. */
export type OwnerProductId = "mensuel" | "mensuel-plus" | "annuel" | "annuel-plus";

export interface OwnerProduct {
  /** Ce qui apparaît dans l'adresse du bon de commande. */
  id: OwnerProductId;
  /** Le nom lu par le client, sur la page ET sur le reçu Stripe. */
  label: string;
  /**
   * Le prix EN CENTIMES, **taxe comprise**.
   *
   * Béné, 12 août : "je facture toujours TTC donc par exemple c'est 47€
   * TTC, la TVA doit donc calculer pour arriver à ce montant."
   *
   * C'est exactement ce que fait Stripe avec `tax_behavior: "inclusive"` :
   * le montant payé par le client ne bouge pas, quelle que soit la TVA de
   * son pays, et c'est la part de TVA qui varie à l'intérieur. Un client
   * belge et un client français paient tous les deux 17,00 €.
   *
   * ATTENTION : `tax_behavior` ne peut PLUS être modifié une fois posé sur
   * un prix Stripe. Ça se décide à la première ligne, pas après la
   * première vente.
   */
  amountCents: number;
  /** Une seule devise pour l'instant, décision Béné du 13 août. */
  currency: "eur";
  /** `null` = paiement unique. Sinon, la récurrence de l'abonnement. */
  interval: "month" | "year" | null;
  /** Le plan que ce produit ouvre dans l'app. La raison d'être de la vente. */
  plan: TiquizPlan;
  /**
   * Ce qu'on écrit dans le journal des ventes et dans l'audit des plans.
   *
   * DISTINCT de `systeme_io`, et ce n'est pas cosmétique : les deux
   * chemins partagent la table `webhook_logs`, dont l'idempotence repose
   * sur `(source, event_id)`. Une source commune mélangerait les deux, et
   * un identifiant réutilisé par l'un ferait sauter une vente de l'autre.
   */
  source: string;
}

/**
 * LE CATALOGUE.
 *
 * Les tarifs sont ceux du 6 août 2026 (passage de 9/90 à 17/170), les
 * mêmes que ceux annoncés aux affiliées dans `lib/affiliate/commission.ts`
 * côté Tipote. Le test de cohérence les compare à `AMOUNT_TO_PLAN` : si
 * un prix change ici sans changer là-bas, il rougit avant la prod.
 */
export const OWNER_CATALOG: Readonly<Record<OwnerProductId, OwnerProduct>> = {
  mensuel: {
    id: "mensuel",
    label: "Tiquiz mensuel",
    amountCents: 1700,
    currency: "eur",
    interval: "month",
    plan: "monthly",
    source: "stripe",
  },
  "mensuel-plus": {
    id: "mensuel-plus",
    label: "Tiquiz mensuel Plus",
    amountCents: 2900,
    currency: "eur",
    interval: "month",
    plan: "monthly_plus",
    source: "stripe",
  },
  annuel: {
    id: "annuel",
    label: "Tiquiz annuel",
    amountCents: 17000,
    currency: "eur",
    interval: "year",
    plan: "yearly",
    source: "stripe",
  },
  "annuel-plus": {
    id: "annuel-plus",
    label: "Tiquiz annuel Plus",
    amountCents: 29000,
    currency: "eur",
    interval: "year",
    plan: "yearly_plus",
    source: "stripe",
  },
} as const;

/** L'ordre d'affichage sur les écrans qui listent les paliers. */
export const OWNER_PRODUCT_ORDER: readonly OwnerProductId[] = [
  "mensuel",
  "annuel",
  "mensuel-plus",
  "annuel-plus",
];

/**
 * Le produit désigné par un identifiant d'URL, ou `null`.
 *
 * **Un identifiant inconnu ne vend rien.** C'est la même règle que partout
 * ailleurs dans ce dépôt : l'absence de configuration FERME. Ici elle ne
 * prive personne, puisqu'un identifiant que nous n'avons jamais émis ne
 * peut pas figurer dans un lien que nous avons envoyé.
 */
export function findOwnerProduct(id: string | null | undefined): OwnerProduct | null {
  const propre = String(id ?? "").trim().toLowerCase();
  if (!propre) return null;
  return (OWNER_CATALOG as Record<string, OwnerProduct>)[propre] ?? null;
}

/** Le plan ouvert par ce produit. Jamais deviné : lu dans le catalogue. */
export function planForOwnerProduct(id: string | null | undefined): TiquizPlan | null {
  return findOwnerProduct(id)?.plan ?? null;
}

/**
 * Le prix formaté pour l'écran, dans la langue du visiteur.
 *
 * Il vit ici et pas dans un composant pour la raison habituelle : une
 * page de vente, un bon de commande et un écran Réglages qui formatent
 * chacun de leur côté finissent par afficher trois prix différents pour
 * la même chose.
 */
export function formatOwnerPrice(product: OwnerProduct, locale = "fr-FR"): string {
  return formatCents(product.amountCents, product.currency, locale);
}

/**
 * Un montant en centimes, formaté comme un prix.
 *
 * Séparé de `formatOwnerPrice` parce que tout n'est pas le prix d'un
 * produit : la facture de prorata d'une montée de palier est un montant
 * calculé par Stripe. Deux formateurs afficheraient deux styles pour la
 * même chose sur le même écran.
 */
export function formatCents(cents: number, currency = "eur", locale = "fr-FR"): string {
  const n = Number(cents);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: String(currency || "eur").toUpperCase(),
    // 17,00 € plutôt que 17 € : c'est un prix, pas un compte.
    minimumFractionDigits: 2,
  }).format((Number.isFinite(n) ? n : 0) / 100);
}

/**
 * Le produit du catalogue qui ouvre CE plan, ou `null`.
 *
 * L'app parle en plans (`monthly_plus`), le catalogue en produits
 * (`mensuel-plus`). La table de correspondance vit ici, avec le
 * catalogue, et pas recopiée dans un écran : c'est exactement la faute
 * qui a coûté un client le 7 août (le prix vivait à un endroit, le plan
 * à un autre, le lien à un troisième).
 */
export function produitPourPlan(plan: string | null | undefined): OwnerProduct | null {
  const p = String(plan ?? "").trim().toLowerCase();
  if (!p) return null;
  return Object.values(OWNER_CATALOG).find((prod) => prod.plan === p) ?? null;
}

/**
 * La phrase de récurrence, séparée du prix.
 *
 * Renvoie une CLÉ, pas une phrase : l'interface existe en 7 langues, et
 * c'est elle qui sait comment le dire (même règle que les raisons d'erreur
 * renvoyées par le serveur).
 */
export function ownerBillingKey(product: OwnerProduct): "once" | "monthly" | "yearly" {
  if (product.interval === "month") return "monthly";
  if (product.interval === "year") return "yearly";
  return "once";
}
