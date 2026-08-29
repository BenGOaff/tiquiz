// tests/logic/pilotage-recents.test.mts
//
// L'APERÇU DE L'ACCUEIL (Béné, 29 août 2026).
//
// "Je veux voir mes derniers contacts, mes dernières ventes, un aperçu
// général clair, sans blabla." Court, donc chaque ligne compte : une
// erreur de tri met en tête ce qui n'a rien à y faire, et l'écran ment
// sans en avoir l'air.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parDateDesc, derniersContacts, dernieresVentes } from "@/lib/pilotage/recents";
import type { Person } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";

function personne(p: Partial<Person>): Person {
  return {
    email: "a@b.fr",
    name: null,
    userId: null,
    hasTiquizAccount: true,
    plan: "free",
    status: "gratuit",
    createdAt: "2026-08-01T10:00:00Z",
    lastSignIn: null,
    quizCount: 0,
    leadCount: 0,
    resellerName: null,
    selfServe: false,
    paidCents: 0,
    sales: [],
    lastProvider: null,
    lastPaidAt: null,
    ...p,
  } as Person;
}

function vente(p: Partial<Sale>): Sale {
  return {
    ref: "r",
    email: "a@b.fr",
    amountCents: 1700,
    amountSource: "payload",
    paidAt: "2026-08-01T10:00:00Z",
    productId: null,
    refundedAt: null,
    ...p,
  } as Sale;
}

test("le plus récent en premier", () => {
  const rangees = parDateDesc(
    [{ d: "2026-06-01" }, { d: "2026-08-20" }, { d: "2026-07-05" }],
    (x) => x.d,
  );
  assert.deepEqual(rangees.map((x) => x.d), ["2026-08-20", "2026-07-05", "2026-06-01"]);
});

test("UNE DATE ILLISIBLE NE REMONTE PAS EN TÊTE", () => {
  // C'est le piège : un tri naif place `null` au sommet dans la moitié
  // des moteurs, donc l'écran s'ouvre sur ce qu'on connaît le moins
  // bien.
  const rangees = parDateDesc(
    [{ d: null }, { d: "2026-08-20" }, { d: "" }, { d: "2026-07-05" }],
    (x) => x.d,
  );
  assert.deepEqual(rangees.slice(0, 2).map((x) => x.d), ["2026-08-20", "2026-07-05"]);
});

test("mais elle n'est jamais SUPPRIMÉE", () => {
  // Une ligne écartée en silence est une ligne dont personne ne
  // s'occupera jamais.
  const rangees = parDateDesc([{ d: null }, { d: "2026-08-20" }], (x) => x.d);
  assert.equal(rangees.length, 2);
});

test("les derniers contacts sont coupés au nombre demandé", () => {
  const gens = Array.from({ length: 20 }, (_, i) =>
    personne({ email: `p${i}@b.fr`, createdAt: `2026-08-${String(i + 1).padStart(2, "0")}T10:00:00Z` }),
  );
  const vus = derniersContacts(gens, 6);
  assert.equal(vus.length, 6);
  assert.equal(vus[0].email, "p19@b.fr");
});

test("les dernières ventes traversent toutes les personnes", () => {
  const vus = dernieresVentes(
    [
      personne({ email: "a@b.fr", sales: [vente({ ref: "vieux", paidAt: "2026-05-01T10:00:00Z" })] }),
      personne({ email: "c@d.fr", sales: [vente({ ref: "neuf", paidAt: "2026-08-25T10:00:00Z" })] }),
    ],
    6,
  );
  assert.deepEqual(vus.map((v) => v.vente.ref), ["neuf", "vieux"]);
  assert.equal(vus[0].email, "c@d.fr");
});

test("UNE VENTE REMBOURSÉE RESTE VISIBLE", () => {
  // Elle a eu lieu, et c'est justement ce qu'on veut voir passer.
  // C'est l'affichage qui la marque, pas le tri qui la cache.
  const vus = dernieresVentes(
    [personne({ sales: [vente({ ref: "rendu", refundedAt: "2026-08-26T10:00:00Z" })] })],
    6,
  );
  assert.equal(vus.length, 1);
  assert.equal(vus[0].vente.ref, "rendu");
});
