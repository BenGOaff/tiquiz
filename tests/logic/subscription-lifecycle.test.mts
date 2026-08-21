// tests/logic/subscription-lifecycle.test.mts
//
// UN ABONNÉ QUI RÉSILIE GARDAIT SON PLAN PAYANT POUR TOUJOURS.
//
// Trouvé le 21 août en préparant le tableau de bord de Béné, qui
// demandait "qui a arrêté son abo". La réponse était : personne ne le
// savait. Le webhook n'écoutait AUCUN événement d'abonnement, sur une
// app dont c'est le mode de vente principal.
//
// Ces tests protègent les deux moitiés, et la seconde est celle qu'on
// casse en croyant bien faire :
//
//   - on coupe quand l'abonnement est VRAIMENT fini ;
//   - on ne coupe PAS quand il a seulement demandé à partir, ni quand
//     son prélèvement vient d'échouer.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  OWNER_SUBSCRIPTION_EVENTS,
  isSubscriptionEvent,
  readCancellationFeedback,
  readSubscriptionAmount,
  readSubscriptionOutcome,
  stripeDateToIso,
} from "../../lib/checkout/subscriptionLifecycle.ts";
import { OWNER_STRIPE_EVENTS } from "../../lib/checkout/stripeCheckout.ts";

test("LE BUG : la fin d'un abonnement retire le plan payant", () => {
  const r = readSubscriptionOutcome("customer.subscription.deleted", {
    id: "sub_1",
    status: "canceled",
  });
  assert.equal(r.outcome, "revoke");
  assert.equal(r.reason, "ended");
});

test("IL A DEMANDE A PARTIR, IL N'EST PAS PARTI : on ne coupe pas", () => {
  // C'est le piege de cette correction, et il est l'inverse de ce qu'on
  // croit. Quelqu'un qui resilie son mensuel le 3 du mois a paye jusqu'au
  // 30 : couper ici serait le voler. Meme famille que le remboursement
  // partiel du 20 aout.
  const r = readSubscriptionOutcome("customer.subscription.updated", {
    id: "sub_1",
    status: "active",
    cancel_at_period_end: true,
  });
  assert.notEqual(r.outcome, "revoke", "on coupe l'acces d'un client qui a paye sa periode");
  assert.equal(r.reason, "cancel_scheduled");
  assert.equal(r.churnPending, true, "le depart n'est pas consigne");
});

test("une carte qui vient d'expirer ne met personne dehors", () => {
  // `past_due` = Stripe reessaie plusieurs jours. Couper au premier
  // echec mettrait dehors des gens qui vont payer, sans qu'ils
  // comprennent pourquoi.
  const r = readSubscriptionOutcome("customer.subscription.updated", {
    id: "sub_1",
    status: "past_due",
  });
  assert.notEqual(r.outcome, "revoke");

  const f = readSubscriptionOutcome("invoice.payment_failed", { id: "sub_1", status: "past_due" });
  assert.notEqual(f.outcome, "revoke");
  assert.equal(f.reason, "payment_failed");
});

test("quand Stripe abandonne, LA on coupe", () => {
  for (const statut of ["canceled", "unpaid", "incomplete_expired"]) {
    const r = readSubscriptionOutcome("customer.subscription.updated", {
      id: "sub_1",
      status: statut,
    });
    assert.equal(r.outcome, "revoke", `statut ${statut}`);
  }
});

test("un statut qu'on ne sait pas nommer ne coupe RIEN", () => {
  // Le risque d'un client mis dehors a tort est plus cher que celui d'un
  // acces garde quelques jours de trop, et le `deleted` finira par
  // arriver. On ne coupe jamais sur ce qu'on ne comprend pas.
  for (const statut of ["incomplete", "un_statut_futur", "", null, undefined]) {
    const r = readSubscriptionOutcome("customer.subscription.updated", {
      id: "sub_1",
      status: statut as string | null,
    });
    assert.notEqual(r.outcome, "revoke", `statut ${String(statut)}`);
  }
});

test("il annule sa resiliation : on le note, on ne cree pas de depart", () => {
  const r = readSubscriptionOutcome("customer.subscription.updated", {
    id: "sub_1",
    status: "active",
    cancel_at_period_end: false,
  });
  assert.equal(r.reason, "reactivated");
  assert.equal(r.churnPending, false);
  assert.notEqual(r.outcome, "revoke");
});

test("un renouvellement encaisse ne touche jamais a l'acces", () => {
  const r = readSubscriptionOutcome("invoice.paid", { id: "sub_1", status: "active" });
  assert.equal(r.reason, "renewed");
  assert.notEqual(r.outcome, "revoke");
});

test("un evenement inconnu ne fait rien", () => {
  // L'absence de configuration FERME partout dans ce depot. Ici fermer
  // voudrait dire couper un acces sur un evenement qu'on ne comprend
  // pas : c'est l'inverse qui protege le client.
  for (const t of ["customer.created", "", null, undefined]) {
    const r = readSubscriptionOutcome(t as string | null, { id: "sub_1", status: "active" });
    assert.equal(r.outcome, "keep");
    assert.equal(r.reason, "unknown_event");
  }
});

