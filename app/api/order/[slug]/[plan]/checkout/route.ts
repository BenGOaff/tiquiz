// app/api/order/[slug]/[plan]/checkout/route.ts
//
// Demarre le paiement natif d'un client de revendeur. Le bon de commande
// hoste appelle cette route, qui cree l'abonnement chez Stripe ou PayPal
// AVEC LA CLE DU REVENDEUR (l'argent va sur son compte) et renvoie l'URL
// vers laquelle rediriger l'acheteur.
//
// POST { email, provider: "stripe" | "paypal" }
//
// Aucune authentification : page publique. La securite vient du slug non
// devinable + de la verification du paiement au retour (success).

import { NextRequest, NextResponse } from "next/server";

import { loadResellerPaymentSecrets } from "@/lib/resellerPayments";
import { logPaymentEvent } from "@/lib/resellerPaymentLog";
import { createPaypalSubscriptionCheckout } from "@/lib/paypalRest";
import { createStripeSubscriptionCheckout } from "@/lib/stripeRest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveAppUrl } from "@/lib/authLinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
const PLAN_KEYS = ["monthly", "yearly", "monthly_plus", "yearly_plus"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type RouteContext = { params: Promise<{ slug: string; plan: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { slug, plan } = await context.params;
  if (!PLAN_KEYS.includes(plan)) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const provider = String(body?.provider ?? "").toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (provider !== "stripe" && provider !== "paypal") {
    return NextResponse.json({ ok: false, error: "invalid_provider" }, { status: 400 });
  }

  // Revendeur + tarif.
  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,pricing")
    .eq("slug", slug)
    .maybeSingle();
  if (!reseller || reseller.status !== "active") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const pricing = (reseller.pricing ?? {}) as Record<string, { amount_cents?: number }>;
  const amountCents = pricing[plan]?.amount_cents;
  if (!amountCents || amountCents <= 0) {
    await logPaymentEvent({
      resellerId: reseller.id,
      provider: provider as "stripe" | "paypal",
      stage: "checkout",
      event: "checkout_no_price",
      ok: false,
      email,
      plan,
      detail: "Aucun tarif fixe pour ce plan.",
    });
    return NextResponse.json({ ok: false, error: "no_price" }, { status: 400 });
  }

  const secrets = await loadResellerPaymentSecrets(reseller.id);
  const successUrl = `${APP_URL}/order/${slug}/success?provider=${provider}`;
  const cancelUrl = `${APP_URL}/order/${slug}/${plan}?canceled=1`;

  try {
    if (provider === "stripe") {
      if (!secrets.stripeKey) {
        await logPaymentEvent({
          resellerId: reseller.id,
          provider: "stripe",
          stage: "checkout",
          event: "checkout_not_connected",
          ok: false,
          email,
          plan,
          detail: "Stripe n'est pas connecte.",
        });
        return NextResponse.json({ ok: false, error: "not_connected" }, { status: 400 });
      }
      const result = await createStripeSubscriptionCheckout({
        key: secrets.stripeKey,
        resellerId: reseller.id,
        plan,
        amountCents,
        email,
        // Stripe remplace {CHECKOUT_SESSION_ID} par l'id reel.
        successUrl: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl,
      });
      if (!result.ok || !result.url) {
        await logPaymentEvent({
          resellerId: reseller.id,
          provider: "stripe",
          stage: "checkout",
          event: "checkout_provider_error",
          ok: false,
          email,
          plan,
          detail: result.error ?? "Stripe a refuse la creation du paiement.",
        });
        return NextResponse.json({ ok: false, error: "stripe_failed" }, { status: 502 });
      }
      await logPaymentEvent({
        resellerId: reseller.id,
        provider: "stripe",
        stage: "checkout",
        event: "checkout_start",
        email,
        plan,
      });
      return NextResponse.json({ ok: true, url: result.url });
    }

    // PayPal
    if (!secrets.paypalClientId || !secrets.paypalSecret) {
      await logPaymentEvent({
        resellerId: reseller.id,
        provider: "paypal",
        stage: "checkout",
        event: "checkout_not_connected",
        ok: false,
        email,
        plan,
        detail: "PayPal n'est pas connecte.",
      });
      return NextResponse.json({ ok: false, error: "not_connected" }, { status: 400 });
    }
    const result = await createPaypalSubscriptionCheckout({
      clientId: secrets.paypalClientId,
      secret: secrets.paypalSecret,
      env: secrets.paypalEnv,
      resellerId: reseller.id,
      resellerName: reseller.name,
      plan,
      amountCents,
      email,
      returnUrl: successUrl,
      cancelUrl,
    });
    if (!result.ok || !result.url) {
      await logPaymentEvent({
        resellerId: reseller.id,
        provider: "paypal",
        stage: "checkout",
        event: "checkout_provider_error",
        ok: false,
        email,
        plan,
        detail: result.error ?? "PayPal a refuse la creation du paiement.",
      });
      return NextResponse.json({ ok: false, error: "paypal_failed" }, { status: 502 });
    }
    await logPaymentEvent({
      resellerId: reseller.id,
      provider: "paypal",
      stage: "checkout",
      event: "checkout_start",
      email,
      plan,
    });
    return NextResponse.json({ ok: true, url: result.url });
  } catch (e) {
    await logPaymentEvent({
      resellerId: reseller.id,
      provider: provider as "stripe" | "paypal",
      stage: "checkout",
      event: "checkout_exception",
      ok: false,
      email,
      plan,
      detail: (e as Error).message,
    });
    console.error("[order/checkout] failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
