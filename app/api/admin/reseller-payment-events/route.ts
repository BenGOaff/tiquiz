// app/api/admin/reseller-payment-events/route.ts
//
// Suivi global des paiements revendeurs (Bene, admin uniquement). Permet
// de voir ou / comment / pourquoi un paiement a echoue, pour tous les
// revendeurs, sans demander a quiconque d'ouvrir une console.
//
// GET ?errors=1 : uniquement les echecs. ?reseller_id=... : un revendeur.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const errorsOnly = req.nextUrl.searchParams.get("errors") === "1";
  const resellerId = req.nextUrl.searchParams.get("reseller_id");

  let query = supabaseAdmin
    .from("reseller_payment_events")
    .select("id,reseller_id,provider,stage,event,ok,email,plan,detail,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (errorsOnly) query = query.eq("ok", false);
  if (resellerId) query = query.eq("reseller_id", resellerId);

  const { data: events, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }

  // Nom du revendeur pour l'affichage.
  const ids = Array.from(
    new Set((events ?? []).map((e) => e.reseller_id).filter(Boolean) as string[]),
  );
  const names: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: resellers } = await supabaseAdmin
      .from("resellers")
      .select("id,name")
      .in("id", ids);
    for (const r of (resellers ?? []) as Array<{ id: string; name: string }>) {
      names[r.id] = r.name;
    }
  }

  return NextResponse.json({
    ok: true,
    events: (events ?? []).map((e) => ({
      ...e,
      reseller_name: e.reseller_id ? (names[e.reseller_id] ?? null) : null,
    })),
  });
}
