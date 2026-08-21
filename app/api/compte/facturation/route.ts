// app/api/compte/facturation/route.ts
//
// L'ABONNÉ OUVRE SON PORTAIL STRIPE.
//
//   POST {}  ->  { ok: true, url }
//            ->  { ok: false, reason }
//
// Béné, 21 août : "on peut aussi permettre aux users de modifier leur
// mode de paiement ? Genre ils veulent payer avec une autre carte ?"
//
// Cette route ne construit AUCUN formulaire de carte : elle ouvre le
// portail client de Stripe, qui fait déjà tout (changer de carte, voir
// ses factures, résilier), en français, à jour tout seul, et sans nous
// mettre la conformité PCI sur les bras. Voir l'en-tête de
// `lib/checkout/billingPortal.ts`.
//
// -- LE PORTAIL EST PERSONNEL : ON NE FAIT CONFIANCE À RIEN -------------
//
// L'identifiant du client Stripe n'est JAMAIS lu depuis la requête. Il
// est relu en base à partir de la session authentifiée. Sinon, n'importe
// qui pourrait ouvrir le portail de n'importe qui en envoyant un
// `cus_...` : les factures, l'adresse et la carte d'un autre.
//
// C'est la même règle que le prix du bon de commande, qui vient du
// catalogue et jamais du navigateur : un prix reçu du client serait un
// prix négociable par le client.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { readStripeCustomerId } from "@/lib/checkout/customerLink";
import { createBillingPortalSession } from "@/lib/checkout/billingPortal";
import { resolveAppUrl } from "@/lib/authLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "not_signed_in" }, { status: 401 });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) {
    console.error("[compte/facturation] STRIPE_SECRET_KEY_OWNER absente : portail impossible.");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const customerId = await readStripeCustomerId(user.id);
  if (!customerId) {
    // PAS UNE PANNE, ET LE MESSAGE DOIT LE DIRE.
    //
    // Les clients arrivés par Systeme.io ont leur abonnement chez
    // Systeme.io : leur carte se change là-bas. Leur afficher une erreur
    // les enverrait chercher au mauvais endroit, ce qui coûte plus cher
    // que le probleme lui-meme (regle du 3 aout sur les `ok: false`).
    return NextResponse.json({ ok: false, reason: "no_customer" }, { status: 404 });
  }

  let locale: string | undefined;
  try {
    const body = (await req.json()) as { locale?: string };
    locale = typeof body?.locale === "string" ? body.locale : undefined;
  } catch {
    // Corps absent : ce n'est pas une erreur, le portail choisira
    // d'apres le navigateur.
  }

  const resultat = await createBillingPortalSession({
    key: compte.key,
    customerId,
    // On le ramene sur ses reglages, la ou il a clique.
    returnUrl: `${resolveAppUrl(req.nextUrl.origin)}/settings`,
    locale,
  });

  if (!resultat.ok || !resultat.url) {
    console.error(
      `[compte/facturation] portail refuse : ${resultat.reason} / ${resultat.detail ?? ""}`,
    );
    // 502 : ce n'est pas la requete de l'abonne qui est en cause.
    return NextResponse.json({ ok: false, reason: resultat.reason }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url: resultat.url });
}
