// tests/logic/pilotage-sondes-cles.test.mts
//
// EST-CE QUE LA CLÉ MARCHE.
//
// Béné : "dans paramètres je vois pas trop l'intérêt". Elle a raison :
// "posée" ne dit rien de plus qu'un grep dans le fichier. Ce fichier
// fige la seule règle qui compte ici, et elle a déjà coûté une heure le
// 22 août : ON N'ACCUSE PAS UNE CLÉ SUR UN CODE QUI N'ACCUSE PAS LA CLÉ.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  comptePannes,
  lireReponse,
  phraseCle,
  trierCles,
  type ResultatCle,
} from "@/lib/pilotage/sondesCles";

test("SEULS 401 ET 403 ACCUSENT LA CLÉ", () => {
  assert.equal(lireReponse(200), "ok");
  assert.equal(lireReponse(204), "ok");
  assert.equal(lireReponse(401), "refusee");
  assert.equal(lireReponse(403), "refusee");
});

test("un 500 accuse le SERVICE, jamais la clé", () => {
  // Conclure "cle refusee" sur un 500 enverrait regenerer une cle
  // parfaitement bonne. C'est l'erreur du 22 aout dans l'autre sens :
  // trois echanges a accuser une cle anon qui n'avait rien.
  assert.equal(lireReponse(500), "injoignable");
  assert.equal(lireReponse(502), "injoignable");
  assert.equal(lireReponse(0), "injoignable");
  assert.equal(lireReponse(429), "injoignable");
});

test("chaque état porte une phrase, et le refus dit QUOI FAIRE", () => {
  for (const e of ["absente", "ok", "refusee", "injoignable"] as const) {
    const p = phraseCle("Stripe", e, "STRIPE_SECRET_KEY_OWNER");
    assert.ok(p.length > 20, e);
  }
  assert.ok(phraseCle("Stripe", "refusee", "STRIPE_SECRET_KEY_OWNER").includes("STRIPE_SECRET_KEY_OWNER"));
  assert.ok(
    phraseCle("Stripe", "injoignable", "X").includes("pas la même chose"),
    "injoignable ne doit jamais se lire comme refusee",
  );
});

test("CE QUI CLOCHE EST EN HAUT, l'éteint volontaire en bas", () => {
  const r: ResultatCle[] = [
    { service: "Zeta", etat: "ok", detail: "", variable: "A" },
    { service: "Alpha", etat: "absente", detail: "", variable: "B" },
    { service: "Beta", etat: "refusee", detail: "", variable: "C" },
    { service: "Gamma", etat: "injoignable", detail: "", variable: "D" },
  ];
  assert.deepEqual(
    trierCles(r).map((x) => x.service),
    ["Beta", "Gamma", "Alpha", "Zeta"],
  );
});

test("seul un REFUS compte comme panne", () => {
  // Une cle absente est le plus souvent une fonctionnalite eteinte
  // volontairement : la compter comme panne ferait rougir l'ecran en
  // permanence, et un ecran qui rougit tout le temps ne se lit plus.
  const r: ResultatCle[] = [
    { service: "A", etat: "absente", detail: "", variable: "" },
    { service: "B", etat: "refusee", detail: "", variable: "" },
    { service: "C", etat: "injoignable", detail: "", variable: "" },
  ];
  assert.equal(comptePannes(r), 1);
});
