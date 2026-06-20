// lib/stripeRest.ts
//
// Checkout natif Stripe pour les revendeurs, via l'API REST (pas de SDK,
// pas de dependance ajoutee). On cree un abonnement avec la cle du
// revendeur : l'argent va sur SON compte, Tiquiz orchestre seulement.
//
// On utilise price_data inline (pas de Product/Price a pre-creer) :
// Stripe Checkout en mode subscription accepte un prix recurrent ad hoc.

import crypto from "node:crypto";

const STRIPE_API = "https://api.stripe.com";

/** Events du webhook de cycle de vie (crees auto dans le compte revendeur). */
export const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.deleted",
];

/** Plan revendeur -> recurrence Stripe. */
const PLAN_INTERVAL: Record<string, "month" | "year"> = {
  monthly: "month",
  monthly_plus: "month",
  yearly: "year",
  yearly_plus: "year",
};

/** Nom du produit affiche sur le recu Stripe (non i18n, cote Stripe). */
const PLAN_LABEL: Record<string, string> = {
  monthly: "Tiquiz mensuel",
  monthly_plus: "Tiquiz mensuel plus",
  yearly: "Tiquiz annuel",
  yearly_plus: "Tiquiz annuel plus",
};

export function isStripeSupportedPlan(plan: string): boolean {
  return plan in PLAN_INTERVAL;
}

function toForm(obj: Record<string, string | number>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/**
 * Cree une session Checkout Stripe (abonnement) et renvoie l'URL hostee
 * Stripe vers laquelle rediriger l'acheteur.
 */
export async function createStripeSubscriptionCheckout(args: {
  key: string;
  resellerId: string;
  plan: string;
  amountCents: number;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const interval = PLAN_INTERVAL[args.plan];
  if (!interval) return { ok: false, error: "invalid_plan" };
  if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const params: Record<string, string | number> = {
    mode: "subscription",
    customer_email: args.email,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": args.amountCents,
    "line_items[0][price_data][recurring][interval]": interval,
    "line_items[0][price_data][product_data][name]": PLAN_LABEL[args.plan] ?? "Tiquiz",
    // Metadata lues au retour (success) et par un futur webhook pour
    // provisionner le bon compte sur le bon plan.
    "metadata[reseller_id]": args.resellerId,
    "metadata[plan]": args.plan,
    "metadata[email]": args.email,
    "subscription_data[metadata][reseller_id]": args.resellerId,
    "subscription_data[metadata][plan]": args.plan,
    "subscription_data[metadata][email]": args.email,
  };

  try {
    const res = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: toForm(params),
    });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.url) {
      return { ok: false, error: json.error?.message ?? "stripe_error" };
    }
    return { ok: true, url: json.url };
  } catch (e) {
    console.error("[stripeRest] createCheckout failed", (e as Error).message);
    return { ok: false, error: "network" };
  }
}

/**
 * Cree (ou recree) le webhook de cycle de vie dans le compte Stripe du
 * revendeur. Renvoie l'id + le signing secret (a chiffrer puis stocker).
 */
export async function ensureStripeWebhook(
  key: string,
  url: string,
): Promise<{ ok: boolean; id?: string; secret?: string; error?: string }> {
  const body =
    `url=${encodeURIComponent(url)}&` +
    STRIPE_WEBHOOK_EVENTS.map((e) => `enabled_events[]=${encodeURIComponent(e)}`).join("&");
  try {
    const res = await fetch(`${STRIPE_API}/v1/webhook_endpoints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      secret?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.id || !json.secret) {
      return { ok: false, error: json.error?.message ?? "stripe_error" };
    }
    return { ok: true, id: json.id, secret: json.secret };
  } catch (e) {
    console.error("[stripeRest] ensureWebhook failed", (e as Error).message);
    return { ok: false, error: "network" };
  }
}

/** Supprime un webhook (best-effort, a la deconnexion). */
export async function deleteStripeWebhook(key: string, id: string): Promise<void> {
  try {
    await fetch(`${STRIPE_API}/v1/webhook_endpoints/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch (e) {
    console.error("[stripeRest] deleteWebhook failed", (e as Error).message);
  }
}

/**
 * Annule immediatement un abonnement Stripe (DELETE /v1/subscriptions/:id).
 * Utilise quand un client change de formule : on annule l'ancien abo pour
 * eviter le double-prelevement. Best-effort : renvoie true si Stripe a
 * accepte. Un 404 (abo deja annule / inexistant) est traite comme ok.
 */
export async function cancelStripeSubscription(key: string, subId: string): Promise<boolean> {
  if (!subId) return false;
  try {
    const res = await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(subId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok || res.status === 404;
  } catch (e) {
    console.error("[stripeRest] cancelSubscription failed", (e as Error).message);
    return false;
  }
}

/**
 * Verifie la signature d'un event Stripe (header Stripe-Signature) sans
 * SDK : HMAC-SHA256 de `${timestamp}.${rawBody}`, comparaison constante,
 * tolerance de 5 minutes contre le rejeu.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  let t = "";
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const [k, val] = part.split("=");
    if (k === "t") t = val;
    else if (k === "v1" && val) v1.push(val);
  }
  if (!t || v1.length === 0) return false;

  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`, "utf8")
    .digest("hex");
  const expBuf = Buffer.from(expected, "hex");
  return v1.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  });
}

export interface StripeSessionInfo {
  paid: boolean;
  plan: string | null;
  email: string | null;
  resellerId: string | null;
  subscriptionId: string | null;
}

/**
 * Relit une session Checkout au retour de l'acheteur pour confirmer le
 * paiement et provisionner. Source de verite : payment_status = "paid".
 */
export async function retrieveStripeSession(
  key: string,
  sessionId: string,
): Promise<StripeSessionInfo | null> {
  try {
    const res = await fetch(
      `${STRIPE_API}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      payment_status?: string;
      status?: string;
      subscription?: string | null;
      customer_details?: { email?: string | null } | null;
      metadata?: Record<string, string> | null;
    };
    const meta = json.metadata ?? {};
    return {
      paid: json.payment_status === "paid" || json.status === "complete",
      plan: meta.plan ?? null,
      email: meta.email ?? json.customer_details?.email ?? null,
      resellerId: meta.reseller_id ?? null,
      subscriptionId: json.subscription ?? null,
    };
  } catch (e) {
    console.error("[stripeRest] retrieveSession failed", (e as Error).message);
    return null;
  }
}
