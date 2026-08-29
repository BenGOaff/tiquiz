// tests/logic/pilotage-graphique.test.mts
//
// LE GRAPHIQUE QUI NE MONTRE QU'UNE BARRE (Béné, 29 août 2026).
//
// "Je t'ai demandé mille fois de t'inspirer de Systeme.io qui donne les
// ventes chaque jour. Une barre toute seule, tu veux que j'en fasse
// quoi ?"
//
// Deux défauts, à deux moments, et ce fichier tient les deux.
//
// 1. LE PAS. Le graphique agrégeait TOUJOURS par mois. Sur "30 derniers
//    jours" ça donne une colonne unique, c'est à dire un nombre déguisé
//    en dessin. Le pas suit maintenant la période.
// 2. LA HAUTEUR. Elle était en POURCENTAGE dans une colonne sans hauteur
//    propre : le pourcentage ne se calculait sur rien, la barre
//    s'écrasait à zéro, et seuls les montants flottaient. Les hauteurs
//    sont en PIXELS, calculées sur une hauteur donnée.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SEUIL_PAS_JOUR,
  choisirPas,
  etiquettesVisibles,
  joursCouverts,
  libellePeriode,
  segmentsDessin,
  serieEmpilee,
  PRODUITS_ORDRE,
} from "@/lib/pilotage/serieEmpilee";
import { resoudrePeriode, type Periode } from "@/lib/pilotage/periode";
import type { Sale } from "@/lib/checkout/sales";

const MAINTENANT = new Date("2026-08-29T12:00:00Z");

function vente(p: Partial<Sale>): Sale {
  return {
    ref: "r1",
    email: "a@b.fr",
    amountCents: 1700,
    amountSource: "payload",
    paidAt: "2026-08-02T10:00:00Z",
    productId: null,
    refundedAt: null,
    ...p,
  } as Sale;
}

/** Une période explicite, pour ne pas dépendre de l'horloge. */
function du(debut: string, fin: string): Periode {
  return { id: "sur-mesure", debut, fin, libelle: `${debut} -> ${fin}` };
}

// ── LE PAS ───────────────────────────────────────────────────────────

test("30 JOURS DONNENT 30 COLONNES, PAS UNE", () => {
  // C'est le reproche exact, et le seul qui compte dans ce fichier.
  const s = serieEmpilee([vente({ paidAt: "2026-08-12T10:00:00Z" })], du("2026-08-01", "2026-08-30"), MAINTENANT);
  assert.ok(s.fiable);
  assert.equal(s.pas, "jour");
  assert.equal(s.points.length, 30);
});

test("une période longue repasse au mois", () => {
  // 400 colonnes quotidiennes ne se lisent pas, et sur un an c'est la
  // tendance qu'on regarde.
  const s = serieEmpilee(
    [vente({ paidAt: "2026-03-02T10:00:00Z" }), vente({ paidAt: "2026-08-02T10:00:00Z" })],
    du("2025-09-01", "2026-08-29"),
    MAINTENANT,
  );
  assert.ok(s.fiable);
  assert.equal(s.pas, "mois");
});

test("le seuil est franc, et il couvre les choix courts de Béné", () => {
  assert.equal(choisirPas("2026-06-01", "2026-08-31"), "jour"); // 92 jours
  assert.equal(joursCouverts("2026-06-01", "2026-08-31"), SEUIL_PAS_JOUR);
  assert.equal(choisirPas("2026-05-31", "2026-08-31"), "mois"); // 93
  for (const id of ["7j", "30j", "ce-mois", "mois-dernier", "90j"] as const) {
    const p = resoudrePeriode(id, MAINTENANT);
    assert.equal(choisirPas(p.debut!, p.fin ?? "2026-08-29"), "jour", id);
  }
});

test("UN JOUR SANS VENTE RESTE, c'est lui qui porte le rythme", () => {
  // Les retirer donnerait un graphique qui ment : un mois à 1 200 € en
  // trois jours et un mois à 1 200 € étalé ne se pilotent pas pareil.
  const s = serieEmpilee(
    [vente({ paidAt: "2026-08-05T10:00:00Z" }), vente({ ref: "r2", paidAt: "2026-08-09T10:00:00Z" })],
    du("2026-08-01", "2026-08-10"),
    MAINTENANT,
  );
  assert.ok(s.fiable);
  assert.equal(s.points.length, 10);
  assert.equal(s.points.filter((p) => p.totalCents === 0).length, 8);
  assert.equal(s.points[0].cle, "2026-08-01", "on part de la borne, pas de la premiere vente");
});

test("en MENSUEL on coupe le vide de tête, jamais les trous du milieu", () => {
  const s = serieEmpilee(
    [vente({ paidAt: "2026-03-02T10:00:00Z" }), vente({ ref: "r2", paidAt: "2026-08-02T10:00:00Z" })],
    du("2025-09-01", "2026-08-29"),
    MAINTENANT,
  );
  assert.ok(s.fiable);
  assert.equal(s.points[0].cle, "2026-03");
  assert.equal(s.points.length, 6, "mars a aout, les mois creux du milieu restent");
});

