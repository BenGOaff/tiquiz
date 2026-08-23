// lib/checkout/paypalOwner.ts
//
// PAYER SON ABONNEMENT TIQUIZ EN PAYPAL, SUR LE COMPTE DE BÉNÉ.
//
// Beaucoup de gens n'ont pas envie de sortir leur carte et paient en
// PayPal ou pas du tout. Un bon de commande sans PayPal, ce ne sont pas
// des ventes qui passent ailleurs, ce sont des ventes qui ne se font
// pas.
//
// -- CE N'EST PAS UN COPIER-COLLER DE L'ATELIER ------------------------
//
// L'Atelier vend un ACHAT UNIQUE : API Orders, une commande, une
// capture, terminé. Tiquiz vend des ABONNEMENTS : il faut un produit,
// un plan de facturation, un abonnement, et un cycle de vie à écouter
// (activation, prélèvement mensuel, échec, annulation). Les deux fichiers
// se ressemblent en surface et ne font pas le même métier.
//
// -- ET CE N'EST PAS NON PLUS UNE NOUVEAUTÉ ----------------------------
//
// `lib/paypalRest.ts` fait déjà tourner des abonnements PayPal en
// production pour les REVENDEURS, depuis leurs propres comptes. Ce
// fichier est la même mécanique appliquée au compte de Béné, avec NOTRE
// catalogue. On ne l'importe pas : il tire `resellerPayments` donc
// `supabaseAdmin`, qui exige les variables d'environnement au
// chargement, et rend le tout intestable. La plomberie REST est
// dupliquée, les DÉCISIONS ne le sont pas.
//
// -- LE PARCOURS, ET POURQUOI IL EST FAIT COMME ÇA ---------------------
//
// 1. On crée un produit, un plan, puis un abonnement. PayPal rend une
//    adresse d'approbation, l'acheteur y va et approuve.
// 2. Il revient sur notre page de retour, qui CONFIRME ce qu'il voit.
// 3. **Le webhook `BILLING.SUBSCRIPTION.ACTIVATED` ouvre l'accès**, pas
//    la page de retour.
//
// Le point 3 est le même que côté Stripe et pour la même raison : la
// page de retour est une URL comme une autre, et beaucoup d'acheteurs
// ne la voient jamais (paiement sur mobile, onglet fermé). Un accès qui
// en dépend, c'est le drame Ivan reproduit à l'identique.
//
// -- LA TVA ------------------------------------------------------------
//
// PayPal ne sait pas calculer la TVA par pays comme Stripe Tax. Le prix
// TTC part tel quel : l'acheteur paie exactement 17,00 €, comme sur le
// formulaire carte. La ventilation se fait dans la comptabilité, pas
// dans le tunnel. C'est une différence assumée entre les deux moyens de
// paiement.
//
// Aucun `server-only` : les décisions (le `custom_id`, les montants, la
// périodicité) sont pures et doivent être testables.

import type { OwnerProduct } from "@/lib/checkout/catalog";
import type { OwnerPaypalAccount } from "@/lib/checkout/ownerAccount";

/**
 * Les événements PayPal qu'on écoute.
 *
 * `PAYMENT.SALE.COMPLETED` est le prélèvement RÉCURRENT : c'est lui qui
 * alimentera le chiffre d'affaires mois après mois. Sans lui, on ne
 * verrait que la première vente, et le tableau de bord annoncerait un
 * revenu qui s'arrête au premier mois.
 */
export const OWNER_PAYPAL_SUB_EVENTS = [
  // L'abonnement démarre : c'est celui qui ouvre l'accès.
  "BILLING.SUBSCRIPTION.ACTIVATED",
  // Il s'arrête pour de bon : ceux qui le referment.
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  // PayPal a suspendu après des échecs de prélèvement. On NE COUPE PAS
  // dessus (cf. le webhook) : Stripe non plus ne coupe pas au premier
  // échec, et couper mettrait dehors quelqu'un qui va payer.
  "BILLING.SUBSCRIPTION.SUSPENDED",
  // Le prélèvement récurrent, et son remboursement.
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
] as const;

/** L'adresse de l'API, selon le compte. */
export function paypalOwnerBase(mode: "live" | "test"): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

/**
 * PayPal veut des euros en chaîne ("17.00"), pas des centimes.
 *
 * La conversion vit ici et NULLE PART AILLEURS : un montant converti à
 * deux endroits finit par diverger d'un centime, et un centime d'écart
 * entre ce qui est affiché et ce qui est prélevé, c'est une contestation.
 */
