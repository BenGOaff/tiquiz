// app/api/commande/paypal/webhook/route.ts
//
// PAYPAL NOUS DIT CE QUI ARRIVE À L'ABONNEMENT.
//
// C'est CE fichier qui ouvre et ferme l'accès, jamais la page de retour :
// beaucoup d'acheteurs ne la voient jamais (paiement sur mobile, onglet
// fermé). Un accès qui en dépend, c'est le drame Ivan à l'identique.
//
// -- LES QUATRE GARANTIES, LES MÊMES QUE CÔTÉ STRIPE -------------------
//
// 1. **La signature**, vérifiée avant tout traitement. PayPal ne signe
//    pas avec un secret partagé : on lui REDEMANDE s'il a bien émis
//    l'événement, et cette question exige `PAYPAL_WEBHOOK_ID_OWNER`.
// 2. **L'idempotence**, par l'index unique `(source, event_id)` de
//    `webhook_logs`. PayPal réessaie, un même événement ne doit ouvrir
//    l'accès qu'une fois.
// 3. **On relit l'abonnement chez PayPal** au lieu de croire le corps
//    reçu : la signature prouve l'expéditeur, pas la fraîcheur.
// 4. **Le plan vient du catalogue**, jamais d'une devinette.
//
// -- CE QUI COUPE, ET CE QUI NE COUPE PAS ------------------------------
//
// `CANCELLED` et `EXPIRED` ferment l'accès : l'abonnement est fini.
// `SUSPENDED` ne le ferme PAS. PayPal suspend après trois échecs de
// prélèvement, et couper là mettrait dehors quelqu'un dont la carte
// vient d'expirer et qui va la changer. Même règle que Stripe, qui ne
// coupe pas sur `invoice.payment_failed`. On le journalise fort : c'est
// une situation qui mérite un humain.
//
// On répond 200 même quand on n'a rien fait : un 500 sur un cas compris
// et écarté déclencherait des réessais en boucle.

import { NextRequest, NextResponse } from "next/server";

import { commissionnerVente } from "@/lib/affiliate/ownerSale";
import { findOwnerProduct } from "@/lib/checkout/catalog";
import { downgradeToFreeByEmail, grantPlanByEmail } from "@/lib/checkout/grantPlan";
import { readOwnerPaypal, readOwnerPaypalWebhookId } from "@/lib/checkout/ownerAccount";
import {
  cancelOwnerPaypalSubscription,
  getOwnerPaypalSubscription,
  verifyOwnerPaypalWebhook,
} from "@/lib/checkout/paypalOwner";
import { rememberPaypalSubscription } from "@/lib/checkout/customerLink";
import { marquerMoisOffertConsomme } from "@/lib/trial/moisOffertCheckout";
import { logWebhookEvent } from "@/lib/webhooks/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE = "paypal";

interface EvenementPaypal {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    /** Sur un PAYMENT.SALE.*, l'abonnement qui a produit ce prélèvement. */
    billing_agreement_id?: string;
    amount?: { total?: string | null } | null;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Le corps BRUT d'abord : la vérification porte sur les octets reçus.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const compte = readOwnerPaypal(process.env);
  const webhookId = readOwnerPaypalWebhookId(process.env);
  if (!compte || !webhookId) {
    console.error(
      "[commande/paypal/webhook] compte ou PAYPAL_WEBHOOK_ID_OWNER absent : " +
        "impossible de verifier quoi que ce soit, on refuse.",
    );
    // 503 et pas 200 : PayPal réessaiera, et une fois la variable posée
    // les ventes de l'intervalle rentreront toutes seules.
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const signe = await verifyOwnerPaypalWebhook({
    compte,
    webhookId,
    headers: req.headers,
    rawBody: raw,
  });
  if (!signe) {
    console.warn("[commande/paypal/webhook] signature refusee");
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let event: EvenementPaypal;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const eventId = String(event.id ?? "").trim() || null;
  const eventType = String(event.event_type ?? "").trim() || null;

  if (eventId) {
    const { duplicate } = await logWebhookEvent({
      source: SOURCE,
      event_id: eventId,
      event_type: eventType,
      payload: event as unknown as Record<string, unknown>,
      status: "received",
    });
    if (duplicate) {
      return NextResponse.json({ ok: true, reason: "deja_traite" });
    }
  }

  // L'ABONNEMENT CONCERNÉ.
  //
  // Sur un `BILLING.SUBSCRIPTION.*`, c'est la ressource elle même. Sur un
  // `PAYMENT.SALE.*`, c'est `billing_agreement_id`. Un événement sans
  // aucun des deux ne nous concerne pas : ce compte PayPal encaisse
  // aussi l'Atelier, dont les commandes ont leur propre webhook.
  const abonnementId =
    String(event.resource?.billing_agreement_id ?? "").trim() ||
    (eventType?.startsWith("BILLING.SUBSCRIPTION.")
      ? String(event.resource?.id ?? "").trim()
      : "");

  if (!abonnementId) {
    return NextResponse.json({ ok: true, ignored: eventType ?? "sans_abonnement" });
  }

  // ON RELIT CHEZ PAYPAL, on ne croit pas le corps reçu.
  const abo = await getOwnerPaypalSubscription({ compte, subscriptionId: abonnementId });
  if (!abo) {
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} illisible chez PayPal (${eventType})`,
    );
    // 502 : on VEUT le réessai, quelqu'un a peut-être payé.
    return NextResponse.json({ ok: false, reason: "unreadable_subscription" }, { status: 502 });
  }

  if (!abo.email) {
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} sans adresse : acces impossible. ` +
        `Intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  // ── CE QUI FERME L'ACCÈS ──
  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
    const sortie = await downgradeToFreeByEmail({
      email: abo.email,
      source: "paypal_cancel",
      reference: abonnementId,
    });
    console.log(
      `[commande/paypal/webhook] ${eventType} pour ${abo.email} : ` +
        `${sortie.skipped ? `rien a retirer (${sortie.skipped})` : `plan ${sortie.previousPlan} retire`}`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── CE QUI NE FERME RIEN, ET QUI DOIT SE VOIR ──
  if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} SUSPENDU par PayPal (${abo.email}) : ` +
        `acces conserve, prelevement arrete. A regarder, c'est un client qui va partir.`,
    );
    return NextResponse.json({ ok: true, reason: "suspended" });
  }

