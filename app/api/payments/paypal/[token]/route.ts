// app/api/payments/paypal/[token]/route.ts
//
// Webhook de cycle de vie PayPal d'un revendeur (cree automatiquement
// dans SON app a la connexion). On y recoit :
// - BILLING.SUBSCRIPTION.ACTIVATED : filet de securite pour ouvrir l'acces.
// - CANCELLED / EXPIRED / SUSPENDED : on repasse le client en free.
//
// Le revendeur est identifie par resellers.webhook_token (dans l'URL).
// Signature verifiee via l'API officielle PayPal.

import { NextRequest, NextResponse } from "next/server";

import { verifyPaypalWebhookSignature } from "@/lib/paypalRest";
import { isResellerAllowedPlan } from "@/lib/reseller";
import {
  activateResellerClient,
  cancelResellerClient,
} from "@/lib/resellerProvisioning";
import { loadResellerPaymentSecrets } from "@/lib/resellerPayments";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CANCEL_EVENTS = [
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
];

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const rawBody = await req.text();

  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,support_email,paypal_webhook_id")
    .eq("webhook_token", token)
    .maybeSingle();
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!reseller.paypal_webhook_id) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  }

  const secrets = await loadResellerPaymentSecrets(reseller.id);
  if (!secrets.paypalClientId || !secrets.paypalSecret) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  }

  const valid = await verifyPaypalWebhookSignature({
    clientId: secrets.paypalClientId,
    secret: secrets.paypalSecret,
    env: secrets.paypalEnv,
    webhookId: reseller.paypal_webhook_id,
    headers: req.headers,
    rawBody,
  });
  if (!valid) {
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  if (reseller.status !== "active") {
    return NextResponse.json({ received: true, ignored: "suspended" });
  }

  let event: { event_type?: string; resource?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  const resource = (event.resource ?? {}) as {
    custom_id?: string;
    subscriber?: { email_address?: string } | null;
  };
  let meta: { reseller_id?: string; plan?: string; email?: string } = {};
  if (resource.custom_id) {
    try {
      meta = JSON.parse(resource.custom_id);
    } catch {
      /* custom_id non JSON : on ignore */
    }
  }
  if (meta.reseller_id && meta.reseller_id !== reseller.id) {
    return NextResponse.json({ received: true, ignored: "other_reseller" });
  }

  const email = meta.email ?? resource.subscriber?.email_address ?? null;
  const plan = meta.plan ?? null;
  const provReseller = {
    id: reseller.id,
    name: reseller.name,
    support_email: reseller.support_email,
  };

  if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
    if (email && isResellerAllowedPlan(plan)) {
      await activateResellerClient({
        reseller: provReseller,
        email,
        plan,
        source: "paypal_webhook",
      });
    }
  } else if (event.event_type && CANCEL_EVENTS.includes(event.event_type)) {
    if (email) {
      await cancelResellerClient({ reseller: provReseller, email, source: "paypal_webhook" });
    }
  }

  return NextResponse.json({ received: true });
}
