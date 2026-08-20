// app/api/commande/webhook/route.ts
//
// STRIPE NOUS DIT QUE L'ARGENT EST RENTRÉ. ON OUVRE LE PLAN.
//
// Jumeau du webhook de l'Atelier, avec `grantPlanByEmail` à la place de
// `grantAccessByEmail`. Les quatre garanties sont les mêmes, et elles ont
// toutes un drame derrière elles :
//
// 1. **La signature**, vérifiée sur le corps BRUT, avant tout parsing.
//    Sans elle, cette adresse distribue des abonnements gratuits à qui
//    la connaît.
// 2. **L'idempotence**, avant toute ouverture. Stripe réessaie tant qu'il
//    n'a pas un 2xx : un même événement ne doit ouvrir le plan qu'une
//    fois. C'est la base qui tranche, via l'index unique
//    `(source, event_id)` de `webhook_logs`.
// 3. **On relit la vente chez Stripe** au lieu de croire le corps reçu.
//    La signature prouve l'expéditeur, pas la fraîcheur de l'objet.
// 4. **Le plan vient du catalogue**, jamais d'une devinette. C'est toute
//    la différence avec le routage Systeme.io, qui doit deviner parce
//    qu'il reçoit un paiement qu'il n'a pas déclenché.
//
// On répond 200 même quand on n'a rien fait : un 500 sur un cas compris
// et écarté déclencherait des réessais en boucle. On ne renvoie une
// erreur que sur une VRAIE panne, où le réessai est ce qu'on veut.

import { NextRequest, NextResponse } from "next/server";

