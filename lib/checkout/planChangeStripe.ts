// lib/checkout/planChangeStripe.ts
//
// LE CHANGEMENT DE PALIER CHEZ STRIPE.
//
// La DÉCISION vit dans `planChange.ts`, pure et testée. Ici, les trois
// gestes qui l'exécutent :
//   1. s'assurer que le palier existe comme PRODUIT chez Stripe ;
//   2. montrer ce que ça va coûter AVANT de facturer ;
//   3. changer la ligne de l'abonnement, avec le prorata.
//
// -- POURQUOI UN APERÇU, ET PAS SEULEMENT UN BOUTON --------------------
//
// Parce que le montant n'est pas 12 € (29 - 17). Il dépend du jour du
// mois : à mi-période, Stripe crédite la moitié du mensuel déjà payé et
// facture la moitié du Plus. Un bouton "Passer au Plus" sans montant
// demande à quelqu'un d'accepter une somme qu'il ne connaît pas, sur une
// carte qu'il a déjà donnée. C'est exactement ce qui produit une demande
// de remboursement le lendemain.
//
// -- ET LE PRIX N'EST JAMAIS RECALCULÉ ICI -----------------------------
//
// Il vient du catalogue, comme partout. La leçon Ivan du 7 août tient en
// une phrase : un prix affiché à un endroit et facturé à un autre est la
// faute la plus coûteuse qu'un tunnel de paiement puisse commettre.

import { idProduitStripe, type ProrationStripe } from "@/lib/checkout/planChange";
import type { OwnerProduct } from "@/lib/checkout/catalog";

const STRIPE_API = "https://api.stripe.com";

