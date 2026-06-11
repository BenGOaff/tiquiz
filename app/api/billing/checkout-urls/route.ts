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
    .select("status,checkout_urls")
    .eq("id", resellerId)
    .maybeSingle();

  const urls =
    reseller && reseller.status === "active"
      ? ((reseller.checkout_urls ?? {}) as Record<string, string>)
      : {};

  return NextResponse.json({ ok: true, managed: true, urls });
}
