// tests/logic/apres-paiement.test.mts
//
// CE QUI SUIT UN PAIEMENT PRIS CHEZ NOUS.
//
// Béné, 22 août : "Et le paiement il marche sur stripe et paypal ? Sur
// tiquiz et l'atelier ? On peut mettre en place ?"
//
// Trois choses devaient être vraies avant de pouvoir répondre oui, et
// deux ne l'étaient pas.
//
// 1. L'email d'accès venait de SUPABASE, donc de ses gabarits à elle,
//    configurés pour l'autre app. C'est exactement ce qui l'a fait
//    hurler le 22 août : "je demande un lien magique sur tiquiz et je
//    reçois les trucs tipote c'est pas pro du tout !!" Le tout premier
//    message qu'une cliente reçoit après avoir payé ne peut pas porter
//    le nom d'un autre produit.
// 2. L'étiquette Systeme.io n'était pas posée. Ses automatisations sont
//    bâties dessus : un client non étiqueté sort de toutes ses séquences
//    sans que rien ne le signale.
// 3. La facture, elle, était déjà là (`invoice_creation` chez Stripe).
//
// Ces trois garanties se lisent dans le code, pas à l'exécution : un
// paiement réel ne se rejoue pas dans un test. C'est le même genre de
// filet que `tests/logic/editor-chrome.test.mts`, et il attrape
// exactement ce qu'il doit attraper : quelqu'un qui, en rangeant,
// rebrancherait l'email de Supabase.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

const GRANT = "lib/checkout/grantPlan.ts";

test("l'email d'acces est ECRIT PAR NOUS, jamais envoye par Supabase", () => {
  const src = lire(GRANT);
  // `signInWithOtp` fait envoyer l'email par Supabase, avec SON gabarit.
  assert.ok(
    !src.includes("signInWithOtp"),
    "grantPlan est revenu a l'email de Supabase : la cliente recevra le gabarit de l'autre app",
  );
  assert.ok(src.includes("sendMagicLinkEmail"), "grantPlan n'envoie plus notre email");
  // Notre lien passe par le jeton, pas par le lien de Supabase.
  assert.ok(src.includes("hashed_token"), "le lien n'est plus construit a partir du jeton");
  assert.ok(src.includes("buildAuthCallbackUrl"), "le lien ne passe plus par /auth/callback");
});

test("l'etiquette Systeme.io est posee, et elle ne bloque JAMAIS l'acces", () => {
  const src = lire(GRANT);
  assert.ok(src.includes("poserTagAchat"), "l'etiquette Systeme.io n'est plus posee");
  // "Il a paye le client, il doit recevoir ses acces, point barre."
  // Une etiquette qui echoue ne doit pas faire echouer l'ouverture.
  assert.ok(
    /poserTagAchat\([^)]*\)\.catch\(/.test(src),
    "une etiquette qui echoue peut desormais priver quelqu'un de son acces",
  );
});

test("le plan est pose AVANT l'email et AVANT l'etiquette", () => {
  // L'ordre est la seule protection : envoyer l'email d'abord ferait
  // decouvrir a la cliente un compte en gratuit apres avoir paye.
  const src = lire(GRANT);
  const iPlan = src.indexOf('from("profiles").upsert');
  // Les APPELS, pas les imports : ceux-ci sont en haut du fichier.
  const iTag = src.indexOf("await poserTagAchat(");
  const iMail = src.indexOf("await sendMagicLinkEmail(");
  assert.ok(iPlan > 0 && iTag > iPlan, "l'etiquette est posee avant le plan");
  assert.ok(iMail > iPlan, "l'email part avant que le plan soit pose");
});

test("on ne CREE jamais une etiquette manquante chez Systeme.io", () => {
  // Une etiquette creee par nous avec une faute se retrouverait en
  // double dans sa liste, et ses automatisations continueraient de
  // pointer l'ancienne. Mieux vaut ne rien poser et le dire.
  const src = lire("lib/sio/appliquerTag.ts");
  assert.ok(
    !/method: "POST"[\s\S]{0,120}\/tags"/.test(src),
    "le code cree desormais des etiquettes chez Systeme.io",
  );
  assert.ok(src.includes("l'etiquette"), "le code ne dit plus pourquoi il n'a rien pose");
});

test("on revérifie l'adresse du contact avant de l'etiqueter", () => {
  // Selon les API, un filtre `?email=` peut etre ignore et rendre la
  // premiere page complete. Sans cette verification, on etiquetterait
  // un inconnu.
  const src = lire("lib/sio/appliquerTag.ts");
  assert.ok(
    src.includes('String(c?.email ?? "").trim().toLowerCase() === email'),
    "le contact n'est plus verifie : on peut etiqueter la mauvaise personne",
  );
});

test("la facture est bien emise par Stripe", () => {
  // Elle etait deja la, et c'est la seule des trois qui n'a pas eu
  // besoin d'etre corrigee. Le test la fige : elle ne sert a rien en
  // local, et rien d'autre ne dirait qu'on l'a retiree.
  const src = lire("lib/checkout/stripeCheckout.ts");
  assert.ok(
    src.includes('params["invoice_creation[enabled]"] = "true"'),
    "les achats uniques n'emettent plus de facture",
  );
});

test("le bon de commande affiche les CGV et la renonciation", () => {
  // Nos CGV disent "cette renonciation est recueillie avant paiement".
  // Sans cette mention a l'ecran, le texte annonce quelque chose que
  // l'interface ne fait pas.
  const src = lire("app/commande/[produit]/CommandeClient.tsx");
  assert.ok(src.includes('href="/terms"'), "le bon de commande ne mene plus aux CGV");
  assert.ok(src.includes('href="/privacy"'), "le bon de commande ne mene plus a la confidentialite");
  assert.ok(src.includes("L221-28"), "la renonciation au droit de retractation a disparu");
});