test("une période ouverte part de la première vente, pas d'une date inventée", () => {
  const s = serieEmpilee(
    [vente({ paidAt: "2026-08-20T10:00:00Z" })],
    { id: "tout", debut: null, fin: null, libelle: "Depuis le début" },
    MAINTENANT,
  );
  assert.ok(s.fiable);
  assert.equal(s.points[0].cle, "2026-08-20");
  assert.equal(s.points[s.points.length - 1].cle, "2026-08-29");
});

// ── LES HAUTEURS ─────────────────────────────────────────────────────

test("UNE HAUTEUR N'EST JAMAIS ZÉRO QUAND IL Y A DE L'ARGENT", () => {
  // C'est le bug exact : des montants affichés au dessus de rien.
  const s = serieEmpilee([vente({})], du("2026-08-01", "2026-08-10"), MAINTENANT);
  assert.ok(s.fiable);
  const point = s.points.find((p) => p.totalCents > 0)!;
  const segs = segmentsDessin(point, s.totalCents, 176);
  assert.ok(segs.length > 0);
  assert.ok(segs.every((x) => x.hauteurPx >= 3));
});

test("une petite vente à côté d'une grosse reste VISIBLE", () => {
  const s = serieEmpilee(
    [
      vente({ paidAt: "2026-08-02T10:00:00Z", amountCents: 119700 }),
      vente({ ref: "r2", paidAt: "2026-08-03T10:00:00Z", amountCents: 900 }),
    ],
    du("2026-08-01", "2026-08-10"),
    MAINTENANT,
  );
  assert.ok(s.fiable);
  const max = Math.max(...s.points.map((p) => p.totalCents));
  const petit = s.points.find((p) => p.totalCents === 900)!;
  const segs = segmentsDessin(petit, max, 176);
  assert.ok(segs[0].hauteurPx >= 3, "un trait invisible ferait passer le jour pour vide");
});

test("un point à zéro ne dessine aucun segment", () => {
  const s = serieEmpilee([vente({})], du("2026-08-01", "2026-08-10"), MAINTENANT);
  assert.ok(s.fiable);
  const vide = s.points.find((p) => p.totalCents === 0)!;
  assert.deepEqual(segmentsDessin(vide, 1700, 176), []);
});

// ── L'HONNÊTETÉ DES MONTANTS ─────────────────────────────────────────

test("une vente sans montant connu RETIRE le graphique", () => {
  // Une somme fausse est pire qu'une absence de dessin.
  const s = serieEmpilee(
    [vente({ amountSource: "inconnu", amountCents: 0 })],
    du("2026-08-01", "2026-08-10"),
    MAINTENANT,
  );
  assert.equal(s.fiable, false);
  assert.equal(s.fiable === false && s.raison, "montants-absents");
});

test("une vente REMBOURSÉE ne compte pas dans la colonne", () => {
  const s = serieEmpilee(
    [vente({ refundedAt: "2026-08-10T10:00:00Z" })],
    du("2026-08-01", "2026-08-10"),
    MAINTENANT,
  );
  assert.ok(s.fiable);
  assert.equal(s.totalCents, 0);
});

test("un montant venu du tarif du plan compte, mais il se dit", () => {
  const s = serieEmpilee(
    [vente({ amountSource: "plan" })],
    du("2026-08-01", "2026-08-10"),
    MAINTENANT,
  );
  assert.ok(s.fiable);
  assert.equal(s.estimees, 1);
});

test("aucune vente sur la période : on le dit, on ne dessine pas un cadre vide", () => {
  const s = serieEmpilee([], du("2026-08-01", "2026-08-10"), MAINTENANT);
  assert.equal(s.fiable, false);
  assert.equal(s.fiable === false && s.raison, "aucune-donnee");
});

// ── LA LÉGENDE ET LES ÉTIQUETTES ─────────────────────────────────────

test("seuls les produits PRÉSENTS ont une légende", () => {
  const s = serieEmpilee([vente({})], du("2026-08-01", "2026-08-10"), MAINTENANT);
  assert.ok(s.fiable);
  assert.ok(s.presents.length >= 1);
  assert.ok(s.presents.every((p) => PRODUITS_ORDRE.includes(p)));
});

test("TRENTE DATES NE S'ÉCRIVENT PAS TOUTES : une sur n, bornes comprises", () => {
  const v = etiquettesVisibles(30, 900);
  assert.ok(v.length < 30, "trente etiquettes cote a cote se chevauchent");
  assert.equal(v[0], 0, "la premiere dit ou commence le graphique");
  assert.equal(v[v.length - 1], 29, "la derniere dit ou il s'arrete");
});

test("peu de colonnes : toutes les étiquettes s'écrivent", () => {
  assert.deepEqual(etiquettesVisibles(6, 900), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(etiquettesVisibles(0, 900), []);
});

test("le libellé dit la période RÉELLEMENT lue", () => {
  const jour = serieEmpilee([vente({})], du("2026-08-01", "2026-08-10"), MAINTENANT);
  assert.equal(libellePeriode(jour), "du 1 août au 10 août");
  const mois = serieEmpilee(
    [vente({ paidAt: "2026-03-02T10:00:00Z" }), vente({ ref: "r2", paidAt: "2026-08-02T10:00:00Z" })],
    du("2025-09-01", "2026-08-29"),
    MAINTENANT,
  );
  assert.equal(libellePeriode(mois), "de mars 26 à août 26");
});
