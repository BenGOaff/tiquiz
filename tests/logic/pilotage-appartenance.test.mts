// tests/logic/pilotage-appartenance.test.mts
//
// DE QUOI CETTE PERSONNE EST-ELLE CLIENTE.
//
// Béné : "je vois en un clin d'oeil de QUOI il est client ? Tiquiz ?
// Atelier ? Tipote ?" Le piège de cette question est le GRATUIT : le
// compter comme client Tiquiz gonflerait la clientèle payante, et c'est
// un chiffre sur lequel on décide.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  APPARTENANCES_ORDRE,
  appartenances,
  compterAppartenances,
  estDe,
  NOM_APPARTENANCE,
  type EntreeAppartenance,
} from "@/lib/pilotage/appartenance";

function gens(p: Partial<EntreeAppartenance>): EntreeAppartenance {
  return { hasTiquizAccount: true, plan: "free", atelier: null, ...p };
}

test("UN COMPTE GRATUIT N'EST PAS UN CLIENT PAYANT", () => {
  assert.deepEqual(appartenances(gens({ plan: "free" })), ["tiquiz-gratuit"]);
  assert.deepEqual(appartenances(gens({ plan: "monthly" })), ["tiquiz"]);
});

test("mais il n'est pas RIEN non plus : une case vide se lirait comme un trou", () => {
  assert.equal(appartenances(gens({ plan: "free" })).length, 1);
});

test("une personne peut être cliente de plusieurs choses", () => {
  const a = appartenances(
    gens({ plan: "yearly_plus", atelier: { status: "active" }, tipote: true }),
  );
  assert.deepEqual(a, ["tiquiz", "atelier", "tipote"]);
});

test("un élève de l'Atelier SANS compte Tiquiz porte une seule pastille", () => {
  const a = appartenances({
    hasTiquizAccount: false,
    plan: "",
    atelier: { status: "active" },
  });
  assert.deepEqual(a, ["atelier"]);
});

test("un Atelier non actif ne compte pas", () => {
  assert.deepEqual(appartenances(gens({ plan: "monthly", atelier: { status: "revoked" } })), [
    "tiquiz",
  ]);
});

test("TIPOTE INCONNU N'EST PAS TIPOTE ABSENT", () => {
  // La base de Tipote vit ailleurs. Afficher "pas client Tipote" quand
  // on n'a rien demandé serait une affirmation qu'on ne peut pas
  // soutenir : c'est la règle du 22 août, "je n'ai pas trouvé" et "il
  // n'y a rien" sont deux réponses différentes.
  assert.ok(!appartenances(gens({ plan: "monthly", tipote: null })).includes("tipote"));
  assert.ok(!appartenances(gens({ plan: "monthly" })).includes("tipote"));
  assert.ok(appartenances(gens({ plan: "monthly", tipote: true })).includes("tipote"));
});

test("l'ordre d'affichage est fixe, le payant devant le gratuit", () => {
  assert.deepEqual(APPARTENANCES_ORDRE, ["tiquiz", "atelier", "tipote", "tiquiz-gratuit"]);
  for (const a of APPARTENANCES_ORDRE) assert.ok(NOM_APPARTENANCE[a]);
});

test("les compteurs comptent une personne dans CHACUNE de ses appartenances", () => {
  const c = compterAppartenances([
    gens({ plan: "monthly", atelier: { status: "active" } }),
    gens({ plan: "free" }),
    { hasTiquizAccount: false, plan: "", atelier: { status: "active" } },
  ]);
  assert.equal(c.tiquiz, 1);
  assert.equal(c.atelier, 2);
  assert.equal(c["tiquiz-gratuit"], 1);
  assert.equal(c.tipote, 0);
});

test("estDe sert le filtre, et il dit la même chose que la liste", () => {
  const p = gens({ plan: "monthly", atelier: { status: "active" } });
  assert.ok(estDe(p, "tiquiz"));
  assert.ok(estDe(p, "atelier"));
  assert.ok(!estDe(p, "tipote"));
});
