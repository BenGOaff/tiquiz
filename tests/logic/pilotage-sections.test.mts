// tests/logic/pilotage-sections.test.mts
//
// LE PLAN DU CENTRE DE PILOTAGE (Béné, 29 août 2026).
//
// "Là tout est mélangé, commenté, pas à jour." Le menu, les titres et
// l'état de chaque section lisent tous UNE liste. Ce test fige ce qui,
// sinon, se remet à diverger au troisième ajout.

import { test } from "node:test";
import assert from "node:assert/strict";

import { SECTIONS, cheminSection, sectionActive } from "@/lib/pilotage/sections";

test("les 8 sections de Béné sont là, et elles seules", () => {
  assert.deepEqual(
    SECTIONS.map((s) => s.id),
    ["accueil", "clients", "ventes", "affilies", "business", "support", "sante", "parametres"],
  );
});

test("aucun identifiant ni chemin en double", () => {
  assert.equal(new Set(SECTIONS.map((s) => s.id)).size, SECTIONS.length);
  assert.equal(new Set(SECTIONS.map((s) => s.chemin)).size, SECTIONS.length);
});

test("chaque section porte la QUESTION à laquelle elle répond", () => {
  // Le nom d'une section ne dit pas à quoi elle sert. La question, si.
  for (const s of SECTIONS) {
    assert.ok(s.question.length > 20, s.id);
    assert.ok(s.question.trim().endsWith("?") || s.question.trim().endsWith("."), s.id);
  }
});

test("une section PAS ENCORE PRÊTE dit où se fait le travail aujourd'hui", () => {
  // Sinon on se retrouve sans l'outil ET sans son remplaçant, un jour où
  // on en a besoin. C'est la règle qui permet d'éteindre les anciens
  // /admin sans jamais laisser un trou.
  for (const s of SECTIONS) {
    if (s.etat === "prete") continue;
    assert.ok((s.remplace ?? []).length > 0, `${s.id} annonce "bientot" sans dire ou aller`);
    for (const r of s.remplace ?? []) {
      assert.ok(r.href.startsWith("/") || r.href.startsWith("https://"), `${s.id} : ${r.href}`);
      assert.ok(r.libelle.trim().length > 0, s.id);
    }
  }
});

test("l'accueil est la racine, et il est construit", () => {
  assert.equal(SECTIONS[0].chemin, "");
  assert.equal(cheminSection(SECTIONS[0]), "/pilotage");
  assert.equal(SECTIONS[0].etat, "prete");
});

test("LA SECTION ACTIVE EST LA PLUS PRÉCISE, jamais l'accueil par défaut", () => {
  // Le chemin de l'accueil est vide, donc il préfixe tous les autres :
  // une correspondance naive allumerait "Accueil" sur chaque page.
  assert.equal(sectionActive("/pilotage").id, "accueil");
  assert.equal(sectionActive("/pilotage/clients").id, "clients");
  assert.equal(sectionActive("/pilotage/clients/eric@exemple.fr").id, "clients");
  assert.equal(sectionActive("/pilotage/affilies/").id, "affilies");
  assert.equal(sectionActive("/pilotage/parametres").id, "parametres");
});

test("un chemin hors du plan retombe sur l'accueil au lieu de rien allumer", () => {
  assert.equal(sectionActive("/pilotage/inconnu").id, "accueil");
  assert.equal(sectionActive("").id, "accueil");
});
