// app/api/reseller/payment-events/route.ts
//
// Journal de paiement du revendeur : il voit le suivi de SES paiements
// (checkout, ouverture d'acces, webhooks) et surtout les echecs avec la
// raison, sans avoir a ouvrir une console.

import { NextResponse } from "next/server";

import { getResellerSession } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("reseller_payment_events")
    .select("id,provider,stage,event,ok,email,plan,detail,created_at")
    .eq("reseller_id", session.reseller.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, events: data ?? [] });
}
