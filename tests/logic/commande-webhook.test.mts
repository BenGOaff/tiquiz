// tests/logic/commande-webhook.test.mts
//
// LE WEBHOOK QUI OUVRE LES ACCÈS, ET LES QUATRE CHOSES QU'IL NE DOIT
// JAMAIS CESSER DE FAIRE.
//
// C'est le seul endroit où un accès s'ouvre après un paiement. Chacune
// des garanties ci-dessous a un drame derrière elle, et aucune ne se voit
// à l'écran tant qu'elle tient.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROUTE = path.join(process.cwd(), "app/api/commande/webhook/route.ts");
const src = fs.readFileSync(ROUTE, "utf8");

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("la signature est verifiee AVANT tout le reste", () => {
  // Sans ça, cette adresse est un distributeur d'accès gratuits pour qui
  // la connaît. Et le corps doit être lu BRUT : la signature porte sur les
  // octets reçus, pas sur un objet reconstruit.
  assert.ok(src.includes("verifyStripeSignature"), "plus aucune verification de signature");
  assert.ok(src.includes("await req.text()"), "le corps n'est plus lu brut");

  // On vise les APPELS, pas les lignes d'import : comparer des positions
  // d'import ferait passer ce test au vert quel que soit l'ordre reel du
  // code, c'est a dire exactement le genre de test qui rassure a tort.
  const posSignature = src.indexOf("verifyStripeSignature(raw");
  const posParse = src.indexOf("JSON.parse(raw)");
  assert.ok(posSignature > 0 && posParse > 0, "appels introuvables : le test ne mesure plus rien");
  assert.ok(
    posSignature < posParse,
    "le corps est parse avant d'etre verifie : la verification ne prouve plus rien",
  );

  // Secret absent = on refuse. L'absence ferme.
  assert.ok(
    src.includes("readOwnerStripeWebhookSecret"),
    "le secret n'est plus lu : impossible de verifier quoi que ce soit",
  );
});

test("un evenement deja traite n'ouvre pas l'acces une deuxieme fois", () => {
  // Stripe réessaie tant qu'il n'a pas un 2xx. Sans verrou, un réessai
  // rejouerait la vente.
  assert.ok(src.includes("prendreLeVerrou"), "plus de verrou, donc plus d'idempotence");
  assert.match(src, /verrou\.action === "doublon"/);

  const posVerrou = src.indexOf("await prendreLeVerrou(");
  const posGrant = src.indexOf("await grantPlanByEmail(");
  assert.ok(posVerrou > 0 && posGrant > 0, "appels introuvables : le test ne mesure plus rien");
  assert.ok(
    posVerrou < posGrant,
    "l'acces est ouvert AVANT le verrou : un reessai rejouerait la vente",
  );
});

test("UN TRAITEMENT RATE PEUT ETRE REPRIS (audit 24 aout)", () => {
  // LE BUG : la route repondait 502 pour demander un reessai, et ce
  // reessai retombait sur la ligne de journal, etait pris pour un
  // doublon, et recevait 200. Une vente encaissee dont le premier
  // traitement ratait n'ouvrait donc JAMAIS l'acces, en silence.
  //
  // Deux pieces, et les deux comptent : le statut fait partie du verrou
  // (migration), et l'echec MARQUE la ligne pour la liberer.
  assert.match(src, /marquerTraite\(SOURCE, eventId, reussi \? "processed" : "error"/);
  assert.match(src, /verrou\.action === "en_cours"/, "un traitement en cours devrait demander un reessai");

  const migration = lire("supabase/migrations/20260824_webhook_lock.sql");
  assert.match(migration, /status in \('processing', 'processed'\)/);
  assert.match(migration, /drop index if exists public\.webhook_logs_owner_event_uidx/);
});

test("TOUTES les sorties passent par le marquage", () => {
  // Un `return` oublie au milieu de deux cents lignes laisserait
  // l'evenement bloque en `processing`, donc repris toutes les deux
  // minutes. La separation en deux fonctions est ce qui l'empeche.
  assert.match(src, /async function traiterEvenement\(/);
  // Le POST ne fait plus le travail lui meme : il verrouille, delegue,
  // et marque.
  assert.match(src, /reponse = await traiterEvenement\(/);
  // Et une exception ne laisse pas la ligne bloquee non plus.
  assert.match(src, /await marquerTraite\(SOURCE, eventId, "error"/);
});

test("seuls DEUX evenements valent un encaissement", () => {
  // On ne devine jamais qu'un événement inconnu vaut un paiement : c'est
  // ce garde-fou qui empêche un appel mal configuré d'ouvrir un accès.
  // Et le second n'est pas optionnel : il couvre les paiements différés,
  // confirmés APRÈS la session. Sans lui, ces ventes n'ouvriraient rien.
  assert.ok(src.includes('"checkout.session.completed"'), "l'evenement principal a disparu");
  assert.ok(
    src.includes('"checkout.session.async_payment_succeeded"'),
    "les paiements differes n'ouvriraient plus aucun acces",
  );
});

test("on relit la vente chez Stripe au lieu de croire l'appel", () => {
  // La signature prouve que l'appel vient de Stripe. Elle ne prouve pas
  // que l'objet qu'il porte est à jour : sur un paiement différé, le
  // statut du corps peut encore dire "impayé".
  assert.ok(src.includes("retrieveOwnerSession"), "on ne relit plus la vente");
  assert.ok(src.includes("vente.paid"), "le statut de paiement n'est plus controle");
});

test("le plan ouvert vient du catalogue, jamais d'une devinette", () => {
  // Une vente encaissée dont on ne sait pas nommer le produit n'ouvre
  // RIEN, mais elle crie dans le journal : c'est exactement la situation
  // d'Ivan (7 août), et elle appelle une action humaine.
  assert.ok(src.includes("findOwnerProduct"), "le produit ne vient plus du catalogue");
  assert.ok(src.includes("product.plan"), "le plan n'est plus lu dans le catalogue");
  assert.ok(
    /unknown_product/.test(src) && /console\.error/.test(src),
    "un produit inconnu passerait en silence",
  );
});

test("un echec d'ouverture demande un reessai, il ne se tait pas", () => {
  // Une cliente a payé : on veut que Stripe rappelle. Répondre 200 sur un
  // échec d'octroi enterrerait la vente.
  const bloc = src.slice(src.indexOf("const octroi"));
  assert.ok(bloc.includes("status: 502"), "un echec d'ouverture repond 200 : la vente serait perdue");
  assert.ok(bloc.includes("console.error"), "un echec d'ouverture ne laisse aucune trace");
});

test("la source est distincte de celle de Systeme.io", () => {
  // Les deux journaux partagent la table `webhook_logs`. Une source
  // commune mélangerait les idempotences, et un identifiant réutilisé
  // par l'un ferait sauter une vente de l'autre.
  assert.ok(src.includes('const SOURCE = "stripe"'), "la source du journal a change");
  assert.ok(!src.includes('"systeme_io"'), "la source de Systeme.io est reutilisee ici");
});
