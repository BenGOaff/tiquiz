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

// ── LA DESCENTE, PROGRAMMÉE À L'ÉCHÉANCE ─────────────────────────────
//
// Béné, 29 août : "je veux que le downgrade soit pris en compte sans
// désabonnement côté user."
//
// -- POURQUOI UN CALENDRIER, ET PAS UNE SIMPLE MISE À JOUR ------------
//
// `subscription.update` avec `proration_behavior: none` change le prix
// pour la PROCHAINE facture, mais il change la ligne TOUT DE SUITE.
// Notre webhook lit `customer.subscription.updated` et ouvrirait donc
// le palier inférieur immédiatement : elle perdrait le PLUS qu'elle a
// déjà payé jusqu'à la fin du mois. C'est exactement ce qu'on refuse.
//
// Un CALENDRIER (`subscription_schedules`) met la vérité chez Stripe :
// la phase 1 garde le tarif actuel jusqu'à la fin de la période payée,
// la phase 2 applique le nouveau. Notre webhook voit le changement le
// jour où il a vraiment lieu, et ouvre le bon palier à ce moment là.
// Aucun état "descente en attente" à tenir de notre côté, donc aucune
// deuxième source de vérité à faire diverger.
//
// -- ET UN CALENDRIER EXIGE UN VRAI PRIX ------------------------------
//
// Les montées passent par `price_data` (un tarif fabriqué à la volée).
// Les calendriers n'en veulent pas : il leur faut un objet `Price`. On
// en crée donc un, UNE fois par palier, retrouvé par son `lookup_key` :
// sans ça le compte Stripe de Béné se remplirait d'un prix par
// descente, exactement ce que `idProduitStripe` évite pour les produits.

/** La clé qui retrouve le prix d'un palier. Unique sur le compte. */
function cleDuPrix(cible: OwnerProduct): string {
  return `tiquiz_prix_${cible.id.replace(/-/g, "_")}`;
}

/**
 * Le prix Stripe de ce palier, créé s'il n'existe pas encore.
 *
 * `transfer_lookup_key` déplace la clé depuis l'ancien prix le jour où
 * le tarif change : Stripe interdit de modifier le montant d'un prix,
 * donc un changement de tarif crée un nouvel objet, et sans ce
 * transfert on retrouverait l'ancien pour toujours.
 */
export async function assurerPrixStripe(
  key: string,
  cible: OwnerProduct,
): Promise<{ ok: boolean; id?: string; detail?: string }> {
  const lookup = cleDuPrix(cible);
  const attendu = {
    montant: cible.amountCents,
    devise: cible.currency.toLowerCase(),
    interval: cible.interval ?? "month",
  };

  const trouve = await appelStripe(
    key,
    `/v1/prices?lookup_keys[]=${encodeURIComponent(lookup)}&active=true&limit=1`,
  );
  if (trouve.ok) {
    const data = (trouve.json.data as Record<string, unknown>[] | undefined) ?? [];
    const p = data[0];
    const rec = (p?.recurring ?? {}) as { interval?: string };
    // ON VÉRIFIE QUE LE PRIX RETROUVÉ EST BIEN LE BON. Un prix dont le
    // montant ne correspond plus (tarif changé) ne doit pas être
    // réutilisé : on en créerait un nouveau et on lui prendrait la clé.
    if (
      p &&
      Number(p.unit_amount) === attendu.montant &&
      String(p.currency).toLowerCase() === attendu.devise &&
      rec.interval === attendu.interval
    ) {
      return { ok: true, id: String(p.id) };
    }
  }

  const produit = await assurerProduitStripe(key, cible);
  if (!produit.ok || !produit.id) return { ok: false, detail: produit.detail };

  const cree = await appelStripe(key, "/v1/prices", {
    product: produit.id,
    unit_amount: cible.amountCents,
    currency: cible.currency,
    "recurring[interval]": cible.interval ?? "month",
    // La TVA est DANS le prix, comme partout ailleurs.
    tax_behavior: "inclusive",
    lookup_key: lookup,
    transfer_lookup_key: "true",
  });
  if (!cree.ok) return { ok: false, detail: cree.detail };
  return { ok: true, id: String(cree.json.id) };
}

export interface DescenteProgrammee {
  ok: boolean;
  detail?: string;
  /** Quand le nouveau palier prend effet, en ISO. */
  effetLe?: string;
  /** Le calendrier créé, pour pouvoir l'annuler. */
  scheduleId?: string;
}

function lirePhaseCourante(schedule: Record<string, unknown>): {
  price: string | null;
  debut: number | null;
  fin: number | null;
} {
  const phases = (schedule.phases as Record<string, unknown>[] | undefined) ?? [];
  const p = phases[0];
  if (!p) return { price: null, debut: null, fin: null };
  const items = (p.items as Record<string, unknown>[] | undefined) ?? [];
  const prix = items[0]?.price;
  return {
    // `price` peut être une chaîne ou un objet développé selon l'appel.
    price: typeof prix === "string" ? prix : prix ? String((prix as { id?: string }).id ?? "") : null,
    debut: typeof p.start_date === "number" ? p.start_date : null,
    fin: typeof p.end_date === "number" ? p.end_date : null,
  };
}