  // ── UN REMBOURSEMENT : l'argent repart, l'accès aussi ──
  if (eventType === "PAYMENT.SALE.REFUNDED") {
    const sortie = await downgradeToFreeByEmail({
      email: abo.email,
      source: "paypal_refund",
      reference: abonnementId,
    });
    // Rembourser sans arrêter l'abonnement re-prélève le mois suivant
    // quelqu'un qui n'a plus rien. Même règle que côté Stripe.
    const stop = await cancelOwnerPaypalSubscription({
      compte,
      subscriptionId: abonnementId,
      raison: "Remboursement",
    });
    if (!stop.ok) {
      console.error(
        `[commande/paypal/webhook] REMBOURSEMENT de ${abo.email} : abonnement NON arrete ` +
          `(${stop.reason}). A arreter A LA MAIN dans PayPal, sinon il sera preleve le mois prochain.`,
      );
    }
    console.log(
      `[commande/paypal/webhook] remboursement pour ${abo.email} : ` +
        `${sortie.skipped ? `rien a retirer (${sortie.skipped})` : "plan retire"}`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── LE PRÉLÈVEMENT RÉCURRENT : on l'enregistre, on ne touche à rien ──
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    console.log(
      `[commande/paypal/webhook] echeance encaissee pour ${abo.email} ` +
        `(${event.resource?.amount?.total ?? "?"} EUR, abonnement ${abonnementId})`,
    );
    return NextResponse.json({ ok: true, reason: "echeance" });
  }

  // ── CE QUI OUVRE L'ACCÈS ──
  if (eventType !== "BILLING.SUBSCRIPTION.ACTIVATED") {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const product = findOwnerProduct(abo.productId);
  if (!product) {
    // Un abonnement payé dont on ne sait pas nommer le produit. On
    // n'invente pas de plan, et on ne se tait pas : c'est la situation
    // exacte d'Ivan, elle appelle une action humaine.
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} ACTIF pour un produit inconnu ` +
        `(${abo.productId}) : plan NON ouvert, intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "unknown_product" });
  }

  const octroi = await grantPlanByEmail({
    email: abo.email,
    plan: product.plan,
    source: "paypal",
    reference: abonnementId,
    requestOrigin: req.nextUrl.origin,
    planLabel: product.label,
  });

  if (!octroi.ok) {
    console.error(
      `[commande/paypal/webhook] plan NON ouvert pour ${abo.email} (${octroi.reason ?? "inconnu"})`,
    );
    return NextResponse.json({ ok: false, reason: octroi.reason ?? "grant_failed" }, { status: 502 });
  }

  // LE FIL VERS PAYPAL, pour pouvoir arrêter l'abonnement plus tard.
  // Sans lui, le bouton "Arrêter l'abonnement" ne saurait pas quoi
  // arrêter, et le prélèvement continuerait après la fermeture de
  // l'accès. APRÈS l'octroi : c'est lui qui crée le profil.
  const lien = await rememberPaypalSubscription({
    email: abo.email,
    subscriptionId: abonnementId,
  });
  if (!lien.ok) {
    console.warn(
      `[commande/paypal/webhook] abonnement ${abonnementId} non rattache a ${abo.email} ` +
        `(${lien.reason}) : il faudra l'arreter a la main chez PayPal.`,
    );
  }

  console.log(
    `[commande/paypal/webhook] plan ouvert pour ${abo.email} : ${product.id} (${product.plan}), ` +
      `compte ${octroi.created ? "cree" : "existant"}, confirmation ${octroi.loginLinkSent ? "envoyee" : "NON ENVOYEE"}`,
  );

  // ── LE MOIS OFFERT EST CONSOMMÉ ──
  //
  // ICI et pas au bon de commande : un paiement abandonné ne doit pas
  // brûler le cadeau. Le nombre de jours est LU dans le `custom_id`, il
  // n'est pas déduit d'un `sa` présent.
  if (abo.trialDays > 0) {
    await marquerMoisOffertConsomme({
      email: abo.email,
      sa: abo.affiliateRef,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
  }

  // ── LA COMMISSION DE L'AFFILIÉE ──
  //
  // **Sur le TTC, et c'est une décision de Béné** (22 août : "pour paypal :
  // oui on garde le TTC"). PayPal ne ventile pas la TVA comme Stripe Tax,
  // donc il n'y a pas de HT à isoler : passer une taxe à zéro dit la
  // vérité de cette vente là, au lieu d'inventer un taux. L'affiliée
  // touche donc un peu plus sur une vente PayPal que sur une vente carte,
  // et c'est assumé.
  await commissionnerVente({
    email: abo.email,
    reference: abonnementId,
    affiliateRef: abo.affiliateRef,
    // Ce qui a vraiment été prélevé quand PayPal le dit, sinon le prix
    // du catalogue : ne rien envoyer ferait sauter la commission.
    amountTotalCents: abo.amountCents || product.amountCents,
    amountTaxCents: 0,
    product: { id: product.id, label: product.label },
  });

  return NextResponse.json({ ok: true });
}
