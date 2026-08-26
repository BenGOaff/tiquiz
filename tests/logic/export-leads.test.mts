// tests/logic/export-leads.test.mts
//
// L'EXPORT DES LEADS : LES COLONNES NE PEUVENT PLUS SE DÉCALER.
//
// Béné, 26 août 2026 : "l'export des résultats de tiquiz ne donne ni la
// date ni le détail des réponses, ni le tag enregistré dans systeme io
// (si concerné), en plus de ne pas gérer mes accents."
//
// LE BUG PRINCIPAL N'ÉTAIT PAS UN OUBLI, C'ÉTAIT UN DÉCALAGE. Sur un
// quiz scoré, l'en-tête disait `... Résultat, Date, Scores` et la ligne
// écrivait `... résultat, SCORES, date`. Le score tombait donc dans la
// colonne "Date" et la date dans "Scores". Les deux listes vivaient sur
// la MÊME ligne de code, à quatre-vingts caractères d'écart : personne
// ne pouvait le voir en relisant.
//
// Une colonne est maintenant un couple `{ entete, valeur }`. Le décalage
// n'est plus une erreur possible, c'est une impossibilité.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BOM_UTF8,
  cellule,
  colonnesExport,
  construireCsv,
  dateExport,
  type LeadExportable,
} from "@/lib/leads/exportCsv";

const LIBELLES = {
  email: "Email", prenom: "Prénom", nom: "Nom", resultat: "Résultat",
  date: "Date", telephone: "Téléphone", pays: "Pays", scores: "Scores",
  tag: "Tag Systeme.io", question: "Q",
};

const QUESTIONS = [
  { id: "q1", question_text: "<b>Tu dors bien ?</b>" },
  { id: "q2", question_text: "Ton énergie le matin" },
];

function colonnes(scoring: boolean) {
  return colonnesExport({
    libelles: LIBELLES,
    scoring,
    resumerScores: (s) => (s ? "score=62%" : ""),
    questions: QUESTIONS,
    reponse: (l, i) => (l.email === "vide@x.fr" ? "" : `rep${i + 1}`),
    nettoyer: (h) => h.replace(/<[^>]*>/g, ""),
  });
}

const LEAD: LeadExportable = {
  email: "marie@exemple.fr",
  first_name: "Marie",
  last_name: "Durand",
  phone: "0612345678",
  country: "FR",
  result_title: "<span>Le <b>Chronotype</b> du soir</span>",
  scores: { total: 62 },
  sio_tag_applied: "quiz-chronotype-soir",
  created_at: "2026-08-26T14:32:09.000Z",
};

// ── 1. LE DÉCALAGE, LE VRAI BUG ──

test("sur un quiz SCORÉ, la date est bien dans la colonne Date", () => {
  const cols = colonnes(true);
  const csv = construireCsv(cols, [LEAD]);
  const [entetes, ligne] = csv.replace(BOM_UTF8, "").split("\r\n");
  const iDate = entetes.split(",").findIndex((c) => c === `"${LIBELLES.date}"`);
  const iScores = entetes.split(",").findIndex((c) => c === `"${LIBELLES.scores}"`);
  assert.ok(iDate >= 0 && iScores >= 0);
  const cellules = ligne.split(",");
  assert.match(cellules[iDate], /2026-08-26/, "la date n'est pas sous Date : le decalage est revenu");
  assert.match(cellules[iScores], /62%/, "le score n'est pas sous Scores");
});

test("l'en-tete et chaque ligne ont EXACTEMENT le meme nombre de colonnes", () => {
  for (const scoring of [true, false]) {
    const cols = colonnes(scoring);
    const csv = construireCsv(cols, [LEAD, { email: "vide@x.fr" }]);
    const lignes = csv.replace(BOM_UTF8, "").split("\r\n");
    const attendu = lignes[0].split('","').length;
    for (const [i, l] of lignes.entries()) {
      assert.equal(l.split('","').length, attendu, `ligne ${i}, scoring=${scoring}`);
    }
  }
});

