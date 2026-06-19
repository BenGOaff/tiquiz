// app/api/payments/stripe/[token]/route.ts
//
// Webhook de cycle de vie Stripe d'un revendeur (cree automatiquement
// dans SON compte a la connexion). On y recoit :
// - checkout.session.completed : filet de securite pour ouvrir l'acces si
//   l'acheteur n'est pas revenu sur la page success.
// - customer.subscription.deleted : resiliation / echec de paiement
//   repete -> on repasse le client en free.
//
// Le revendeur est identifie par resellers.webhook_token (dans l'URL).
// Signature verifiee avec SON signing secret (chiffre en base).

import { NextRequest, NextResponse } from "next/server";

import { isResellerAllowedPlan } from "@/lib/reseller";
import { logPaymentEvent } from "@/lib/resellerPaymentLog";
import {
  activateResellerClient,
  cancelResellerClient,
} from "@/lib/resellerProvisioning";
import { decryptSecret } from "@/lib/secretsCrypto";
import { verifyStripeSignature } from "@/lib/stripeRest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,support_email,stripe_webhook_secret_enc")
    .eq("webhook_token", token)
    .maybeSingle();
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!reseller.stripe_webhook_secret_enc) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  }

  let secret: string;
  try {
    secret = decryptSecret(reseller.stripe_webhook_secret_enc);
  } catch {
    return NextResponse.json({ ok: false, error: "decrypt" }, { status: 400 });
  }
  if (!verifyStripeSignature(rawBody, sig, secret)) {
    await logPaymentEvent({
      resellerId: reseller.id,
      provider: "stripe",
      stage: "webhook",
      event: "webhook_bad_signature",
      ok: false,
      detail: "Signature Stripe invalide (event rejete).",
    });
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  // Signature OK : a partir d'ici on repond 200 (sinon Stripe retente en
  // boucle), meme si l'event ne nous concerne pas.
  if (reseller.status !== "active") {
    return NextResponse.json({ received: true, ignored: "suspended" });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  const obj = (event.data?.object ?? {}) as {
    payment_status?: string;
    metadata?: Record<string, string> | null;
  };
  const meta = obj.metadata ?? {};
  // Defense : on ignore tout event dont les metadata pointent un autre
  // revendeur (ne devrait pas arriver, le webhook est dans son compte).
  if (meta.reseller_id && meta.reseller_id !== reseller.id) {
    return NextResponse.json({ received: true, ignored: "other_reseller" });
  }

  const email = meta.email ?? null;
  const plan = meta.plan ?? null;
  const provReseller = {
    id: reseller.id,
    name: reseller.name,
    support_email: reseller.support_email,
  };

  if (event.type === "checkout.session.completed") {
    if (obj.payment_status === "paid" && email && isResellerAllowedPlan(plan)) {
      const result = await activateResellerClient({
        reseller: provReseller,
        email,
        plan,
        source: "stripe_webhook",
      });
      await logPaymentEvent({
        resellerId: reseller.id,
        provider: "stripe",
        stage: "webhook",
        event: result.ok ? "webhook_activate" : "webhook_activate_failed",
        ok: result.ok,
        email,
        plan,
        detail: `checkout.session.completed -> ${result.outcome}.`,
      });
    }
  } else if (event.type === "customer.subscription.deleted") {
    if (email) {
      const result = await cancelResellerClient({
        reseller: provReseller,
        email,
        source: "stripe_webhook",
      });
      await logPaymentEvent({
        resellerId: reseller.id,
        provider: "stripe",
        stage: "webhook",
        event: "webhook_cancel",
        ok: result.ok,
        email,
        detail: `subscription.deleted -> ${result.outcome}.`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
