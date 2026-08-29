// tests/logic/pilotage-resume.test.mts
//
// TOUT L'ÉCRAN PARLE DE LA MÊME PÉRIODE, OU IL MENT.
//
// Le piège du sélecteur de période est entier là dedans : s'il ne
// déplaçait que le graphique pendant que les compteurs du haut parlent
// d'autre chose, deux chiffres se contrediraient sur la même page.

import { test } from "node:test";
import assert from "node:assert/strict";

import { resumePeriode } from "@/lib/pilotage/resumePeriode";
import { resoudrePeriode, lirePeriode } from "@/lib/pilotage/periode";
import type { Person } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";

const MAINTENANT = new Date("2026-08-29T12:00:00Z");

function vente(p: Partial<Sale>): Sale {
  return {
    ref: "r",
    provider: "stripe",
    email: "a@b.fr",
    name: null,
    productId: null,
    amountCents: 1700,
    amountSource: "payload",
    paidAt: "2026-08-10T10:00:00Z",
    refundedAt: null,
    ...p,
  } as Sale;
}

function personne(p: Partial<Person>): Person {
  return {
    email: "a@b.fr",
    name: null,
    userId: null,
    hasTiquizAccount: true,
    plan: "free",
    status: "gratuit",
    createdAt: "2026-08-10T10:00:00Z",
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

test("LE COMPTEUR ET LE GRAPHIQUE DONNENT LE MÊME TOTAL", () => {
  // Deux chiffres sur la meme page qui se contredisent, c'est celui du
  // haut qu'on croit. Ils sortent donc des memes ventes filtrees.
  const r = resumePeriode({
    sales: [
      vente({ ref: "a", amountCents: 5200, paidAt: "2026-08-10T10:00:00Z" }),
      vente({ ref: "b", amountCents: 1700, paidAt: "2026-08-20T10:00:00Z" }),
      vente({ ref: "vieux", amountCents: 99900, paidAt: "2026-04-10T10:00:00Z" }),
    ],
    people: [],
    periode: resoudrePeriode("ce-mois", MAINTENANT),
    maintenant: MAINTENANT,
  });
  assert.equal(r.encaisseCents, 6900);
  assert.equal(r.serie.fiable, true);
  if (r.serie.fiable) assert.equal(r.serie.totalCents, 6900);
});

test("une vente HORS période ne compte nulle part", () => {
  const r = resumePeriode({
    sales: [vente({ paidAt: "2026-04-10T10:00:00Z", amountCents: 99900 })],
    people: [],
    periode: resoudrePeriode("ce-mois", MAINTENANT),
    maintenant: MAINTENANT,
  });
  assert.equal(r.encaisseCents, 0);
  assert.equal(r.ventes, 0);
  assert.equal(r.serie.fiable, false);
});

test("UN REMBOURSEMENT COMPTE DANS LE MOIS OÙ IL SORT", () => {
  // C'est ce que fait une banque, et c'est a ca que Bene comparera : un
  // remboursement d'aout sur une vente d'avril sort de la tresorerie en
  // aout.
  const r = resumePeriode({
    sales: [
      vente({
        paidAt: "2026-04-10T10:00:00Z",
        refundedAt: "2026-08-15T10:00:00Z",
        amountCents: 6400,
      }),
    ],
    people: [],
    periode: resoudrePeriode("ce-mois", MAINTENANT),
    maintenant: MAINTENANT,
  });
  assert.equal(r.rembourseCents, 6400);
  // Et elle n'a pas ete encaissee ce mois ci.
  assert.equal(r.encaisseCents, 0);
});

test("une vente remboursée ne gonfle pas l'encaissé de sa propre période", () => {
  const r = resumePeriode({
    sales: [
      vente({ paidAt: "2026-08-02T10:00:00Z", refundedAt: "2026-08-20T10:00:00Z", amountCents: 6400 }),
      vente({ ref: "ok", paidAt: "2026-08-03T10:00:00Z", amountCents: 1700 }),
    ],
    people: [],
    periode: resoudrePeriode("ce-mois", MAINTENANT),
    maintenant: MAINTENANT,
  });
  assert.equal(r.encaisseCents, 1700);
  assert.equal(r.rembourseCents, 6400);
});

test("les nouveaux comptes suivent la même période", () => {
  const r = resumePeriode({
    sales: [],
    people: [
      personne({ email: "neuf@x.fr", createdAt: "2026-08-20T10:00:00Z" }),
      personne({ email: "vieux@x.fr", createdAt: "2026-02-01T10:00:00Z" }),
    ],
    periode: resoudrePeriode("ce-mois", MAINTENANT),
    maintenant: MAINTENANT,
  });
  assert.equal(r.nouveauxComptes, 1);
  assert.deepEqual(r.contacts.map((p) => p.email), ["neuf@x.fr"]);
});

test("LES DERNIÈRES VENTES SONT CELLES DE LA PÉRIODE, pas les dernières tout court", () => {
  const r = resumePeriode({
    sales: [],
    people: [
      personne({
        email: "c@x.fr",
        sales: [
          vente({ ref: "dedans", paidAt: "2026-08-15T10:00:00Z" }),
          vente({ ref: "dehors", paidAt: "2026-03-15T10:00:00Z" }),
        ],
      }),
    ],
    periode: resoudrePeriode("ce-mois", MAINTENANT),
    maintenant: MAINTENANT,
  });
  assert.deepEqual(r.dernieresVentes.map((v) => v.vente.ref), ["dedans"]);
});

test("une période sur mesure découpe exactement ce qu'on a demandé", () => {
  const p = lirePeriode(new URLSearchParams("debut=2026-06-01&fin=2026-06-30"), MAINTENANT);
  const r = resumePeriode({
    sales: [
      vente({ ref: "juin", paidAt: "2026-06-30T23:00:00Z", amountCents: 900 }),
      vente({ ref: "juillet", paidAt: "2026-07-01T01:00:00Z", amountCents: 22200 }),
    ],
    people: [],
    periode: p,
    maintenant: MAINTENANT,
  });
  assert.equal(r.encaisseCents, 900);
});
