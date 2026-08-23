// tests/logic/mois-offert-admin.test.mts
//
// CE QUE BÉNÉ VOIT DES MOIS OFFERTS.
//
// Béné, 23 août 2026 : "Il faut aussi tracker les tricheurs qui veulent
// s'autoaffilier : même adresse email, même adresse IP etc."
//
// Deux cas échappent au moteur PAR CONSTRUCTION : un deuxième mois
// ouvert avant qu'on connaisse l'adresse (formulaire carte), et une IP
// partagée qu'on accorde volontairement. S'ils ne remontent pas ici, la
// promesse ne tient pas et personne ne s'en apercevrait.

import assert from "node:assert/strict";
import test from "node:test";

import { buildMoisOffertDigest } from "../../lib/admin/moisOffertDigest.ts";
import type { Person } from "../../lib/admin/people.ts";

function personne(over: Partial<Person> & { email: string }): Person {
  return {
    email: over.email,
    name: over.name ?? null,
    userId: null,
    hasTiquizAccount: true,
    plan: "monthly",
    status: "abonne",
    createdAt: null,
    lastSignIn: null,
    quizCount: 0,
    leadCount: 0,
    resellerName: null,
    selfServe: true,
    moisOffert: over.moisOffert ?? null,
    paidCents: 0,
    sales: [],
    lastProvider: null,
    lastPaidAt: null,
    atelier: null,
    churn: null,
  } as Person;
}

const mo = (grantedAt: string, flag: string | null) => ({
  grantedAt,
  source: "filleul",
  sa: "sa1234567890abcdef1234",
  flag,
});

test("on compte TOUS les mois offerts, on ne signale que les douteux", () => {
  const d = buildMoisOffertDigest([
    personne({ email: "a@x.fr", moisOffert: mo("2026-08-10T10:00:00Z", null) }),
    personne({ email: "b@x.fr", moisOffert: mo("2026-08-12T10:00:00Z", "meme_ip") }),
    personne({ email: "c@x.fr" }),
  ]);
  assert.equal(d.total, 2);
  assert.equal(d.aRegarder.length, 1);
  assert.equal(d.aRegarder[0].email, "b@x.fr");
  assert.deepEqual(d.parMotif, { meme_ip: 1 });
});

test("les plus recents d'abord : c'est la ou une fraude est encore vivante", () => {
  const d = buildMoisOffertDigest([
    personne({ email: "vieux@x.fr", moisOffert: mo("2026-08-01T10:00:00Z", "deja_recu") }),
    personne({ email: "recent@x.fr", moisOffert: mo("2026-08-20T10:00:00Z", "meme_ip") }),
  ]);
  assert.deepEqual(d.aRegarder.map((l) => l.email), ["recent@x.fr", "vieux@x.fr"]);
});

test("une date illisible ne fait pas disparaitre la ligne", () => {
  // Elle passe en fin de liste, elle ne s'evapore pas : une ligne perdue
  // est exactement le genre de silence qui coute une journee.
  const d = buildMoisOffertDigest([
    personne({ email: "cassee@x.fr", moisOffert: mo("pas une date", "meme_ip") }),
    personne({ email: "ok@x.fr", moisOffert: mo("2026-08-20T10:00:00Z", "deja_recu") }),
  ]);
  assert.equal(d.aRegarder.length, 2);
  assert.equal(d.aRegarder[1].email, "cassee@x.fr");
});

test("aucun mois offert : rien a montrer, et surtout pas un zero permanent", () => {
  const d = buildMoisOffertDigest([personne({ email: "a@x.fr" })]);
  assert.equal(d.total, 0);
  assert.equal(d.aRegarder.length, 0);
  assert.deepEqual(d.parMotif, {});
});

test("la colonne absente ne se lit pas comme `jamais eu de mois offert`", () => {
  // Tant que la migration n'est pas passee, `moisOffert` vaut null pour
  // tout le monde : le total est 0 et l'ecran ne montre RIEN, au lieu
  // d'affirmer quelque chose de faux sur chaque fiche.
  const d = buildMoisOffertDigest([
    personne({ email: "a@x.fr" }),
    personne({ email: "b@x.fr" }),
  ]);
  assert.equal(d.total, 0);
});
