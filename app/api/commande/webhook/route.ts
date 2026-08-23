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
import { arreterAbonnementsStripe } from "@/lib/checkout/subscriptionCancel";
import { sendRefundGoodbyeEmail } from "@/lib/email/refundGoodbyeEmail";
import { readOwnerStripe, readOwnerStripeWebhookSecret } from "@/lib/checkout/ownerAccount";
import {
  retrieveOwnerCustomer,
  retrieveOwnerSession,
  retrieveOwnerSessionByPaymentIntent,
  retrieveOwnerSubscription,
  verifyStripeSignature,
} from "@/lib/checkout/stripeCheckout";
import { recordChurn } from "@/lib/checkout/churn";
import { rememberStripeCustomer } from "@/lib/checkout/customerLink";
import { commissionnerVente } from "@/lib/affiliate/ownerSale";
import { marquerMoisOffertConsomme } from "@/lib/trial/moisOffertCheckout";
import {
  isSubscriptionEvent,
  readCancellationFeedback,
  readSubscriptionAmount,
  readSubscriptionOutcome,
  stripeDateToIso,
  type RawSubscription,
} from "@/lib/checkout/subscriptionLifecycle";
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

  // ── L'ABONNEMENT S'ARRÊTE, OU IL VA S'ARRÊTER ──
  //
  // Ajouté le 21 août. Avant : aucun événement d'abonnement n'était
  // écouté, donc un client qui résiliait gardait son plan payant
  // indéfiniment, et la question "qui est parti" n'avait aucune donnée
  // derrière. Ce qui coupe, ce qui ne coupe PAS, et pourquoi : voir
  // `lib/checkout/subscriptionLifecycle.ts`.
  if (isSubscriptionEvent(eventType)) {
    return await surAbonnement(eventType, event);
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
    // Le nom AFFICHE sur le bon de commande, pour que l'email de
    // confirmation nomme ce qui vient d'etre paye.
    planLabel: product.label,
  });

  if (!octroi.ok) {
    console.error(
      `[commande/webhook] plan NON ouvert pour ${vente.email} (${octroi.reason ?? "raison inconnue"})`,
    );
    // 502 : on VEUT que Stripe réessaie, parce qu'un client a payé.
    return NextResponse.json({ ok: false, reason: octroi.reason ?? "grant_failed" }, { status: 502 });
  }

  // ON GARDE LE FIL VERS STRIPE.
  //
  // Sans cet identifiant, l'abonne ne pourra jamais changer sa carte :
  // le portail de facturation a besoin de savoir DE QUI on parle, et
  // l'adresse email ne peut pas le remplacer (elle change, et elle n'est
  // pas toujours celle du compte).
  //
  // APRES l'octroi, jamais avant : c'est l'octroi qui cree le profil sur
  // un premier achat. Et un echec ici ne fait pas echouer le webhook, un
  // acces ouvert vaut plus qu'un lien de facturation.
  const lien = await rememberStripeCustomer({
    email: vente.email,
    customerId: vente.customerId,
  });
  if (!lien.ok) {
    console.warn(
      `[commande/webhook] lien Stripe non enregistre pour ${vente.email} (${lien.reason}) : ` +
        `le portail de facturation ne lui sera pas propose.`,
    );
  }

  console.log(
    `[commande/webhook] plan ouvert pour ${vente.email} : ${product.id} (${product.plan}), ` +
      `compte ${octroi.created ? "cree" : "existant"}, lien de connexion ${octroi.loginLinkSent ? "envoye" : "NON ENVOYE"}`,
  );

  // ── LE MOIS OFFERT EST CONSOMMÉ ──
  //
  // ICI et pas au moment du bon de commande : un checkout abandonné ne
  // doit pas brûler le cadeau de quelqu'un qui n'a rien acheté.
  //
  // On lit la métadonnée ÉCRITE à l'ouverture du checkout, on ne déduit
  // rien d'un `sa` présent : un `sa` peut être là sans qu'aucun essai
  // n'ait été ouvert (personne qui a déjà eu son mois, auto-affiliation
  // refusée), et marquer un cadeau jamais fait priverait quelqu'un du
  // sien.
  if (vente.freeMonthDays > 0) {
    await marquerMoisOffertConsomme({
      email: vente.email,
      sa: vente.affiliateRef,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
  }

  // ── LA COMMISSION DE L'AFFILIÉE ──
  //
  // APRES le plan, et jamais avant : une commission qui echoue ne doit
  // pas priver un acheteur de ce qu'il a paye. Sans ce bloc, une vente
  // faite sur NOTRE bon de commande ne payait personne, alors que la
  // meme vente passee par le tunnel Systeme.io payait bien.
  await commissionnerVente({
    email: vente.email,
    reference: vente.paymentRef,
    affiliateRef: vente.affiliateRef,
    amountTotalCents: vente.amountTotalCents,
    amountTaxCents: vente.amountTaxCents,
    product,
  });

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

  // ── ON ARRÊTE AUSSI L'ABONNEMENT, ET C'EST INDISPENSABLE ──
  //
  // Un remboursement ne touche PAS à l'abonnement chez Stripe : il rend
  // l'argent d'un paiement, et le calendrier continue. Sans ce bloc, la
  // personne remboursée est re-prélevée le mois suivant alors que son
  // accès vient d'être fermé. C'est le pire des deux mondes, et ça
  // n'apparaît qu'un mois plus tard, sur son relevé.
  //
  // `immediat` et pas `fin-de-periode` : la période en cours vient
  // d'être remboursée, il n'y a plus rien à honorer.
  // L'identifiant client vient de la VENTE relue chez Stripe. On ne le
  // lit pas sur la charge : sa forme varie (chaine ou objet etendu), et
  // raisonner sur la forme supposee d'un payload est exactement ce qui a
  // coute la journee du 7 aout (drame Ivan).
  const clientStripe = vente?.customerId ?? null;
  if (compte && clientStripe) {
    const stop = await arreterAbonnementsStripe(compte.key, clientStripe, "immediat");
    if (!stop.ok) {
      // On ne fait PAS échouer le webhook : l'accès est déjà retiré, et
      // un réessai rejouerait l'email d'au revoir. On crie, parce qu'un
      // abonnement encore vivant se règle à la main, tout de suite.
      console.error(
        `[commande/webhook] REMBOURSEMENT de ${email} : abonnement NON arrete (${stop.reason}). ` +
          `A arreter A LA MAIN dans Stripe, sinon elle sera prelevee le mois prochain.`,
      );
    } else if (stop.arretes.length) {
      console.log(`[commande/webhook] abonnement(s) arrete(s) apres remboursement : ${stop.arretes.join(", ")}`);
    }
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

/**
 * LE CYCLE DE VIE D'UN ABONNEMENT.
 *
 * Trois choses se passent ici, et la deuxième est celle qu'on oublie.
 *
 * 1. On RELIT l'abonnement chez Stripe. La signature prouve
 *    l'expéditeur, pas la fraîcheur de l'objet : entre l'envoi et le
 *    traitement, le client a pu annuler sa résiliation.
 * 2. On DEMANDE l'adresse au client Stripe. Un événement d'abonnement
 *    n'en porte aucune : sans cet appel, on saurait qu'un abonnement
 *    s'arrête sans savoir de qui il s'agit.
 * 3. On consigne le départ, et on ne coupe que sur une fin réelle.
 *
 * On répond 200 sur tous les cas compris, y compris quand on ne fait
 * rien : un 500 sur un cas écarté déclencherait des réessais en boucle.
 */
async function surAbonnement(
  eventType: string | null,
  event: RawEvent,
): Promise<NextResponse> {
  const objet = (event.data?.object ?? {}) as Record<string, unknown>;

  // Sur `customer.subscription.*` l'objet EST l'abonnement ; sur
  // `invoice.*` il porte l'abonnement dans un champ. Deux formes, une
  // seule lecture, écrite ici plutôt que devinée plus bas.
  const surLAbonnement = String(eventType ?? "").startsWith("customer.subscription.");
  const subId = String(
    (surLAbonnement ? objet.id : objet.subscription) ?? "",
  ).trim();
  const customerId = String(objet.customer ?? "").trim();

  const compte = readOwnerStripe(process.env);
  if (!compte) {
    console.error("[commande/webhook] STRIPE_SECRET_KEY_OWNER absente : abonnement non traite.");
    // 503 : Stripe reessaiera, et une fois la cle posee les evenements
    // de l'intervalle rentreront tout seuls.
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // On relit, sauf si on n'a rien a relire (une facture sans abonnement
  // est un paiement unique : ce n'est pas notre affaire ici).
  const frais = subId ? await retrieveOwnerSubscription(compte.key, subId) : null;
  const abonnement = (frais ?? (surLAbonnement ? objet : null)) as RawSubscription | null;

  if (!subId && surLAbonnement) {
    console.error("[commande/webhook] evenement d'abonnement sans identifiant");
    return NextResponse.json({ ok: true, reason: "no_subscription" });
  }
  if (!subId) {
    // `invoice.paid` d'un achat unique : rien a faire cote abonnement.
    return NextResponse.json({ ok: true, reason: "not_a_subscription" });
  }

  const lecture = readSubscriptionOutcome(eventType, abonnement);

  // L'ADRESSE. Sur une facture Stripe la donne parfois directement ;
  // sinon on va la chercher chez le client. Sans elle, on ne peut ni
  // retirer un plan ni consigner un depart.
  const surFacture = String(objet.customer_email ?? "").trim() || null;
  const client = surFacture ? null : await retrieveOwnerCustomer(compte.key, customerId);
  const email = surFacture ?? client?.email ?? null;

  if (!email) {
    console.error(
      `[commande/webhook] abonnement ${subId} (${eventType}) sans adresse retrouvee : ` +
        `rien consigne, plan NON touche. Intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  // Un evenement d'abonnement porte le client : c'est l'occasion de
  // rattraper le lien pour les comptes qui n'en avaient pas encore (une
  // vente encaissee avant cette colonne, par exemple).
  if (customerId) {
    await rememberStripeCustomer({ email, customerId });
  }

  const { amountCents, currency } = readSubscriptionAmount(abonnement);
  const { feedback, comment } = readCancellationFeedback(abonnement);
  const finDePeriode = stripeDateToIso(abonnement?.current_period_end);

  // ── ON CONSIGNE ──
  //
  // Uniquement sur une intention de partir ou une fin reelle. Stripe
  // envoie un `customer.subscription.updated` pour a peu pres tout (une
  // carte mise a jour, une TVA renseignee) : creer une ligne a chaque
  // fois remplirait la table de departs qui n'en sont pas.
  if (lecture.reason === "cancel_scheduled" || lecture.reason === "ended") {
    await recordChurn({
      email,
      reference: subId,
      amountCents,
      currency,
      endsAt: finDePeriode,
      endedAt: lecture.outcome === "revoke" ? new Date().toISOString() : null,
      stripeFeedback: feedback,
      stripeComment: comment,
    });
  } else if (lecture.reason === "reactivated") {
    // On ne cree rien : on complete SI un depart etait deja consigne.
    // Sans ce garde-fou, chaque mise a jour anodine deviendrait un
    // depart dans le tableau de bord.
    await recordChurn({
      email,
      reference: subId,
      reactivatedAt: new Date().toISOString(),
      updateOnly: true,
    });
  }

  if (lecture.outcome !== "revoke") {
    console.log(
      `[commande/webhook] abonnement ${subId} (${eventType}) : ${lecture.reason}, acces conserve`,
    );
    return NextResponse.json({ ok: true, subscription: lecture.reason, revoked: false });
  }

  const sortie = await downgradeToFreeByEmail({
    email,
    source: "stripe",
    reference: subId,
  });

  if (!sortie.ok && sortie.reason !== "already_free") {
    console.error(
      `[commande/webhook] abonnement ${subId} termine mais plan NON retire pour ${email} ` +
        `(${sortie.reason ?? "raison inconnue"})`,
    );
    // 502 : on VEUT que Stripe reessaie. Garder un plan payant qui n'est
    // plus paye est une perte seche, tous les mois.
    return NextResponse.json({ ok: false, reason: sortie.reason ?? "downgrade_failed" }, { status: 502 });
  }

  console.log(
    `[commande/webhook] abonnement ${subId} termine : ${email} repasse en gratuit ` +
      `(${sortie.reason ?? "ok"})`,
  );
  return NextResponse.json({ ok: true, subscription: lecture.reason, revoked: true });
}
