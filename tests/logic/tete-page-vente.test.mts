// tests/logic/tete-page-vente.test.mts
//
// UN SEUL TITRE DANS LA TÊTE D'UNE PAGE DE VENTE.
//
// 1er septembre 2026 : `tiquiz.fr` et `atelierduquiz.fr` portaient DEUX
// balises `<title>`. La nôtre en haut du head, celle de la capture
// Systeme.io plus bas. Google choisissait lui même laquelle afficher.
//
// La cause tenait en un caractère : `stripHeadTags` visait `<title>`
// NU, alors que Systeme.io publie `<title data-react-helmet="true">`.
// Le retrait ne mordait pas, et le commentaire au dessus de la fonction
// promettait mot pour mot que la page ne porterait pas "deux titres,
// deux descriptions et deux canoniques".
//
// Le test porte sur la VRAIE capture : un test qui n'exercerait qu'une
// chaîne écrite à la main aurait été vert le jour du bug.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { renderSalesPage, stripHeadTags } from "@/lib/sales/servePage";

const CAPTURE = path.join(process.cwd(), "content", "sales", "tiquiz.html");

function compte(html: string, motif: RegExp): number {
  return (html.match(motif) ?? []).length;
}

test("le titre de la capture est retire, attributs compris", () => {
  const avec = `<head><title data-react-helmet="true">Titre de la capture</title></head>`;
  assert.equal(stripHeadTags(avec).includes("Titre de la capture"), false);

  const nu = `<head><title>Titre nu</title></head>`;
  assert.equal(stripHeadTags(nu).includes("Titre nu"), false);
});

test("une balise qui COMMENCE par title n'est pas confondue avec le titre", () => {
  // `<title\b` exige une frontiere de mot : sans elle, on retirerait
  // aussi le contenu d'un hypothetique <titlebar>.
  const html = `<div><titlebar>Garde moi</titlebar></div>`;
  assert.equal(stripHeadTags(html).includes("Garde moi"), true);
});

test("la page de vente ne porte QU'UN titre et QU'UNE canonique", () => {
  const capture = fs.readFileSync(CAPTURE, "utf8");
  assert.ok(/<title\b/i.test(capture), "la capture doit contenir un <title>");

  const html = renderSalesPage(
    capture,
    {
      slug: "tiquiz",
      canonical: "https://tiquiz.fr/",
      title: "Le titre que NOUS ecrivons",
      description: "La description que nous ecrivons.",
      locale: "fr_FR",
    },
    { indexable: true, analytics: false, checkoutTargets: null },
  );

  assert.equal(compte(html, /<title\b/gi), 1, "deux titres, Google choisit");
  assert.equal(compte(html, /rel=["']?canonical/gi), 1);
  assert.equal(compte(html, /name=["']description["']/gi), 1);
  assert.ok(html.includes("Le titre que NOUS ecrivons"));
});

test("le titre servi garde le mot cle qui vend", () => {
  // POURQUOI CE TEST EXISTE. Le titre de la capture portait
  // "Systeme io", et c'est la requete la plus rentable du produit. En
  // corrigeant le doublon, c'est le titre du CODE qui gagne : le
  // corriger sans changer ce titre aurait fait perdre le mot cle au
  // moment meme ou on reprenait la main sur l'affichage.
  const route = fs.readFileSync(
    path.join(process.cwd(), "app", "apercu", "vente", "[slug]", "route.ts"),
    "utf8",
  );
  const titre = /title:\s*"([^"]*Tiquiz[^"]*)"/.exec(route)?.[1] ?? "";
  assert.match(titre, /Systeme\.io/, "le titre de tiquiz.fr doit nommer Systeme.io");
});
