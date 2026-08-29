// tests/logic/churn-digest.test.mts
//
// CE QUE BÉNÉ LIT QUAND ELLE OUVRE "POURQUOI ELLES PARTENT".
//
// Le bloc est la seule raison d'être de l'email de départ : sans lui,
// les réponses seraient enregistrées et illisibles. Ces tests figent les
// deux choses qui le rendraient trompeur : compter des gens qui ne sont
// pas partis, et laisser croire que deux phrases décrivent trente
// départs.

import assert from "node:assert/strict";
import test from "node:test";

import { buildChurnDigest, MAX_VOIX } from "../../lib/admin/churnDigest.ts";
import type { Person } from "../../lib/admin/people.ts";

type Churn = NonNullable<Person["churn"]>;

function personne(over: Partial<Person> & { email: string }): Person {
  return {
    email: over.email,
    name: over.name ?? null,
    userId: null,
    hasTiquizAccount: true,
    plan: "monthly",
    status: over.status ?? "abonne",
    createdAt: null,
    lastSignIn: null,
    quizCount: 0,
    leadCount: 0,
    resellerName: null,
    selfServe: true,
    moisOffert: null,
    paidCents: 0,
    sales: [],
    lastProvider: null,
    lastPaidAt: null,
    atelier: null,
    essaiPlus: null,
    churn: over.churn ?? null,
  } as Person;
}

function depart(over: Partial<Churn>): Churn {
  return {
    cancelledAt: over.cancelledAt ?? null,
    endsAt: over.endsAt ?? null,
    endedAt: over.endedAt ?? null,
    feedback: over.feedback ?? null,
    comment: over.comment ?? null,
  };
}

test("on ne compte QUE les departs, jamais les abonnes en cours", () => {
  const d = buildChurnDigest([
    personne({ email: "a@x.fr", status: "abonne" }),
    personne({ email: "b@x.fr", status: "essai" }),
    personne({
      email: "c@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-10T00:00:00Z", comment: "trop lourd pour moi" }),
    }),
  ]);
  assert.equal(d.total, 1);
  assert.equal(d.voix.length, 1);
  assert.equal(d.voix[0].email, "c@x.fr");
});

test("celle qui a resilie mais court jusqu'a la fin compte deja", () => {
  // Elle a dit pourquoi le jour ou elle a resilie. Attendre la fin de sa
  // periode pour lire sa phrase, c'est la lire un mois trop tard.
  const d = buildChurnDigest([
    personne({
      email: "a@x.fr",
      status: "partant",
      churn: depart({ cancelledAt: "2026-08-20T00:00:00Z", comment: "je reviendrai" }),
    }),
  ]);
  assert.equal(d.total, 1);
  assert.equal(d.voix.length, 1);
});

test("la plus recente d'abord, et les sans date passent derriere", () => {
  const d = buildChurnDigest([
    personne({
      email: "vieux@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-06-01T00:00:00Z", comment: "vieux" }),
    }),
    personne({
      email: "sansdate@x.fr",
      status: "parti",
      churn: depart({ comment: "sans date" }),
    }),
    personne({
      email: "recent@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-15T00:00:00Z", comment: "recent" }),
    }),
  ]);
  assert.deepEqual(
    d.voix.map((v) => v.email),
    ["recent@x.fr", "vieux@x.fr", "sansdate@x.fr"],
  );
});

test("une case cochee se compte, une phrase se lit, et les deux cohabitent", () => {
  const d = buildChurnDigest([
    personne({
      email: "a@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-01T00:00:00Z", feedback: "too_expensive" }),
    }),
    personne({
      email: "b@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-02T00:00:00Z", feedback: "too_expensive" }),
    }),
    personne({
      email: "c@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-03T00:00:00Z", feedback: "unused", comment: "pas eu le temps" }),
    }),
  ]);
  assert.deepEqual(d.parMotif, [
    { motif: "too_expensive", count: 2 },
    { motif: "unused", count: 1 },
  ]);
  // Une case cochee SANS phrase ne fabrique pas de fausse citation.
  assert.equal(d.voix.length, 1);
  assert.equal(d.voix[0].texte, "pas eu le temps");
  assert.equal(d.voix[0].motif, "unused");
});

test("les departs muets sont comptes, sinon deux phrases parlent pour trente", () => {
  const gens = [
    personne({
      email: "parle@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-01T00:00:00Z", comment: "il manquait l'export" }),
    }),
    ...Array.from({ length: 9 }, (_, i) =>
      personne({
        email: `muet${i}@x.fr`,
        status: "parti",
        churn: depart({ endedAt: "2026-08-01T00:00:00Z" }),
      }),
    ),
  ];
  const d = buildChurnDigest(gens);
  assert.equal(d.total, 10);
  assert.equal(d.voix.length, 1);
  assert.equal(d.sansReponse, 9);
});

test("une case cochee sans phrase n'est PAS un depart muet", () => {
  // Elle a dit quelque chose, meme peu : la compter comme muette
  // gonflerait le "personne ne repond" et ferait croire que l'email ne
  // sert a rien.
  const d = buildChurnDigest([
    personne({
      email: "a@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-01T00:00:00Z", feedback: "too_expensive" }),
    }),
  ]);
  assert.equal(d.sansReponse, 0);
});

test("un texte vide ou blanc ne fabrique pas une citation vide", () => {
  const d = buildChurnDigest([
    personne({
      email: "a@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-01T00:00:00Z", comment: "   " }),
    }),
  ]);
  assert.equal(d.voix.length, 0);
  assert.equal(d.sansReponse, 1);
});

test("la liste est bornee, l'ecran ne devient jamais un mur", () => {
  const gens = Array.from({ length: MAX_VOIX + 12 }, (_, i) =>
    personne({
      email: `p${i}@x.fr`,
      status: "parti",
      churn: depart({
        endedAt: `2026-08-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
        comment: `raison ${i}`,
      }),
    }),
  );
  const d = buildChurnDigest(gens);
  assert.equal(d.total, MAX_VOIX + 12);
  assert.equal(d.voix.length, MAX_VOIX);
});

test("aucun pourcentage ne sort de cette fonction", () => {
  // La retenue ne s'obtient pas en la demandant a l'ecran : elle
  // s'obtient en ne calculant jamais le chiffre qui trompe. Sur trois
  // departs, "67%" designe deux personnes.
  const d = buildChurnDigest([
    personne({
      email: "a@x.fr",
      status: "parti",
      churn: depart({ endedAt: "2026-08-01T00:00:00Z", feedback: "too_expensive" }),
    }),
  ]);
  const cles = new Set(Object.keys(d).concat(Object.keys(d.parMotif[0] ?? {})));
  for (const cle of cles) {
    assert.ok(!/pct|percent|ratio|part/i.test(cle), `${cle} ressemble a un pourcentage`);
  }
});

test("une liste vide ne casse rien", () => {
  const d = buildChurnDigest([]);
  assert.deepEqual(d, { total: 0, parMotif: [], voix: [], sansReponse: 0 });
});
