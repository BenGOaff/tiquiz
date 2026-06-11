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
    pricing: session.reseller.pricing ?? {},
    webhook_token: session.reseller.webhook_token ?? null,
    slug: session.reseller.slug ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    const actions: string[] = [];

    // 1. URLs de paiement (pages Stripe/PayPal du revendeur).
    if (body?.checkout_urls && typeof body.checkout_urls === "object") {
      const next: Record<string, string> = {};
      for (const key of CHECKOUT_PLAN_KEYS) {
        const value = (body.checkout_urls as Record<string, unknown>)[key];
        if (value === undefined || value === null || value === "") continue;
        if (typeof value !== "string" || !isValidHttpsUrl(value.trim())) {
          return NextResponse.json(
            { ok: false, error: "invalid_url", plan: key },
            { status: 400 },
          );
        }
        next[key] = value.trim();
      }
      updates.checkout_urls = next;
      actions.push("update_checkout_urls");
    }

    // 2. Tarifs affichés sur les bons de commande hébergés (texte libre,
    //    affichage uniquement : le montant réel est celui de sa page de
    //    paiement).
    if (body?.pricing && typeof body.pricing === "object") {
      const next: Record<string, { label: string }> = {};
      for (const key of CHECKOUT_PLAN_KEYS) {
        const value = (body.pricing as Record<string, unknown>)[key];
        const label =
          value && typeof value === "object"
            ? (value as { label?: unknown }).label
            : value;
        if (label === undefined || label === null || label === "") continue;
        if (typeof label !== "string" || label.trim().length > 80) {
          return NextResponse.json(
            { ok: false, error: "invalid_price", plan: key },
            { status: 400 },
          );
        }
        next[key] = { label: label.trim() };
      }
      updates.pricing = next;
      actions.push("update_pricing");
    }

    // 3. Rotation du secret webhook (si le token a fuité).
    if (body?.regenerate_webhook_token === true) {
      updates.webhook_token =
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      actions.push("regenerate_webhook_token");
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from("resellers")
      .update(updates)
      .eq("id", session.reseller.id)
      .select("checkout_urls,pricing,webhook_token,slug")
      .single();
    if (error) throw error;

    for (const action of actions) {
      await logResellerAction({
        resellerId: session.reseller.id,
        actorUserId: session.userId,
        action,
        meta: {},
      });
    }

    return NextResponse.json({
      ok: true,
      checkout_urls: updated.checkout_urls ?? {},
      pricing: updated.pricing ?? {},
      webhook_token: updated.webhook_token ?? null,
      slug: updated.slug ?? null,
    });
  } catch (e) {
    console.error("[reseller/settings] PUT failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
