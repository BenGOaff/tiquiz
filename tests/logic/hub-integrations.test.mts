// tests/logic/hub-integrations.test.mts
//
// LE HUB INTÉGRATIONS (Béné, 1er septembre 2026).
//
// "On va créer un hub intégrations pour aller capter les intentions de
// recherches entre les outils concurrents et systeme io pour introduire
// Tiquiz."
//
// Ce que ce filet protège, c'est ce qui casse une page de comparaison
// sans bruit : un prix recopié à côté d'une capture qui dit autre chose,
// un lien vers une page qui n'existe pas encore, et un tableau devenu
// une image.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { OUTILS, OUTILS_PUBLIES, ZAPIER, faqJsonLd, filDArianeJsonLd } from "../../lib/site/integrations.ts";
import { PAGES_PUBLIQUES } from "../../lib/site/pagesPubliques.ts";

const RACINE = process.cwd();
const DOSSIER = path.join(RACINE, "app", "(site)", "integrations");

function source(chemin: string): string {
  return fs.readFileSync(path.join(DOSSIER, chemin), "utf8");
}

/**
 * Le code SANS ses commentaires.
 *
 * L'écart entre le document de départ (19,99 $) et la capture (29,99 $)
 * est EXPLIQUÉ en tête des fichiers concernés, et il doit y rester : une
 * exemption sans raison écrite est une exemption que le prochain passage
 * prend pour un oubli. Ce qu'on interdit, c'est un prix dans ce qui
 * s'AFFICHE.
 */
function codeSeul(chemin: string): string {
  return source(chemin)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
}

const PAGES = ["page.tsx", "zapier-systeme-io/page.tsx", "tally-systeme-io/page.tsx", "typeform-systeme-io/page.tsx"];

// --- LE PRIX DE ZAPIER VIT À UN SEUL ENDROIT --------------------------

test("aucune page ne réécrit le prix de Zapier à la main", () => {
  // Le document de départ annonçait 19,99 $, la capture affichée par la
  // page dit 29,99 $. Un prix recopié au dessus d'une image qui le
  // contredit détruit la page en dix secondes, et c'est la ligne rouge
  // numéro un de Béné. Le prix vient donc de ZAPIER.professionnelParMois.
  for (const p of PAGES) {
    const src = codeSeul(p);
    const nombres = src.match(/\d{1,3},\d{2}\s*\$/g) ?? [];
    assert.deepEqual(nombres, [], `${p} écrit un prix Zapier en dur : ${nombres.join(", ")}`);
  }
});

test("les chiffres de Zapier sont ceux relevés sur la capture", () => {
  assert.equal(ZAPIER.gratuitTachesParMois, 100);
  assert.equal(ZAPIER.gratuitEtapesParZap, 2);
  assert.match(ZAPIER.professionnelParMois, /^\d{1,3},\d{2} \$$/);
});

// --- ON NE LIE JAMAIS UNE PAGE QUI N'EXISTE PAS ------------------------

test("le hub ne lie que les outils dont la page est écrite", () => {
  // Cinq 404 dans un pied de page, c'est le drame du centre d'aide du
  // 24 août. Les outils sans page restent MONTRÉS dans le tableau (une
  // ligne manquante se lit comme un oubli), mais sans lien.
  const hub = source("page.tsx");
  assert.ok(
    hub.includes("OUTILS_PUBLIES.map"),
    "le hub doit construire ses liens depuis OUTILS_PUBLIES, jamais à la main",
  );
  for (const outil of OUTILS) {
    if (outil.slug === null) continue;
    assert.ok(
      fs.existsSync(path.join(DOSSIER, outil.slug, "page.tsx")),
      `${outil.slug} est publié mais sa page n'existe pas`,
    );
  }
  for (const outil of OUTILS) {
    if (outil.slug !== null) continue;
    assert.ok(
      !hub.includes(`/integrations/${outil.nom.toLowerCase().replace(/\s/g, "-")}`),
      `le hub pose un lien vers ${outil.nom}, dont la page n'est pas écrite`,
    );
  }
});

test("chaque outil publié est déclaré dans PAGES_PUBLIQUES", () => {
  const declares = new Set(PAGES_PUBLIQUES.map((p) => p.chemin));
  assert.ok(declares.has("/integrations"), "le hub n'est pas déclaré");
  for (const outil of OUTILS_PUBLIES) {
    assert.ok(
      declares.has(`/integrations/${outil.slug}`),
      `/integrations/${outil.slug} n'est ni dans le sitemap ni dans llms.txt`,
    );
  }
});

// --- LES TABLEAUX SONT DES TABLEAUX ------------------------------------

