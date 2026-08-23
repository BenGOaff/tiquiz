// app/api/commande/paypal/route.ts
//
// OUVRIR UN PAIEMENT PAYPAL DEPUIS LE BON DE COMMANDE.
//
//   POST { produit, email, k?, ref? }  ->  { ok: true, approveUrl, mode }
//                                      ->  { ok: false, reason }
//
// Jumeau du bouton PayPal de l'Atelier, avec une différence de fond :
// l'Atelier vend un achat unique (API Orders), Tiquiz vend un ABONNEMENT
// (API Subscriptions). Voir `lib/checkout/paypalOwner.ts`.
//
// -- POURQUOI L'ADRESSE EST DEMANDÉE AVANT ------------------------------
//
// Stripe la collecte dans son formulaire. PayPal, lui, emmène l'acheteur
// chez lui et nous rendra l'adresse de SON COMPTE PayPal, qui n'est pas
// toujours celle qu'il utilise chez nous. On la demande donc avant, et
// c'est celle-là qui ouvrira l'accès.

import { NextRequest, NextResponse } from "next/server";

import { findOwnerProduct } from "@/lib/checkout/catalog";
import {
  readOwnerPaypal,
  readOwnerPaypalWebhookId,
} from "@/lib/checkout/ownerAccount";
import { createOwnerPaypalSubscription } from "@/lib/checkout/paypalOwner";
import { checkoutReturnBase } from "@/lib/sales/salesHosts";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { resolveAppUrl } from "@/lib/authLinks";
import { readSa } from "@/lib/affiliate/sa";
import { essaiPourCeCheckout } from "@/lib/trial/moisOffertCheckout";
import { lienOuvreLeMoisOffert, MO_COOKIE } from "@/lib/affiliate/moisOffertLien";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { produit?: string; email?: string; k?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!isSalesOpen(body.k, req.headers.get("host"), process.env)) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const product = findOwnerProduct(body.produit);
  if (!product) {
    return NextResponse.json({ ok: false, reason: "unknown_product" }, { status: 404 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }

  const compte = readOwnerPaypal(process.env);
  if (!compte) {
    console.error(
      "[commande/paypal] PAYPAL_CLIENT_ID_OWNER / PAYPAL_SECRET_OWNER absents ou invalides : " +
        "aucun paiement PayPal possible.",
    );
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // ON N'ENCAISSE PAS DE VRAI ARGENT TANT QUE RIEN N'OUVRE L'ACCÈS.
  //
  // Sans identifiant de webhook, aucune confirmation de PayPal ne peut
  // être vérifiée, donc un vrai abonnement serait prélevé et l'acheteur
  // n'aurait rien. C'est la même règle que le secret du webhook Stripe,
  // et pour la même raison. En bac à sable on laisse passer : personne
  // n'est débité.
  if (compte.mode === "live" && !readOwnerPaypalWebhookId(process.env)) {
    console.error(
      "[commande/paypal] compte LIVE sans PAYPAL_WEBHOOK_ID_OWNER : paiement refuse, " +
        "sinon un abonnement serait preleve sans ouvrir d'acces.",
    );
    return NextResponse.json({ ok: false, reason: "live_without_webhook" }, { status: 503 });
  }

  // ON RAMÈNE L'ACHETEUR LÀ OÙ IL A ACHETÉ. `checkoutReturnBase` n'accepte
  // que NOS domaines de vente, donc un Host falsifié ne détourne rien.
  const base = checkoutReturnBase(req.nextUrl.origin, resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin));
  const cle = encodeURIComponent(String(body.k ?? ""));
  const retour = `${base}/commande/${product.id}/retour?k=${cle}`;

  // Le mois offert, exactement comme sur le formulaire carte. Ici on
  // connait l'adresse (elle est demandee avant), donc le controle du
  // non-cumul est complet AVANT le paiement.
  const essai = await essaiPourCeCheckout({
    sa: readSa(body.ref),
    // Meme lecture que sur le formulaire carte : le marqueur vient du
    // COOKIE pose par le middleware, jamais du corps de la requete.
    lienCourant: lienOuvreLeMoisOffert(readSa(body.ref), req.cookies.get(MO_COOKIE)?.value),
    email,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  if (essai.jours > 0) {
    console.log(
      `[commande/paypal] ${essai.jours} jours offerts sur ${product.id}` +
        (essai.signale ? ` A VERIFIER : ${essai.signale}` : ""),
    );
  }

  const result = await createOwnerPaypalSubscription({
    compte,
    product,
    email,
    trialDays: essai.jours,
    returnUrl: retour,
    // Annuler ramène au bon de commande, pas sur un cul-de-sac.
    cancelUrl: `${base}/commande/${product.id}?k=${cle}`,
    // `readSa` et pas un `slice()` : une valeur tronquée garde la FORME
    // d'un identifiant valide, passe tous les contrôles, et ne désigne
    // personne. La commission serait perdue en silence.
    affiliateRef: readSa(body.ref),
  });

  if (!result.ok || !result.approveUrl) {
    console.error(
      `[commande/paypal] PayPal a refuse : ${result.reason} / ${result.detail ?? ""}`,
    );
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    approveUrl: result.approveUrl,
    // L'écran DOIT pouvoir dire "bac à sable" : un paiement PayPal de
    // test ressemble trait pour trait à une vraie vente.
    mode: compte.mode,
  });
}
