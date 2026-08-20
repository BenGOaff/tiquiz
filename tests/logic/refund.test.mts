// tests/logic/refund.test.mts
//
// LE REMBOURSEMENT : QUI PERD SON ACCÈS, ET QUI NE LE PERD PAS.
//
// Béné, 20 août 2026 : "si je rembourse les 47 €, l'accès est coupé ou
// pas ? L'user reçoit quelle info ?" La réponse, avant ce chantier,
// était "non" et "rien de toi".
//
// Le piège de ce genre de correction, c'est d'aller trop loin dans
// l'autre sens : "remboursement = on coupe" est faux dès qu'il s'agit
// d'un geste commercial partiel, et l'acheteur se retrouverait dehors
// alors qu'il a payé pour rester dedans. C'est la famille de bugs du
// 1er août (une logique écrite pour un cas, appliquée à un autre), donc
// la décision est nommée, isolée et figée ici.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { readRefundOutcome } from "../../lib/checkout/refund.ts";

test("un remboursement TOTAL coupe l'acces", () => {
  assert.equal(readRefundOutcome({ amount: 4700, amount_refunded: 4700, refunded: true }), "full");
  // Le drapeau seul suffit : c'est celui que Stripe leve sur un
  // remboursement complet, et il peut arriver avant le cumul.
  assert.equal(readRefundOutcome({ amount: 4700, amount_refunded: 0, refunded: true }), "full");
  // Deux remboursements partiels qui atteignent le total en font un
  // total, meme si Stripe n'a pas encore leve le drapeau.
  assert.equal(readRefundOutcome({ amount: 4700, amount_refunded: 4700, refunded: false }), "full");
});

test("un geste commercial PARTIEL ne coupe rien", () => {
  // Le cas qui compte : 10 EUR rendus sur 47. Il a paye 37 EUR pour
  // rester dedans, le mettre dehors serait une faute.
  assert.equal(readRefundOutcome({ amount: 4700, amount_refunded: 1000, refunded: false }), "partial");
  assert.equal(readRefundOutcome({ amount: 4700, amount_refunded: 4699, refunded: false }), "partial");
});

test("ce qu'on ne sait pas lire ne coupe RIEN", () => {
  // L'absence ferme, mais dans le bon sens : on ne retire pas un acces
  // sur une charge qu'on n'a pas comprise. Une revocation a tort coute
  // beaucoup plus cher qu'une revocation en retard.
  assert.equal(readRefundOutcome(null), "none");
  assert.equal(readRefundOutcome(undefined), "none");
  assert.equal(readRefundOutcome({}), "none");
  assert.equal(readRefundOutcome({ amount: 4700, amount_refunded: 0, refunded: false }), "none");
  assert.equal(readRefundOutcome({ amount: 0, amount_refunded: 0, refunded: true }), "none");
});

test("le webhook ecoute le remboursement, et l'abonne a Stripe", () => {
  // Deux moities d'une meme decision, a deux endroits du code : la route
  // doit traiter l'evenement, ET il doit figurer dans la liste qu'on
  // demande a Stripe. Abonner sans traiter ne fait rien ; traiter sans
  // abonner ne se voit jamais, parce que l'evenement n'arrive pas.
  const racine = process.cwd();
  const route = fs.readFileSync(
    path.join(racine, "app/api/commande/webhook/route.ts"),
    "utf8",
  );
  const lib = fs.readFileSync(path.join(racine, "lib/checkout/stripeCheckout.ts"), "utf8");

  assert.ok(
    route.includes('eventType === "charge.refunded"'),
    "la route ne traite plus le remboursement : un acheteur rembourse garderait son acces",
  );
  assert.ok(
    lib.includes('"charge.refunded"'),
    "charge.refunded a disparu de OWNER_STRIPE_EVENTS : Stripe ne nous l'enverrait plus",
  );
  assert.ok(
    route.includes("await downgradeToFreeByEmail("),
    "la retrogradation a disparu de la route",
  );
  assert.ok(
    route.includes("sendRefundGoodbyeEmail("),
    "l'email d'au revoir a disparu : l'acheteur ne recevrait que celui de Stripe",
  );
});

test("le plan est retire sur l'adresse de la VENTE, pas sur celle de la carte", () => {
  // `billing_details.email` est l'adresse de facturation du moyen de
  // paiement : celle du conjoint, de l'entreprise, ou vide. Couper
  // dessus, c'est couper l'acces de quelqu'un d'autre. On remonte a la
  // session, qui porte l'adresse qui a recu les acces, et la carte ne
  // sert que de dernier recours pour ne pas rester muet.
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/webhook/route.ts"),
    "utf8",
  );
  const session = route.indexOf("vente?.email");
  const carte = route.indexOf("charge?.billing_details?.email");
  assert.ok(session > 0 && carte > 0, "une des deux sources d'adresse a disparu");
  assert.ok(session < carte, "l'adresse de la carte passe AVANT celle de la vente");
});

test("l'email d'au revoir ne contient aucun tiret cadratin", () => {
  // Regle absolue de Bene sur tout contenu qu'elle signe (drame du
  // 7 juin 2026) : un tiret cadratin trahit le texte genere.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/email/refundGoodbyeEmail.ts"),
    "utf8",
  );
  const debut = src.indexOf("function buildContent");
  assert.ok(debut > 0, "buildContent a disparu");
  const corps = src.slice(debut);
  assert.ok(!corps.includes("\u2014"), "tiret cadratin dans l'email d'au revoir");
  assert.ok(!corps.includes("\u2013"), "tiret demi-cadratin dans l'email d'au revoir");
});

test("un plan promis A VIE ne redescend jamais par un remboursement", () => {
  // beta et lifetime ont ete promis a vie. Le seul chemin legitime pour
  // les retirer est la route d'administration. La liste vit a UN endroit,
  // partagee avec le webhook Systeme.io : deux copies finiraient par
  // diverger, et la divergence couterait un compte a vie.
  const grant = fs.readFileSync(path.join(process.cwd(), "lib/checkout/grantPlan.ts"), "utf8");
  const sio = fs.readFileSync(
    path.join(process.cwd(), "app/api/systeme-io/webhook/route.ts"),
    "utf8",
  );
  assert.ok(
    grant.includes("isLifetimePlan(previousPlan)"),
    "la retrogradation Stripe ne protege plus les plans a vie",
  );
  assert.ok(
    sio.includes('from "@/lib/plans/lifetime"'),
    "le webhook Systeme.io a repris sa propre copie de la liste des plans a vie",
  );
  assert.ok(
    !/const LIFETIME_PLANS[^=]*=\s*new Set/.test(sio),
    "une deuxieme definition de LIFETIME_PLANS est reapparue dans la route",
  );
});
