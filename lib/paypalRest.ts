// lib/paypalRest.ts
//
// Checkout natif PayPal pour les revendeurs (abonnements), via l'API REST.
// On cree a la volee : un token, un produit, un plan de facturation, puis
// un abonnement. L'acheteur approuve sur PayPal, l'argent va sur le compte
// du revendeur. Au retour, on relit l'abonnement pour provisionner.
//
// Note : produit + plan sont crees a chaque achat (simple, sans cache).
// Acceptable au lancement ; un cache pourra etre ajoute si besoin.

import { paypalApiBase } from "@/lib/resellerPayments";

const PLAN_UNIT: Record<string, "MONTH" | "YEAR"> = {
  monthly: "MONTH",
  monthly_plus: "MONTH",
  yearly: "YEAR",
  yearly_plus: "YEAR",
};

const PLAN_LABEL: Record<string, string> = {
  monthly: "Tiquiz mensuel",
  monthly_plus: "Tiquiz mensuel plus",
  yearly: "Tiquiz annuel",
  yearly_plus: "Tiquiz annuel plus",
};

export function isPaypalSupportedPlan(plan: string): boolean {
  return plan in PLAN_UNIT;
}

export async function paypalAccessToken(
  base: string,
  clientId: string,
  secret: string,
): Promise<string | null> {
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
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
}

async function ppPost(
  base: string,
  token: string,
  path: string,
  body: unknown,
): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, json };
}

/**
 * Cree un abonnement PayPal pour un plan revendeur et renvoie l'URL
 * d'approbation vers laquelle rediriger l'acheteur.
 */
export async function createPaypalSubscriptionCheckout(args: {
  clientId: string;
  secret: string;
  env: string | null;
  resellerId: string;
  resellerName: string;
  plan: string;
  amountCents: number;
  email: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const unit = PLAN_UNIT[args.plan];
  if (!unit) return { ok: false, error: "invalid_plan" };
  if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
    return { ok: false, error: "invalid_amount" };
  }
  const base = paypalApiBase(args.env);
  const value = (args.amountCents / 100).toFixed(2);

  try {
    const token = await paypalAccessToken(base, args.clientId, args.secret);
    if (!token) return { ok: false, error: "auth" };

    // 1. Produit.
    const product = await ppPost(base, token, "/v1/catalogs/products", {
      name: `Tiquiz - ${args.resellerName}`,
      type: "SERVICE",
      category: "SOFTWARE",
    });
    const productId = product.json.id as string | undefined;
    if (!product.ok || !productId) return { ok: false, error: "product" };

    // 2. Plan de facturation recurrent.
    const plan = await ppPost(base, token, "/v1/billing/plans", {
      product_id: productId,
      name: PLAN_LABEL[args.plan] ?? "Tiquiz",
      billing_cycles: [
        {
          frequency: { interval_unit: unit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value, currency_code: "EUR" } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    });
    const planId = plan.json.id as string | undefined;
    if (!plan.ok || !planId) return { ok: false, error: "plan" };

    // 3. Abonnement. custom_id porte nos metadata pour le retour.
    const sub = await ppPost(base, token, "/v1/billing/subscriptions", {
      plan_id: planId,
      custom_id: JSON.stringify({
        reseller_id: args.resellerId,
        plan: args.plan,
        email: args.email,
      }),
      subscriber: { email_address: args.email },
      application_context: {
        brand_name: args.resellerName,
        user_action: "SUBSCRIBE_NOW",
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
      },
    });
    if (!sub.ok) return { ok: false, error: "subscription" };
    const links = (sub.json.links as Array<{ rel: string; href: string }>) ?? [];
    const approve = links.find((l) => l.rel === "approve")?.href;
    if (!approve) return { ok: false, error: "no_approval_link" };
    return { ok: true, url: approve };
  } catch (e) {
    console.error("[paypalRest] createCheckout failed", (e as Error).message);
    return { ok: false, error: "network" };
  }
}

export interface PaypalSubscriptionInfo {
  active: boolean;
  plan: string | null;
  email: string | null;
  resellerId: string | null;
}

/**
 * Relit un abonnement au retour de l'acheteur pour confirmer l'activation
 * et provisionner. custom_id porte reseller_id + plan + email.
 */
export async function getPaypalSubscription(args: {
  clientId: string;
  secret: string;
  env: string | null;
  subscriptionId: string;
}): Promise<PaypalSubscriptionInfo | null> {
  const base = paypalApiBase(args.env);
  try {
    const token = await paypalAccessToken(base, args.clientId, args.secret);
    if (!token) return null;
    const res = await fetch(
      `${base}/v1/billing/subscriptions/${encodeURIComponent(args.subscriptionId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      custom_id?: string;
      subscriber?: { email_address?: string } | null;
    };
    let meta: { reseller_id?: string; plan?: string; email?: string } = {};
    if (json.custom_id) {
      try {
        meta = JSON.parse(json.custom_id);
      } catch {
        /* custom_id non JSON : on ignore */
      }
    }
    return {
      // ACTIVE = paye et en cours ; APPROVED = approuve, activation
      // imminente (on accepte les deux au retour immediat).
      active: json.status === "ACTIVE" || json.status === "APPROVED",
      plan: meta.plan ?? null,
      email: meta.email ?? json.subscriber?.email_address ?? null,
      resellerId: meta.reseller_id ?? null,
    };
  } catch (e) {
    console.error("[paypalRest] getSubscription failed", (e as Error).message);
    return null;
  }
}
