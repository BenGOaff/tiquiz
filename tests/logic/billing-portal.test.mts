// tests/logic/billing-portal.test.mts
//
// "ILS VEULENT PAYER AVEC UNE AUTRE CARTE ?" (Béné, 21 août 2026.)
//
// Oui, et sans qu'on écrive un seul champ de carte : le portail client
// de Stripe fait déjà tout. Ce qui manquait n'était pas l'écran, c'était
// le FIL : on encaissait, on ouvrait le plan, et on jetait l'identifiant
// du client Stripe. Sans lui, aucun portail n'est ouvrable.
//
// Ces tests protègent trois choses, dans cet ordre d'importance :
//
//   1. l'identifiant n'est JAMAIS lu depuis la requête (sinon n'importe
//      qui ouvre le portail de n'importe qui) ;
//   2. le fil est bien capturé au moment de la vente ;
//   3. un refus produit une phrase, jamais un clic sans effet.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  createBillingPortalSession,
  looksLikePortalNotConfigured,
} from "../../lib/checkout/billingPortal.ts";
import { readCustomerId } from "../../lib/checkout/stripeCheckout.ts";

const lire = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("SECURITE : l'identifiant du client ne vient JAMAIS de la requete", () => {
  // Le coeur du sujet. S'il etait lu dans le corps du POST, n'importe qui
  // pourrait ouvrir le portail de n'importe qui : ses factures, son
  // adresse, sa carte. Il est relu en base a partir de la session.
  const route = lire("app/api/compte/facturation/route.ts");
  assert.ok(route.includes("readStripeCustomerId(user.id)"), "l'identifiant n'est plus relu en base");
  assert.ok(
    !/body\s*[.?]\s*customerId|body\.customer\b/.test(route),
    "l'identifiant du client est lu depuis la requete",
  );
  assert.ok(route.includes("auth.getUser()"), "la route n'exige plus d'etre connecte");
  assert.ok(route.includes('reason: "not_signed_in"'), "un visiteur anonyme n'est plus refuse");
});

test("sans identifiant, on ne fabrique rien", () => {
  // L'absence FERME, comme partout dans ce depot. Une session de portail
  // ouverte sur un client vide serait au mieux une erreur Stripe, au
  // pire le portail de quelqu'un d'autre.
  return createBillingPortalSession({
    key: "sk_test_x",
    customerId: "   ",
    returnUrl: "https://quiz.tipote.com/settings",
  }).then((r) => {
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no_customer");
  });
});

test("le portail non configure est reconnu, pas confondu avec une panne", () => {
  // Stripe exige une configuration par defaut avant d'accepter la
  // moindre session. Tant qu'elle manque, il repond une erreur qui
  // ressemble a un bug alors que ca se regle en deux clics. Meme regle
  // que Stripe Tax sur le bon de commande.
  for (const m of [
    "No configuration provided and your test mode default configuration has not been created.",
    "Your customer portal configuration is missing",
  ]) {
    assert.ok(looksLikePortalNotConfigured(m), m);
  }
  assert.ok(!looksLikePortalNotConfigured("No such customer: cus_123"));
  assert.ok(!looksLikePortalNotConfigured(""));
  assert.ok(!looksLikePortalNotConfigured(null));
});

test("l'identifiant du client se lit sous SES DEUX formes", () => {
  // Stripe renvoie soit la chaine, soit l'objet complet quand la
  // ressource est etendue. N'en lire qu'une marcherait aujourd'hui et
  // casserait au premier `expand` : la lecon du drame Ivan, ou on
  // raisonnait sur la forme SUPPOSEE d'un payload.
  assert.equal(readCustomerId("cus_123"), "cus_123");
  assert.equal(readCustomerId({ id: "cus_123" }), "cus_123");
  assert.equal(readCustomerId("  cus_123  "), "cus_123");
  for (const v of [null, undefined, "", "   ", {}, { id: 42 }, 7]) {
    assert.equal(readCustomerId(v), null, JSON.stringify(v));
  }
});

