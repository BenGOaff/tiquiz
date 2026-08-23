// app/api/admin/ventes/rembourser/route.ts
//
// REMBOURSER DEPUIS NOTRE ADMIN, SANS OUVRIR STRIPE NI PAYPAL.
//
//   POST { ref, provider }  ->  { ok: true }
//                           ->  { ok: false, reason }
//
// -- CE QUE CETTE ROUTE NE FAIT PAS, ET C'EST VOULU --------------------
//
// **Elle ne révoque aucun accès et n'envoie aucun email.** Elle demande
// le remboursement au fournisseur, et c'est tout.
//
// La fermeture de l'accès et l'email d'au revoir sont accrochés au
// webhook (`charge.refunded` chez Stripe, `PAYMENT.CAPTURE.REFUNDED`
// chez PayPal), qui part de toute façon, que le remboursement ait été
// déclenché ici ou depuis le tableau de bord du fournisseur.
//
// Le faire AUSSI ici donnerait deux chemins pour une même décision, et
// c'est le défaut que ce dépôt paie le plus cher : deux endroits qui
// décident la même chose finissent par se contredire. Ici la
// contradiction serait un accès coupé sans email, ou un email envoyé
// deux fois.
//
// Conséquence assumée : entre le clic et la fermeture de l'accès, il
// s'écoule le temps d'un aller-retour de webhook. Quelques secondes.
//
// Sur Tiquiz, seul Stripe encaisse pour l'instant.
//
// -- REMBOURSEMENT TOTAL UNIQUEMENT ------------------------------------
//
// Un remboursement partiel ne coupe pas l'accès (cf.
// `lib/checkout/refund.ts`). Proposer ici un geste dont la conséquence
// change selon le montant serait un piège pour celle qui clique. Le
// partiel se fait chez le fournisseur, en connaissance de cause.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API = "https://api.stripe.com";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let body: { ref?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const ref = String(body.ref ?? "").trim();
  const provider = String(body.provider ?? "").trim();
  // PayPal n'encaisse pas encore pour Tiquiz : refuser explicitement vaut
  // mieux que d'appeler une API qui n'est pas branchee.
  if (!ref || provider !== "stripe") {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });

  try {
    const res = await fetch(`${STRIPE_API}/v1/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${compte.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // UN `ch_` SE REMBOURSE AUSSI BIEN QU'UN `pi_`.
      //
      // Sur un abonnement, la facture ne porte pas toujours de
      // PaymentIntent : certaines ne donnent qu'une charge. Envoyer une
      // charge sous le nom `payment_intent` fait répondre Stripe "no
      // such payment_intent", et l'écran dirait "le fournisseur a
      // refusé" pour une vente parfaitement remboursable.
      body: `${ref.startsWith("ch_") ? "charge" : "payment_intent"}=${encodeURIComponent(ref)}`,
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!res.ok) {
      const detail = json.error?.message ?? `HTTP ${res.status}`;
      console.error(`[admin/rembourser] Stripe a refuse ${ref} : ${detail}`);
      // LA CAUSE LA PLUS PROBABLE EST UNE PERMISSION MANQUANTE.
      //
      // La clé restreinte doit avoir "Remboursements" en ÉCRITURE. Sans
      // ça Stripe répond 403, et un message générique enverrait Béné
      // chercher un bug dans le code alors que tout se règle en deux
      // clics dans son tableau de bord. Le serveur renvoie la RAISON,
      // l'écran sait comment le dire.
      const manquePermission = res.status === 403 || /permission|not have access/i.test(detail);
      return NextResponse.json(
        { ok: false, reason: manquePermission ? "missing_permission" : "provider_refused" },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error(`[admin/rembourser] reseau : ${(e as Error).message}`);
    return NextResponse.json({ ok: false, reason: "network" }, { status: 502 });
  }

  console.log(`[admin/rembourser] ${user.email} a rembourse le paiement Stripe ${ref}`);
  return NextResponse.json({ ok: true });
}
