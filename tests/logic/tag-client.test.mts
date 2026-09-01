// tests/logic/tag-client.test.mts
//
// LE TAG QUI DÉCLENCHE LA SÉQUENCE D'ABONNEMENT.
//
// Béné, 1er septembre 2026 : "il faut que tu ajoutes le tag
// tiquiz-clients pour faire partir la campagne tiquiz abonnement à
// chaque vente sur notre système."
//
// Son workflow écoute `tiquiz-clients`. Le palier (`tiquiz-mensuel`...)
// ne déclenche rien : un client payé chez nous portait son palier et
// n'entrait dans AUCUNE séquence, sans qu'une ligne ne le dise.
//
// Le tag a été RELEVÉ dans son compte le 1er septembre (id 2156863).
// On ne le crée jamais : c'est la règle du 22 août.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PLAN_TO_TAG,
  TAG_CLIENT_TIQUIZ,
  readSioClientTag,
  readSioTag,
} from "@/lib/sio/tags";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("Le tag client se pose sur toute vente encaissée par nous", () => {
  test("le nom est celui de SON workflow, au caractère près", () => {
    // Une faute ici ne casse rien de visible : le tag n'est pas trouvé,
    // on répond `tag_inconnu`, et la séquence ne part jamais.
    assert.equal(TAG_CLIENT_TIQUIZ, "tiquiz-clients");
  });

  test("tous les paliers PAYANTS le portent", () => {
    for (const plan of Object.keys(PLAN_TO_TAG)) {
      if (plan === "free") continue;
      assert.equal(
        readSioClientTag(plan),
        TAG_CLIENT_TIQUIZ,
        `${plan} doit entrer dans la séquence client`,
      );
    }
  });

  test("UNE INSCRIPTION GRATUITE NE LE PORTE PAS", () => {
    // Elle a déjà SA campagne, déclenchée par `tiquiz-free` (vérifié par
    // Béné dans son tableau de bord). La marquer cliente l'enverrait
    // dans la séquence d'abonnement de quelqu'un qui n'a rien payé.
    assert.equal(readSioClientTag("free"), null);
  });

  test("un palier inconnu ne pose rien", () => {
    // On ne devine pas : un palier qu'on ne sait pas nommer n'a pas de
    // tag de palier non plus, donc rien ne part.
    assert.equal(readSioClientTag("premium_gold"), null);
    assert.equal(readSioClientTag(""), null);
    assert.equal(readSioClientTag(null), null);
    assert.equal(readSioClientTag(undefined), null);
  });

  test("IL S'AJOUTE AU PALIER, IL NE LE REMPLACE PAS", () => {
    // Ses segments et ses filtres sont bâtis sur le palier : poser
    // `tiquiz-clients` à la place les viderait tous d'un coup.
    assert.equal(readSioTag("monthly"), "tiquiz-mensuel");
    assert.equal(readSioClientTag("monthly"), "tiquiz-clients");
    assert.notEqual(readSioTag("monthly"), readSioClientTag("monthly"));
  });
});

describe("Les deux tags partent vraiment, sur les deux moyens de paiement", () => {
  const GRANT = lire("lib/checkout/grantPlan.ts");

  test("grantPlan pose le palier ET le tag client", () => {
    assert.match(GRANT, /poserTagPlan\(email, args\.plan/);
    assert.match(GRANT, /readSioClientTag\(args\.plan\)/);
    assert.match(GRANT, /poserTagParNom\(email, tagClient/);
  });

  test("les deux poses sont SÉPARÉES : une panne n'emporte pas l'autre", () => {
    // Les enchaîner (`await palier && await client`) ferait perdre les
    // deux pour une seule panne.
    const iPalier = GRANT.indexOf("const tagPose = await poserTagPlan(");
    const iClient = GRANT.indexOf("await poserTagParNom(email, tagClient");
    assert.ok(iPalier > 0 && iClient > iPalier, "le palier passe en premier");
    const entre = GRANT.slice(iPalier, iClient);
    assert.ok(
      /\.catch\(\(\) => false\)/.test(entre),
      "la pose du palier ne doit jamais jeter",
    );
  });

  test("UN TAG QUI ÉCHOUE NE PRIVE JAMAIS D'UN ACCÈS PAYÉ", () => {
    // "Il a payé le client, il doit recevoir ses accès, point barre."
    const iPlan = GRANT.indexOf("plan: args.plan,");
    const iTag = GRANT.indexOf("const tagPose = await poserTagPlan(");
    assert.ok(iPlan > 0 && iTag > iPlan, "le plan s'ouvre AVANT les tags");
    assert.ok(
      /poserTagParNom\(email, tagClient, \{[\s\S]*?\}\)\.catch\(\(\) => false\)/.test(GRANT),
      "la pose du tag client ne doit jamais jeter",
    );
  });

  test("un échec du tag client CRIE dans le journal", () => {
    // Elle a payé et sa séquence ne partira pas : ça ne bloque rien,
    // mais ça ne doit pas rester invisible non plus (règle du 3 août).
    assert.match(GRANT, /console\.error\(`\[grantPlan\] tag \$\{tagClient\} NON pose/);
  });

  test("les DEUX moyens de paiement passent par là", () => {
    // Stripe et PayPal : n'en brancher qu'un laisserait la moitié des
    // clients hors de sa séquence, et ça ne se verrait pas.
    for (const route of [
      "app/api/commande/webhook/route.ts",
      "app/api/commande/paypal/webhook/route.ts",
    ]) {
      assert.match(lire(route), /grantPlanByEmail\(/, `${route} doit passer par grantPlan`);
    }
  });

  test("ON NE CRÉE JAMAIS LE TAG s'il n'existe pas", () => {
    // Règle du 22 août : un tag créé par nous avec une faute se
    // retrouverait en double, et ses automatisations continueraient de
    // pointer l'ancien.
    const TAG = lire("lib/sio/appliquerTag.ts");
    assert.match(TAG, /On ne CRÉE jamais le tag manquant/);
  });
});
