// tests/logic/sale-product.test.mts
//
// TIQUIZ OU L'ATELIER : "je vois mal les différences" (Béné, 22 août).
//
// Les deux produits se vendent par le même Systeme.io, s'encaissent sur
// le même compte Stripe et atterrissent dans la même table. À l'écran,
// un abonnement à 17 € et une formation à 47 € finissaient dans la même
// barre : ni le nombre ni le total ne voulaient dire quoi que ce soit.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { readSaleProduct, totauxParProduit } from "../../lib/admin/saleProduct.ts";
import { buildSioSales } from "../../lib/admin/sioSales.ts";
import type { Sale } from "../../lib/checkout/sales.ts";

function vente(over: Partial<Sale> = {}): Sale {
  return {
    ref: "pi_1",
    provider: "stripe",
    email: "a@b.fr",
    name: null,
    productId: "monthly",
    amountCents: 1700,
    amountSource: "payload",
    currency: "eur",
    paidAt: "2026-08-03T09:00:00Z",
    refundedAt: null,
    ...over,
  };
}

test("la reference prefixee est l'indice le plus sur", () => {
  // C'est NOUS qui l'ecrivons, dans lib/admin/atelier.ts, en rapatriant
  // les ventes de l'Atelier.
  assert.equal(readSaleProduct(vente({ ref: "atelier:pi_9", productId: "atelier-atelier" })), "atelier");
});

test("un palier Tiquiz est du Tiquiz", () => {
  for (const plan of ["free", "monthly", "monthly_plus", "yearly", "yearly_plus", "lifetime"]) {
    assert.equal(readSaleProduct(vente({ productId: plan })), "tiquiz", plan);
  }
});

test("un plan tarifaire Systeme.io est reconnu par son identifiant", () => {
  assert.equal(readSaleProduct(vente({ productId: "3375217" })), "tiquiz");
  assert.equal(readSaleProduct(vente({ productId: "offer-price-3316702" })), "atelier");
});

test("ce qu'on ne sait pas rattacher se voit, au lieu d'etre range au hasard", () => {
  assert.equal(readSaleProduct(vente({ productId: "un-truc" })), "inconnu");
  assert.equal(readSaleProduct(vente({ productId: null })), "inconnu");
});

test("une vente Atelier passee par Systeme.io ne finit plus en inconnu", () => {
  // Ces plans n'ouvrent aucun palier Tiquiz : sans cette regle, ils
  // tombaient dans "inconnu" et se melangeaient aux abonnements.
  const [v] = buildSioSales([
    {
      source: "systeme_io",
      event_type: "customer.sale.completed",
      event_id: "sio_order_7",
      payload: { pricePlan: { id: 3316702 } },
      created_at: "2026-08-03T09:00:00Z",
    },
  ]);
  assert.equal(v?.productId, "atelier");
  assert.equal(readSaleProduct(v!), "atelier");
  assert.equal(v?.amountCents, 4700);
});

test("les totaux separent les deux produits, et disent ce qui est estime", () => {
  const totaux = totauxParProduit([
    vente({ ref: "pi_1", productId: "monthly", amountCents: 1700 }),
    vente({ ref: "pi_2", productId: "monthly", amountCents: 1700, amountSource: "plan" }),
    vente({ ref: "atelier:pi_3", productId: "atelier", amountCents: 4700 }),
    vente({ ref: "pi_4", productId: "bidule", amountCents: 0, amountSource: "inconnu" }),
  ]);
  assert.deepEqual(totaux, [
    { produit: "tiquiz", ventes: 2, totalCents: 3400, estimees: 1 },
    { produit: "atelier", ventes: 1, totalCents: 4700, estimees: 0 },
    { produit: "inconnu", ventes: 1, totalCents: 0, estimees: 0 },
  ]);
});

test("une vente remboursee reste comptee, mais ne fait pas de total", () => {
  // L'effacer creerait un ecart inexplicable avec le journal des appels.
  const [t] = totauxParProduit([
    vente({ productId: "monthly", amountCents: 1700, refundedAt: "2026-08-20T09:00:00Z" }),
  ]);
  assert.equal(t?.ventes, 1);
  assert.equal(t?.totalCents, 0);
});
