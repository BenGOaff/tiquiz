// app/api/reseller/settings/route.ts
//
// Réglages du revendeur : ses bons de commande (une URL par plan payant).
// Ses clients verront CES URLs dans Réglages -> Abonnement à la place
// des BDC tipote.fr de Béné.
//
// GET : URLs actuelles.
// PUT : { checkout_urls: { monthly?, yearly?, monthly_plus?, yearly_plus? } }
//       URL https obligatoire, chaîne vide = suppression de l'entrée.

import { NextRequest, NextResponse } from "next/server";

import { getResellerSession, logResellerAction } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHECKOUT_PLAN_KEYS = ["monthly", "yearly", "monthly_plus", "yearly_plus"] as const;

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    checkout_urls: session.reseller.checkout_urls ?? {},
  });
}

export async function PUT(req: NextRequest) {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.checkout_urls;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const next: Record<string, string> = {};
    for (const key of CHECKOUT_PLAN_KEYS) {
      const value = (raw as Record<string, unknown>)[key];
      if (value === undefined || value === null || value === "") continue;
      if (typeof value !== "string" || !isValidHttpsUrl(value.trim())) {
        return NextResponse.json(
          { ok: false, error: "invalid_url", plan: key },
          { status: 400 },
        );
      }
      next[key] = value.trim();
    }

    const { error } = await supabaseAdmin
      .from("resellers")
      .update({ checkout_urls: next })
      .eq("id", session.reseller.id);
    if (error) throw error;

    await logResellerAction({
      resellerId: session.reseller.id,
      actorUserId: session.userId,
      action: "update_checkout_urls",
      meta: { plans: Object.keys(next) },
    });

    return NextResponse.json({ ok: true, checkout_urls: next });
  } catch (e) {
    console.error("[reseller/settings] PUT failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