/**
 * Programme la descente à la fin de la période déjà payée.
 *
 * **On n'ouvre PAS le plan ici**, et on ne le fera pas non plus le jour
 * venu : c'est le webhook qui l'ouvre en voyant l'abonnement changer,
 * comme pour n'importe quelle vente. Deux chemins qui ouvriraient
 * l'accès chacun de leur côté finiraient par se contredire.
 */
export async function programmerDescente(args: {
  key: string;
  subscriptionId: string;
  cible: OwnerProduct;
}): Promise<DescenteProgrammee> {
  const prix = await assurerPrixStripe(args.key, args.cible);
  if (!prix.ok || !prix.id) return { ok: false, detail: prix.detail };

  // 1. Un calendrier CALQUÉ sur l'abonnement en cours. Sa phase 0 décrit
  //    exactement ce qui est facturé aujourd'hui : on la relira pour la
  //    réécrire à l'identique, Stripe exigeant qu'on renvoie TOUTES les
  //    phases à chaque mise à jour.
  const cree = await appelStripe(args.key, "/v1/subscription_schedules", {
    from_subscription: args.subscriptionId,
  });
  if (!cree.ok) return { ok: false, detail: cree.detail };

  const scheduleId = String(cree.json.id ?? "");
  const phase = lirePhaseCourante(cree.json);
  if (!scheduleId || !phase.price || !phase.debut || !phase.fin) {
    // On ne devine pas la forme d'une réponse : sans ces valeurs on ne
    // peut pas réécrire la phase courante à l'identique, et l'écrire de
    // travers changerait ce qui est facturé MAINTENANT.
    return { ok: false, detail: "calendrier illisible" };
  }

  // 2. Deux phases : le tarif actuel jusqu'à l'échéance, le nouveau
  //    ensuite. `release` rend l'abonnement à lui même une fois la
  //    bascule faite : sans ça il resterait piloté par un calendrier
  //    dont plus personne n'a besoin, et une montée ultérieure
  //    échouerait.
  const maj = await appelStripe(
    args.key,
    `/v1/subscription_schedules/${encodeURIComponent(scheduleId)}`,
    {
      end_behavior: "release",
      "phases[0][items][0][price]": phase.price,
      "phases[0][items][0][quantity]": 1,
      "phases[0][start_date]": phase.debut,
      "phases[0][end_date]": phase.fin,
      "phases[1][items][0][price]": prix.id,
      "phases[1][items][0][quantity]": 1,
      // Le webhook lit `metadata.product` pour savoir QUEL palier
      // ouvrir. Portée par la phase, elle est recopiée sur l'abonnement
      // au moment de la bascule : sans elle, il rouvrirait l'ancien
      // palier et la descente se déferait toute seule.
      "phases[1][metadata][product]": args.cible.id,
      "phases[1][metadata][source]": args.cible.source,
      "phases[1][proration_behavior]": "none",
    },
  );
  if (!maj.ok) return { ok: false, detail: maj.detail };

  return {
    ok: true,
    scheduleId,
    effetLe: new Date(phase.fin * 1000).toISOString(),
  };
}

/**
 * Le changement déjà programmé sur cet abonnement, s'il y en a un.
 *
 * Une descente programmée qu'on ne peut ni voir ni défaire serait pire
 * que pas de descente du tout : elle découvrirait le nouveau palier un
 * matin, sans se souvenir de l'avoir demandé.
 */
export async function lireDescenteProgrammee(args: {
  key: string;
  subscriptionId: string;
}): Promise<{ scheduleId: string; effetLe: string; produit: string | null } | null> {
  const sub = await appelStripe(
    args.key,
    `/v1/subscriptions/${encodeURIComponent(args.subscriptionId)}`,
  );
  if (!sub.ok) return null;
  const scheduleId =
    typeof sub.json.schedule === "string"
      ? sub.json.schedule
      : sub.json.schedule
        ? String((sub.json.schedule as { id?: string }).id ?? "")
        : "";
  if (!scheduleId) return null;

  const sch = await appelStripe(
    args.key,
    `/v1/subscription_schedules/${encodeURIComponent(scheduleId)}`,
  );
  if (!sch.ok) return null;
  const phases = (sch.json.phases as Record<string, unknown>[] | undefined) ?? [];
  const suivante = phases[1];
  if (!suivante) return null;
  const meta = (suivante.metadata ?? {}) as { product?: string };
  const debut = typeof suivante.start_date === "number" ? suivante.start_date : null;
  if (!debut) return null;
  return {
    scheduleId,
    effetLe: new Date(debut * 1000).toISOString(),
    produit: meta.product ?? null,
  };
}

/** Annule un changement programmé, sans toucher à l'abonnement en cours. */
export async function annulerDescenteProgrammee(args: {
  key: string;
  scheduleId: string;
}): Promise<{ ok: boolean; detail?: string }> {
  // `release` détache le calendrier et LAISSE l'abonnement tel qu'il
  // est. `cancel`, lui, annulerait l'abonnement : la confusion coûterait
  // une cliente, donc on n'utilise jamais l'autre.
  const out = await appelStripe(
    args.key,
    `/v1/subscription_schedules/${encodeURIComponent(args.scheduleId)}/release`,
    {},
  );
  return out.ok ? { ok: true } : { ok: false, detail: out.detail };
}
