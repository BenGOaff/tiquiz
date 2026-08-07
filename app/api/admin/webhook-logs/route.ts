// app/api/admin/webhook-logs/route.ts
//
// LES DERNIERS APPELS DE SYSTEME.IO, LISIBLES.
//
// -- POURQUOI CET ÉCRAN EXISTE (drame Ivan, 7 août 2026) ---------------
//
// Ivan paie son abonnement, son compte reste en gratuit. Pour comprendre,
// il fallait répondre à UNE question : est-ce que l'appel de Systeme.io
// est arrivé jusqu'à nous ?
//
//   - il est arrivé et on l'a refusé -> le bon de commande n'est pas
//     reconnu, c'est la table de routage qu'il faut compléter ;
//   - il n'est jamais arrivé -> le webhook n'est pas posé sur ce bon de
//     commande, et aucune ligne de code ne peut le rattraper.
//
// Les deux se corrigent à des endroits opposés, et rien dans l'app ne
// permettait de les distinguer : la réponse dormait dans `webhook_logs`,
// c'est à dire dans Supabase, c'est à dire nulle part pour Béné.
//
// Cet écran ne remplace pas l'alerte email (qui, elle, ne part QUE si
// l'appel arrive). Il répond à la question que l'alerte ne peut pas poser :
// "et s'il n'est jamais arrivé ?"
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminEmail } from "@/lib/adminEmails";
import { inferPlanFromOfferId, inferPlanFromUrl } from "@/lib/sio/webhookInference";

export const dynamic = "force-dynamic";

/** Premier chemin non vide, comme le webhook lui-même. */
function deepGet(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]),
    obj,
  );
}
function pick(body: unknown, paths: readonly string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

const EMAIL_PATHS = [
  "customer.email", "data.customer.email",
  "contact.email", "data.contact.email",
  "email",
] as const;
const URL_PATHS = [
  "funnel.url", "data.funnel.url",
  "funnel_step.url", "data.funnel_step.url",
  "order.source_url", "data.order.source_url",
  "source_url", "data.source_url",
  "checkout_url", "data.checkout_url", "data.order.checkout_url",
  "order.funnel.url", "data.order.funnel.url",
  "order.funnel_step.url", "data.order.funnel_step.url",
] as const;
const OFFER_PATHS = [
  "pricePlan.id", "data.pricePlan.id",
  "data.offer_price_plan.id", "data.offer_price.id",
  "product_id",
] as const;

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 40) || 40, 200);
  const { data, error } = await supabaseAdmin
    .from("webhook_logs")
    .select("id, source, event_type, event_id, status, error, payload, received_at")
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // On extrait de quoi COMPRENDRE sans ouvrir le JSON : l'adresse, l'URL
  // du tunnel, l'identifiant d'offre, et ce que le routage en aurait fait.
  // Le payload brut n'est PAS renvoyé : il contient des données client, et
  // cet écran sert à diagnostiquer, pas à tout étaler.
  const rows = (data ?? []).map((r) => {
    const p = (r as { payload?: unknown }).payload;
    const sourceUrl = pick(p, URL_PATHS);
    const offerId = pick(p, OFFER_PATHS);
    return {
      id: (r as { id: string }).id,
      source: (r as { source: string | null }).source,
      eventType: (r as { event_type: string | null }).event_type,
      status: (r as { status: string | null }).status,
      error: (r as { error: string | null }).error,
      receivedAt: (r as { received_at: string }).received_at,
      email: pick(p, EMAIL_PATHS),
      sourceUrl,
      offerId,
      // Ce que la table de routage répondrait AUJOURD'HUI sur cette ligne.
      // Sur un appel refusé hier, ça dit tout de suite si le correctif
      // déployé depuis suffit, sans refaire un achat pour le savoir.
      planNow: inferPlanFromUrl(sourceUrl) ?? inferPlanFromOfferId(offerId),
    };
  });

  return NextResponse.json({ ok: true, rows });
}
