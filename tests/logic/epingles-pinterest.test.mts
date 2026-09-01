// tests/logic/epingles-pinterest.test.mts
//
// « LE FORMAT DES IMAGES NE ME PERMET PAS DE LES PARTAGER SUR PINTEREST
//   (LISTE DES ARTICLES, HUB ...) ET JE MANQUE DE LA VISIBILITÉ À CAUSE
//   DE ÇA » (Béné, 1er septembre 2026)
//
// Mesuré sur la production AVANT de corriger, et c'était plus bête que
// le format : `/blog` ne déclarait AUCUNE image, les rubriques non plus,
// et le hub n'en avait qu'une en PAYSAGE. Seule la page d'un article
// portait une épingle verticale.

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { attributsEpingle, attributsEpinglePour, epinglePour } from "@/lib/blog/partage";
import { listerArticles } from "@/lib/blog/articles";
import { codeVerificationPinterest, diagnosticVerificationPinterest } from "@/lib/site/pinterest";

test("chaque article publié a son épingle verticale sur le disque", () => {
  for (const a of listerArticles()) {
    if (!a.couverture) continue;
    assert.ok(epinglePour(a.slug), `épingle manquante pour ${a.slug}`);
  }
});

test("une épingle désigne l'ARTICLE, jamais le sommaire du blog", () => {
  // Le morceau qu'on ne peut pas oublier : épinglée depuis la liste, une
  // carte sans `data-pin-url` renverrait le lecteur sur /blog.
  const [a] = listerArticles();
  assert.ok(a);
  const attrs = attributsEpingle(a);
  assert.equal(attrs["data-pin-url"], `https://tiquiz.fr/blog/${a.slug}`);
  assert.match(attrs["data-pin-media"] ?? "", /^https:\/\/tiquiz\.fr\/blog\/pin\/.+\.jpg$/);
  assert.ok((attrs["data-pin-description"] ?? "").length > 10);
});

test("sans épingle construite, on ne désigne RIEN", () => {
  // Mieux vaut laisser Pinterest se débrouiller avec la page que lui
  // donner l'adresse d'un fichier qui n'existe pas.
  assert.deepEqual(attributsEpinglePour("slug-qui-nexiste-pas", "https://x.fr", "texte"), {});
});

test("la LISTE des articles porte les attributs, pas seulement l'article", () => {
  const carte = readFileSync("components/site/CarteArticle.tsx", "utf8");
  assert.match(carte, /attributsEpingle\(article\)/);
  assert.match(carte, /\{\.\.\.epingle\}/);
  const index = readFileSync("app/blog/page.tsx", "utf8");
  assert.match(index, /attributsEpingle\(une\)/);
});

test("le sommaire du blog et les rubriques déclarent enfin une image", () => {
  // Elles n'en avaient AUCUNE : partagées, elles sortaient nues sur
  // Pinterest, LinkedIn et Facebook.
  const index = readFileSync("app/blog/page.tsx", "utf8");
  assert.match(index, /COUVERTURE_UNE/);
  assert.match(index, /openGraph:[\s\S]{0,600}images:/);
  const rubrique = readFileSync("app/blog/rubrique/[rubrique]/page.tsx", "utf8");
  assert.match(rubrique, /articlesDeLaRubrique\(r\.id\)\[0\]\?\.couverture/);
  assert.match(rubrique, /openGraph:[\s\S]{0,600}images:/);
});

test("le hub a son épingle verticale, et elle est branchée", () => {
  assert.ok(
    existsSync("public/blog/pin/hub-integrations.jpg"),
    "npm run blog:epingles doit construire l'épingle du hub",
  );
  const hub = readFileSync("app/(site)/integrations/page.tsx", "utf8");
  assert.match(hub, /attributsEpinglePour\(\s*"hub-integrations"/);
});

test("LE CODE PINTEREST SE VALIDE, il ne se croit pas sur parole", () => {
  // Règle du 2 août : un `??` protège du manquant, jamais du faux.
  assert.equal(codeVerificationPinterest(""), null);
  assert.equal(codeVerificationPinterest(undefined), null);
  assert.equal(codeVerificationPinterest("pas valide !!"), null);
  assert.equal(codeVerificationPinterest("trop-court"), null);
  assert.equal(codeVerificationPinterest("a1b2c3d4e5f6a1b2c3d4"), "a1b2c3d4e5f6a1b2c3d4");
  // Le cas le plus probable : elle colle la balise entière, c'est ce que
  // Pinterest met dans le presse papier.
  assert.equal(
    codeVerificationPinterest('<meta name="p:domain_verify" content="a1b2c3d4e5f6a1b2c3d4"/>'),
    "a1b2c3d4e5f6a1b2c3d4",
  );
});

test("une valeur illisible CRIE, une valeur absente se tait", () => {
  assert.equal(diagnosticVerificationPinterest(undefined), null);
  assert.equal(diagnosticVerificationPinterest("a1b2c3d4e5f6a1b2c3d4"), null);
  const dit = diagnosticVerificationPinterest("pas valide !!");
  assert.ok(dit && dit.includes("illisible"));
  // On dit la LONGUEUR, jamais la valeur : ce message finit dans un
  // terminal et dans un historique (règle du 22 août).
  assert.ok(!dit.includes("pas valide"));
});

test("la balise ne sort pas quand le code manque", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /codeVerificationPinterest\(\)\s*\n?\s*\?\s*\{ other: \{ "p:domain_verify"/);
});