test("la colonne Scores n'existe QUE sur un quiz score", () => {
  // `scoring` est un PARAMÈTRE, jamais deviné du contenu : un quiz scoré
  // sans aucune réponse doit quand même produire la colonne.
  assert.ok(colonnes(true).some((c) => c.entete === LIBELLES.scores));
  assert.ok(!colonnes(false).some((c) => c.entete === LIBELLES.scores));
});

// ── 2. LES ACCENTS ──

test("le fichier commence par le BOM, sinon Excel affiche RÃ©sultat", () => {
  const csv = construireCsv(colonnes(false), [LEAD]);
  assert.ok(csv.startsWith(BOM_UTF8), "sans BOM, Excel lit l'UTF-8 en Latin-1");
  assert.equal(BOM_UTF8, "﻿");
  assert.ok(csv.includes("Résultat"));
});

// ── 3. CE QUI MANQUAIT ──

test("la date porte l'heure, et se trie comme du texte", () => {
  // `toLocaleDateString()` rendait "26/08/2026" : pas d'heure, et un
  // tableur americain y lit le 8 juin.
  assert.match(dateExport("2026-08-26T14:32:09.000Z"), /^2026-08-26 \d{2}:\d{2}$/);
  assert.equal(dateExport(null), "");
  assert.equal(dateExport("pas une date"), "", "une date illisible ne doit pas ecrire Invalid Date");
});

test("le tag Systeme.io est exporte, et vide quand il n'y en a pas", () => {
  const cols = colonnes(false);
  const tag = cols.find((c) => c.entete === LIBELLES.tag);
  assert.ok(tag, "la colonne du tag a disparu");
  assert.equal(tag!.valeur(LEAD), "quiz-chronotype-soir");
  // Quelqu'un qui n'utilise pas Systeme.io voit une colonne vide : c'est
  // la reponse juste a sa question, pas un trou.
  assert.equal(tag!.valeur({ email: "x@y.fr" }), "");
});

test("une colonne par question, avec son libelle nettoye du HTML", () => {
  const cols = colonnes(false);
  const qCols = cols.filter((c) => c.entete.startsWith("Q"));
  assert.equal(qCols.length, 2);
  assert.equal(qCols[0].entete, "Q1 Tu dors bien ?", "le HTML du titre fuite dans le tableur");
  assert.equal(qCols[0].valeur(LEAD), "rep1");
  assert.equal(qCols[1].valeur(LEAD), "rep2");
  // Un lead qui n'a pas repondu laisse la cellule vide, pas "undefined".
  assert.equal(qCols[0].valeur({ email: "vide@x.fr" }), "");
});

test("telephone et pays sont exportes", () => {
  const cols = colonnes(false);
  assert.equal(cols.find((c) => c.entete === LIBELLES.telephone)!.valeur(LEAD), "0612345678");
  assert.equal(cols.find((c) => c.entete === LIBELLES.pays)!.valeur(LEAD), "FR");
});

// ── 4. LE FICHIER RESTE LISIBLE PAR UN TABLEUR ──

test("les cinq premieres colonnes gardent leur ordre historique", () => {
  // Quelqu'un qui a deja une correspondance d'import ne doit pas la
  // refaire : tout ce qui est nouveau vient APRES.
  assert.deepEqual(
    colonnes(false).slice(0, 5).map((c) => c.entete),
    [LIBELLES.email, LIBELLES.prenom, LIBELLES.nom, LIBELLES.resultat, LIBELLES.date],
  );
});

test("une cellule ne peut pas casser le fichier", () => {
  assert.equal(cellule('il a dit "oui"'), '"il a dit ""oui"""');
  // Un saut de ligne dans une reponse libre couperait la ligne en deux.
  assert.equal(cellule("ligne1\nligne2"), '"ligne1 ligne2"');
  assert.equal(cellule("ligne1\r\nligne2"), '"ligne1 ligne2"');
  assert.equal(cellule(null), '""');
  assert.equal(cellule(undefined), '""');
});

test("le HTML du resultat ne fuite pas dans le tableur", () => {
  // Rapport Adeline, 17 mai 2026 : du `<span style=...>` brut dans une
  // cellule. La regle tient toujours.
  const cols = colonnes(false);
  const res = cols.find((c) => c.entete === LIBELLES.resultat)!;
  assert.equal(res.valeur(LEAD), "Le Chronotype du soir");
});
