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

    // 1. Config de paiement par plan : { stripe?, paypal?, sio? }
    //    (lien Stripe Payment Link, lien PayPal, URL du BDC Systeme.io).
    if (body?.checkout_urls && typeof body.checkout_urls === "object") {
      const next: Record<string, { stripe?: string; paypal?: string; sio?: string }> = {};
      for (const key of CHECKOUT_PLAN_KEYS) {
        const value = (body.checkout_urls as Record<string, unknown>)[key];
        if (!value || typeof value !== "object") continue;
        const entry: { stripe?: string; paypal?: string; sio?: string } = {};
        for (const kind of ["stripe", "paypal", "sio"] as const) {
          const url = (value as Record<string, unknown>)[kind];
          if (url === undefined || url === null || url === "") continue;
          if (typeof url !== "string" || !isValidHttpsUrl(url.trim())) {
            return NextResponse.json(
              { ok: false, error: "invalid_url", plan: key, kind },
              { status: 400 },
            );
          }
          entry[kind] = url.trim();
        }
        if (Object.keys(entry).length > 0) next[key] = entry;
      }
      updates.checkout_urls = next;
      actions.push("update_checkout_urls");
    }

    // 2. Tarifs : label affiché sur le bon de commande hébergé (texte
    //    libre) + montant déclaré en euros (base du calcul de commission,
    //    stocké en centimes). Le montant réel encaissé reste celui de sa
    //    page de paiement.
    if (body?.pricing && typeof body.pricing === "object") {
      const next: Record<string, { label?: string; amount_cents?: number }> = {};
      for (const key of CHECKOUT_PLAN_KEYS) {
        const value = (body.pricing as Record<string, unknown>)[key];
        if (!value || typeof value !== "object") continue;
        const { label, amount } = value as { label?: unknown; amount?: unknown };
        const entry: { label?: string; amount_cents?: number } = {};

        if (label !== undefined && label !== null && label !== "") {
          if (typeof label !== "string" || label.trim().length > 80) {
            return NextResponse.json(
              { ok: false, error: "invalid_price", plan: key },
              { status: 400 },
            );
          }
          entry.label = label.trim();
        }

        if (amount !== undefined && amount !== null && amount !== "") {
          const parsed =
            typeof amount === "number" ? amount : Number(String(amount).replace(",", "."));
          if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000) {
            return NextResponse.json(
              { ok: false, error: "invalid_amount", plan: key },
              { status: 400 },
            );
          }
          entry.amount_cents = Math.round(parsed * 100);
        }

        if (Object.keys(entry).length > 0) next[key] = entry;
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
