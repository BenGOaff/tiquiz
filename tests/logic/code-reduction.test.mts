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
  planDuCheckout,
  prixRemiseCents,
  tipoteBaseUrl,
} from "../../lib/checkout/codeReduction.ts";
import {
  couponPourRemise,
  lireRemiseEnAttente,
  poserLaRemise,
} from "../../lib/checkout/remiseDifferee.ts";

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

test("des jours offerts REMPLACENT le mois, ils ne s'ajoutent pas", () => {
  // Béné : "deux mois gratis AU LIEU d'un". 60 jours, pas 30 + 60.
  const p = planDuCheckout({
    joursOfferts: 30,
    avantage: { type: "free_days", jours: 60 },
  });
  assert.equal(p.jours, 60);
  assert.equal(p.coupon, null);
  assert.equal(p.differee, null);
});

test("un code ne rouvre JAMAIS un essai refusé", () => {
  // Le moteur du mois offert dit déjà "un seul par personne, point
  // barre" (23 août) et refuse l'auto-affiliation. Un code qui passerait
  // outre rouvrirait exactement le trou qu'on a fermé. Et l'écran le
  // DIT, au lieu d'avaler le code en silence.
  const p = planDuCheckout({
    joursOfferts: 0,
    avantage: { type: "free_days", jours: 60 },
  });
  assert.equal(p.jours, 0);
  assert.equal(p.refus, "essai-refuse");
});

test("une remise ATTEND la fin de l'essai quand il y en a un", () => {
  // "Un pourcentage sur le premier mois APRÈS le mois gratuit." Un
  // coupon posé au checkout risquerait de se consommer sur la facture
  // d'essai à 0 €, et l'acheteur paierait plein tarif au premier vrai
  // mois en croyant avoir eu son code.
  const p = planDuCheckout({
    joursOfferts: 30,
    avantage: { type: "percent", percentOff: 40, duree: "once", mois: null },
  });
  assert.equal(p.jours, 30);
  assert.equal(p.coupon, null);
  assert.equal(p.differee?.percentOff, 40);
});

test("sans essai, la remise s'applique tout de suite", () => {
  const p = planDuCheckout({
    joursOfferts: 0,
    avantage: { type: "percent", percentOff: 40, duree: "forever", mois: null },
  });
  assert.equal(p.coupon?.duree, "forever");
  assert.equal(p.differee, null);
});

test("les trois durées de remise traversent le plan intactes", () => {
  // Les cinq demandes de Béné se rangent en trois durées : la première
  // échéance, N mois ("décembre à -40%"), et toujours.
  for (const duree of ["once", "forever", "months"] as const) {
    const p = planDuCheckout({
      joursOfferts: 0,
      avantage: { type: "percent", percentOff: 25, duree, mois: duree === "months" ? 3 : null },
    });
    assert.equal(p.coupon?.duree, duree);
    if (duree === "months") assert.equal(p.coupon?.mois, 3);
  }
});

// ── La remise différée ───────────────────────────────────────────────

test("une remise en attente se relit dans les metadata", () => {
  const r = lireRemiseEnAttente({ remise_pct: "40", remise_duree: "once", discount_code: "NOEL" });
  assert.equal(r?.percentOff, 40);
  assert.equal(r?.duree, "once");
  assert.equal(r?.code, "NOEL");
});

test("un abonnement SANS remise en attente ne déclenche rien", () => {
  // C'est le cas de l'immense majorité des abonnements : il ne faut
  // surtout pas qu'ils posent un coupon au passage.
  assert.equal(lireRemiseEnAttente(null), null);
  assert.equal(lireRemiseEnAttente({}), null);
  assert.equal(lireRemiseEnAttente({ remise_pct: "0" }), null);
  assert.equal(lireRemiseEnAttente({ remise_pct: "150" }), null);
  // "N mois" sans N n'est pas applicable : on ne choisit pas un N à la
  // place de Béné.
  assert.equal(lireRemiseEnAttente({ remise_pct: "20", remise_duree: "months" }), null);
});

test("un webhook rejoué ne pose PAS deux fois la remise", () => {
  // Deux remises cumulées sur un abonnement, ça se voit sur un relevé,
  // pas sur un écran.
  const remise = { percentOff: 40, duree: "once" as const, mois: null, code: "NOEL" };
  assert.equal(poserLaRemise({ remise, dejaPosee: false, statut: "trialing" }), true);
  assert.equal(poserLaRemise({ remise, dejaPosee: true, statut: "trialing" }), false);
  assert.equal(poserLaRemise({ remise: null, dejaPosee: false, statut: "trialing" }), false);
  // Un abonnement déjà mort ne reçoit pas de remise.
  assert.equal(poserLaRemise({ remise, dejaPosee: false, statut: "canceled" }), false);
});

test("le coupon différé porte la durée du code", () => {
  const c = couponPourRemise({ percentOff: 40, duree: "months", mois: 3, code: "NOEL" });
  assert.equal(c.duration, "months");
  assert.equal(c.duration_in_months, 3);
  assert.equal(c.percent_off, 40);
  // Un coupon fabriqué pour UN abonnement, pas pour la terre entière.
  assert.equal(c.max_redemptions, 1);
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
    "pas-encore",
    "essai-refuse",
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
  // La durée vient du CODE, elle n'est plus écrite en dur : Béné a
  // demandé les trois (première échéance, N mois, à vie).
  assert.match(src, /duration: remise\.duree/);
  assert.match(src, /duration_in_months = remise\.mois/);
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
  // PayPal exprime TOUT en cycles de facturation, donc il rend les cinq
  // cas sans mécanique différée : l'essai, puis le cycle remisé, puis le
  // prix plein se suivent naturellement.
  const src = lire("lib/checkout/paypalOwner.ts");
  assert.match(src, /cyclesRemises/);
  assert.match(src, /total_cycles: cyclesRemises/);
  // "À vie" n'est pas un cycle de plus : c'est le prix du cycle sans fin.
  assert.match(src, /remiseAVie/);
  assert.match(src, /paypalAmount\(prixRegulier\)/);
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
