// tests/logic/domaine-canonique.test.mts
//
// UN DOMAINE QUI N'EST PAS À NOUS NE DOIT REVENIR NULLE PART.
//
// Béné, 26 août 2026 : "je n'ai PAS tiquiz.com il n'est PAS à moi ce
// domaine... donc fais ce qu'il faut pour supprimer ce problème !"
//
// -- CE QU'IL FAISAIT, ET POURQUOI PERSONNE NE L'AVAIT VU -------------
//
// `https://tiquiz.com` était le repli écrit en dur de quatre endroits
// qui s'adressent aux moteurs de recherche : `robots.ts`, `sitemap.ts`,
// `llms.txt` et le `metadataBase` du layout. Constaté en production ce
// jour là :
//
//   robots.txt   Host: https://tiquiz.com
//   sitemap.xml  <loc>https://tiquiz.com/</loc>   (toutes les URLs)
//
// Le domaine ne répondait même pas. On envoyait donc le référencement
// de toutes nos pages vers une adresse détenue par un tiers, pendant
// que la page de vente déclarait sa canonique sur `tiquiz.fr`.
//
// Il vivait aussi dans les CGV, les CGU, la politique de
// confidentialité, les mentions légales, l'adresse de contact et les
// consignes Search Console montrées aux créatrices en 7 langues.
//
// -- CE TEST N'EST PAS DÉCORATIF --------------------------------------
//
// Un repli écrit en dur se recopie tout seul au prochain fichier qui a
// besoin d'une URL par défaut. Le seul moyen de ne pas rejouer ça est
// qu'une machine refuse la chaîne, partout, tout le temps.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  DOMAINE_ETRANGER,
  HOTE_APP,
  HOTE_VENTE,
  hoteCanonique,
} from "../../lib/publicHost.ts";

const RACINE = process.cwd();
const DOSSIERS = ["app", "lib", "components", "messages"];
const EXTENSIONS = [".ts", ".tsx", ".json"];

/** Le seul fichier autorisé à écrire le domaine : celui qui l'interdit. */
const EXCEPTIONS = new Set([
  join("lib", "publicHost.ts"),
  join("lib", "legal", "company.ts"), // le commentaire qui explique la correction
]);

function* fichiers(dossier: string): Generator<string> {
  let entrees: string[];
  try {
    entrees = readdirSync(join(RACINE, dossier));
  } catch {
    return;
  }
  for (const entree of entrees) {
    if (entree === "node_modules" || entree.startsWith(".")) continue;
    const relatif = join(dossier, entree);
    const absolu = join(RACINE, relatif);
    if (statSync(absolu).isDirectory()) {
      yield* fichiers(relatif);
    } else if (EXTENSIONS.some((e) => entree.endsWith(e))) {
      yield relatif;
    }
  }
}

test("le domaine qui n'est pas à nous n'apparaît nulle part", () => {
  const coupables: string[] = [];

  for (const dossier of DOSSIERS) {
    for (const relatif of fichiers(dossier)) {
      if (EXCEPTIONS.has(relatif)) continue;
      const contenu = readFileSync(join(RACINE, relatif), "utf-8");
      // `quiz.tipote.com` contient ".com" mais pas notre chaîne ; on
      // cherche le domaine exact, pas une sous-chaîne trompeuse.
      if (contenu.includes(DOMAINE_ETRANGER)) {
        const ligne = contenu.split("\n").findIndex((l) => l.includes(DOMAINE_ETRANGER)) + 1;
        coupables.push(`${relatif}:${ligne}`);
      }
    }
  }

  assert.deepEqual(
    coupables,
    [],
    `Ce domaine n'appartient pas à l'éditrice. Utiliser hoteCanonique() ` +
      `(lib/publicHost.ts). Trouvé dans :\n  ${coupables.join("\n  ")}`,
  );
});

test("l'hôte canonique par défaut est l'app, et elle répond", () => {
  assert.equal(hoteCanonique({}), HOTE_APP);
  assert.equal(HOTE_APP, "https://quiz.tipote.com");
});

test("un domaine de vente s'annonce LUI-MÊME", () => {
  // C'est la branche qui manquait : `tiquiz.fr` tombait dans le cas de
  // l'app, donc sur le repli étranger.
  for (const host of ["tiquiz.fr", "www.tiquiz.fr", "TIQUIZ.FR", "tiquiz.fr:443"]) {
    assert.equal(hoteCanonique({ host }), HOTE_VENTE, host);
  }
});

test("le domaine personnalisé d'une créatrice passe devant tout", () => {
  assert.equal(
    hoteCanonique({ customHost: "quiz.adelinecirade.com", host: "tiquiz.fr" }),
    "https://quiz.adelinecirade.com",
  );
});

test("un hôte inconnu retombe sur l'app, jamais sur rien", () => {
  for (const host of ["", "   ", "n-importe-quoi.example", null, undefined]) {
    assert.equal(hoteCanonique({ host }), HOTE_APP, JSON.stringify(host));
  }
});
