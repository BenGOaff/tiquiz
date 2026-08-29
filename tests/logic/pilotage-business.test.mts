// tests/logic/pilotage-business.test.mts
//
// "ÉQUILIBRE ENTRE VENTES (CE QUI RENTRE) ET AFFILIATION (CE QUI SORT)"
// (Béné, 29 août 2026).

import { test } from "node:test";
import assert from "node:assert/strict";

import { balance, engagement, tuiles, COUT_INCONNU } from "@/lib/pilotage/business";

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

// ── CE QU'ON DOIT VRAIMENT, ET QUAND ─────────────────────────────────

test("ON N'EXTRAPOLE PLUS : les trois montants sont ceux des commissions", () => {
  // Bene, 29 aout : "on tracke les commissions, donc on peut estimer en
  // temps reel les commissions a verser". Le premier jet appliquait au
  // recurrent le POURCENTAGE observe sur la periode : il suffisait
  // qu'une grosse vente affiliee tombe dedans pour que le previsionnel
  // double sans qu'aucun abonne n'ait bouge.
  const e = engagement({
    ...COUT_INCONNU,
    duesCents: 20000,
    sousGarantieCents: 10000,
    verseesCents: 500000,
  })!;
  assert.equal(e.aVerserCents, 20000);
  assert.equal(e.sousGarantieCents, 10000);
  assert.equal(e.engageCents, 30000);
  assert.equal(e.verseesCents, 500000, "le deja verse est rendu, il n'entre pas dans l'engage");
});

test("A VERSER et SOUS GARANTIE ne se confondent jamais", () => {
  // Bene : "a ajuster en fonction du delai de 30 jours et des
  // remboursements". Un remboursement pendant la garantie annule sa
  // commission : les fondre en un seul "a payer" annoncerait comme du
  // du de l'argent qui peut encore disparaitre.
  const e = engagement({ ...COUT_INCONNU, duesCents: 100, sousGarantieCents: 900 })!;
  assert.notEqual(e.aVerserCents, e.engageCents);
});

test("liaison muette : on ne rend pas un cout de zero", () => {
  assert.equal(engagement(null), null);
});

test("LES QUATRE CHIFFRES QUI PASSENT DEVANT, et ils sont quatre", () => {
  // "Tu peux pas me faire ressortir des chiffres importants ? Genre en
  // haut revenus recurrents, commissions en cours." Au dela de quatre,
  // plus rien ne ressort et on est revenu au tableau qu'elle trouve
  // triste.
  const t = tuiles({
    mrrCents: 105900,
    abonnes: 12,
    encaisseCents: 100000,
    ventes: 7,
    engagement: engagement({ ...COUT_INCONNU, duesCents: 20000, sousGarantieCents: 10000 }),
  });
  assert.deepEqual(
    t.map((x) => x.cle),
    ["recurrent", "encaisse", "commissions", "net"],
  );
  assert.equal(t[0].cents, 105900);
  assert.equal(t[2].cents, 30000);
  assert.equal(t[3].cents, 70000);
  // Chaque grand nombre porte une phrase : sans elle il ne se compare a
  // rien.
  for (const x of t) assert.ok(x.note.length > 3, x.cle);
});

test("sans liaison, les tuiles qui en dependent rendent null, jamais zero", () => {
  const t = tuiles({
    mrrCents: 105900,
    abonnes: 12,
    encaisseCents: 100000,
    ventes: 7,
    engagement: null,
  });
  assert.equal(t.find((x) => x.cle === "commissions")?.cents, null);
  assert.equal(t.find((x) => x.cle === "net")?.cents, null);
  // Le recurrent et l'encaisse, eux, ne dependent pas de l'autre app.
  assert.equal(t.find((x) => x.cle === "recurrent")?.cents, 105900);
});

test("des valeurs absurdes ne produisent jamais NaN", () => {
  const b = balance(Number.NaN, { ...COUT_INCONNU, duesCents: Number.NaN });
  assert.equal(Number.isFinite(b.netCents), true);
  const e = engagement({ ...COUT_INCONNU, duesCents: Number.NaN })!;
  assert.equal(Number.isFinite(e.engageCents), true);
});