function toForm(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

async function appelStripe(
  key: string,
  chemin: string,
  params?: Record<string, string | number>,
): Promise<{ ok: boolean; json: Record<string, unknown>; detail?: string }> {
  const res = await fetch(`${STRIPE_API}${chemin}`, {
    method: params ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(params ? { body: toForm(params) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string; code?: string } | undefined;
    return { ok: false, json, detail: err?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, json };
}

/**
 * L'identifiant Stripe de la ligne à modifier, et le produit facturé.
 *
 * On lit `items.data[0]` : nos abonnements n'ont qu'UNE ligne, c'est le
 * bon de commande qui les crée. On ne suppose pas pour autant qu'elle
 * est là (leçon Ivan : on ne raisonne pas sur la forme supposée d'un
 * payload), et l'absence est une raison nommée, pas un plantage.
 */
export function lireLigneAbonnement(sub: unknown): { itemId: string | null; produit: string | null } {
  const o = sub as { items?: { data?: unknown[] }; metadata?: Record<string, unknown> } | null;
  const premiere = Array.isArray(o?.items?.data) ? (o!.items!.data![0] as { id?: unknown } | null) : null;
  const itemId = String(premiere?.id ?? "").trim() || null;
  const produit = String(o?.metadata?.product ?? "").trim() || null;
  return { itemId, produit };
}

/**
 * Le produit Stripe du palier, créé s'il n'existe pas encore.
 *
 * L'`id` est imposé (`tiquiz_mensuel_plus`), donc l'appel est idempotent :
 * un produit déjà là fait répondre `resource_already_exists`, ce qui est
 * un SUCCÈS pour nous. Traiter ce refus comme une panne ferait échouer
 * toutes les montées à partir de la deuxième.
 */
export async function assurerProduitStripe(
  key: string,
  produit: OwnerProduct,
): Promise<{ ok: boolean; id?: string; detail?: string }> {
  const id = idProduitStripe(produit);
  const out = await appelStripe(key, "/v1/products", { id, name: produit.label });
  if (out.ok) return { ok: true, id };
  const code = (out.json.error as { code?: string } | undefined)?.code ?? "";
  if (code === "resource_already_exists") return { ok: true, id };
  return { ok: false, detail: out.detail };
}

/** Les paramètres de la nouvelle ligne, écrits UNE fois pour l'aperçu et pour l'application. */
function ligneCible(
  itemId: string,
  produitStripeId: string,
  cible: OwnerProduct,
): Record<string, string | number> {
  return {
    "items[0][id]": itemId,
    "items[0][price_data][currency]": cible.currency,
    "items[0][price_data][product]": produitStripeId,
    "items[0][price_data][unit_amount]": cible.amountCents,
    // La TVA est DANS le prix, comme sur le bon de commande. Une montée
    // facturée hors taxe ferait payer plus que le tarif affiché.
    "items[0][price_data][tax_behavior]": "inclusive",
    "items[0][price_data][recurring][interval]": cible.interval ?? "month",
  };
}

export interface ApercuChangement {
  ok: boolean;
  detail?: string;
  /** Ce qui est prélevé MAINTENANT, taxe comprise. Peut être 0. */
  aPayerCents?: number;
  currency?: string;
  /** Ce qui sera prélevé à chaque échéance ensuite. */
  ensuiteCents?: number;
}

/**
 * Ce que la montée coûte AUJOURD'HUI, sans rien facturer.
 *
 * `preview_mode: "next"` demande à Stripe la facture qu'il émettrait si
 * on appliquait le changement maintenant : crédit du temps non consommé
 * inclus, taxe incluse. C'est SA propre arithmétique, pas la nôtre : la
 * refaire à la main donnerait un montant affiché différent du montant
 * prélevé, ce qui est pire que de ne rien afficher.
 */
export async function apercuChangement(args: {
  key: string;
  customerId: string;
  subscriptionId: string;
  itemId: string;
  cible: OwnerProduct;
  proration: ProrationStripe;
}): Promise<ApercuChangement> {
  const produit = await assurerProduitStripe(args.key, args.cible);
  if (!produit.ok || !produit.id) return { ok: false, detail: produit.detail };

  const params: Record<string, string | number> = {
    customer: args.customerId,
    subscription: args.subscriptionId,
    ...ligneCible(args.itemId, produit.id, args.cible),
    subscription_proration_behavior: args.proration,
    "automatic_tax[enabled]": "true",
  };

  const out = await appelStripe(args.key, "/v1/invoices/create_preview", params);
  if (!out.ok) return { ok: false, detail: out.detail };

  const total = Number(out.json.total);
  return {
    ok: true,
    aPayerCents: Number.isFinite(total) ? Math.max(0, total) : 0,
    currency: String(out.json.currency ?? args.cible.currency),
    ensuiteCents: args.cible.amountCents,
  };
}

export interface ApplicationChangement {
  ok: boolean;
  detail?: string;
  /** Le plan est ouvert par le WEBHOOK, jamais par cette fonction. */
  subscriptionId?: string;
}

/**
 * Applique la montée.
 *
 * `proration_behavior: always_invoice` fait exactement ce que Béné a
 * décrit : Stripe crédite ce qui a été payé et pas consommé, facture la
 * différence tout de suite, et remet le bon montant à l'échéance
 * suivante.
 *
 * **On n'ouvre PAS le plan ici.** L'abonnement mis à jour émet
 * `customer.subscription.updated` puis `invoice.paid`, et c'est le
 * webhook qui ouvre l'accès, comme pour une vente ordinaire. Deux
 * chemins qui ouvriraient l'accès chacun de leur côté finiraient par se
 * contredire : c'est la leçon des deux moitiés de décision, quatre fois
 * payée dans ce dépôt.
 */
export async function appliquerChangement(args: {
  key: string;
  subscriptionId: string;
  itemId: string;
  cible: OwnerProduct;
  proration: ProrationStripe;
}): Promise<ApplicationChangement> {
  const produit = await assurerProduitStripe(args.key, args.cible);
  if (!produit.ok || !produit.id) return { ok: false, detail: produit.detail };

  const params: Record<string, string | number> = {
    ...ligneCible(args.itemId, produit.id, args.cible),
    proration_behavior: args.proration,
    // Le webhook lit `metadata.product` pour savoir QUEL plan ouvrir.
    // Sans cette ligne, il rouvrirait l'ancien palier à la prochaine
    // échéance et la montée se déferait toute seule un mois plus tard.
    "metadata[product]": args.cible.id,
    "metadata[source]": args.cible.source,
    "automatic_tax[enabled]": "true",
    // La facture de prorata part tout de suite sur la carte enregistrée.
    payment_behavior: "error_if_incomplete",
  };

  const out = await appelStripe(
    args.key,
    `/v1/subscriptions/${encodeURIComponent(args.subscriptionId)}`,
    params,
  );
  if (!out.ok) return { ok: false, detail: out.detail };
  return { ok: true, subscriptionId: String(out.json.id ?? args.subscriptionId) };
}
