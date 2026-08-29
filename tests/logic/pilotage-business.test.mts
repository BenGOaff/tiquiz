// tests/logic/pilotage-business.test.mts
//
// "ÉQUILIBRE ENTRE VENTES (CE QUI RENTRE) ET AFFILIATION (CE QUI SORT)"
// (Béné, 29 août 2026).

import { test } from "node:test";
import assert from "node:assert/strict";

import { balance, previsionnel, COUT_INCONNU } from "@/lib/pilotage/business";

test("le net retire ce qui est ENGAGÉ, pas ce qui est deja parti", () => {
  // Le deja verse concerne des ventes d'AVANT : l'ajouter ferait payer
  // deux fois le meme mois.
  const b = balance(100000, {
    ...COUT_INCONNU,
    duesCents: 20000,
    sousGarantieCents: 10000,
    verseesCents: 500000,
  });
  assert.equal(b.sortCents, 30000);
  assert.equal(b.netCents, 70000);
  assert.equal(b.partPct, 30);
});

test("UN POURCENTAGE SUR ZÉRO N'EST PAS ZÉRO", () => {
  // Afficher "0 %" sur un mois sans vente ferait croire que
  // l'affiliation ne coute rien, alors qu'il n'y a rien a mesurer.
  const b = balance(0, { ...COUT_INCONNU, duesCents: 5000 });
  assert.equal(b.partPct, null);
  // Et le net devient negatif, ce qui est la verite : on doit de
  // l'argent sur un mois ou rien n'est rentre.
  assert.equal(b.netCents, -5000);
});

test("un cout inconnu ne fabrique pas un net flatteur", () => {
  const b = balance(52000, COUT_INCONNU);
  assert.equal(b.sortCents, 0);
  assert.equal(b.netCents, 52000);
  assert.equal(b.partPct, 0);
});

test("le previsionnel est une PROJECTION, et refuse d'inventer un taux", () => {
  assert.equal(previsionnel(105900, 30), 74130);
  // Sans part observee, on ne devine pas : un previsionnel faux qui a
  // l'air precis est pire que pas de previsionnel.
  assert.equal(previsionnel(105900, null), null);
});

test("des valeurs absurdes ne produisent jamais NaN", () => {
  const b = balance(Number.NaN, { ...COUT_INCONNU, duesCents: Number.NaN });
  assert.equal(Number.isFinite(b.netCents), true);
  assert.equal(Number.isFinite(previsionnel(Number.NaN, 10) ?? 0), true);
});