export function paypalAmount(amountCents: number): string {
  return (Math.round(amountCents) / 100).toFixed(2);
}

/** L'inverse, pour relire ce que PayPal nous renvoie. */
export function paypalAmountToCents(raw: unknown): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** La périodicité PayPal d'un produit du catalogue. */
export function paypalInterval(product: OwnerProduct): "MONTH" | "YEAR" | null {
  if (product.interval === "month") return "MONTH";
  if (product.interval === "year") return "YEAR";
  // Un produit sans périodicité n'est pas un abonnement : on refuse
  // plutôt que d'inventer un cycle. Aujourd'hui les quatre paliers
  // vendus en ont un, mais le jour où un achat unique arrive au
  // catalogue, il ne doit pas partir en abonnement mensuel.
  return null;
}

// ── LE `custom_id`, ET POURQUOI IL PORTE L'ADRESSE ────────────────────
//
// PayPal renvoie `subscriber.email_address`, mais c'est l'adresse du
// COMPTE PAYPAL, qui n'est pas toujours celle saisie sur notre bon de
// commande (compte du conjoint, adresse professionnelle, ancienne
// adresse). Ouvrir l'accès sur celle-là, c'est fabriquer un compte
// orphelin : exactement ce que l'Atelier a rencontré le 7 août avec les
// commandes de bonus.
//
// On transporte donc l'adresse SAISIE, et c'est elle qui gagne.
//
// PayPal borne `custom_id` à 127 caractères. Format compact, séparé par
// des barres, dans l'ordre de ce qu'on refuse de perdre en premier :
//
//     <produit>|<email>|<sa>
//
// Si ça dépasse, on lâche le `sa` (l'attribution retombe alors sur la
// conversion par email, qui existe). On ne lâche JAMAIS l'adresse.

export const CUSTOM_ID_MAX = 127;

export function buildCustomId(args: {
  productId: string;
  email: string;
  affiliateRef?: string | null;
}): string {
  const produit = String(args.productId ?? "").trim();
  const email = String(args.email ?? "").trim();
  const sa = String(args.affiliateRef ?? "").trim();

  const complet = `${produit}|${email}|${sa}`;
  if (complet.length <= CUSTOM_ID_MAX) return complet;

  const sansSa = `${produit}|${email}|`;
  if (sansSa.length <= CUSTOM_ID_MAX) return sansSa;

  // Une adresse à elle seule plus longue que la limite : on garde le
  // produit et on tronque, mais on le DIT, parce que l'accès s'ouvrira
  // sur une adresse fausse.
  console.error(
    `[paypal] custom_id trop long pour ${email} : l'adresse sera tronquee, acces a verifier.`,
  );
  return complet.slice(0, CUSTOM_ID_MAX);
}

export function readCustomId(raw: string | null | undefined): {
  productId: string | null;
  email: string | null;
  affiliateRef: string | null;
} {
  const s = String(raw ?? "").trim();
  if (!s) return { productId: null, email: null, affiliateRef: null };
  const [produit, email, sa] = s.split("|");
  return {
    productId: produit || null,
    email: (email || "").trim().toLowerCase() || null,
    affiliateRef: sa || null,
  };
}

// ── LES APPELS À PAYPAL ───────────────────────────────────────────────

export type PaypalFailure =
  | "not_configured"
  | "invalid_product"
  | "paypal_refused"
  | "no_approval_link"
  | "network";

