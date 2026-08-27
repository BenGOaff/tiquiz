// tests/logic/clic-affilie.test.mts
//
// UN SEUL LIEN AFFILIÉ, ET IL COMPTE TOUT (Béné, 27 août 2026).
//
// "Je veux UN lien affilié pour chaque page, avec l'ID de l'affilié et
// ça doit tout compter, pourquoi tu me parles de deux URL là ?"
//
// Elle avait raison de ne rien comprendre. Le lien affilié est, et
// reste, `tiquiz.fr/?ref=jocelyne`. Il posait déjà le cookie d'un an,
// rattachait à vie, ouvrait le mois offert et payait la commission tous
// les mois. La SEULE chose qui manquait était le comptage du clic : un
// compteur existait (le redirecteur `/go/` de l'espace affilié, écrit le
// 19 août) et RIEN ne l'utilisait, parce que la page Promouvoir
// distribue le lien direct. Sa page de suivi était donc vide par
// construction, et son propre clic n'a rien produit.
//
// On ne change pas le lien de tout le monde pour nourrir le compteur :
// on branche le compteur sur le lien.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { clicASignaler, tipoteBaseUrl } from "@/lib/affiliate/signalerClic";

const PAGE = "text/html,application/xhtml+xml";

test("une page vue avec un code affilié compte un clic", () => {
  assert.equal(clicASignaler({ ref: "jocelyne", pathname: "/", accept: PAGE }), true);
  assert.equal(clicASignaler({ ref: "jocelyne", pathname: "/commande/mensuel", accept: PAGE }), true);
});

test("sans code, il n'y a rien à compter", () => {
  assert.equal(clicASignaler({ ref: null, pathname: "/", accept: PAGE }), false);
  assert.equal(clicASignaler({ ref: "   ", pathname: "/", accept: PAGE }), false);
});

test("une image ou un appel d'API ne sont PAS des clics", () => {
  // Sans ce garde, une seule visite en produirait plusieurs : la page,
  // puis chaque ressource chargée en gardant `?ref=` dans l'URL. Le
  // dédoublonnage par IP les absorberait la plupart du temps, mais
  // compter juste vaut mieux que compter puis corriger.
  assert.equal(clicASignaler({ ref: "jocelyne", pathname: "/logo.png", accept: "image/*" }), false);
  assert.equal(clicASignaler({ ref: "jocelyne", pathname: "/api/quiz", accept: PAGE }), false);
  assert.equal(clicASignaler({ ref: "jocelyne", pathname: "/", accept: "application/json" }), false);
});

test("le registre est chez Tipote, et jamais sur une adresse locale", () => {
  // Même garde que `resolveAppUrl` : un `??` ne protège que de la
  // variable ABSENTE, jamais de la variable FAUSSE (drame Véronique,
  // 2 août). Un `.env` de prod mal renseigné enverrait les clics dans le
  // vide, en silence.
  assert.equal(tipoteBaseUrl({ TIPOTE_APP_URL: "https://app.tipote.com" }), "https://app.tipote.com");
  assert.equal(tipoteBaseUrl({ TIPOTE_APP_URL: "http://localhost:3000" }), "https://app.tipote.com");
  assert.equal(tipoteBaseUrl({}), "https://app.tipote.com");
});

test("le middleware signale le clic SANS faire attendre la page", () => {
  // `await` ici retarderait chaque page portant un `?ref=` du temps
  // d'un aller-retour vers l'autre app. Une page de vente ralentie coûte
  // une vente ; un clic non compté coûte une ligne dans un tableau.
  const src = readFileSync("middleware.ts", "utf8");
  assert.match(src, /event\.waitUntil\(\s*\n?\s*signalerClic\(/);
  assert.ok(
    !/await\s+signalerClic\(/.test(src),
    "le middleware attend le signalement : chaque lien affilié ralentit la page",
  );
});
