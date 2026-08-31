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
  couponPourRemise,
  lireRemiseEnAttente,
  poserLaRemise,
} from "@/lib/checkout/remiseDifferee";
import {
  readCustomerId,
  retrieveOwnerCustomer,
  retrieveOwnerSession,
  retrieveOwnerSessionByPaymentIntent,
  poserRemiseSurAbonnement,
  retrieveOwnerSubscription,
  verifyStripeSignature,
} from "@/lib/checkout/stripeCheckout";
import { recordChurn } from "@/lib/checkout/churn";
import { rememberStripeCustomer } from "@/lib/checkout/customerLink";
import { annulerCommissionVente, commissionnerVente } from "@/lib/affiliate/ownerSale";
import { marquerMoisOffertConsomme } from "@/lib/trial/moisOffertCheckout";
import { ouvertureDemandee, type OuvertureDemandee } from "@/lib/checkout/planChange";
import { estPlanAVie } from "@/lib/checkout/plansAVie";
import { estAbonnementVivant } from "@/lib/checkout/subscriptionCancel";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isSubscriptionEvent,
  readCancellationFeedback,
  readSubscriptionAmount,
  readSubscriptionOutcome,
  stripeDateToIso,
  type RawSubscription,
} from "@/lib/checkout/subscriptionLifecycle";
import {
  abonnementDeLaFacture,
  finDePeriodeAbonnement,
  metaAbonnementDeLaFacture,
  taxeDeLaFacture,
} from "@/lib/checkout/formeStripe";
import { marquerTraite, prendreLeVerrou } from "@/lib/webhooks/log";
import { completerFacturation } from "@/lib/facture/store";
import { echapperMotifLike } from "@/lib/db/motifLike";

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

  // ── LE VERROU ──
  //
  // Il journalise ET dit si on a le droit de travailler. Avant l'audit
  // du 24 aout, toute ligne existante etait prise pour un doublon :
  // un traitement rate repondait 502 pour demander un reessai, et ce
  // reessai recevait 200 sans rien faire. Une vente encaissee dont le
  // premier traitement ratait n'ouvrait donc JAMAIS l'acces.
  const verrou = await prendreLeVerrou({
    source: SOURCE,
    event_id: eventId,
    event_type: eventType,
    payload: event,
    status: "processing",
  });
  if (verrou.action === "doublon") {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (verrou.action === "en_cours") {
    // 409 : Stripe reessaiera. Repondre 200 ici perdrait la vente si le
    // traitement en cours echoue.
    return NextResponse.json({ ok: false, reason: "en_cours" }, { status: 409 });
  }

  // LE MARQUAGE EST OBLIGATOIRE, quelle que soit la sortie. Sans lui,
  // l'evenement reste `processing` et sera repris deux minutes plus
  // tard : c'est le filet, pas le fonctionnement normal.
  let reponse: NextResponse;
  try {
    reponse = await traiterEvenement(req, event, eventType);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[commande/webhook] traitement interrompu : ${message}`);
    await marquerTraite(SOURCE, eventId, "error", message.slice(0, 500));
    // 500 : Stripe reessaiera, et le statut `error` laisse la porte
    // ouverte au reessai.
    return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
  }
  const reussi = reponse.status >= 200 && reponse.status < 300;
  await marquerTraite(SOURCE, eventId, reussi ? "processed" : "error", reussi ? null : `HTTP ${reponse.status}`);
  return reponse;
}

/**
 * Le traitement proprement dit, une fois le verrou pris.
 *
 * Separe de `POST` pour une seule raison : TOUTES ses sorties doivent
 * passer par le marquage, et un `return` oublie au milieu de deux cents
 * lignes laisserait l'evenement bloque en `processing`.
 */
async function traiterEvenement(
  req: NextRequest,
  event: RawEvent,
  eventType: string | null,
): Promise<NextResponse> {

  // ── L'ARGENT REPART : ON FERME, ET ON LE DIT BIEN ──
  //
  // Béné, 20 août : "si je rembourse, l'accès est coupé ou pas ? L'user
  // reçoit quelle info ?" Avant ce bloc : non, et rien de nous. Sur un
  // abonnement, ça voulait dire garder le plan payant sans le payer.
  if (eventType === "charge.refunded") {
    return await surRemboursement(event, "remboursement");
  }

  // ── LA BANQUE REPREND L'ARGENT ──
  //
  // `charge.dispute.*` n'etait ecoute NULLE PART (audit du 26 aout). Un
  // impaye laissait donc l'acces ouvert, l'abonnement actif ET la
  // commission en route vers le lot du mois : on perdait la vente, le
  // service rendu et la commission, les trois d'un coup.
  //
  // On agit sur `funds_withdrawn` (l'argent est VRAIMENT parti), pas sur
  // `created` : une contestation se conteste, et fermer l'acces d'un
  // client qui va gagner son litige nous en ferait perdre un pour rien.
  if (eventType === "charge.dispute.funds_withdrawn") {
    return await surRemboursement(event, "impaye");
  }
  if (eventType === "charge.dispute.created") {
    // On ne touche a rien, on rend la chose VISIBLE : c'est le moment ou
    // Bene peut encore repondre avec une preuve de livraison.
    const objet = event.data?.object as { charge?: unknown; amount?: unknown } | undefined;
    console.error(
      `[commande/webhook] CONTESTATION ouverte sur ${String(objet?.charge ?? "?")} ` +
        `(${String(objet?.amount ?? "?")} c) : acces conserve, rien retire. ` +
        `A repondre dans Stripe avant la date limite.`,
    );
    return NextResponse.json({ ok: true, dispute: "opened" });
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

  // CE QUE STRIPE A COLLECTÉ, GARDÉ CHEZ NOUS.
  //
  // Béné, 24 août : "dans la fiche contact de mes clients j'ai aussi
  // besoin de savoir : l'entreprise, l'adresse, le pays, la tva..."
  // Le formulaire carte les exige déjà : les redemander serait présenter
  // un formulaire vide à quelqu'un qui vient de le remplir, et laisser
  // la fiche client sans adresse alors qu'elle figure sur la facture
  // Stripe.
  //
  // `completerFacturation` et pas `ecrireFacturation` : cette source ne
  // connaît ni la société ni un email de facturation distinct, et elle
  // ne doit rien effacer de ce que la personne a saisi elle même.
  if (vente.facturation) {
    const ecrit = await completerFacturation({
      email: vente.email,
      acheteur: vente.facturation,
      source: "stripe",
    });
    if (!ecrit.ok) {
      console.warn(
        `[commande/webhook] facturation non enregistree pour ${vente.email} (${ecrit.reason})`,
      );
    }
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
      ref: vente.affiliateCode,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
  }

  // ── LA COMMISSION D'UN ACHAT UNIQUE ──
  //
  // APRES le plan, et jamais avant : une commission qui echoue ne doit
  // pas priver un acheteur de ce qu'il a paye.
  //
  // **UNIQUEMENT sur un produit sans echeance.** Un ABONNEMENT est
  // commissionne facture par facture, sur `invoice.paid` : Bene, 26
  // aout, "on paye 40% chaque mois ou [le client] reste abonne, pas une
  // seule fois". Commissionner ici EN PLUS ferait deux commissions sur
  // le premier mois, sous deux cles differentes (le paiement ici, la
  // facture la-bas), donc sans que la contrainte d'unicite les voie.
  if (product.interval === null) {
    await commissionnerVente({
      moyen: "stripe",
      email: vente.email,
      reference: vente.paymentRef,
      affiliateRef: vente.affiliateRef,
      affiliateCode: vente.affiliateCode,
      amountTotalCents: vente.amountTotalCents,
      amountTaxCents: vente.amountTaxCents,
      product,
    });
  }

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
      /** Chaine ou objet etendu : `readCustomerId` gere les deux. */
      customer?: string | { id?: string } | null;
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
async function surRemboursement(
  event: RawEvent,
  motif: "remboursement" | "impaye",
): Promise<NextResponse> {
  const charge = event.data?.object ?? null;

  // UN IMPAYÉ N'EST JAMAIS PARTIEL, et l'objet reçu n'est pas le même.
  //
  // Sur `charge.dispute.funds_withdrawn`, `data.object` est un LITIGE :
  // il n'a ni `amount_refunded` ni `refunded`, donc `readRefundOutcome`
  // y répondrait "aucun remboursement" et on ne ferait rien. La
  // mécanique est donc un PARAMÈTRE, pas une lecture de la forme reçue.
  if (motif === "remboursement") {
    const issue = readRefundOutcome(charge);
    if (issue !== "full") {
      console.log(`[commande/webhook] remboursement ${issue} : plan conserve`);
      return NextResponse.json({ ok: true, refund: issue });
    }
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

  // ── LA COMMISSION TOMBE AVEC LA VENTE ──
  //
  // Rien ne le faisait avant le 26 août : la commission mûrissait, et
  // vingt et un jours plus tard elle partait dans un lot. Nos propres
  // conditions d'affiliation le promettaient pourtant déjà.
  //
  // LES CLÉS POSSIBLES DE CET ENCAISSEMENT LÀ, et seulement lui : les
  // mois déjà encaissés ont été gagnés et restent acquis. C'est la règle
  // de Béné ("on arrête de payer s'il se barre", pas "on reprend ce qui
  // a été versé").
  //
  //   * une ÉCHÉANCE d'abonnement est commissionnée sur la FACTURE, que
  //     la charge porte dans `invoice` ;
  //   * un ACHAT UNIQUE est commissionné sur le paiement.
  //
  // On essaie les deux : une seule existe en base, l'autre ne trouve
  // rien. Deviner laquelle marcherait aujourd'hui et casserait au
  // premier produit qui change de forme.
  const factureDeLaCharge = String((charge as { invoice?: unknown } | null)?.invoice ?? "").trim();
  await annulerCommissionVente({
    references: [
      factureDeLaCharge ? `stripe:${factureDeLaCharge}` : null,
      vente?.paymentRef ? `stripe:${vente.paymentRef}` : null,
      paymentIntent ? `stripe:${paymentIntent}` : null,
    ],
    motif,
  });

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
  // L'identifiant client vient de la VENTE relue chez Stripe, PUIS de la
  // charge elle meme.
  //
  // LE BUG QUE LE REPLI FERME (audit du 24 aout) : `vente` est cherchee
  // parmi les sessions de paiement. Une ECHEANCE d'abonnement n'en a
  // pas (c'est une facture, pas une session), donc `vente` valait `null`
  // sur tout remboursement mensuel, donc l'abonnement n'etait PAS
  // arrete. On fermait l'acces et Stripe prelevait le mois suivant :
  // exactement le bug d'argent du 23 aout, par une autre porte.
  //
  // `readCustomerId` gere les DEUX formes que Stripe envoie (chaine ou
  // objet etendu) : c'est justement pour ca qu'elle existe. Ne pas s'en
  // servir n'etait pas une precaution, c'etait un trou.
  const clientStripe = vente?.customerId ?? readCustomerId(charge?.customer) ?? null;
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
  //
  // ET SUR LA FACTURE, LE CHAMP A DÉMÉNAGÉ (audit du 31 août 2026).
  // `invoice.subscription` a disparu au profit de
  // `invoice.parent.subscription_details.subscription`. Lu au seul
  // premier niveau, `invoice.paid` sortait en "ce n'est pas un
  // abonnement" et `commissionnerEcheance` n'était JAMAIS appelée :
  // l'affilié touchait le premier mois et plus rien ensuite, sans
  // qu'une seule ligne d'erreur le dise. `abonnementDeLaFacture` lit
  // les deux formes. Voir `lib/checkout/formeStripe.ts`.
  const surLAbonnement = String(eventType ?? "").startsWith("customer.subscription.");
  const subId = surLAbonnement
    ? String(objet.id ?? "").trim()
    : (abonnementDeLaFacture(objet) ?? "");
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
  // `current_period_end` a quitté la racine de l'abonnement pour ses
  // LIGNES. Lu au seul premier niveau, la date annoncée à quelqu'un qui
  // descend de palier disparaissait, et le départ consigné n'avait plus
  // d'échéance.
  const finDePeriode = stripeDateToIso(finDePeriodeAbonnement(abonnement));

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

  // ── LA COMMISSION, CHAQUE MOIS OÙ LE CLIENT RESTE ABONNÉ ──
  //
  // Béné, 26 août : "on paye bien 40% chaque mois où [le client] reste
  // abonné, pas une seule fois... on arrête de payer s'il se barre
  // c'est tout."
  //
  // C'EST DONC ICI, pour TOUTES les échéances, y compris la première :
  // le checkout ne commissionne plus les abonnements, justement pour ne
  // pas la compter deux fois. Une seule mécanique, un seul endroit.
  //
  // Et ça règle le mois offert sans un drapeau de plus : la facture
  // d'essai vaut 0, donc pas de commission ; la première vraie échéance
  // en crée une.
  if (eventType === "invoice.paid") {
    await commissionnerEcheance(abonnement, objet);
  }

  if (lecture.outcome !== "revoke") {
    // ── LA MONTEE DE PALIER ──
    //
    // Bene, 23 aout : "l'user paye 17 EUR pour le mois et veut upgrader
    // a tiquiz plus". La route `/api/billing/change-plan` change la
    // ligne chez Stripe ; c'est ICI que l'acces suit, a partir de ce
    // que Stripe facture VRAIMENT. Deux endroits qui ouvriraient le
    // plan finiraient par se contredire (quatrieme fois dans ce depot).
    //
    // `ouvertureDemandee` rend null des que rien n'a bouge : Stripe
    // envoie `customer.subscription.updated` pour a peu pres tout, et
    // ouvrir a chaque fois enverrait un email de confirmation a
    // quelqu'un qui vient de mettre sa carte a jour.
    const ouverture = await lireOuverture(email, abonnement);
    if (ouverture) {
      const grant = await grantPlanByEmail({
        email,
        plan: ouverture.plan,
        source: "stripe",
        reference: subId,
        planLabel: ouverture.label,
      });
      if (!grant.ok) {
        console.error(
          `[commande/webhook] palier ${ouverture.produit} NON ouvert pour ${email} ` +
            `(${grant.reason ?? "raison inconnue"}) : il a paye la difference.`,
        );
        // 502 : on VEUT que Stripe reessaie. Il a paye une montee qu'il
        // n'a pas recue, et le silence coute plus cher que le bug.
        return NextResponse.json({ ok: false, reason: grant.reason ?? "grant_failed" }, { status: 502 });
      }
      console.log(
        `[commande/webhook] abonnement ${subId} : ${email} passe en ${ouverture.plan}`,
      );
      return NextResponse.json({ ok: true, subscription: "plan_changed", plan: ouverture.plan });
    }

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

/**
 * Le palier a ouvrir pour cet abonnement, ou `null`.
 *
 * La DECISION est pure et testee (`ouvertureDemandee`). Ici on ne fait
 * que lui donner ce qu'elle demande : ce que Stripe facture, si
 * l'abonnement est vivant, et le plan REEL du compte. Lire le plan
 * dedans la rendrait intestable, et comparer a une hypothese au lieu du
 * plan reel ferait repartir un email a chaque mise a jour anodine.
 */
async function lireOuverture(
  email: string,
  abonnement: RawSubscription | null,
): Promise<OuvertureDemandee | null> {
  const meta = (abonnement as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
  const produitFacture = String(meta.product ?? "").trim();
  if (!produitFacture) return null;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .ilike("email", echapperMotifLike(email))
    .maybeSingle();
  const planActuel = String((data as { plan?: string } | null)?.plan ?? "").trim().toLowerCase();

  return ouvertureDemandee({
    produitFacture,
    vivant: estAbonnementVivant((abonnement as { status?: unknown } | null)?.status),
    planActuel,
    aVie: estPlanAVie(planActuel),
  });
}

/**
 * LA COMMISSION D'UNE ÉCHÉANCE D'ABONNEMENT.
 *
 * Une par facture payée, donc une par mois où le client reste abonné.
 * **La clé est la FACTURE**, jamais l'abonnement : avec l'abonnement
 * pour clé, la deuxième échéance serait un doublon et l'affilié ne
 * toucherait plus rien à partir du deuxième mois.
 *
 * Trois cas se règlent tout seuls, sans rien à débrancher :
 *   * le MOIS OFFERT : la facture d'essai vaut 0, donc pas de
 *     commission ;
 *   * l'ARRÊT de l'abonnement : plus de facture, donc plus de
 *     commission ;
 *   * la MONTÉE DE PALIER : la facture suivante porte le nouveau
 *     montant, donc la commission suit toute seule.
 */
async function commissionnerEcheance(
  abonnement: RawSubscription | null,
  facture: Record<string, unknown>,
): Promise<void> {
  // Ce qui a VRAIMENT été encaissé sur cette facture, jamais le prix du
  // catalogue : une remise, un prorata ou une TVA différente changent la
  // somme, et la commission se calcule sur ce qui est rentré.
  const paye = Math.round(Number(facture.amount_paid ?? 0)) || 0;
  if (paye <= 0) return;
  // LA TVA, ET ELLE DÉCIDE DE 1,13 EUR PAR VENTE ET PAR MOIS.
  //
  // `invoice.tax` est devenu `invoice.total_taxes[].amount`. Lu au seul
  // premier niveau, la taxe valait zéro, donc la commission se calculait
  // sur le TTC : 40 % de 17,00 EUR au lieu de 40 % de 14,17 EUR. C'est
  // le MÊME écart que l'audit du 26 août, par une autre porte, et il
  // est invisible parce que zéro est une réponse légitime (un client
  // hors UE, une autoliquidation).
  const taxe = taxeDeLaFacture(facture);

  const factureId = String(facture.id ?? "").trim();
  if (!factureId) {
    console.error(
      "[commande/webhook] facture payee sans identifiant : commission NON creee, " +
        "elle serait impossible a dedupliquer.",
    );
    return;
  }

  // LES METADONNÉES, AVEC LEUR REPLI SUR LA FACTURE.
  //
  // On préfère celles de l'abonnement RELU (elles suivent une montée de
  // palier), mais une relecture ratée ne doit pas coûter une commission :
  // Stripe recopie ces mêmes clés sur la facture. Sans ce repli, une
  // seconde d'API indisponible faisait disparaître le mois de l'affilié,
  // en silence, et le réessai de Stripe n'y changeait rien puisque le
  // webhook avait répondu 200.
  const surAbo = (abonnement as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
  const meta = Object.keys(surAbo).length > 0 ? surAbo : metaAbonnementDeLaFacture(facture);
  const produit = findOwnerProduct(String(meta.product ?? ""));
  if (!produit) {
    console.error(
      `[commande/webhook] echeance ${factureId} encaissee mais produit inconnu ` +
        `(${String(meta.product ?? "?")}) : commission NON creee.`,
    );
    return;
  }

  const email = String(facture.customer_email ?? "").trim();
  if (!email) return;

  await commissionnerVente({
    moyen: "stripe",
    email,
    reference: factureId,
    affiliateRef: String(meta.affiliate_ref ?? "") || null,
    affiliateCode: String(meta.affiliate_code ?? "") || null,
    amountTotalCents: paye,
    amountTaxCents: taxe,
    product: { id: produit.id, label: produit.label },
  });
}
