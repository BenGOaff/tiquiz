// app/api/reseller/billing/route.ts
//
// GET : vue commission du revendeur ("ce que je dois à Tipote").
// - licences actuelles + taux du palier courant + barème complet
// - factures mensuelles (reseller_invoices) avec statut
// - liens de paiement vers Béné (env RESELLER_PAYOUT_STRIPE_URL /
//   RESELLER_PAYOUT_PAYPAL_URL : SES pages d'encaissement, montant
//   libre, à configurer une fois dans le .env prod).

import { NextResponse } from "next/server";

import { commissionRateFor, getResellerSession, isPaidPlan } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data: clients } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("reseller_id", session.reseller.id);

    const byPlan: Record<string, number> = {};
    let licences = 0;
    for (const c of (clients ?? []) as Array<{ plan: string }>) {
      if (!isPaidPlan(c.plan)) continue;
      byPlan[c.plan] = (byPlan[c.plan] ?? 0) + 1;
      licences += 1;
    }
    const rate = commissionRateFor(licences, session.reseller.commission_tiers ?? []);

    // Solde EN COURS (estimation du mois courant, même formule que le
    // cron) : licences par plan x prix déclaré mensualisé x taux.
    const pricing = session.reseller.pricing ?? {};
    const YEARLY = new Set(["yearly", "yearly_plus"]);
    let estimateCents = 0;
    let estimateMissingPrice = false;
    for (const [plan, count] of Object.entries(byPlan)) {
      const declared = pricing[plan]?.amount_cents;
      if (typeof declared === "number" && declared > 0) {
        const monthly = YEARLY.has(plan) ? Math.round(declared / 12) : declared;
        estimateCents += Math.round(monthly * count * rate);
      } else {
        estimateMissingPrice = true;
      }
    }

    const { data: invoices, error } = await supabaseAdmin
      .from("reseller_invoices")
      .select("id,period,licence_count,rate,currency,total_cents,lines,status,created_at,paid_at")
      .eq("reseller_id", session.reseller.id)
      .order("period", { ascending: false })
      .limit(24);
    if (error && !/does not exist/i.test(error.message)) throw error;

    return NextResponse.json({
      ok: true,
      licences,
      rate,
      tiers: session.reseller.commission_tiers ?? [],
      estimate_cents: estimateCents,
      estimate_missing_price: estimateMissingPrice,
      invoices: invoices ?? [],
      payout_urls: {
        stripe: process.env.RESELLER_PAYOUT_STRIPE_URL?.trim() || null,
        paypal: process.env.RESELLER_PAYOUT_PAYPAL_URL?.trim() || null,
      },
    });
  } catch (e) {
    console.error("[reseller/billing] GET failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}
