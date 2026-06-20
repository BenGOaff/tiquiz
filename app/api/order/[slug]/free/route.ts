// app/api/order/[slug]/free/route.ts
//
// Essai gratuit d'un client de revendeur : provisionne un compte en plan
// `free` rattache au revendeur (reseller_id), sans paiement. Le client
// recoit son acces par email. Anti-captation appliquee (un email deja
// pris hors portefeuille n'est jamais touche).
//
// POST { email }

import { NextRequest, NextResponse } from "next/server";

import { logPaymentEvent } from "@/lib/resellerPaymentLog";
import { activateResellerClient } from "@/lib/resellerProvisioning";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,support_email")
    .eq("slug", slug)
    .maybeSingle();
  if (!reseller || reseller.status !== "active") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const result = await activateResellerClient({
    reseller: { id: reseller.id, name: reseller.name, support_email: reseller.support_email },
    email,
    plan: "free",
    source: "free_signup",
  });

  await logPaymentEvent({
    resellerId: reseller.id,
    stage: "provision",
    event: result.ok ? "free_signup" : "free_signup_failed",
    ok: result.ok,
    email,
    plan: "free",
    detail: `Essai gratuit : ${result.outcome}.`,
  });

  if (!result.ok) {
    // rejected_email_taken = email deja utilise par un compte hors portefeuille.
    return NextResponse.json({ ok: false, error: result.outcome });
  }
  return NextResponse.json({ ok: true });
}