import { findOwnerProduct } from "@/lib/checkout/catalog";
import { downgradeToFreeByEmail, grantPlanByEmail } from "@/lib/checkout/grantPlan";
import { readRefundOutcome } from "@/lib/checkout/refund";
import { sendRefundGoodbyeEmail } from "@/lib/email/refundGoodbyeEmail";
import { readOwnerStripe, readOwnerStripeWebhookSecret } from "@/lib/checkout/ownerAccount";
import {
  retrieveOwnerSession,
  retrieveOwnerSessionByPaymentIntent,
  verifyStripeSignature,
} from "@/lib/checkout/stripeCheckout";
import { logWebhookEvent } from "@/lib/webhooks/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La source du journal, distincte de celle de Systeme.io. */
const SOURCE = "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Le corps BRUT d'abord : la signature porte sur les octets reçus.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const secret = readOwnerStripeWebhookSecret(process.env);
  if (!secret) {
    console.error(
      "[commande/webhook] STRIPE_WEBHOOK_SECRET_OWNER absent : impossible de verifier quoi que ce soit, on refuse.",
    );
    // 503 et pas 200 : Stripe réessaiera, et une fois le secret posé les
    // ventes de l'intervalle rentreront toutes seules.
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    console.warn("[commande/webhook] signature refusee");
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let event: RawEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const eventId = String(event.id ?? "").trim() || null;
  const eventType = String(event.type ?? "").trim() || null;

  const { duplicate } = await logWebhookEvent({
    source: SOURCE,
    event_id: eventId,
    event_type: eventType,
    payload: event,
    status: "received",
  });
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // ── L'ARGENT REPART : ON FERME, ET ON LE DIT BIEN ──
  //
  // Béné, 20 août : "si je rembourse, l'accès est coupé ou pas ? L'user
  // reçoit quelle info ?" Avant ce bloc : non, et rien de nous. Sur un
  // abonnement, ça voulait dire garder le plan payant sans le payer.
  if (eventType === "charge.refunded") {
    return await surRemboursement(event);
  }

  // Les deux événements qui veulent dire "l'argent est là". Le second
  // couvre les paiements différés, confirmés APRÈS la session.
  const encaisse =
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded";
  if (!encaisse) {
    // On ne devine JAMAIS qu'un événement inconnu vaut un paiement.
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const sessionId = String(event.data?.object?.id ?? "").trim();
  if (!sessionId) {
    console.error("[commande/webhook] evenement de paiement sans identifiant de session");
    return NextResponse.json({ ok: true, reason: "no_session" });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) {
    console.error("[commande/webhook] STRIPE_SECRET_KEY_OWNER absente : impossible de relire la vente.");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const vente = await retrieveOwnerSession(compte.key, sessionId);
  if (!vente) {
    console.error(`[commande/webhook] session ${sessionId} illisible chez Stripe`);
    return NextResponse.json({ ok: false, reason: "unreadable_session" }, { status: 502 });
  }

  if (!vente.paid) {
    return NextResponse.json({ ok: true, reason: "not_paid_yet" });
  }
  if (!vente.email) {
    console.error(`[commande/webhook] vente ${sessionId} PAYEE mais sans email : acces impossible`);
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  const product = findOwnerProduct(vente.productId);
  if (!product) {
    // Une vente encaissée dont on ne sait pas nommer le produit. On
    // n'invente pas de plan, mais on ne se tait pas non plus : c'est la
    // situation exacte d'Ivan, et elle appelle une action humaine.
    console.error(
      `[commande/webhook] vente ${sessionId} PAYEE pour un produit inconnu (${vente.productId}) : ` +
        `plan NON ouvert, intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "unknown_product" });
  }

  const octroi = await grantPlanByEmail({
    email: vente.email,
    plan: product.plan,
    source: product.source,
    reference: sessionId,
    requestOrigin: req.nextUrl.origin,
  });

  if (!octroi.ok) {
    console.error(
      `[commande/webhook] plan NON ouvert pour ${vente.email} (${octroi.reason ?? "raison inconnue"})`,
    );
    // 502 : on VEUT que Stripe réessaie, parce qu'un client a payé.
    return NextResponse.json({ ok: false, reason: octroi.reason ?? "grant_failed" }, { status: 502 });
  }

  console.log(
    `[commande/webhook] plan ouvert pour ${vente.email} : ${product.id} (${product.plan}), ` +
      `compte ${octroi.created ? "cree" : "existant"}, lien de connexion ${octroi.loginLinkSent ? "envoye" : "NON ENVOYE"}`,
  );
  return NextResponse.json({ ok: true, granted: true });
}

/** La forme d'un evenement Stripe, reduite a ce qu'on lit. */
interface RawEvent {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      amount?: number | null;
      amount_refunded?: number | null;
      refunded?: boolean | null;
      payment_intent?: string | null;
      billing_details?: { email?: string | null; name?: string | null } | null;
    };
  };
}

/**
 * UN REMBOURSEMENT TOTAL RETIRE LE PLAN. UN REMBOURSEMENT PARTIEL, NON.
 *
 * La distinction n'est pas theorique : un geste commercial de 5 EUR sur
 * un abonnement a 17 EUR mettrait dehors quelqu'un qui a paye 12 EUR pour
 * rester dedans. La decision vit dans `readRefundOutcome`, testee, et
 * personne ne la reecrit ici.
 *
 * On repond 200 dans tous les cas compris, y compris quand on ne fait
 * rien : un 500 sur un cas ecarte declencherait des reessais en boucle.
 */
async function surRemboursement(event: RawEvent): Promise<NextResponse> {
  const charge = event.data?.object ?? null;
  const issue = readRefundOutcome(charge);
  if (issue !== "full") {
    console.log(`[commande/webhook] remboursement ${issue} : plan conserve`);
    return NextResponse.json({ ok: true, refund: issue });
  }

  const compte = readOwnerStripe(process.env);
  const paymentIntent = String(charge?.payment_intent ?? "").trim();

  // L'adresse de la VENTE d'abord : c'est elle qui a recu les acces.
  // `billing_details.email` est l'adresse de facturation de la carte, qui
  // peut etre celle du conjoint, de l'entreprise, ou vide. On ne retire
  // pas un plan sur cette base la, on s'en sert seulement en dernier
  // recours pour ne pas rester muet.
  const vente =
    compte && paymentIntent
      ? await retrieveOwnerSessionByPaymentIntent(compte.key, paymentIntent)
      : null;
  const email = vente?.email ?? charge?.billing_details?.email ?? null;
  const prenom = vente?.name ?? charge?.billing_details?.name ?? null;

  if (!email) {
    console.error(
      "[commande/webhook] remboursement TOTAL sans adresse retrouvee : plan NON retire, " +
        `paiement ${paymentIntent || "inconnu"}. Intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  const sortie = await downgradeToFreeByEmail({
    email,
    source: "stripe_refund",
    reference: paymentIntent || null,
  });
  if (!sortie.ok) {
    console.error(`[commande/webhook] retrogradation impossible pour ${email} : ${sortie.reason}`);
    // 502 : on VEUT le reessai, un plan paye reste ouvert sans paiement.
    return NextResponse.json({ ok: false, reason: sortie.reason }, { status: 502 });
  }

  // ON SE QUITTE BIEN, ET C'EST NOUS QUI LE DISONS.
  //
  // Pas d'email quand il n'y avait rien a retirer (compte deja gratuit,
  // adresse inconnue de nous) : annoncer la fin d'un abonnement a
  // quelqu'un qui n'en avait pas serait absurde. Un plan a vie protege
  // ne recoit rien non plus, il n'a rien perdu.
  let envoye = false;
  if (!sortie.skipped) {
    envoye = await sendRefundGoodbyeEmail({ email, prenom });
  }

  console.log(
    `[commande/webhook] remboursement total pour ${email} : ` +
      `${sortie.skipped ? `rien a retirer (${sortie.skipped})` : `plan ${sortie.previousPlan} retire`}, ` +
      `email d'au revoir ${envoye ? "envoye" : "non envoye"}`,
  );
  return NextResponse.json({ ok: true, downgraded: !sortie.skipped, skipped: sortie.skipped });
}
