// tests/logic/ventes-hors-tiquiz.test.mts
//
// « DES VENTES NON IDENTIFIÉES SUR LE DASHBOARD C'EST DES ABONNEMENTS
//   TIQUIZ VIA SYSTEME IO ET UN AUTRE ABONNEMENT QUI N'A RIEN À VOIR »
//   (Béné, 1er septembre 2026)
//
// Deux défauts, et le second coûte de l'argent tous les mois.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PRICE_PLANS, readPricePlan } from "@/lib/sio/pricePlans";
import { produitDeLOffre, venteHorsTiquiz, nomDeLOffre } from "@/lib/sio/produitVendu";
import { inferPlanFromAmount, inferPlanFromOfferId } from "@/lib/sio/webhookInference";
import { nomProduitVendu, readSaleProduct, NOM_PRODUIT } from "@/lib/admin/saleProduct";

// L'abonnement « qui n'a rien à voir », relevé dans son compte le
// 1er septembre : Le Pacte™ mensuel, plan 2502221, 20,00 €.
const LE_PACTE = "2502221";

test("Le Pacte est un plan CONNU, et ce n'est pas Tiquiz", () => {
  const plan = readPricePlan(LE_PACTE);
  assert.ok(plan, "le plan tarifaire du Pacte doit vivre dans PRICE_PLANS");
  assert.equal(plan.produit, "autre");
  assert.match(plan.nom, /pacte/i);
  assert.equal(produitDeLOffre(LE_PACTE), "autre");
  assert.equal(venteHorsTiquiz(LE_PACTE), true);
  assert.equal(nomDeLOffre(LE_PACTE), plan.nom);
});

test("une offre qu'on ne connaît pas n'est PAS fermée", () => {
  // « je n'ai pas trouvé » et « je sais que ce n'est pas nous » sont deux
  // réponses différentes. La règle du 7 août tient sur la première :
  // « il a payé le client, il doit recevoir ses accès, point barre ».
  assert.equal(produitDeLOffre("9999999"), "inconnu");
  assert.equal(venteHorsTiquiz("9999999"), false);
  assert.equal(venteHorsTiquiz(null), false);
  assert.equal(venteHorsTiquiz(""), false);
});

test("un palier Tiquiz reste ouvert", () => {
  for (const offre of ["3375217", "3375221", "3278876", "3278878"]) {
    assert.equal(venteHorsTiquiz(offre), false, `${offre} est un palier Tiquiz`);
    assert.ok(inferPlanFromOfferId(offre), `${offre} doit router`);
  }
});

test("LE PIÈGE : trois autres produits coûtent le prix d'un palier Tiquiz", () => {
  // C'est ce qui rend le repli par le montant dangereux : il ouvrait un
  // palier PRÉCIS et FAUX, ce qui ressemble à un routage réussi.
  const collisions = Object.entries(PRICE_PLANS).filter(
    ([, p]) => p.produit !== "tiquiz" && inferPlanFromAmount(p.montantCents) != null,
  );
  assert.ok(
    collisions.length > 0,
    "si plus aucun autre produit ne collisionne, cette garde peut se relire, " +
      "mais elle ne se retire pas : le catalogue de Systeme.io bouge sans nous",
  );
  // Et pour chacune, la garde passe AVANT le montant.
  for (const [id] of collisions) {
    assert.equal(venteHorsTiquiz(id), true, `${id} doit fermer la porte avant le montant`);
  }
});

test("le webhook consulte la garde AVANT de créer le compte", () => {
  const src = readFileSync("app/api/systeme-io/webhook/route.ts", "utf8");
  const garde = src.indexOf("venteHorsTiquiz(offerId)");
  const creation = src.indexOf("auth.admin.createUser");
  // `lastIndexOf` : le repli est aussi NOMMÉ dans les imports, tout en
  // haut. Chercher sa première occurrence ferait passer ce test pour la
  // mauvaise raison, et c'est exactement le défaut qu'il surveille.
  const repli = src.lastIndexOf("?? FALLBACK_PAID_PLAN");
  assert.ok(garde > 0, "la garde doit être appelée dans le webhook");
  assert.ok(
    garde < creation,
    "un acheteur d'un AUTRE produit ne doit pas se voir créer un compte Tiquiz",
  );
  assert.ok(garde < repli, "la garde passe avant le repli du 7 août");
});

test("le tableau de bord NOMME le produit au lieu de dire « non identifié »", () => {
  const vente = { ref: "evt", productId: LE_PACTE } as const;
  assert.equal(readSaleProduct(vente), "autre");
  assert.match(nomProduitVendu(vente), /pacte/i);
  assert.notEqual(nomProduitVendu(vente), NOM_PRODUIT.inconnu);

  // Une vraie orpheline reste orpheline : on ne la range pas au hasard.
  const orpheline = { ref: "evt", productId: "9999999" } as const;
  assert.equal(readSaleProduct(orpheline), "inconnu");
  assert.equal(nomProduitVendu(orpheline), NOM_PRODUIT.inconnu);
});

test("le tarif se lit MÊME quand le montant est là", () => {
  // Le défaut d'affichage : `tarif` n'était calculé que pour combler un
  // montant manquant, donc une vente qui portait sa somme n'était jamais
  // nommée. C'est exactement ce que Béné a vu.
  const src = readFileSync("lib/admin/sioSales.ts", "utf8");
  assert.ok(
    !/const tarif = duPayload == null \? readPricePlan/.test(src),
    "le tarif ne doit plus dépendre de l'absence de montant",
  );
  assert.match(src, /const tarif = readPricePlan\(offre\);/);
});

test("la garde ne ferme rien sur un plan Tiquiz du catalogue", () => {
  for (const [id, p] of Object.entries(PRICE_PLANS)) {
    if (p.produit !== "tiquiz") continue;
    assert.equal(venteHorsTiquiz(id), false, `${id} (${p.nom}) doit rester ouvert`);
  }
});