test("LA MECANIQUE EST UN PARAMETRE : le meme objet, deux verdicts", () => {
  // Le meme abonnement, exactement, lu par deux evenements differents.
  // Si la fonction devinait au lieu de recevoir le type, elle rendrait
  // la meme reponse aux deux : c'est la lecon du 1er aout.
  const abo = { id: "sub_1", status: "canceled" as const };
  assert.equal(readSubscriptionOutcome("customer.subscription.deleted", abo).outcome, "revoke");
  assert.equal(readSubscriptionOutcome("invoice.paid", abo).outcome, "notice");
});

test("les quatre evenements sont declares chez Stripe", () => {
  // S'ils ne sont pas dans la liste, Bene ne les cochera pas dans son
  // tableau de bord Stripe, et rien n'arrivera jamais.
  for (const e of OWNER_SUBSCRIPTION_EVENTS) {
    assert.ok(
      (OWNER_STRIPE_EVENTS as readonly string[]).includes(e),
      `${e} absent de OWNER_STRIPE_EVENTS`,
    );
    assert.ok(isSubscriptionEvent(e));
  }
  assert.ok(!isSubscriptionEvent("checkout.session.completed"));
  assert.ok(!isSubscriptionEvent("charge.refunded"));
});

test("les evenements de vente ne sont PAS traites comme des abonnements", () => {
  // Sinon un paiement reussi passerait dans la branche abonnement et
  // n'ouvrirait jamais l'acces.
  for (const e of ["checkout.session.completed", "checkout.session.async_payment_succeeded", "charge.refunded"]) {
    assert.ok(!isSubscriptionEvent(e), e);
  }
});

test("la raison du depart donnee par Stripe est recuperee", () => {
  // C'est de la donnee GRATUITE qu'on ne collectait pas : quand le
  // client resilie depuis le portail Stripe, il choisit une raison et
  // peut ecrire un commentaire.
  const { feedback, comment } = readCancellationFeedback({
    cancellation_details: { feedback: "too_expensive", comment: "trop cher pour mon usage" },
  });
  assert.equal(feedback, "too_expensive");
  assert.equal(comment, "trop cher pour mon usage");

  const vide = readCancellationFeedback({ cancellation_details: { feedback: "  ", comment: null } });
  assert.equal(vide.feedback, null);
  assert.equal(vide.comment, null);
  assert.deepEqual(readCancellationFeedback(null), { feedback: null, comment: null });
});

test("un commentaire immense est borne", () => {
  const long = "a".repeat(9000);
  const { comment } = readCancellationFeedback({ cancellation_details: { comment: long } });
  assert.equal(comment?.length, 2000);
});

test("le montant perdu est lu sur l'abonnement", () => {
  const m = readSubscriptionAmount({
    items: { data: [{ price: { unit_amount: 1700, currency: "EUR" } }] },
  });
  assert.equal(m.amountCents, 1700);
  assert.equal(m.currency, "eur");
  assert.deepEqual(readSubscriptionAmount(null), { amountCents: null, currency: null });
  assert.deepEqual(readSubscriptionAmount({ items: { data: [] } }), {
    amountCents: null,
    currency: null,
  });
});

test("une date Stripe absurde ne produit pas une date absurde", () => {
  assert.equal(stripeDateToIso(1_755_000_000)?.slice(0, 4), "2025");
  for (const v of [0, -1, null, undefined, Number.NaN]) {
    assert.equal(stripeDateToIso(v as number | null), null, String(v));
  }
});

test("le webhook passe par la fonction, et n'a pas ses propres regles", () => {
  // Le vrai garde-fou de regression : une decision recopiee dans une
  // route n'est pas testable, donc elle n'est pas testee, et c'est
  // exactement la que les bugs s'installent.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/webhook/route.ts"),
    "utf8",
  );
  assert.ok(src.includes("readSubscriptionOutcome("), "le webhook ne consulte plus la fonction");
  assert.ok(src.includes("isSubscriptionEvent("), "le webhook ne reconnait plus ces evenements");
  assert.ok(
    !/cancel_at_period_end\s*===?\s*true[\s\S]{0,80}downgrade/i.test(src),
    "le webhook a repris sa propre regle de coupure",
  );
  assert.ok(src.includes("recordChurn("), "le depart n'est plus consigne");
});

test("la migration du depart existe et suit les regles du depot", () => {
  const p = path.join(process.cwd(), "supabase/migrations/20260821_subscription_churn.sql");
  assert.ok(fs.existsSync(p), "migration absente");
  const sql = fs.readFileSync(p, "utf8");
  assert.ok(/CREATE TABLE IF NOT EXISTS/i.test(sql), "pas de IF NOT EXISTS");
  assert.ok(/NOTIFY pgrst, 'reload schema'/i.test(sql), "pas de rechargement du schema");
  // Une ligne par abonnement, pas une par evenement : sans cet index,
  // le tableau de bord annoncerait trois departs pour un client.
  assert.ok(
    /CREATE UNIQUE INDEX IF NOT EXISTS subscription_churn_ref_uidx/i.test(sql),
    "pas d'index unique : les departs seront comptes plusieurs fois",
  );
});
