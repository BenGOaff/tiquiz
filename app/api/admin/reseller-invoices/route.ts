// app/api/admin/reseller-invoices/route.ts
//
// Contrôle Béné sur les factures de commission des revendeurs.
// GET   : liste des factures (toutes, récentes d'abord) + nom revendeur.
// PATCH : { invoice_id, status: "paid" | "pending" } — marquer payée
//         (ou repasser en attente en cas d'erreur de manip).
// POST  : déclenche la génération du mois courant (même logique que le
//         cron, pratique pour tester sans attendre le 1er du mois).

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { resolveAppUrl } from "@/lib/authLinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const { data: invoices, error } = await supabaseAdmin
      .from("reseller_invoices")
      .select("id,reseller_id,period,licence_count,rate,currency,total_cents,lines,status,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      // Table absente pré-migration : section vide, admin intact.
      if (/does not exist/i.test(error.message)) {
        return NextResponse.json({ ok: true, invoices: [] });
      }
      throw error;
    }

    const resellerIds = [...new Set((invoices ?? []).map((i) => i.reseller_id))];
    const names: Record<string, string> = {};
    if (resellerIds.length > 0) {
      const { data: resellers } = await supabaseAdmin
        .from("resellers")
        .select("id,name")
        .in("id", resellerIds);
      for (const r of (resellers ?? []) as Array<{ id: string; name: string }>) {
        names[r.id] = r.name;
      }
    }

    return NextResponse.json({
      ok: true,
      invoices: (invoices ?? []).map((i) => ({
        ...i,
        reseller_name: names[i.reseller_id] ?? "?",
      })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const invoiceId = typeof body?.invoice_id === "string" ? body.invoice_id : "";
    const status = body?.status;
    if (!invoiceId || (status !== "paid" && status !== "pending")) {
      return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("reseller_invoices")
      .update({
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", invoiceId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Déclenchement manuel = appel interne du cron avec le secret.
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 500 });
  }
  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  try {
    const res = await fetch(`${appUrl}/api/cron/reseller-invoices`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