async function jeton(compte: OwnerPaypalAccount): Promise<string | null> {
  const auth = Buffer.from(`${compte.clientId}:${compte.secret}`).toString("base64");
  try {
    const res = await fetch(`${paypalOwnerBase(compte.mode)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

async function poster(
  compte: OwnerPaypalAccount,
  token: string,
  chemin: string,
  corps: unknown,
): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const res = await fetch(`${paypalOwnerBase(compte.mode)}${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, json };
}

export interface PaypalSubscriptionResult {
  ok: boolean;
  approveUrl?: string;
  subscriptionId?: string;
  reason?: PaypalFailure;
  detail?: string;
}

/**
 * Crée l'abonnement et rend l'adresse d'approbation.
 *
 * Produit et plan sont créés à chaque commande, comme pour les
 * revendeurs. C'est un appel de plus et zéro état à garder synchronisé :
 * un identifiant de plan mémorisé dans une variable d'environnement
 * serait une chose de plus à reposer le jour d'un changement de prix, et
 * une occasion de plus de vendre l'ancien tarif.
 */
export async function createOwnerPaypalSubscription(args: {
  compte: OwnerPaypalAccount;
  product: OwnerProduct;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  affiliateRef?: string | null;
}): Promise<PaypalSubscriptionResult> {
  const unit = paypalInterval(args.product);
  if (!unit) return { ok: false, reason: "invalid_product" };

  const token = await jeton(args.compte);
  if (!token) return { ok: false, reason: "not_configured" };

  try {
    const produit = await poster(args.compte, token, "/v1/catalogs/products", {
      name: args.product.label,
      type: "SERVICE",
      category: "SOFTWARE",
    });
    const productId = produit.json.id as string | undefined;
    if (!produit.ok || !productId) {
      return { ok: false, reason: "paypal_refused", detail: "product" };
    }

    const plan = await poster(args.compte, token, "/v1/billing/plans", {
      product_id: productId,
      name: args.product.label,
      billing_cycles: [
        {
          frequency: { interval_unit: unit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          // 0 = sans fin. "Sans engagement" veut dire qu'on arrête quand
          // on veut, pas que ça s'arrête tout seul au bout d'un an.
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: paypalAmount(args.product.amountCents),
              currency_code: args.product.currency.toUpperCase(),
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        // Trois échecs avant que PayPal suspende. Même esprit que Stripe,
        // qui réessaie : on ne met pas quelqu'un dehors sur un incident
        // de carte.
        payment_failure_threshold: 3,
      },
    });
    const planId = plan.json.id as string | undefined;
    if (!plan.ok || !planId) {
      return { ok: false, reason: "paypal_refused", detail: "plan" };
    }

    const abo = await poster(args.compte, token, "/v1/billing/subscriptions", {
      plan_id: planId,
      custom_id: buildCustomId({
        productId: args.product.id,
        email: args.email,
        affiliateRef: args.affiliateRef,
      }),
      subscriber: { email_address: args.email },
      application_context: {
        brand_name: "Tiquiz",
        locale: "fr-FR",
        user_action: "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
      },
    });
    if (!abo.ok) {
      return {
        ok: false,
        reason: "paypal_refused",
        detail: String((abo.json as { message?: string }).message ?? "subscription"),
      };
    }
    const links = (abo.json.links as Array<{ rel?: string; href?: string }>) ?? [];
    const approve = links.find((l) => l.rel === "approve")?.href;
    if (!approve) return { ok: false, reason: "no_approval_link" };

    return {
      ok: true,
      approveUrl: approve,
      subscriptionId: String(abo.json.id ?? "") || undefined,
    };
  } catch (e) {
    console.error(`[paypal] creation impossible : ${(e as Error).message}`);
    return { ok: false, reason: "network" };
  }
}

export interface PaypalSubscriptionInfo {
  /** L'abonnement est-il en cours ? */
  actif: boolean;
  status: string;
  productId: string | null;
  /** L'adresse SAISIE sur notre bon de commande, quand on l'a. */
  email: string | null;
  affiliateRef: string | null;
  amountCents: number;
}

/** La forme d'un abonnement PayPal, réduite à ce qu'on en lit. */
interface AboShape {
  status?: string;
  custom_id?: string | null;
  subscriber?: { email_address?: string | null } | null;
  billing_info?: { last_payment?: { amount?: { value?: string | null } | null } | null } | null;
}

/**
 * Lit un abonnement. PURE, donc testable : la lecture est l'endroit où
 * les bugs d'attribution s'installent (drame Ivan, 7 août).
 */
export function readSubscription(json: AboShape): PaypalSubscriptionInfo {
  const status = String(json.status ?? "").trim().toUpperCase();
  const { productId, email, affiliateRef } = readCustomId(json.custom_id);
  return {
    // ACTIVE : payé et en cours. APPROVED : approuvé, activation
    // imminente, ce qu'on voit au retour immédiat de l'acheteur.
    actif: status === "ACTIVE" || status === "APPROVED",
    status,
    productId,
    // L'adresse SAISIE d'abord, celle du compte PayPal seulement en
    // repli : voir le bloc sur le `custom_id` plus haut.
    email: email ?? (json.subscriber?.email_address ?? null),
    affiliateRef,
    amountCents: paypalAmountToCents(json.billing_info?.last_payment?.amount?.value),
  };
}

/** Relit un abonnement chez PayPal. */
export async function getOwnerPaypalSubscription(args: {
  compte: OwnerPaypalAccount;
  subscriptionId: string;
}): Promise<PaypalSubscriptionInfo | null> {
  const id = String(args.subscriptionId ?? "").trim();
  if (!id) return null;
  const token = await jeton(args.compte);
  if (!token) return null;
  try {
    const res = await fetch(
      `${paypalOwnerBase(args.compte.mode)}/v1/billing/subscriptions/${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    return readSubscription((await res.json()) as AboShape);
  } catch (e) {
    console.error(`[paypal] relecture impossible : ${(e as Error).message}`);
    return null;
  }
}

/**
 * Arrête un abonnement.
 *
 * **PayPal ne connaît pas la "fin de période".** Chez Stripe,
 * `cancel_at_period_end` laisse l'accès courir jusqu'à la date payée.
 * Ici, `cancel` arrête tout de suite le prélèvement, et c'est la seule
 * chose que PayPal sache faire. On ne fait donc PAS semblant : le
 * `quand` sert à décider ce que NOUS faisons de l'accès (le garder
 * jusqu'à la date déjà payée, ou le fermer), pas ce que PayPal fait du
 * prélèvement.
 */
export async function cancelOwnerPaypalSubscription(args: {
  compte: OwnerPaypalAccount;
  subscriptionId: string;
  raison?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const id = String(args.subscriptionId ?? "").trim();
  if (!id) return { ok: false, reason: "no_subscription" };
  const token = await jeton(args.compte);
  if (!token) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(
      `${paypalOwnerBase(args.compte.mode)}/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: args.raison ?? "Annulation demandee" }),
      },
    );
    // 404 / 422 = déjà annulé ou pas actif : le résultat voulu est là.
    if (res.ok || res.status === 404 || res.status === 422) return { ok: true };
    return { ok: false, reason: `http_${res.status}` };
  } catch (e) {
    console.error(`[paypal] annulation impossible : ${(e as Error).message}`);
    return { ok: false, reason: "network" };
  }
}

/**
 * Vérifie la signature d'un événement, par l'API officielle.
 *
 * Sans `PAYPAL_WEBHOOK_ID_OWNER`, on ne peut rien vérifier : la fonction
 * refuse plutôt que de faire semblant. Une adresse de webhook qui accepte
 * un corps non signé distribue des abonnements gratuits à qui la connaît.
 */
export async function verifyOwnerPaypalWebhook(args: {
  compte: OwnerPaypalAccount;
  webhookId: string;
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  if (!args.webhookId) return false;
  const token = await jeton(args.compte);
  if (!token) return false;
  try {
    const h = (nom: string) => args.headers.get(nom) ?? "";
    const res = await poster(args.compte, token, "/v1/notifications/verify-webhook-signature", {
      auth_algo: h("paypal-auth-algo"),
      cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"),
      webhook_id: args.webhookId,
      webhook_event: JSON.parse(args.rawBody),
    });
    return res.ok && res.json.verification_status === "SUCCESS";
  } catch (e) {
    console.error(`[paypal] verification impossible : ${(e as Error).message}`);
    return false;
  }
}

/**
 * Crée (ou retrouve) le webhook dans le compte PayPal de Béné.
 *
 * Sert au script d'installation : sans ça il faudrait aller cliquer dans
 * le tableau de bord PayPal, relever un identifiant à la main et le
 * recopier, c'est à dire trois occasions de se tromper pour une valeur
 * qui casse le paiement en silence.
 */
export async function ensureOwnerPaypalWebhook(args: {
  compte: OwnerPaypalAccount;
  url: string;
}): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const token = await jeton(args.compte);
  if (!token) return { ok: false, reason: "not_configured" };
  try {
    const cree = await poster(args.compte, token, "/v1/notifications/webhooks", {
      url: args.url,
      event_types: OWNER_PAYPAL_SUB_EVENTS.map((name) => ({ name })),
    });
    const id = cree.json.id as string | undefined;
    if (cree.ok && id) return { ok: true, id };

    // Adresse déjà enregistrée : on relit la liste pour retrouver l'id.
    const liste = await fetch(`${paypalOwnerBase(args.compte.mode)}/v1/notifications/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (liste.ok) {
      const json = (await liste.json()) as { webhooks?: Array<{ id: string; url: string }> };
      const existant = (json.webhooks ?? []).find((w) => w.url === args.url);
      if (existant) return { ok: true, id: existant.id };
    }
    return {
      ok: false,
      reason: String((cree.json as { message?: string }).message ?? "webhook_refuse"),
    };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
