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
import { readRef } from "@/lib/affiliate/refLien";
import { essaiPourCeCheckout } from "@/lib/trial/moisOffertCheckout";
import {
  planDuCheckout,
  verifierCodeReduction,
  type Avantage,
} from "@/lib/checkout/codeReduction";
import { lireAcheteur } from "@/lib/facture/identite";
import { ecrireFacturation } from "@/lib/facture/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: {
    produit?: string;
    email?: string;
    k?: string;
    ref?: string;
    sa?: string;
    code?: string;
    facturation?: unknown;
  };
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
  // Meme regle que sur le formulaire carte : le cadeau s'ouvre sur un
  // `?ref=` (nos liens), jamais sur un `?sa=` (anciens tunnels
  // Systeme.io, qui commissionnent comme avant).
  const essai = await essaiPourCeCheckout({
    ref: readRef(body.ref),
    email,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  if (essai.jours > 0) {
    console.log(
      `[commande/paypal] ${essai.jours} jours offerts sur ${product.id}` +
        (essai.signale ? ` A VERIFIER : ${essai.signale}` : ""),
    );
  }

  // ON ENREGISTRE LA FACTURATION AVANT D'OUVRIR PAYPAL.
  //
  // Le webhook émettra la facture au premier encaissement, et il ne
  // saura la relire que par l'adresse email. L'écrire après le retour de
  // PayPal serait trop tard : l'acheteur qui ferme son onglet a payé
  // quand même, et sa facture n'aurait aucune adresse.
  //
  // **On n'échoue jamais ici.** Une écriture refusée ne doit pas empêcher
  // d'encaisser : la facture sortira marquée "à compléter", ce qui se
  // rattrape depuis la fiche client, alors qu'une vente perdue ne se
  // rattrape pas.
  if (body.facturation) {
    const ecrit = await ecrireFacturation({
      email,
      acheteur: { ...lireAcheteur(body.facturation), email },
      source: "checkout",
    });
    if (!ecrit.ok) {
      console.error(
        `[commande/paypal] facturation NON enregistree pour ${email} (${ecrit.reason}) : ` +
          `la facture sortira incomplete.`,
      );
    }
  }

  // L'AVANTAGE DU CODE, EXACTEMENT COMME SUR LA CARTE.
  //
  // Les deux moyens de paiement doivent facturer la même chose : un code
  // qui marche par carte et pas par PayPal, c'est un bon de commande qui
  // ment sur l'un des deux, et une réclamation le lendemain.
  //
  // Une différence assumée : PayPal exprime TOUT en cycles de
  // facturation, donc il n'a pas besoin de la remise différée de Stripe.
  // Le cycle d'essai puis le cycle remisé se suivent naturellement, et
  // `plan.differee` s'applique ici comme une remise ordinaire.
  let avantage: Avantage | null = null;
  let codeApplique = "";
  const codeSaisi = String(body.code ?? "").trim();
  if (codeSaisi) {
    const verdict = await verifierCodeReduction({
      code: codeSaisi,
      produit: product.id,
      ref: readRef(body.ref) ?? null,
      sa: readSa(body.sa) ?? null,
    });
    if (verdict.valide) {
      avantage = verdict.avantage;
      codeApplique = verdict.code;
    }
  }
  const plan = planDuCheckout({ joursOfferts: essai.jours, avantage });
  const remisePaypal = plan.coupon ?? plan.differee;

  const result = await createOwnerPaypalSubscription({
    compte,
    product,
    email,
    trialDays: plan.jours,
    remise: remisePaypal ? { ...remisePaypal, code: codeApplique } : null,
    returnUrl: retour,
    // Annuler ramène au bon de commande, pas sur un cul-de-sac.
    cancelUrl: `${base}/commande/${product.id}?k=${cle}`,
    // `readRef` / `readSa` et pas un `slice()` : une valeur tronquée
    // garde la FORME d'un identifiant valide, passe tous les contrôles,
    // et ne désigne personne. La commission serait perdue en silence.
    affiliateCode: readRef(body.ref),
    affiliateRef: readSa(body.sa),
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
