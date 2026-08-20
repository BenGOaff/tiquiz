// tests/logic/stripe-checkout.test.mts
//
// LE PAIEMENT DE L'ATELIER, ET CE QUI NE DOIT JAMAIS BOUGER DEDANS.
//
// Ces tests ne parlent pas à Stripe. Ils figent les décisions qui, si
// elles changeaient sans qu'on le voie, coûteraient de l'argent ou de la
// confiance :
//   - la TVA est DANS le prix, jamais au dessus ;
//   - le prix vient du catalogue, jamais du navigateur ;
//   - une signature qui ne prouve rien est refusée.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  looksLikeTaxNotEnabled,
  verifyStripeSignature,
} from "../../lib/checkout/stripeCheckout.ts";

const SECRET = "whsec_test_de_signature";
const CORPS = '{"id":"evt_1","type":"checkout.session.completed"}';

function signer(corps: string, secret: string, horodatage: number): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${horodatage}.${corps}`, "utf8")
    .digest("hex");
  return `t=${horodatage},v1=${sig}`;
}

test("une signature valide et fraiche passe", () => {
  const t = Math.floor(Date.now() / 1000);
  assert.equal(verifyStripeSignature(CORPS, signer(CORPS, SECRET, t), SECRET), true);
});

test("rien d'autre ne passe", () => {
  const t = Math.floor(Date.now() / 1000);
  const bonne = signer(CORPS, SECRET, t);

  // Pas d'en-tête, pas de secret : on refuse, on ne "laisse passer par
  // défaut". Un webhook qui accepte sans vérifier ouvre des accès gratuits
  // à quiconque connaît l'adresse.
  assert.equal(verifyStripeSignature(CORPS, null, SECRET), false);
  assert.equal(verifyStripeSignature(CORPS, bonne, null), false);
  assert.equal(verifyStripeSignature(CORPS, bonne, ""), false);

  // Le corps a été modifié en route.
  assert.equal(verifyStripeSignature(CORPS + " ", bonne, SECRET), false);
  // Le secret n'est pas le bon.
  assert.equal(verifyStripeSignature(CORPS, bonne, "whsec_autre"), false);
  // En-tête mal formé.
  assert.equal(verifyStripeSignature(CORPS, "n'importe quoi", SECRET), false);
  assert.equal(verifyStripeSignature(CORPS, `t=${t}`, SECRET), false);
});

test("un rejeu vieux de plus de 5 minutes est refuse", () => {
  // Quelqu'un qui capte un appel légitime ne doit pas pouvoir le rejouer
  // une heure plus tard pour rouvrir un accès révoqué.
  const vieux = Math.floor(Date.now() / 1000) - 600;
  assert.equal(verifyStripeSignature(CORPS, signer(CORPS, SECRET, vieux), SECRET), false);

  // Et pas non plus un horodatage dans le futur.
  const futur = Math.floor(Date.now() / 1000) + 600;
  assert.equal(verifyStripeSignature(CORPS, signer(CORPS, SECRET, futur), SECRET), false);
});

test("le refus \"Stripe Tax pas active\" est reconnu, pas confondu avec une panne", () => {
  // Si on ne le reconnaît pas, Béné cherche un bug dans le code alors que
  // ça se règle en deux clics dans son tableau de bord.
  const vrais = [
    "You cannot use automatic_tax because Stripe Tax has not been activated on your account.",
    "Stripe Tax is not enabled for this account",
    "automatic_tax[enabled] requires Tax to be active",
  ];
  for (const m of vrais) {
    assert.equal(looksLikeTaxNotEnabled(m), true, `non reconnu : ${m}`);
  }

  const faux = [
    "",
    null,
    undefined,
    "Your card was declined.",
    "No such price: 'price_123'",
    "Invalid API Key provided",
  ];
  for (const m of faux) {
    assert.equal(looksLikeTaxNotEnabled(m), false, `faux positif : ${m}`);
  }
});

test("la TVA est DANS le prix, et le prix ne vient pas du navigateur", () => {
  // Deux décisions qui ne se voient qu'en lisant le code, et dont l'oubli
  // ne se verrait qu'en comptabilité (TVA ajoutée par dessus les 47 €) ou
  // sur un vol (un prix envoyé par le client, donc négociable par lui).
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/checkout/stripeCheckout.ts"),
    "utf8",
  );

  assert.ok(
    src.includes('"line_items[0][price_data][tax_behavior]": "inclusive"'),
    "tax_behavior n'est plus inclusive : la TVA s'ajouterait AU DESSUS des 47 EUR",
  );
  assert.ok(
    src.includes('"automatic_tax[enabled]": "true"'),
    "automatic_tax a disparu : plus aucun calcul de TVA par pays",
  );
  assert.ok(
    src.includes("p.amountCents"),
    "le montant ne vient plus du produit du catalogue",
  );
  assert.ok(
    !/unit_amount"\]\s*:\s*args\./.test(src),
    "le montant vient des arguments d'appel : un prix envoye par le client serait negociable par lui",
  );
});

test("le formulaire reste DANS notre page", () => {
  // `ui_mode: embedded` est la demande de Béné ("bon de commande pleine
  // page"). Repasser en page hébergée par Stripe enverrait l'acheteur sur
  // un écran qui n'est pas le sien, au moment le plus fragile du tunnel.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/checkout/stripeCheckout.ts"),
    "utf8",
  );
  assert.ok(src.includes('ui_mode: "embedded"'), "le paiement n'est plus integre a la page");
});

test("on n'encaisse pas de vrai argent tant que rien n'ouvre l'acces", () => {
  // Le garde-fou le plus important de ce chantier, et il est invisible :
  // une cle LIVE posee avant que le webhook existe encaisserait des ventes
  // dont personne n'ouvrirait l'acces. C'est le drame Ivan (7 aout), sauf
  // que cette fois l'argent serait sur notre compte.
  //
  // En mode test on laisse passer : c'est fait pour ca, personne n'est
  // debite.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/session/route.ts"),
    "utf8",
  );
  assert.ok(
    src.includes('compte.mode === "live" && !readOwnerStripeWebhookSecret'),
    "le garde-fou a saute : une cle live sans webhook encaisserait sans ouvrir d'acces",
  );
  assert.ok(
    src.includes("live_without_webhook"),
    "la raison renvoyee a l'ecran a disparu",
  );

  // Et l'ecran doit savoir la dire : une raison sans phrase, c'est un
  // echec silencieux (regle du 3 aout).
  const ecran = fs.readFileSync(
    path.join(process.cwd(), "app/commande/[produit]/CommandeClient.tsx"),
    "utf8",
  );
  assert.ok(
    ecran.includes("live_without_webhook"),
    "l'ecran ne sait pas traduire cette raison : l'acheteuse verrait un cadre vide",
  );
});

test("chaque raison du serveur a une phrase a l'ecran", () => {
  // Une raison sans phrase se traduit par un message generique, donc par
  // une acheteuse qui ne sait pas si elle a ete debitee.
  const ecran = fs.readFileSync(
    path.join(process.cwd(), "app/commande/[produit]/CommandeClient.tsx"),
    "utf8",
  );
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/session/route.ts"),
    "utf8",
  );
  const raisons = [...route.matchAll(/reason:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(raisons.length >= 4, `trop peu de raisons trouvees : ${raisons.join(", ")}`);
  for (const r of new Set(raisons)) {
    assert.ok(ecran.includes(`${r}:`), `la raison "${r}" n'a pas de phrase a l'ecran`);
  }
});

test("une vraie facture, pas seulement un recu (20 aout 2026)", () => {
  // Le 20 aout, la premiere vraie vente a produit "Recu de ETHILIFE
  // n. 1879-1677". Un recu prouve un paiement ; il ne porte ni numero de
  // facture, ni adresse de l'acheteur, donc un client professionnel ne
  // peut rien en faire. Trois lignes reparent ca, et les trois comptent.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/checkout/stripeCheckout.ts"),
    "utf8",
  );

  assert.ok(
    src.includes('params["invoice_creation[enabled]"] = "true"'),
    "invoice_creation a disparu : les acheteurs ne recevraient qu'un recu",
  );
  assert.ok(
    src.includes('billing_address_collection: "required"'),
    "sans adresse collectee, la facture n'a pas ses mentions obligatoires",
  );
  assert.ok(
    src.includes('"tax_id_collection[enabled]": "true"'),
    "sans numero de TVA collecte, aucune entreprise ne peut etre autoliquidee",
  );
  assert.ok(
    src.includes("include_inclusive_tax"),
    "le prix est TTC : la facture doit montrer la TVA CONTENUE, pas une taxe ajoutee",
  );
});

test("invoice_creation ne part JAMAIS sur un abonnement", () => {
  // `invoice_creation` n'existe qu'en mode paiement. Envoye sur un
  // abonnement, Stripe REFUSE la session : la caisse tombe. Et il serait
  // inutile de toute facon, un abonnement facturant tout seul a chaque
  // echeance. Le test verifie que la ligne vit bien dans la branche du
  // paiement unique, apres le `} else {`.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/checkout/stripeCheckout.ts"),
    "utf8",
  );
  const sinon = src.indexOf("  } else {");
  const facture = src.indexOf('params["invoice_creation[enabled]"]');
  assert.ok(sinon > 0 && facture > sinon, "invoice_creation est sorti de la branche paiement unique");
});

test("une couleur ne peut pas faire tomber la caisse", () => {
  // `branding_settings` donne au formulaire de Stripe le fond clair de la
  // page (Bene, 20 aout : "tout est sur fond clair, pas de fond fonce").
  // Ses valeurs sont des enumerations chez Stripe : si l'une changeait de
  // nom, la session serait refusee et plus personne ne pourrait payer.
  // On reessaie donc SANS l'habillage avant d'abandonner.
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/checkout/stripeCheckout.ts"),
    "utf8",
  );
  assert.ok(src.includes("STRIPE_BRANDING"), "l'habillage du formulaire Stripe a disparu");
  assert.ok(
    src.includes("mentionneLHabillage(out.detail)"),
    "le repli sans habillage a disparu : une couleur refusee bloquerait tous les paiements",
  );
  assert.ok(
    src.indexOf("postSession(args.key, params)") > src.indexOf("mentionneLHabillage(out.detail)"),
    "le second essai ne retire pas l'habillage",
  );
});

test("notre CSS ne traverse pas l'iframe de Stripe : les couleurs vivent a UN endroit", () => {
  // Le fond fonce vu par Bene n'etait pas le notre : le formulaire est
  // rendu dans une iframe de js.stripe.com, que nos feuilles de style
  // n'atteignent pas. La seule facon de le colorer est `branding_settings`.
  // Ces couleurs sont donc lues des DEUX cotes de la frontiere, et une
  // couleur ecrite deux fois finit par se contredire.
  const brand = fs.readFileSync(path.join(process.cwd(), "lib/checkout/brand.ts"), "utf8");
  for (const cle of ["background_color", "button_color", "font_family", "border_style"]) {
    assert.ok(brand.includes(cle), `branding_settings[${cle}] a disparu de brand.ts`);
  }
  // Cherche le PARAMETRE, pas le mot : `display_name` est cite dans un
  // commentaire juste au dessus, et un test qui attrape un commentaire
  // rougit sans qu'il y ait de bug.
  assert.ok(
    !brand.includes("branding_settings[display_name]"),
    "display_name est repose : le nom affiche doit rester celui du releve bancaire",
  );
});
