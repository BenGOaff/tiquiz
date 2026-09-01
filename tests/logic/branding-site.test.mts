// tests/logic/branding-site.test.mts
//
// AUCUN APLAT DE COULEUR SOUS DU TEXTE, SUR LE SITE PUBLIC.
//
// Béné, 31 août 2026 : "supprime l'arrière plan bleu sous le texte
// c'est pas adapté, pas beau, j'en veux pas, NULLE PART. Au pire mets
// carrément le texte en couleur, mais dans les couleurs Tiquiz pas
// couleurs des vignettes. Notre branding c'est celui des pages de vente
// tiquiz.fr et atelierduquiz.fr pas les vignettes."
//
// TROISIÈME FOIS QUE LA REMARQUE SORT, et c'est ça qui justifie un
// test plutôt qu'une correction de plus :
//
//  - 3 août : "l'encart est tout pété, il monte presque sur le menu de
//    gauche" ET "il est de la même couleur que les boutons, ça entraîne
//    de la confusion" (les quatre temps de la page de résultat) ;
//  - 30 août : "les encarts bleu sont moches j'en veux pas en plus ils
//    rendent le texte illisible" (l'encart de fin d'article) ;
//  - 31 août : ici, sur le simulateur et les deux blocs de fin de page.
//
// Le motif est toujours le même : on prend les couleurs d'un VISUEL
// (une couverture d'article, une vignette sombre) et on les applique à
// une INTERFACE. Un dessin de 1200 px peut porter trois mots dans un
// bloc bleu ; une page qui doit se LIRE, non.
//
// CE QUI RESTE COLORÉ, ET IL N'Y A QUE ÇA :
//  - un bouton (`.tq-bouton`), où rien ne se lit longtemps ;
//  - une pastille numérotée, qui porte un chiffre ;
//  - le PIED de page (`.tq-pied`), le geste Typeform qu'elle a montré
//    elle même le 30 août ;
//  - un filet HORIZONTAL et un chiffre en couleur.
//
// Le test regarde les fichiers du SITE PUBLIC uniquement. L'app derrière
// connexion a ses propres jetons et n'est pas concernée.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

const RACINE = process.cwd();

/** Les écrans du site public, ceux que Béné regarde. */
const ECRANS = [
  "app/(site)/affiliation/page.tsx",
  "app/(site)/affiliation-atelier/page.tsx",
  "app/(site)/a-propos/page.tsx",
  "app/(site)/newsletter/page.tsx",
  "app/blog/page.tsx",
  "app/(site)/integrations/page.tsx",
  "app/(site)/integrations/zapier-systeme-io/page.tsx",
  "app/(site)/integrations/tally-systeme-io/page.tsx",
  "app/(site)/integrations/typeform-systeme-io/page.tsx",
  "components/site/Integrations.tsx",
  "components/site/EncartCta.tsx",
  "components/site/SimulateurAffiliation.tsx",
];

function lire(relatif: string): string {
  return fs.readFileSync(path.join(RACINE, relatif), "utf8");
}

/** Le code, sans les commentaires : ils CITENT les motifs interdits. */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");
}

describe("Le site public n'a plus un seul aplat sous du texte", () => {
  for (const ecran of ECRANS) {
    test(`${ecran} : pas de panneau marine`, () => {
      const src = sansCommentaires(lire(ecran));
      assert.ok(
        !src.includes("bg-[var(--tq-marine)]"),
        "un panneau marine porte forcement du texte blanc dessus",
      );
      assert.ok(!/text-\[#b9c3d9\]|text-\[#7f8db0\]/.test(src), "les gris d'un fond sombre");
    });

    test(`${ecran} : le bleu ne sert pas de fond a un bloc`, () => {
      const src = sansCommentaires(lire(ecran));
      // Un fond bleu se reconnait a ce qu'il porte du PADDING : un
      // filet horizontal (`h-[3px] w-12`) et une pastille (`h-7 w-7`)
      // n'en ont pas, et ce sont les deux usages autorises.
      const fautes = [...src.matchAll(/bg-\[var\(--tq-bleu[^\]]*\)\][^"']*/g)]
        .map((m) => m[0])
        .filter((classe) => /\bp[xy]?-\d/.test(classe))
        .filter((classe) => !/\btq-bouton\b/.test(classe));
      assert.deepEqual(fautes, [], "un bloc de texte sur fond bleu");
    });
  }

  test("LE SURLIGNEUR DE MARQUE est une COULEUR DE TEXTE, plus un rectangle", () => {
    // "Au pire mets carrement le texte en couleur." C'etait un degrade
    // bleu avec du blanc dessus, repris des vignettes.
    const css = fs.readFileSync(path.join(RACINE, "app/globals.css"), "utf8");
    const bloc = css.slice(css.indexOf(".tq-surb {"), css.indexOf("}", css.indexOf(".tq-surb {")));
    assert.ok(bloc.length > 0, ".tq-surb doit exister");
    assert.ok(!/background/.test(bloc), ".tq-surb ne doit plus poser de fond");
    assert.ok(!/linear-gradient/.test(bloc), "et surtout pas un degrade");
    assert.match(bloc, /color:\s*var\(--tq-bleu\)/);
  });

  test("le PIED de page reste sombre, et c'est le seul", () => {
    // Ce n'est pas une exception oubliee : c'est le geste Typeform
    // qu'elle a montre elle meme le 30 aout, et rien ne s'y lit
    // longtemps.
    const css = fs.readFileSync(path.join(RACINE, "app/globals.css"), "utf8");
    assert.match(css, /\.tq-pied\s*\{[^}]*var\(--tq-marine\)/);
  });
});
