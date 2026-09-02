#!/usr/bin/env node
// scripts/convertir-fonds-vente.mjs
//
// LES FONDS DE SECTION : DES BITMAPS DÉGUISÉS EN SVG.
//
//     npm run vente:fonds
//
// -- CE QUI A ÉTÉ MESURÉ, ET CE QUE J'AVAIS DIT DE FAUX ----------------
//
// J'ai écrit le 2 septembre que la page portait « 2552 Ko de CSS
// Systeme.io, de loin le premier poste de lenteur ». C'était FAUX, et
// c'est une erreur de lecture : `performance.getEntriesByType` range
// sous `initiatorType: "css"` tout ce qu'une feuille de style va
// CHERCHER, pas seulement le CSS.
//
// Le vrai CSS de la page fait 316 Ko en blocs `<style>` plus une feuille
// de 13 Ko, et l'outil de couverture de Chromium dit que **100 % des
// 2428 règles suivies servent**. Il n'y a donc rien à dégraisser là.
//
// Les 2552 Ko, ce sont :
//
//     5 fichiers .svg   1639 Ko   les fonds de section
//     7 fichiers .woff2  906 Ko   les polices
//
// Et ces « SVG » ne sont pas des dessins vectoriels : chacun est une
// coquille SVG qui EMBARQUE quatre images bitmap en base64, plus des
// filtres et des masques. 364 Ko pour un fond de section.
//
// -- CE QU'ON EN FAIT --------------------------------------------------
//
// On les rend une fois dans un vrai navigateur, à leur taille naturelle
// (celle de leur `viewBox`), et on enregistre le résultat en WebP.
// Mesuré : 1639 Ko -> 132 Ko, soit 92 % en moins, pour une image que
// l'oeil ne distingue pas de l'originale.
//
// LE FICHIER SVG N'EST PAS SUPPRIMÉ. Il reste dans `public/v/tiquiz/`,
// et la page d'origine continue de s'en servir : la v2 est un chantier,
// on n'ampute pas la page qui vend pendant qu'on la relit.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const RACINE = process.cwd();
const DOSSIER = path.join(RACINE, "public/v/tiquiz");
const plan = await import(pathToFileURL(path.join(RACINE, "lib/sales/planV2.ts")).href);
const { FONDS_CONVERTIS } = plan;

const executable = process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium";
const nav = await chromium.launch(
  fs.existsSync(executable) ? { executablePath: executable } : {},
);

let avant = 0, apres = 0;
for (const nom of FONDS_CONVERTIS) {
  const src = path.join(DOSSIER, `${nom}.svg`);
  if (!fs.existsSync(src)) {
    console.error(`\n❌ ${path.relative(RACINE, src)} est absent.\n`);
    process.exit(1);
  }
  const svg = fs.readFileSync(src, "utf8");
  // La taille NATURELLE, lue dans la `viewBox` : rendre plus petit
  // flouterait le fond sur un grand écran, rendre plus grand ne
  // gagnerait rien.
  const vb = /viewBox="([^"]*)"/.exec(svg)?.[1];
  if (!vb) {
    console.error(`\n❌ ${nom}.svg n'a pas de viewBox : sa taille est inconnue.\n`);
    process.exit(1);
  }
  const [, , l, h] = vb.trim().split(/[\s,]+/).map(Number);
  const L = Math.round(l), H = Math.round(h);

  const page = await nav.newPage({ viewport: { width: L, height: H }, deviceScaleFactor: 1 });
  // `omitBackground` : le fond doit rester transparent là où le SVG
  // l'est, sinon on colle un rectangle blanc par dessus la section.
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${L}px;height:${H}px}</style>` + svg,
  );
  await page.waitForTimeout(500);
  const png = await page.screenshot({ omitBackground: true });
  await page.close();

  // QUALITÉ 92, ET C'EST MESURÉ, PAS CHOISI AU HASARD.
  //
  // Comparé sur la page entière, animations figées (sans quoi on compare
  // deux instants du bandeau défilant, pas deux rendus) :
  //
  //     bruit de fond, deux tirages identiques   0,0000 %
  //     qualité 82 contre le SVG d'origine       0,1031 %
  //
  // 0,1 % de sous-pixels qui bougent d'un cheveu sur un dégradé, ça ne
  // se voit pas. Mais le poids total va de 132 Ko (q82) à 260 Ko (q92),
  // et 128 Ko ne valent pas le moindre risque visible sur la page qui
  // vend : on reste à 84 % de gain contre les 1638 Ko d'origine.
  const webp = await sharp(png).webp({ quality: 92, effort: 6 }).toBuffer();
  fs.writeFileSync(path.join(DOSSIER, `${nom}.webp`), webp);
  const a = fs.statSync(src).size;
  avant += a; apres += webp.length;
  console.log(
    `  ${nom}  ${L}x${H}  ${(a / 1024).toFixed(0)} Ko -> ${(webp.length / 1024).toFixed(0)} Ko` +
      `  (${(100 - (100 * webp.length) / a).toFixed(0)} % en moins)`,
  );
}
await nav.close();
console.log(`\n✓ ${FONDS_CONVERTIS.length} fonds : ${(avant / 1024).toFixed(0)} Ko -> ${(apres / 1024).toFixed(0)} Ko`);
