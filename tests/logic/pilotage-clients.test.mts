// tests/logic/pilotage-clients.test.mts
//
// "TOUTES LES PERSONNES QUI SONT SUR MES APP, OU QUI L'ONT ÉTÉ"
// (Béné, 29 août 2026).
//
// Le "ou qui l'ont été" n'est pas une formule : quelqu'un qui est parti
// reste dans la liste. Une liste qui ne montrerait que les actifs
// ferait disparaître ceux qu'on voudrait justement rappeler.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  filtrerClients,
  compterParStatut,
  CRITERES_PAR_DEFAUT,
  ORDRE_STATUTS,
  NOM_STATUT,
} from "@/lib/pilotage/clients";
import type { Person } from "@/lib/admin/people";

function personne(p: Partial<Person>): Person {
  return {
    email: "a@b.fr",
    name: null,
    userId: null,
    hasTiquizAccount: true,
    plan: "free",
    status: "essai",
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

const gens = [
  personne({ email: "abonne@x.fr", status: "abonne", paidCents: 17000, createdAt: "2026-08-20T10:00:00Z" }),
  personne({ email: "parti@x.fr", status: "parti", paidCents: 5200, createdAt: "2026-05-02T10:00:00Z" }),
  personne({ email: "gratuit@x.fr", status: "essai", createdAt: "2026-08-25T10:00:00Z" }),
  personne({ email: "eleve@x.fr", status: "atelier", hasTiquizAccount: false, createdAt: "2026-07-01T10:00:00Z" }),
];

test("QUELQU'UN QUI EST PARTI RESTE DANS LA LISTE", () => {
  const vus = filtrerClients(gens, CRITERES_PAR_DEFAUT);
  assert.ok(vus.some((p) => p.email === "parti@x.fr"));
});

test("les derniers arrivés d'abord, par défaut", () => {
  const vus = filtrerClients(gens, CRITERES_PAR_DEFAUT);
  assert.equal(vus[0].email, "gratuit@x.fr");
});

test("le filtre par statut ne garde que lui", () => {
  const vus = filtrerClients(gens, { ...CRITERES_PAR_DEFAUT, statut: "abonne" });
  assert.deepEqual(vus.map((p) => p.email), ["abonne@x.fr"]);
});

test("on cherche sur l'ADRESSE ET sur le NOM", () => {
  // On cherche parfois "jocelyne", parfois "@gmail". Chercher sur un
  // seul des deux oblige a savoir lequel avant de taper.
  const avecNom = [...gens, personne({ email: "x@y.fr", name: "Jocelyne Dupré" })];
  assert.equal(filtrerClients(avecNom, { ...CRITERES_PAR_DEFAUT, recherche: "jocelyne" }).length, 1);
  assert.equal(filtrerClients(avecNom, { ...CRITERES_PAR_DEFAUT, recherche: "@x.fr" }).length, 4);
});

test("la recherche ignore la casse et les espaces autour", () => {
  assert.equal(
    filtrerClients(gens, { ...CRITERES_PAR_DEFAUT, recherche: "  ABONNE@X.FR " }).length,
    1,
  );
});

test("trier par payé met le plus gros en tête", () => {
  const vus = filtrerClients(gens, { ...CRITERES_PAR_DEFAUT, tri: "paye" });
  assert.equal(vus[0].email, "abonne@x.fr");
  assert.equal(vus[1].email, "parti@x.fr");
});

test("UNE DATE ILLISIBLE NE REMONTE PAS EN TÊTE", () => {
  const vus = filtrerClients(
    [...gens, personne({ email: "sansdate@x.fr", createdAt: null })],
    CRITERES_PAR_DEFAUT,
  );
  assert.notEqual(vus[0].email, "sansdate@x.fr");
  // Mais elle reste dans la liste : une ligne ecartee en silence est
  // une ligne dont personne ne s'occupera jamais.
  assert.equal(vus.length, 5);
});

test("chaque filtre porte son NOMBRE", () => {
  // Voir "abonnes 42" a cote de "partis 8" dit la forme de la base
  // avant meme de cliquer.
  const compte = compterParStatut(gens);
  assert.equal(compte.tous, 4);
  assert.equal(compte.abonne, 1);
  assert.equal(compte.parti, 1);
});

test("chaque statut proposé a un nom lisible", () => {
  for (const s of ORDRE_STATUTS) {
    assert.ok(NOM_STATUT[s] && NOM_STATUT[s].length > 2, s);
  }
});

test("un filtre qui ne rend rien rend un tableau VIDE, jamais tout", () => {
  // Retomber sur la liste complete ferait croire que le filtre ne
  // marche pas, et on cliquerait dix fois.
  const vus = filtrerClients(gens, { ...CRITERES_PAR_DEFAUT, recherche: "personne-de-ce-nom" });
  assert.equal(vus.length, 0);
});
