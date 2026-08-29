// tests/logic/pilotage-revendeurs.test.mts
//
// LES REVENDEURS, QUE J'AVAIS OUBLIÉS (Béné, 29 août 2026).
//
// "Il me manque les revendeurs de Tiquiz ? Tu n'as pas pensé à les
// créer ?"
//
// Deux pièges dans ce domaine, et les deux coûtent de l'argent : une
// LICENCE n'est pas un compte (le palier de commission se calcule sur
// les licences, donc facturer sur les comptes facture au mauvais taux),
// et une facture impayée doit remonter en haut du tableau, pas se
// perdre au milieu.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  construireRevendeurs,
  estActif,
  estImpayee,
  prochainPalier,
  resumerRevendeurs,
  trierRevendeurs,
  type EntreeFacture,
  type EntreeRevendeur,
} from "@/lib/pilotage/revendeurs";

/** Le barème de Béné du 11 juin 2026. */
const BAREME = [
  { max_active: 200, rate: 40 },
  { max_active: 1000, rate: 35 },
  { max_active: 2000, rate: 30 },
  { max_active: 3000, rate: 25 },
  { max_active: null, rate: 20 },
];

function rev(p: Partial<EntreeRevendeur> & { id: string }): EntreeRevendeur {
  return {
    name: "Revendeur",
    email: "r@exemple.fr",
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    clientCount: 10,
    licenceCount: 4,
    freeCount: 6,
    currentRate: 40,
    tiers: BAREME,
    ...p,
  };
}

function facture(p: Partial<EntreeFacture> & { id: string; resellerId: string }): EntreeFacture {
  return {
    period: "2026-08",
    totalCents: 10000,
    status: "pending",
    createdAt: "2026-08-01T10:00:00Z",
    paidAt: null,
    ...p,
  };
}

// ── LES PALIERS ──────────────────────────────────────────────────────

test("LE PROCHAIN PALIER DIT COMBIEN IL EN MANQUE, exactement", () => {
  // 198 licences : deux de plus et il bascule a 35 %.
  assert.deepEqual(prochainPalier(198, BAREME), { manque: 3, taux: 35 });
  assert.deepEqual(prochainPalier(200, BAREME), { manque: 1, taux: 35 });
});

test("au DERNIER palier on ne promet rien", () => {
  // Annoncer un cap qui n'existe pas est pire que de ne rien annoncer.
  assert.equal(prochainPalier(5000, BAREME), null);
});

test("un bareme vide ne fabrique pas d'objectif", () => {
  assert.equal(prochainPalier(10, []), null);
});

// ── LES FACTURES ─────────────────────────────────────────────────────

test("une facture PAYÉE n'est plus un impayé, quel que soit son statut", () => {
  assert.ok(!estImpayee({ status: "pending", paidAt: "2026-08-20T10:00:00Z" }));
  assert.ok(!estImpayee({ status: "paid", paidAt: null }));
  assert.ok(!estImpayee({ status: "cancelled", paidAt: null }));
  assert.ok(estImpayee({ status: "pending", paidAt: null }));
  assert.ok(estImpayee({ status: null, paidAt: null }));
});

test("les impayés se somment par revendeur, les payées vont à l'encaissé", () => {
  const l = construireRevendeurs({
    revendeurs: [rev({ id: "r1" })],
    factures: [
      facture({ id: "f1", resellerId: "r1", totalCents: 12000 }),
      facture({ id: "f2", resellerId: "r1", totalCents: 8000, paidAt: "2026-07-20T10:00:00Z", period: "2026-07" }),
    ],
  });
  assert.equal(l[0].impayeCents, 12000);
  assert.equal(l[0].nbImpayees, 1);
  assert.equal(l[0].encaisseCents, 8000);
  assert.equal(l[0].dernierePeriode, "2026-08");
});

test("les factures d'un AUTRE revendeur ne lui sont jamais recollées", () => {
  const l = construireRevendeurs({
    revendeurs: [rev({ id: "r1" }), rev({ id: "r2" })],
    factures: [facture({ id: "f1", resellerId: "r2", totalCents: 5000 })],
  });
  assert.equal(l.find((x) => x.id === "r1")!.impayeCents, 0);
  assert.equal(l.find((x) => x.id === "r2")!.impayeCents, 5000);
});

// ── L'ORDRE ──────────────────────────────────────────────────────────

test("CE QUI DEMANDE UNE ACTION EST EN HAUT : un impayé passe devant un gros portefeuille", () => {
  // Un tableau se lit du haut. Trier par anciennete laisserait une
  // facture impayee trois ecrans plus bas.
  const l = trierRevendeurs(
    construireRevendeurs({
      revendeurs: [rev({ id: "gros", licenceCount: 500 }), rev({ id: "impaye", licenceCount: 2 })],
      factures: [facture({ id: "f1", resellerId: "impaye", totalCents: 3000 })],
    }),
  );
  assert.equal(l[0].id, "impaye");
});

test("à égalité d'impayés, le plus gros portefeuille passe devant", () => {
  const l = trierRevendeurs(
    construireRevendeurs({
      revendeurs: [rev({ id: "petit", licenceCount: 2 }), rev({ id: "gros", licenceCount: 500 })],
      factures: [],
    }),
  );
  assert.equal(l[0].id, "gros");
});

// ── LES TOTAUX ───────────────────────────────────────────────────────

test("un revendeur SUSPENDU est compté à part, mais ses licences existent toujours", () => {
  // Suspendre coupe son acces au panneau, ca ne touche PAS aux comptes
  // de ses clients : les retirer du total donnerait un chiffre qui ne
  // correspond plus a ce qu'il y a en base.
  const r = resumerRevendeurs(
    construireRevendeurs({
      revendeurs: [
        rev({ id: "a", licenceCount: 10, clientCount: 30 }),
        rev({ id: "b", status: "suspended", licenceCount: 5, clientCount: 12 }),
      ],
      factures: [],
    }),
  );
  assert.equal(r.actifs, 1);
  assert.equal(r.suspendus, 1);
  assert.equal(r.licences, 15);
  assert.equal(r.comptes, 42);
});

test("un statut absent est lu comme ACTIF", () => {
  // Suspendre quelqu'un sur une valeur qu'on ne sait pas lire serait la
  // pire des reponses.
  assert.ok(estActif(null));
  assert.ok(estActif(""));
  assert.ok(estActif("active"));
  assert.ok(!estActif("suspended"));
});

test("les totaux sont la SOMME du tableau, jamais un second calcul", () => {
  const lignes = construireRevendeurs({
    revendeurs: [rev({ id: "a" }), rev({ id: "b" })],
    factures: [
      facture({ id: "f1", resellerId: "a", totalCents: 1000 }),
      facture({ id: "f2", resellerId: "b", totalCents: 2000 }),
    ],
  });
  const r = resumerRevendeurs(lignes);
  assert.equal(r.impayeCents, lignes.reduce((s, l) => s + l.impayeCents, 0));
  assert.equal(r.nbImpayees, 2);
});

test("aucun revendeur : des zéros, jamais un NaN", () => {
  const r = resumerRevendeurs([]);
  assert.equal(r.actifs, 0);
  assert.equal(r.impayeCents, 0);
  assert.ok(Number.isFinite(r.licences));
});
