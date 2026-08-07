// tests/logic/help-url.test.mts
//
// LE LIEN VERS L'AIDE : UNE SEULE ADRESSE, ET LA BONNE LANGUE.
//
// Audit de l'aide, 6 août 2026. Deux problèmes sur le même lien.
//
// 1. L'adresse du centre d'aide (`app.tipote.com/support`) était écrite
//    en dur à TROIS endroits de Tiquiz : la sidebar, le formulaire de
//    création de quiz, le panneau Systeme.io des paramètres. C'est le
//    motif exact du drame de l'Atelier (3 août) : une URL écrite en dur
//    à plusieurs endroits ne se corrige jamais qu'à moitié.
//
// 2. Aucun des trois ne disait la langue. Le centre d'aide vit sur le
//    domaine de Tipote et lit sa langue dans un cookie posé là-bas : une
//    cliente Tiquiz espagnole, qui n'a pas de compte Tipote, cliquait
//    sur "Ayuda" et lisait une aide en français.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { helpUrl } from "../../lib/help.ts";
import { SUPPORTED_LOCALES } from "../../i18n/config.ts";

test("le lien porte toujours la langue de l'interface", () => {
  for (const l of SUPPORTED_LOCALES) {
    assert.ok(
      helpUrl(l).endsWith(`?lang=${l}`),
      `${l} : ${helpUrl(l)} ne transmet pas la langue`,
    );
  }
});

test("par défaut on arrive sur la catégorie Tiquiz, pas sur l'accueil", () => {
  // L'aide couvre Tipote ET Tiquiz. Envoyer une cliente Tiquiz sur
  // l'accueil lui donne dix catégories dont neuf ne la concernent pas.
  assert.equal(helpUrl("fr"), "https://app.tipote.com/support/tiquiz?lang=fr");
});

test("un article précis est atteignable", () => {
  assert.equal(
    helpUrl("en", "article/tiquiz-systeme-io"),
    "https://app.tipote.com/support/article/tiquiz-systeme-io?lang=en",
  );
});

test("l'accueil de l'aide n'a pas de double slash", () => {
  assert.equal(helpUrl("fr", ""), "https://app.tipote.com/support?lang=fr");
  assert.equal(helpUrl("fr", "/tiquiz"), "https://app.tipote.com/support/tiquiz?lang=fr");
});

test("aucun composant ne réécrit l'adresse de l'aide en dur", () => {
  // Le garde-fou qui compte : c'est la duplication qui a créé le bug de
  // l'Atelier, pas la valeur elle-même.
  const coupables: string[] = [];
  const visiter = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        visiter(p);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (p.endsWith(path.join("lib", "help.ts"))) continue;
      const src = fs.readFileSync(p, "utf8");
      // On cherche le lien, pas la mention : les commentaires qui
      // expliquent le bug citent forcément l'adresse.
      if (/href[=:]\s*["'`]https:\/\/app\.tipote\.com\/support/.test(src)) {
        coupables.push(p);
      }
    }
  };
  visiter(path.join(process.cwd(), "components"));
  visiter(path.join(process.cwd(), "app"));

  assert.deepEqual(
    coupables,
    [],
    `ces fichiers écrivent l'adresse de l'aide en dur au lieu d'appeler helpUrl() : ${coupables.join(", ")}`,
  );
});
