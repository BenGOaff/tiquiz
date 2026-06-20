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
  // handle lu separement : si la migration n'est pas passee, on degrade
  // sans casser (handle null) au lieu de planter toute la session.
  const { data: extra } = await supabaseAdmin
    .from("resellers")
    .select("handle")
    .eq("id", session.reseller.id)
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    checkout_urls: session.reseller.checkout_urls ?? {},
    pricing: session.reseller.pricing ?? {},
    webhook_token: session.reseller.webhook_token ?? null,
    slug: session.reseller.slug ?? null,
    handle: (extra as { handle?: string | null } | null)?.handle ?? null,
    support_email: session.reseller.support_email ?? null,
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
          if (typeof label !== "string") {
            return NextResponse.json(
              { ok: false, error: "invalid_price", plan: key },
              { status: 400 },
            );
          }
          // Tolérant : on tronque au lieu de bloquer toute la sauvegarde.
          entry.label = label.trim().slice(0, 80);
        }

        if (amount !== undefined && amount !== null && amount !== "") {
          // Parsing tolérant : un revendeur tape souvent "19,90 €", "1 999"
          // ou "19.90€". On retire devise et espaces, on gère la virgule
          // décimale FR (et le point comme séparateur de milliers quand les
          // deux sont présents). Sinon Number() renvoyait NaN -> rejet ->
          // "Une erreur est survenue" opaque (drame Sebastien 15 juin 2026).
          let parsed: number;
          if (typeof amount === "number") {
            parsed = amount;
          } else {
            let raw = String(amount).trim().replace(/[^\d.,-]/g, "");
            if (raw.includes(",") && raw.includes(".")) raw = raw.replace(/\./g, "");
            raw = raw.replace(",", ".");
            parsed = Number(raw);
          }
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

    // 3. Contact support du revendeur : affiché dans les emails d'accès
    //    de ses clients (reply-to). Chaîne vide = retour au template
    //    Supabase par défaut.
    if (body?.support_email !== undefined) {
      const raw = body.support_email;
      if (raw === null || raw === "") {
        updates.support_email = null;
        actions.push("update_support_email");
      } else if (
        typeof raw === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim()) &&
        raw.trim().length <= 120
      ) {
        updates.support_email = raw.trim().toLowerCase();
        actions.push("update_support_email");
      } else {
        return NextResponse.json({ ok: false, error: "invalid_support_email" }, { status: 400 });
      }
    }

    // 3b. Handle de la page de vente (/<handle>/tiquiz) : a-z 0-9 et
    //     tirets, 3 a 40 caracteres, unique. On normalise avant de tester.
    if (body?.handle !== undefined) {
      const raw = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
      const normalized = raw.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (normalized.length < 3 || normalized.length > 40) {
        return NextResponse.json({ ok: false, error: "invalid_handle" }, { status: 400 });
      }
      // Unicite (hors sa propre ligne).
      const { data: clash } = await supabaseAdmin
        .from("resellers")
        .select("id")
        .eq("handle", normalized)
        .neq("id", session.reseller.id)
        .maybeSingle();
      if (clash) {
        return NextResponse.json({ ok: false, error: "handle_taken" }, { status: 409 });
      }
      updates.handle = normalized;
      actions.push("update_handle");
    }

    // 4. Rotation du secret webhook (si le token a fuité).
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
      .select("checkout_urls,pricing,webhook_token,slug,handle,support_email")
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
      handle: updated.handle ?? null,
      support_email: updated.support_email ?? null,
    });
  } catch (e) {
    // Log complet (message + details + code + hint Supabase) pour pouvoir
    // diagnostiquer un echec specifique a un compte sans deviner.
    console.error("[reseller/settings] PUT failed", JSON.stringify(e));
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
