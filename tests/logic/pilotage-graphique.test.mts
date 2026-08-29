// tests/logic/pilotage-graphique.test.mts
//
// LE GRAPHIQUE QUI NE DESSINAIT RIEN (Béné, 29 août 2026).
//
// "Des infos pourraves genre graphique sans courbe, avec des mois dont
// on se fiche, c'est écrit en tout petit illisible."
//
// La barre portait une hauteur en POURCENTAGE dans une colonne sans
// hauteur propre : le pourcentage ne se calculait sur rien, la barre
// s'écrasait à zéro, et seuls les montants restaient à flotter. Les
// hauteurs sont maintenant en PIXELS, calculées sur une hauteur donnée.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  serieEmpilee,
  segmentsDessin,
  PRODUITS_ORDRE,
} from "@/lib/pilotage/serieEmpilee";
import type { Sale } from "@/lib/checkout/sales";

const FIN = new Date("2026-08-29T12:00:00Z");

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

test("UNE HAUTEUR N'EST JAMAIS ZÉRO QUAND IL Y A DE L'ARGENT", () => {
  // C'est le bug exact : des montants affichés au dessus de rien.
  const s = serieEmpilee([vente({ amountCents: 5200 })], FIN, 12);
  assert.equal(s.fiable, true);
  if (!s.fiable) return;
  const segs = segmentsDessin(s.mois[0], s.mois[0].totalCents, 160);
  assert.ok(segs.length > 0);
  for (const seg of segs) assert.ok(seg.hauteurPx > 0, JSON.stringify(seg));
});

test("LES MOIS VIDES DU DÉBUT SONT COUPÉS, ceux du milieu restent", () => {
  // Sept colonnes vides avant la première vente mangeaient la moitié de
  // l'écran. Un mois creux ENTRE deux mois pleins, lui, dit quelque
  // chose : on ne le supprime pas.
  const s = serieEmpilee(
    [
      vente({ ref: "a", paidAt: "2026-06-10T10:00:00Z" }),
      vente({ ref: "b", paidAt: "2026-08-10T10:00:00Z" }),
    ],
    FIN,
    12,
  );
  assert.equal(s.fiable, true);
  if (!s.fiable) return;
  assert.deepEqual(s.mois.map((m) => m.mois), ["2026-06", "2026-07", "2026-08"]);
  assert.equal(s.mois[1].totalCents, 0);
});

test("un petit mois à côté d'un gros reste VISIBLE", () => {
  // 9 € contre 1197 € : au prorata strict le petit fait moins d'un
  // pixel, donc son mois passerait pour vide. C'est faux et c'est ce
  // que Béné a sous les yeux.
  const s = serieEmpilee(
    [
      vente({ ref: "gros", amountCents: 119700, paidAt: "2026-04-10T10:00:00Z" }),
      vente({ ref: "petit", amountCents: 900, paidAt: "2026-06-10T10:00:00Z" }),
    ],
    FIN,
    12,
  );
  assert.equal(s.fiable, true);
  if (!s.fiable) return;
  const juin = s.mois.find((m) => m.mois === "2026-06")!;
  const segs = segmentsDessin(juin, 119700, 160);
  assert.ok(segs[0].hauteurPx >= 3, `${segs[0].hauteurPx}px`);
});

test("une vente REMBOURSÉE ne compte pas dans la colonne", () => {
  const s = serieEmpilee(
    [vente({ amountCents: 5200, refundedAt: "2026-08-20T10:00:00Z" })],
    FIN,
    12,
  );
  // Elle est dans la fenêtre, donc la série existe, mais elle ne pèse rien.
  assert.equal(s.fiable, true);
  if (!s.fiable) return;
  assert.equal(s.totalCents, 0);
});

test("UN MONTANT INCONNU RETIRE LE GRAPHIQUE, il ne le fausse pas", () => {
  const s = serieEmpilee([vente({ amountSource: "inconnu" })], FIN, 12);
  assert.deepEqual(s, { fiable: false, raison: "montants-absents", concernees: 1 });
});

test("une vente à 0 € est légitime et ne compte pas comme manquante", () => {
  // Le jour où quelqu'un utilise un code de réduction à 100 %.
  const s = serieEmpilee([vente({ amountCents: 0 })], FIN, 12);
  assert.equal(s.fiable, true);
});

test("aucune donnée le DIT, au lieu de dessiner un cadre vide", () => {
  assert.deepEqual(serieEmpilee([], FIN, 12), {
    fiable: false,
    raison: "aucune-donnee",
    concernees: 0,
  });
});

test("l'ordre des produits est FIXE : une couleur suit une entité", () => {
  // Trier par montant repeindrait les survivants au premier filtre, et
  // le vert d'aujourd'hui serait le bleu de demain.
  assert.deepEqual([...PRODUITS_ORDRE], ["tiquiz", "atelier", "inconnu"]);
  const s = serieEmpilee([vente({}), vente({ ref: "r2", amountCents: 100000 })], FIN, 12);
  assert.equal(s.fiable, true);
  if (!s.fiable) return;
  const segs = segmentsDessin(s.mois.at(-1)!, s.totalCents, 160);
  const rang = segs.map((x) => PRODUITS_ORDRE.indexOf(x.produit));
  assert.deepEqual(rang, [...rang].sort((a, b) => a - b));
});

test("seuls les produits PRÉSENTS entrent dans la légende", () => {
  const s = serieEmpilee([vente({})], FIN, 12);
  assert.equal(s.fiable, true);
  if (!s.fiable) return;
  assert.ok(s.presents.length >= 1);
  assert.ok(s.presents.every((p) => PRODUITS_ORDRE.includes(p)));
});
