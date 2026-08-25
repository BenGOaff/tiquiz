// tests/logic/code-reduction.test.mts
//
// Béné, 25 août 2026 : "Codes de réduction : à prévoir pour que j'en
// attribue un à un affilié si besoin. Ne sera valable que sur le lien de
// l'affilié."
//
// Ce fichier surveille le côté TIQUIZ : ce qui est facturé. La décision
// "ce code est-il valable" vit chez Tipote, avec le registre des
// affiliées, et son test aussi.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  arbitrerRemiseEtEssai,
  prixRemiseCents,
  tipoteBaseUrl,
} from "../../lib/checkout/codeReduction.ts";

const lire = (p: string) => readFileSync(p, "utf8");

// ── Le calcul ────────────────────────────────────────────────────────

test("la remise se calcule sur le montant, arrondi au centime", () => {
  assert.equal(prixRemiseCents(1700, 20), 1360);
  assert.equal(prixRemiseCents(17000, 10), 15300);
  // 33 % de 1700 = 561,0 -> 1139
  assert.equal(prixRemiseCents(1700, 33), 1139);
});

test("un pourcentage hors bornes ne remise RIEN", () => {
  // Une valeur illisible ne doit pas produire un prix au hasard : sur de
  // l'argent, un doute se tranche en faveur du prix plein.
  for (const pct of [0, -10, 91, 100, 1.5, NaN, Infinity]) {
    assert.equal(prixRemiseCents(1700, pct as number), 1700, `pct ${pct}`);
  }
});

test("le prix remisé ne tombe jamais à zéro", () => {
  // Un abonnement à 0 € n'est pas une remise : il ne paie aucune
  // commission, n'émet aucune facture, et aucun écran ne le distingue
  // d'un vrai client.
  assert.equal(prixRemiseCents(1, 90), 1);
  assert.equal(prixRemiseCents(10, 90), 1);
  assert.equal(prixRemiseCents(0, 20), 0);
});

// ── Le cumul avec le mois offert ─────────────────────────────────────

test("le mois offert gagne sur le code, et ça se DIT", () => {
  // Le piège est technique et il coûte cher : un coupon Stripe
  // `duration: once` s'applique à la PREMIÈRE facture, et pendant un
  // essai gratuit la première facture vaut zéro. Cumuler brûlerait la
  // remise sur une facture à 0 €, et l'acheteur paierait plein tarif au
  // deuxième mois en croyant avoir eu son code.
  const avecEssai = arbitrerRemiseEtEssai(30);
  assert.equal(avecEssai.appliquer, false);
  assert.equal(avecEssai.appliquer === false && avecEssai.raison, "essai-plus-avantageux");

  assert.equal(arbitrerRemiseEtEssai(0).appliquer, true);
  assert.equal(arbitrerRemiseEtEssai(Number.NaN).appliquer, true);
});

test("l'écran a une phrase pour CHAQUE raison de refus", () => {
  // Un code saisi qui disparaît sans un mot, c'est la règle du
  // `ok: false` muet du 3 août. Le serveur renvoie la raison, l'écran la
  // met en mots.
  const src = lire("app/commande/[produit]/CommandeClient.tsx");
  for (const raison of [
    "mauvais-lien",
    "inconnu",
    "desactive",
    "expire",
    "produit-exclu",
    "remise-illisible",
    "indisponible",
    "essai-plus-avantageux",
  ]) {
    assert.ok(src.includes(raison), `aucune phrase pour la raison ${raison}`);
  }
});

// ── Ce qui est FACTURÉ ───────────────────────────────────────────────

test("Stripe remise la PREMIÈRE échéance, pas toutes", () => {
  // Baisser `unit_amount` marcherait sur un achat unique et serait FAUX
  // sur un abonnement : le prix créé est celui de toutes les échéances,
  // donc une remise de lancement deviendrait une remise à vie.
  const src = lire("lib/checkout/stripeCheckout.ts");
  assert.match(src, /duration: "once"/);
  assert.match(src, /discounts\[0\]\[coupon\]/);
  // Le coupon est fabriqué pour UN acheteur et UN instant : sans ces
  // bornes, un identifiant récupéré dans le trafic resservirait, et le
  // code de l'affiliée deviendrait un code public.
  assert.match(src, /max_redemptions: 1/);
  assert.match(src, /redeem_by/);
});

test("PayPal facture la même chose que Stripe", () => {
  // Un code qui marche par carte et pas par PayPal, c'est un bon de
  // commande qui ment sur l'un des deux.
  const src = lire("lib/checkout/paypalOwner.ts");
  assert.match(src, /remiseActive/);
  assert.match(src, /total_cycles: 1/);
  // Et la remise ne se pose JAMAIS par dessus un essai : la ceinture qui
  // va avec les bretelles de l'arbitrage.
  assert.match(src, /essaiJours === 0 &&/);
});

test("le pourcentage ne vient JAMAIS du navigateur", () => {
  // Un pourcentage qui voyage dans le corps d'une requête est un prix
  // que l'acheteur choisit lui-même. Le client envoie le CODE, le
  // serveur va chercher la remise.
  const client = lire("app/commande/[produit]/CommandeClient.tsx");
  assert.ok(!/percentOff:\s*\d/.test(client), "un pourcentage part du navigateur");
  assert.match(client, /code: codeApplique \|\| undefined/);

  const session = lire("app/api/commande/session/route.ts");
  assert.match(session, /verifierCodeReduction/);
  const paypal = lire("app/api/commande/paypal/route.ts");
  assert.match(paypal, /verifierCodeReduction/);
});

test("appliquer un code REMONTE le formulaire de paiement", () => {
  // Sans ce remontage, le formulaire garderait l'ancienne session, donc
  // l'ancien prix, et facturerait plein tarif derrière un code affiché
  // comme appliqué.
  const src = lire("app/commande/[produit]/CommandeClient.tsx");
  assert.match(src, /key=\{codeApplique \|\| "sans-code"\}/);
});

test("le champ existe dans TOUTES les branches qui proposent un paiement", () => {
  // C'est le défaut du 23 août, à l'identique : le bloc PayPal était
  // rendu dans deux branches sur trois, et celle qui manquait était la
  // seule que voit un acheteur quand tout va bien.
  const src = lire("app/commande/[produit]/CommandeClient.tsx");
  const corps = src.slice(src.indexOf("const blocCode = ("));
  const rendus = (corps.match(/\{blocCode\}/g) ?? []).length;
  assert.ok(rendus >= 3, `blocCode rendu ${rendus} fois, il en faut au moins 3`);
});

// ── Le repli ─────────────────────────────────────────────────────────

test("l'app interrogée n'est jamais une adresse locale", () => {
  // Un `??` ne protège que du MANQUANT, jamais du FAUX (drame Véronique).
  assert.equal(tipoteBaseUrl({}), "https://app.tipote.com");
  assert.equal(tipoteBaseUrl({ TIPOTE_APP_URL: "http://localhost:3000" }), "https://app.tipote.com");
  assert.equal(tipoteBaseUrl({ TIPOTE_APP_URL: "https://app.tipote.com/" }), "https://app.tipote.com");
  assert.equal(tipoteBaseUrl({ TIPOTE_APP_URL: "https://preprod.tipote.com" }), "https://preprod.tipote.com");
});

test("un code non vérifiable ne remise pas, et ça crie", () => {
  // Appliquer une remise qu'on n'a pas pu vérifier laisserait n'importe
  // quel mot de six lettres rabotter une vente.
  const src = lire("lib/checkout/codeReduction.ts");
  assert.match(src, /raison: "indisponible"/);
  assert.match(src, /console\.error/);
});