test("les comparatifs sont de vraies balises table, jamais des images", () => {
  // "Les tableaux sont de vraies balises <table>, jamais des images."
  // Une capture n'est ni extraite par un moteur, ni sélectionnable, ni
  // lisible sur un téléphone : elle rate les trois d'un coup.
  const composant = fs.readFileSync(
    path.join(RACINE, "components", "site", "Integrations.tsx"),
    "utf8",
  );
  assert.ok(composant.includes("<table"), "le composant Tableau ne rend pas de <table>");
  assert.ok(
    composant.includes("overflow-x-auto"),
    "un tableau large doit défiler dans sa boîte, jamais faire défiler la page",
  );
  for (const p of ["page.tsx", "zapier-systeme-io/page.tsx", "tally-systeme-io/page.tsx", "typeform-systeme-io/page.tsx"]) {
    assert.ok(source(p).includes("<Tableau"), `${p} n'a aucun comparatif en balise table`);
  }
});

// --- LE JSON-LD DÉCLARE CE QUI EST AFFICHÉ -----------------------------

test("chaque page enfant déclare un fil d'Ariane et une FAQ", () => {
  for (const p of PAGES.slice(1)) {
    const src = source(p);
    assert.ok(src.includes("filDArianeJsonLd"), `${p} n'a pas de fil d'Ariane`);
    assert.ok(src.includes("faqJsonLd"), `${p} ne déclare pas sa FAQ`);
    assert.ok(src.includes("<Faq questions={FAQ}"), `${p} déclare une FAQ qu'elle n'affiche pas`);
  }
});

test("le JSON-LD reprend mot pour mot la réponse affichée", () => {
  const questions = [{ q: "Une question ?", r: "Une réponse." }];
  const ld = faqJsonLd(questions) as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };
  assert.equal(ld.mainEntity[0].name, "Une question ?");
  assert.equal(ld.mainEntity[0].acceptedAnswer.text, "Une réponse.");
});

test("le fil d'Ariane porte des adresses absolues", () => {
  const ld = filDArianeJsonLd("https://tiquiz.fr", [
    { nom: "Accueil", chemin: "/" },
    { nom: "Intégrations", chemin: "/integrations" },
  ]) as { itemListElement: { position: number; item: string }[] };
  assert.equal(ld.itemListElement[0].item, "https://tiquiz.fr/");
  assert.equal(ld.itemListElement[1].position, 2);
  assert.equal(ld.itemListElement[1].item, "https://tiquiz.fr/integrations");
});

// --- LES CAPTURES EXISTENT VRAIMENT ------------------------------------

test("toute capture affichée existe dans public/integrations", () => {
  // Une image manquante ne casse rien à la compilation : elle laisse un
  // cadre vide sur la page qui doit convaincre.
  for (const p of PAGES) {
    for (const [, src] of source(p).matchAll(/src="(\/integrations\/[^"]+)"/g)) {
      assert.ok(
        fs.existsSync(path.join(RACINE, "public", src)),
        `${p} affiche ${src}, qui n'existe pas`,
      );
    }
  }
});

test("aucune capture n'est affichée sans texte alternatif ni dimensions", () => {
  for (const p of PAGES) {
    for (const [bloc] of source(p).matchAll(/<Capture[\s\S]*?\/>/g)) {
      assert.ok(/alt=[{"]/.test(bloc), `${p} : une capture sans alt`);
      assert.ok(/largeur=\{\d+\}/.test(bloc) && /hauteur=\{\d+\}/.test(bloc), `${p} : une capture sans dimensions`);
    }
  }
});

// --- LES RÈGLES D'ÉCRITURE DE BÉNÉ -------------------------------------

test("aucun tiret cadratin dans les pages du hub", () => {
  for (const p of PAGES) {
    assert.ok(!/[—–]/.test(source(p)), `${p} porte un tiret cadratin`);
  }
});

test("on dit tag, jamais étiquette", () => {
  for (const p of PAGES) {
    assert.ok(!/étiquette/i.test(source(p)), `${p} dit "étiquette" au lieu de "tag"`);
  }
});

test("aucun aplat de couleur sous du texte", () => {
  // Béné, trois fois : "supprime l'arrière plan bleu sous le texte,
  // j'en veux pas, NULLE PART." Le bleu ne sert qu'à un bouton, une
  // pastille numérotée, un filet horizontal ou un chiffre.
  for (const p of [...PAGES, "../../../components/site/Integrations.tsx"]) {
    const src = p.startsWith("../") ? fs.readFileSync(path.join(DOSSIER, p), "utf8") : source(p);
    assert.ok(!/bg-\[var\(--tq-marine\)\]/.test(src), `${p} pose un aplat marine`);
    for (const [, classes] of src.matchAll(/className="([^"]*bg-\[var\(--tq-bleu\)\][^"]*)"/g)) {
      assert.ok(
        /rounded-full/.test(classes),
        `${p} pose un aplat bleu qui n'est pas une pastille : ${classes}`,
      );
    }
  }
});
