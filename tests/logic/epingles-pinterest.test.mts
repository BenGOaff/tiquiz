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
import { metadonneesSommaire } from "@/lib/blog/metaSommaire";
import { codeVerificationPinterest, diagnosticVerificationPinterest } from "@/lib/site/pinterest";
import { LANGUES_PUBLIQUES } from "@/lib/site/langues";
import { sourcePageDuSite } from "./aide/pageDuSite.mts";

test("chaque article publié a son épingle verticale sur le disque", () => {
  // TOUTES LES LANGUES, jamais la seule qui a servi de modele. Mesure du
  // 8 septembre : les quatre articles anglais n'avaient AUCUNE epingle,
  // donc leur flux sortait sans `<enclosure>` et le bouton Pinterest
  // disparaissait de leurs pages. Rien ne le disait.
  let comptees = 0;
  for (const langue of LANGUES_PUBLIQUES) {
    for (const a of listerArticles(langue)) {
      if (!a.couverture) continue;
      assert.ok(epinglePour(a.slug, langue), `épingle manquante pour ${langue} / ${a.slug}`);
      comptees += 1;
    }
  }
  assert.ok(comptees >= 14, `seulement ${comptees} articles couverts : ce test serait muet`);
});

test("chaque langue a son DOSSIER d'épingles", () => {
  // Les quatre slugs anglais different tous des slugs francais
  // aujourd'hui, donc un dossier commun marcherait. Il casserait le jour
  // ou un article anglais porterait le meme slug qu'un francais : sa
  // construction ECRASERAIT l'epingle de l'autre, et le flux francais
  // publierait la couverture anglaise sans qu'une erreur ne s'ecrive.
  const [en] = listerArticles("en");
  assert.ok(en, "aucun article anglais : ce test serait muet");
  assert.match(
    epinglePour(en.slug, "en") ?? "",
    /^https:\/\/tiquiz\.fr\/blog\/pin\/en\/.+\.jpg$/,
    "l'épingle anglaise doit vivre dans son propre dossier",
  );

  // Et la langue DECIDE : demander l'epingle anglaise en francais ne
  // doit pas retomber sur un fichier francais du meme nom.
  assert.equal(epinglePour(en.slug, "fr"), null);
});

test("une épingle désigne l'ARTICLE, jamais le sommaire du blog", () => {
  // Le morceau qu'on ne peut pas oublier : épinglée depuis la liste, une
  // carte sans `data-pin-url` renverrait le lecteur sur /blog.
  const [a] = listerArticles("fr");
  assert.ok(a);
  const attrs = attributsEpingle(a, "fr");
  assert.equal(attrs["data-pin-url"], `https://tiquiz.fr/blog/${a.slug}`);
  assert.match(attrs["data-pin-media"] ?? "", /^https:\/\/tiquiz\.fr\/blog\/pin\/.+\.jpg$/);
  assert.ok((attrs["data-pin-description"] ?? "").length > 10);
});

test("sans épingle construite, on ne désigne RIEN", () => {
  // Mieux vaut laisser Pinterest se débrouiller avec la page que lui
  // donner l'adresse d'un fichier qui n'existe pas.
  assert.deepEqual(attributsEpinglePour("slug-qui-nexiste-pas", "https://x.fr", "texte", "fr"), {});
});

test("la LISTE des articles porte les attributs, pas seulement l'article", () => {
  // ON VISE LE FAIT, PAS L'ENDROIT. La carte et le sommaire ont demenage
  // (`components/site/SommaireBlog.tsx`, 8 septembre) : un test qui
  // figeait `attributsEpingle(une)` dans `app/blog/page.tsx` serait sorti
  // ROUGE sur une correction juste. Ce qui compte, c'est que les deux
  // ECRANS demandent les attributs et les POSENT sur l'image.
  const carte = readFileSync("components/site/CarteArticle.tsx", "utf8");
  assert.match(carte, /attributsEpingle\(article,/);
  assert.match(carte, /\{\.\.\.epingle\}/);
  const sommaire = readFileSync("components/site/SommaireBlog.tsx", "utf8");
  assert.match(sommaire, /\{\.\.\.attributsEpingle\(une,/);
});

test("le sommaire du blog et les rubriques déclarent enfin une image", () => {
  // Elles n'en avaient AUCUNE : partagées, elles sortaient nues sur
  // Pinterest, LinkedIn et Facebook.
  //
  // On APPELLE la fonction au lieu de chercher le nom d'une constante :
  // une constante se renomme, et le test rougirait alors sur une page
  // parfaitement correcte.
  for (const langue of ["fr", "en"] as const) {
    const meta = metadonneesSommaire(langue);
    const images = meta.openGraph && "images" in meta.openGraph ? meta.openGraph.images : null;
    assert.ok(Array.isArray(images) && images.length > 0, `og:image manquante en ${langue}`);
    const url = String((images[0] as { url?: unknown }).url ?? "");
    assert.match(url, /^https:\/\/tiquiz\.fr\/blog\/img\/.+/, langue);
  }
  const rubrique = readFileSync("app/blog/rubrique/[rubrique]/page.tsx", "utf8");
  assert.match(rubrique, /articlesDeLaRubrique\(r\.id\)\[0\]\?\.couverture/);
  assert.match(rubrique, /openGraph:[\s\S]{0,600}images:/);
});

test("le hub a son épingle verticale, et elle est branchée", () => {
  assert.ok(
    existsSync("public/blog/pin/hub-integrations.jpg"),
    "npm run blog:epingles doit construire l'épingle du hub",
  );
  // Le hub a change de GROUPE de routes le 8 septembre (il lit la langue
  // de l'adresse) : on le CHERCHE, un chemin ecrit en dur fige un
  // rangement et rougit sur un code juste.
  const hub = sourcePageDuSite("/integrations");
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
