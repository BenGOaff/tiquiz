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

import { buildPlanOpenedContent } from "../../lib/email/planOpenedContent.ts";

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
  assert.ok(src.includes("sendPlanOpenedEmail"), "grantPlan n'envoie plus notre email");
  // L'email "ton lien de connexion" commence par "Tu as demandé à te
  // connecter" : c'est faux apres un paiement, elle n'a rien demande,
  // elle a paye. Voir le bloc de tests plus bas.
  assert.ok(
    !src.includes("sendMagicLinkEmail"),
    "grantPlan est revenu a l'email de connexion : il ne confirme aucun achat",
  );
  // Notre lien passe par le jeton, pas par le lien de Supabase.
  assert.ok(src.includes("hashed_token"), "le lien n'est plus construit a partir du jeton");
  assert.ok(src.includes("buildAuthCallbackUrl"), "le lien ne passe plus par /auth/callback");
});

test("l'etiquette Systeme.io est posee, et elle ne bloque JAMAIS l'acces", () => {
  const src = lire(GRANT);
  assert.ok(src.includes("poserTagPlan"), "l'etiquette Systeme.io n'est plus posee");
  // "Il a paye le client, il doit recevoir ses acces, point barre."
  // Une etiquette qui echoue ne doit pas faire echouer l'ouverture.
  assert.ok(
    /poserTagPlan\([^)]*\)\.catch\(/.test(src),
    "une etiquette qui echoue peut desormais priver quelqu'un de son acces",
  );
});

test("le plan est pose AVANT l'email et AVANT l'etiquette", () => {
  // L'ordre est la seule protection : envoyer l'email d'abord ferait
  // decouvrir a la cliente un compte en gratuit apres avoir paye.
  const src = lire(GRANT);
  const iPlan = src.indexOf('from("profiles").upsert');
  // Les APPELS, pas les imports : ceux-ci sont en haut du fichier.
  const iTag = src.indexOf("await poserTagPlan(");
  const iMail = src.indexOf("await sendPlanOpenedEmail(");
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


// ── CE QUE LA CLIENTE LIT APRÈS AVOIR PAYÉ (23 août 2026) ──
//
// Béné, apres le premier vrai paiement sur notre bon de commande : "j'ai
// bien reçu un lien de connexion mais pas le mail de bienvenue : il faut
// vérifier qu'une personne qui était en gratuit et passe en payant
// reçoit bien ce qu'il faut."
//
// Elle recevait "Tiquiz : ton lien de connexion", qui commence par "Tu
// as demandé à te connecter à Tiquiz sans mot de passe". Elle n'avait
// pas demandé à se connecter : elle avait payé. Et pour une cliente déjà
// inscrite en gratuit, ce message ne disait strictement rien de son
// achat. Même drame que la montée de palier de l'Atelier, 7 août.

/** Les 7 langues de l'interface. */
const LOCALES = ["fr", "en", "es", "it", "pt", "pt-BR", "ar"];

const SITUATIONS = ["nouveau-compte", "montee-de-palier"] as const;

test("la confirmation d'achat NOMME le plan paye, dans les 7 langues", () => {
  for (const loc of LOCALES) {
    for (const situation of SITUATIONS) {
      const { subject, html, text } = buildPlanOpenedContent({
        situation,
        planLabel: "Tiquiz mensuel",
        actionLink: "https://quiz.tipote.com/auth/callback?token_hash=abc&type=magiclink",
        locale: loc,
      });
      assert.ok(subject.includes("Tiquiz"), `${loc}/${situation} : le sujet ne dit pas Tiquiz`);
      assert.ok(html.includes("Tiquiz mensuel"), `${loc}/${situation} : le plan n'est pas nomme`);
      assert.ok(text.includes("Tiquiz mensuel"), `${loc}/${situation} : version texte sans le plan`);
      assert.ok(html.includes("token_hash=abc"), `${loc}/${situation} : plus de lien d'entree`);
    }
  }
});

test("on ne souhaite pas la bienvenue a quelqu'un qui a deja un compte", () => {
  // C'est la correction de l'Atelier du 7 aout, portee ici : un eleve
  // qui achetait l'upsell recevait le message du jour de son
  // inscription, sans jamais voir sa commande confirmee.
  for (const loc of LOCALES) {
    const nouveau = buildPlanOpenedContent({
      situation: "nouveau-compte",
      planLabel: "Tiquiz mensuel",
      actionLink: "https://x/y",
      locale: loc,
    });
    const montee = buildPlanOpenedContent({
      situation: "montee-de-palier",
      planLabel: "Tiquiz mensuel",
      actionLink: "https://x/y",
      locale: loc,
    });
    assert.notEqual(nouveau.subject, montee.subject, `${loc} : les deux sujets sont identiques`);
    assert.notEqual(nouveau.html, montee.html, `${loc} : les deux messages sont identiques`);
  }
});

test("la confirmation ne dit JAMAIS que la cliente a demande a se connecter", () => {
  // La phrase exacte de l'email qu'elle a recu le 23 aout.
  const interdits = [
    /demand[ée] à te connecter/i,
    /asked to sign in/i,
    /has pedido entrar/i,
    /Hai chiesto di accedere/i,
    /Pediste para entrar/i,
    /pediu para entrar/i,
  ];
  for (const loc of LOCALES) {
    for (const situation of SITUATIONS) {
      const { html } = buildPlanOpenedContent({
        situation,
        planLabel: "Tiquiz mensuel",
        actionLink: "https://x/y",
        locale: loc,
      });
      for (const motif of interdits) {
        assert.ok(!motif.test(html), `${loc}/${situation} : le message parle encore de connexion demandee`);
      }
    }
  }
});

test("aucun tiret cadratin dans ce que la cliente lit", () => {
  for (const loc of LOCALES) {
    for (const situation of SITUATIONS) {
      const { subject, html } = buildPlanOpenedContent({
        situation,
        planLabel: "Tiquiz mensuel",
        actionLink: "https://x/y",
        locale: loc,
      });
      assert.ok(!/[\u2013\u2014]/.test(subject + html), `${loc}/${situation} : tiret cadratin`);
    }
  }
});

test("un plan sans nom ne produit pas un email troue", () => {
  // `planLabel` est optionnel en amont : si personne ne le passe, on
  // retombe sur le nom du plan technique, jamais sur une phrase a trou.
  const { html, subject } = buildPlanOpenedContent({
    situation: "montee-de-palier",
    planLabel: "",
    actionLink: "https://x/y",
    locale: "fr",
  });
  assert.ok(!html.includes("{plan}"), "la variable {plan} est restee dans le message");
  assert.ok(!subject.includes("{plan}"), "la variable {plan} est restee dans le sujet");
});
