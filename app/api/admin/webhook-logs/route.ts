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
import { readCallKind, readCallVerdict } from "@/lib/admin/webhookRows";
import { readSioAmountCents } from "@/lib/admin/sioSales";
import { readPricePlan } from "@/lib/sio/pricePlans";
import {
  OFFER_ID_PATHS,
  PAID_AMOUNT_PATHS,
  URL_PATHS,
  extractStr,
  inferPlanFromOfferId,
  inferPlanFromUrl,
} from "@/lib/sio/webhookInference";

export const dynamic = "force-dynamic";

/**
 * Les chemins viennent de `webhookInference`, PAS d'une copie locale.
 *
 * Cette route en gardait ses propres exemplaires. Deux listes qui disent
 * la même chose finissent toujours par diverger, et cet écran sert
 * précisément à diagnostiquer le routage : le jour où elles se
 * séparent, il annonce un plan que le webhook n'aurait pas choisi. C'est
 * le drame de l'URL de l'Atelier (3 août), transposé.
 */
const EMAIL_PATHS = [
  "customer.email", "data.customer.email",
  "contact.email", "data.contact.email",
  "email",
] as const;

const pick = extractStr;

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
    const source = (r as { source: string | null }).source;
    const eventType = (r as { event_type: string | null }).event_type;
    const status = (r as { status: string | null }).status;
    const sourceUrl = pick(p, URL_PATHS);
    const offerId = pick(p, OFFER_ID_PATHS);
    const kind = readCallKind(source);
    // Ce que la table de routage répondrait AUJOURD'HUI sur cette ligne.
    // Sur un appel refusé hier, ça dit tout de suite si le correctif
    // déployé depuis suffit, sans refaire un achat pour le savoir.
    const planNow = inferPlanFromUrl(sourceUrl) ?? inferPlanFromOfferId(offerId);
    // Le montant encaisse d'abord ; a defaut le tarif du plan, lu dans
    // son compte Systeme.io. La PROVENANCE part avec, sinon l'ecran ne
    // peut pas distinguer une somme reelle d'un ordre de grandeur.
    const duPayload = readSioAmountCents(pick(p, PAID_AMOUNT_PATHS));
    const tarif = duPayload == null ? readPricePlan(offerId) : null;
    const montantCents = duPayload ?? tarif?.montantCents ?? null;
    const montantSource: "payload" | "plan" | "inconnu" =
      duPayload != null ? "payload" : tarif ? "plan" : "inconnu";

    return {
      id: (r as { id: string }).id,
      source,
      eventType,
      status,
      error: (r as { error: string | null }).error,
      receivedAt: (r as { received_at: string }).received_at,
      email: pick(p, EMAIL_PATHS),
      sourceUrl,
      offerId,
      kind,
      planNow,
      // Le verdict est calculé ICI, avec la même fonction que le test.
      // L'écran ne fait que le traduire : il ne recalcule rien, sinon il
      // finit toujours par mentir (six fois dans ce dépôt).
      verdict: readCallVerdict({ source, eventType, status, error: (r as { error: string | null }).error, planNow }),
      montantCents,
      montantSource,
      planNom: tarif?.nom ?? null,
    };
  });

  return NextResponse.json({ ok: true, rows });
}
