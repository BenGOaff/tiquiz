// app/api/cron/reseller-invoices/route.ts
//
// CRON MENSUEL (phase 2 revendeur) : génère la facture de commission
// Tipote de chaque revendeur actif pour le mois en cours.
//
// À lancer le 1er de chaque mois (ou n'importe quand : idempotent, une
// seule facture par revendeur et par mois grâce à l'index unique) :
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//     https://quiz.tipote.com/api/cron/reseller-invoices
//
// Calcul (validé Béné 11 juin 2026) :
// - LICENCE = compte payant. Snapshot au moment de la génération.
// - Taux = palier courant selon le nombre total de licences
//   (commissionRateFor, bornes incluses).
// - Ligne par plan : licences x prix déclaré mensualisé x taux.
//   Plans annuels mensualisés (/12) pour lisser la commission.
// - Prix déclaré manquant -> ligne missing_price, commission 0 (Béné
//   le voit dans son admin et règle ça avec le revendeur).
// - 0 licence -> pas de facture ("je ne touche que s'il touche").

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { commissionRateFor, isPaidPlan, type ResellerRow } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

function authOk(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const expected = Buffer.from(CRON_SECRET);
  const tryEqual = (received: string | null | undefined) => {
    if (!received) return false;
    const a = Buffer.from(received);
    if (a.length !== expected.length) return false;
    return timingSafeEqual(a, expected);
  };
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return tryEqual(auth.slice(7));
  return tryEqual(req.nextUrl.searchParams.get("secret"));
}

const YEARLY_PLANS = new Set(["yearly", "yearly_plus"]);

interface InvoiceLine {
  plan: string;
  licences: number;
  monthly_price_cents: number | null;
  commission_cents: number;
  missing_price: boolean;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  try {
    const { data: resellers, error } = await supabaseAdmin
      .from("resellers")
      .select("id,name,status,commission_tiers,pricing")
      .eq("status", "active");
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const r of (resellers ?? []) as Array<
      Pick<ResellerRow, "id" | "name" | "status" | "commission_tiers" | "pricing">
    >) {
      // Déjà facturé ce mois : idempotent, on passe.
      const { data: existing } = await supabaseAdmin
        .from("reseller_invoices")
        .select("id")
        .eq("reseller_id", r.id)
        .eq("period", period)
        .maybeSingle();
      if (existing) {
        results.push({ reseller: r.name, skipped: "already_invoiced" });
        continue;
      }

      // Snapshot des licences par plan.
      const { data: clients } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("reseller_id", r.id);

      const byPlan: Record<string, number> = {};
      let licenceCount = 0;
      for (const c of (clients ?? []) as Array<{ plan: string }>) {
        if (!isPaidPlan(c.plan)) continue;
        byPlan[c.plan] = (byPlan[c.plan] ?? 0) + 1;
        licenceCount += 1;
      }

      if (licenceCount === 0) {
        results.push({ reseller: r.name, skipped: "no_licence" });
        continue;
      }

      const rate = commissionRateFor(licenceCount, r.commission_tiers ?? []);
      const pricing = (r.pricing ?? {}) as ResellerRow["pricing"];

      const lines: InvoiceLine[] = [];
      let totalCents = 0;
      for (const [plan, count] of Object.entries(byPlan).sort()) {
        const declared = pricing[plan]?.amount_cents;
        if (typeof declared === "number" && declared > 0) {
          const monthlyCents = YEARLY_PLANS.has(plan)
            ? Math.round(declared / 12)
            : declared;
          const commission = Math.round(monthlyCents * count * rate);
          lines.push({
            plan,
            licences: count,
            monthly_price_cents: monthlyCents,
            commission_cents: commission,
            missing_price: false,
          });
          totalCents += commission;
        } else {
          lines.push({
            plan,
            licences: count,
            monthly_price_cents: null,
            commission_cents: 0,
            missing_price: true,
          });
        }
      }

      const { error: insErr } = await supabaseAdmin.from("reseller_invoices").insert({
        reseller_id: r.id,
        period,
        licence_count: licenceCount,
        rate,
        currency: "EUR",
        total_cents: totalCents,
        lines,
      });
      if (insErr) {
        // 23505 = course avec un autre run du cron : déjà facturé.
        if (insErr.code !== "23505") {
          results.push({ reseller: r.name, error: insErr.message });
          continue;
        }
      }
      results.push({
        reseller: r.name,
        period,
        licences: licenceCount,
        rate,
        total_cents: totalCents,
      });
    }

    return NextResponse.json({ ok: true, period, results });
  } catch (e) {
    console.error("[cron/reseller-invoices]", (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
