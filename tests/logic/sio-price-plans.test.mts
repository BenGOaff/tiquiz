// tests/logic/sio-price-plans.test.mts
//
// LES PLANS TARIFAIRES DE SYSTEME.IO, RELEVÉS DANS SON COMPTE.
//
// Béné, 22 août : "vu que tu es connecté à Systeme.io en MCP maintenant,
// tu ne peux pas récupérer toutes les infos qu'il nous manque ?"
//
// La table de `lib/sio/pricePlans.ts` a été LUE dans son compte le
// 22 août 2026, pas devinée. C'est exactement ce qui manquait le 7 août,
// quand la vente d'Ivan a été refusée sur un `pricePlan.id` que personne
// n'avait dans sa liste.
//
// Ce fichier fige les deux garanties qui comptent :
//   1. tout plan Tiquiz vendu est routable par son identifiant ;
//   2. le prix d'un plan reste un ORDRE DE GRANDEUR, jamais une somme
//      encaissée, parce que son compte porte 54 codes de réduction
//      actifs dont certains à 100 %.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { PRICE_PLANS, readPricePlan } from "../../lib/sio/pricePlans.ts";
import { OFFER_TO_PLAN, inferPlanFromOfferId } from "../../lib/sio/webhookInference.ts";
import { buildSioSales } from "../../lib/admin/sioSales.ts";

test("les tarifs releves le 22 aout sont ceux qu'on affiche", () => {
  // Si Systeme.io change un prix, il CREE un plan, donc un nouvel id.
  // Ces lignes ne peuvent donc pas devenir fausses en silence ; elles
  // peuvent seulement devenir incompletes, et c'est le test suivant qui
  // le dit.
  assert.equal(PRICE_PLANS["3375217"]?.montantCents, 1700); // NV tiquiz mensuel
  assert.equal(PRICE_PLANS["3375221"]?.montantCents, 17000); // NV Tiquiz annuel
  assert.equal(PRICE_PLANS["3278876"]?.montantCents, 2900); // mensuel PLUS
  assert.equal(PRICE_PLANS["3278878"]?.montantCents, 29000); // annuel PLUS
  assert.equal(PRICE_PLANS["3198280"]?.montantCents, 5700); // Beta / a vie
});

test("TOUT plan Tiquiz connu est routable par son identifiant", () => {
  // La regle du 7 aout : sur une vente, l'offer-price-id est la SEULE
  // voie qui existe, parce qu'un evenement de vente ne porte aucune URL
  // de tunnel. Un plan absent de OFFER_TO_PLAN tombe sur le repli.
  for (const [id, plan] of Object.entries(PRICE_PLANS)) {
    if (!plan.plan) continue; // l'Atelier n'ouvre aucun palier Tiquiz
    assert.equal(
      inferPlanFromOfferId(id),
      plan.plan,
      `le plan ${id} (${plan.nom}) n'est pas route, ou pas vers le bon palier`,
    );
  }
});

test("les plans en dollars, oublies depuis avril, sont routes", () => {
  // Ils existaient dans son compte depuis avril et n'etaient nulle part
  // dans le code. Une vente dessus ouvrait un acces par repli, donc au
  // bon endroit, mais etiquetee au mauvais palier.
  assert.equal(inferPlanFromOfferId("3211596"), "monthly");
  assert.equal(inferPlanFromOfferId("3211612"), "yearly");
  assert.equal(inferPlanFromOfferId("3211578"), "lifetime");
  assert.equal(PRICE_PLANS["3211612"]?.devise, "usd");
});

test("aucun identifiant ne route vers deux paliers differents", () => {
  for (const [id, plan] of Object.entries(PRICE_PLANS)) {
    if (!plan.plan) continue;
    const parTable = OFFER_TO_PLAN[id] ?? OFFER_TO_PLAN[`offer-price-${id}`];
    assert.equal(parTable, plan.plan, `${id} : les deux tables se contredisent`);
  }
});

test("readPricePlan encaisse les formes que Systeme.io envoie", () => {
  assert.equal(readPricePlan("3375217")?.montantCents, 1700);
  assert.equal(readPricePlan("offer-price-3375217")?.montantCents, 1700);
  assert.equal(readPricePlan("  3375217  ")?.montantCents, 1700);
  assert.equal(readPricePlan(null), null);
  assert.equal(readPricePlan(""), null);
  assert.equal(readPricePlan("9999999"), null);
});

// ── LE MONTANT D'UNE VENTE, ET CE QU'IL VAUT ────────────────────────

function evenement(payload: unknown) {
  return {
    source: "systeme_io",
    event_type: "customer.sale.completed",
    event_id: "sio_order_1",
    payload,
    created_at: "2026-08-03T09:00:00Z",
  };
}

test("le montant du payload gagne toujours sur le tarif du plan", () => {
  // C'est la somme reellement encaissee : elle peut etre remisee, et
  // c'est justement elle qu'on veut.
  const [v] = buildSioSales([
    evenement({ pricePlan: { id: 3375217 }, order: { total_price: "8.50" } }),
  ]);
  assert.equal(v?.amountCents, 850);
  assert.equal(v?.amountSource, "payload");
});

test("sans montant dans le payload, on affiche le tarif du plan, MARQUE comme tel", () => {
  // C'est ce qui manquait : 47 ventes reelles a 0,00 € et un onglet
  // Ventes inutilisable. Mais ca reste un ordre de grandeur.
  const [v] = buildSioSales([evenement({ pricePlan: { id: 3375217 } })]);
  assert.equal(v?.amountCents, 1700);
  assert.equal(v?.amountSource, "plan");
  assert.equal(v?.productId, "monthly");
});

test("un plan inconnu ne fait pas inventer un montant", () => {
  const [v] = buildSioSales([evenement({ pricePlan: { id: 9999999 } })]);
  assert.equal(v?.amountCents, 0);
  assert.equal(v?.amountSource, "inconnu");
});

test("une vente en dollars garde sa devise", () => {
  const [v] = buildSioSales([evenement({ pricePlan: { id: 3211612 } })]);
  assert.equal(v?.currency, "usd");
  assert.equal(v?.amountSource, "plan");
});