test("LE FIL EST CAPTURE AU MOMENT DE LA VENTE", () => {
  // Sans ca, la colonne resterait vide pour toujours et le bouton
  // n'apparaitrait jamais a personne.
  const stripe = lire("lib/checkout/stripeCheckout.ts");
  assert.ok(/customerId: string \| null;/.test(stripe), "la session ne rend plus le client");
  assert.ok(stripe.includes("readCustomerId(json.customer)"), "le client n'est plus lu sur la session");

  const webhook = lire("app/api/commande/webhook/route.ts");
  assert.ok(webhook.includes("rememberStripeCustomer("), "le webhook ne retient plus le client");
  // APRES l'octroi : c'est lui qui cree le profil sur un premier achat.
  const iOctroi = webhook.indexOf("const octroi = await grantPlanByEmail(");
  const iLien = webhook.indexOf("rememberStripeCustomer({\n    email: vente.email");
  assert.ok(iOctroi > 0 && iLien > iOctroi, "le lien est enregistre avant que le profil existe");
});

test("un echec du lien ne fait PAS echouer le webhook", () => {
  // Un acces ouvert vaut plus qu'un lien de facturation. Faire echouer
  // le webhook ici rejouerait l'evenement en boucle pour un desagrement.
  const webhook = lire("app/api/commande/webhook/route.ts");
  const i = webhook.indexOf("rememberStripeCustomer({\n    email: vente.email");
  const apres = webhook.slice(i, i + 900);
  assert.ok(!/status:\s*50\d/.test(apres), "un lien rate renvoie une erreur au lieu d'un avertissement");
  assert.ok(apres.includes("console.warn"), "un lien rate passe en silence");
});

test("UN REFUS PRODUIT UNE PHRASE, jamais un clic sans effet", () => {
  // Regle du 3 aout : un `ok: false` doit produire quelque chose a
  // l'ecran. Un clic sans effet envoie l'utilisatrice chercher au
  // mauvais endroit, ce qui coute plus cher que la panne.
  const ecran = lire("components/settings/SettingsClient.tsx");
  assert.ok(ecran.includes("setPortailErreur("), "aucun message d'erreur");
  assert.ok(ecran.includes('t("billingPortalElsewhere")'), "le cas Systeme.io n'est pas distingue");
  assert.ok(ecran.includes('t("billingPortalFailed")'), "aucune phrase de repli");
});

test("le bouton ne s'affiche QUE si le portail peut s'ouvrir", () => {
  // Les abonnes arrives par Systeme.io n'ont rien a gerer ici. Proposer
  // une porte qui ne s'ouvre pas est pire que ne rien proposer : c'est
  // la regle du coach de l'Atelier (2 aout).
  const ecran = lire("components/settings/SettingsClient.tsx");
  assert.ok(
    ecran.includes("profile?.stripe_customer_id && ("),
    "le bouton s'affiche meme sans client Stripe",
  );
});

test("les cinq libelles existent dans les 7 langues", () => {
  const cles = [
    "billingPortalCta",
    "billingPortalOpening",
    "billingPortalHint",
    "billingPortalFailed",
    "billingPortalElsewhere",
  ];
  const locales = ["fr", "en", "es", "it", "pt", "pt-BR", "ar"];
  for (const l of locales) {
    const j = JSON.parse(lire(`messages/${l}.json`)) as { settings?: Record<string, string> };
    for (const k of cles) {
      const v = j.settings?.[k];
      assert.ok(v && v.trim().length > 0, `${l} : ${k} manquant`);
      // La regle anti-IA de Bene, sur du contenu VU par ses clientes.
      assert.ok(!/[—–]/.test(v), `${l} : ${k} contient un tiret cadratin`);
    }
  }
});

test("la migration du lien Stripe suit les regles du depot", () => {
  const sql = lire("supabase/migrations/20260821_stripe_customer.sql");
  assert.ok(/ADD COLUMN IF NOT EXISTS stripe_customer_id/i.test(sql), "pas de IF NOT EXISTS");
  assert.ok(/NOTIFY pgrst, 'reload schema'/i.test(sql), "pas de rechargement du schema");
});
