// tests/logic/pilotage-sections.test.mts
//
// LE PLAN DU CENTRE DE PILOTAGE (Béné, 29 août 2026).
//
// "Là tout est mélangé, commenté, pas à jour." Le menu, les titres et
// l'état de chaque section lisent tous UNE liste. Ce test fige ce qui,
// sinon, se remet à diverger au troisième ajout.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { SECTIONS, cheminSection, sectionActive } from "@/lib/pilotage/sections";

test("les sections du plan sont là, et elles seules", () => {
  assert.deepEqual(
    SECTIONS.map((s) => s.id),
    [
      "accueil",
      "clients",
      "ventes",
      "affilies",
      "revendeurs",
      "business",
      "support",
      "sante",
      "parametres",
    ],
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

test("L'ÉTAT D'UNE SECTION EST CELUI DE SON ÉCRAN, pas une case oubliée", () => {
  // Le 29 août, Ventes avait sa page construite et servie, et portait
  // encore le tag "à venir" dans le menu. Béné lit ce menu pour
  // savoir où travailler : une section prête annoncée "bientôt", c'est
  // un écran qu'elle n'ouvre pas.
  //
  // Deux sources de vérité (le dossier et cette liste), donc elles
  // finissent par diverger. Ce test les tient ensemble.
  for (const s of SECTIONS) {
    if (!s.chemin) continue; // l'accueil est `app/pilotage/page.tsx`.
    const page = resolve(process.cwd(), `app/pilotage${s.chemin}/page.tsx`);
    const construite = existsSync(page);
    assert.equal(
      construite,
      s.etat === "prete",
      construite
        ? `${s.id} a sa page mais reste annoncee "a venir"`
        : `${s.id} est annoncee "prete" et n'a pas de page`,
    );
  }
});

test("une section prête ne renvoie plus vers l'ancien écran", () => {
  // `remplace` dit où se fait le travail EN ATTENDANT. Le garder sur
  // une section construite ferait repartir vers l'admin qu'on remplace.
  for (const s of SECTIONS) {
    if (s.etat !== "prete") continue;
    assert.equal((s.remplace ?? []).length, 0, s.id);
  }
});

test("LE SÉLECTEUR DE PÉRIODE N'EXISTE QUE LÀ OÙ IL FAIT QUELQUE CHOSE", () => {
  // Béné le veut "partout", et il l'est sur tout ce qui compte des euros
  // ou des personnes dans le temps. Un annuaire, une file de support et
  // une liste de réglages ne se filtrent pas par mois : l'y laisser en
  // ferait un bouton qui ne fait rien, et on le reclique.
  const avec = SECTIONS.filter((s) => s.periode).map((s) => s.id);
  assert.deepEqual(avec, ["accueil", "ventes", "business"]);
});

test("chaque section se prononce sur la période", () => {
  // Un champ optionnel serait "je ne sais pas", et une section ajoutée
  // sans y penser hériterait du silence.
  for (const s of SECTIONS) {
    assert.equal(typeof s.periode, "boolean", s.id);
  }
});
