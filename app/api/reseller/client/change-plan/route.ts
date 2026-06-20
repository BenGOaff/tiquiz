// app/api/reseller/client/change-plan/route.ts
//
// Changement de formule par un CLIENT de revendeur, depuis Reglages ->
// Abonnement. Authentifie : le client ne peut changer QUE son propre
// abonnement (jamais celui d'un autre).
//
// - Abonnement Stripe en cours : mise a jour EN PLACE avec proration
//   (Stripe credite le temps non consomme et facture la difference tout de
//   suite). Aucune action en plus pour le client, sa carte est deja
//   enregistree -> "upgrade direct".
// - Abonnement PayPal ou aucun abonnement (plan free) : on renvoie l'URL du
//   bon de commande du revendeur (checkout). Pour PayPal l'ancien abo sera
//   annule automatiquement a l'activation du nouveau (cf. provisioning).
//
// POST { plan }  ->  { ok, mode, redirectUrl? }

import { NextRequest, NextResponse } from "next/server";

import { activateResellerClient } from "@/lib/resellerProvisioning";
import { loadResellerPaymentSecrets } from "@/lib/resellerPayments";
import { logPaymentEvent } from "@/lib/resellerPaymentLog";
import { updateStripeSubscription } from "@/lib/stripeRest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Changement de formule = uniquement entre plans PAYANTS. Repasser en free
// se fait via l'annulation (bouton dedie), pas ici.
const PAID_PLANS = ["monthly", "yearly", "monthly_plus", "yearly_plus"];

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body?.plan ?? "").trim();
  if (!PAID_PLANS.includes(plan)) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("user_id,email,plan,reseller_id,reseller_sub_provider,reseller_sub_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const resellerId = (profile as { reseller_id?: string | null } | null)?.reseller_id ?? null;
  if (!profile || !resellerId) {
    return NextResponse.json({ ok: false, error: "not_managed" }, { status: 400 });
  }
  if (String(profile.plan ?? "free") === plan) {
    return NextResponse.json({ ok: true, mode: "noop" });
  }

  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,support_email,slug,pricing")
    .eq("id", resellerId)
    .maybeSingle();
  if (!reseller || reseller.status !== "active" || !reseller.slug) {
    return NextResponse.json({ ok: false, error: "reseller_unavailable" }, { status: 400 });
  }

  const pricing = (reseller.pricing ?? {}) as Record<string, { amount_cents?: number }>;
  const amountCents = pricing[plan]?.amount_cents;
  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ ok: false, error: "no_price" }, { status: 400 });
  }

  const email = (profile.email ?? user.email ?? "").toLowerCase();
  const provider = profile.reseller_sub_provider ?? null;
  const subId = profile.reseller_sub_id ?? null;

  // Abonnement Stripe en cours : mise a jour en place (proration).
  if (provider === "stripe" && subId) {
    const secrets = await loadResellerPaymentSecrets(reseller.id);
    if (!secrets.stripeKey) {
      return NextResponse.json({ ok: false, error: "stripe_unavailable" }, { status: 400 });
    }
    const upd = await updateStripeSubscription({
      key: secrets.stripeKey,
      subscriptionId: subId,
      plan,
      amountCents,
    });
    if (!upd.ok) {
      await logPaymentEvent({
        resellerId: reseller.id,
        provider: "stripe",
        stage: "provision",
        event: "change_plan_failed",
        ok: false,
        email,
        plan,
        detail: upd.error ?? "Stripe a refuse la mise a jour de l'abonnement.",
      });
      return NextResponse.json({ ok: false, error: "stripe_failed" }, { status: 502 });
    }
    // Synchronise le plan en base (meme abonnement, donc pas d'annulation).
    await activateResellerClient({
      reseller: { id: reseller.id, name: reseller.name, support_email: reseller.support_email },
      email,
      plan,
      source: "client_change_plan",
      actorUserId: user.id,
      provider: "stripe",
      subscriptionId: subId,
    });
    await logPaymentEvent({
      resellerId: reseller.id,
      provider: "stripe",
      stage: "provision",
      event: "change_plan_updated",
      ok: true,
      email,
      plan,
      detail: "Abonnement Stripe mis a jour en place (proration).",
    });
    return NextResponse.json({ ok: true, mode: "updated" });
  }

  // PayPal ou aucun abonnement : on passe par le bon de commande du
  // revendeur (l'ancien abo PayPal sera annule a l'activation du nouveau).
  return NextResponse.json({
    ok: true,
    mode: "checkout",
    redirectUrl: `/order/${reseller.slug}/${plan}`,
  });
}
