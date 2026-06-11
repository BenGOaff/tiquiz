// app/api/billing/checkout-urls/route.ts
//
// GET : URLs de checkout applicables au user CONNECTÉ pour l'onglet
// Réglages -> Abonnement.
//
// - Client direct Tiquiz (reseller_id NULL) : managed=false, le client
//   utilise les BDC tipote.fr par défaut (hardcodés dans SettingsClient).
// - Client d'un revendeur : managed=true + les URLs de SON revendeur.
//   RÈGLE CRITIQUE (Béné 11 juin 2026) : JAMAIS de fallback vers les
//   BDC tipote.fr pour un client de revendeur. Un plan sans URL
//   configurée par le revendeur = pas de CTA. Sinon le client payerait
//   Béné au lieu de payer son revendeur.
// - Revendeur suspendu : managed=true avec URLs vides (aucun achat
//   possible le temps que Béné tranche, ni chez lui ni chez elle).

import { NextResponse } from "next/server";

import { normalizePlanPayment } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // reseller_id peut ne pas exister tant que la migration n'est pas
  // appliquée : soft-fail vers managed=false (comportement actuel).
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("reseller_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const resellerId = !error
    ? ((profile as { reseller_id?: string | null } | null)?.reseller_id ?? null)
    : null;

  if (!resellerId) {
    return NextResponse.json({ ok: true, managed: false, urls: {} });
  }

  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("status,checkout_urls,slug")
    .eq("id", resellerId)
    .maybeSingle();

  // Résolution par plan, dans l'ordre :
  // 1. BDC Systeme.io du revendeur (s'il en a configuré un)
  // 2. BDC Tiquiz hébergé (/order/<slug>/<plan>) si Stripe ou PayPal
  //    est connecté
  // 3. rien (pas de CTA, JAMAIS de fallback vers les BDC tipote.fr)
  const urls: Record<string, string> = {};
  if (reseller && reseller.status === "active") {
    const config = (reseller.checkout_urls ?? {}) as Record<string, unknown>;
    const slug = (reseller as { slug?: string | null }).slug ?? null;
    for (const [plan, raw] of Object.entries(config)) {
      const p = normalizePlanPayment(
        raw as { stripe?: string; paypal?: string; sio?: string } | string | undefined,
      );
      if (p.sio) {
        urls[plan] = p.sio;
      } else if ((p.stripe || p.paypal) && slug) {
        urls[plan] = `/order/${slug}/${plan}`;
      }
    }
  }

  return NextResponse.json({ ok: true, managed: true, urls });
}
