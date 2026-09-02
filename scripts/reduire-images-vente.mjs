#!/usr/bin/env node
// scripts/reduire-images-vente.mjs
//
// RÉDUIT LES IMAGES SURDIMENSIONNÉES DE LA PAGE DE VENTE.
//
//   npm run vente:images              construit les fichiers réduits
//   npm run vente:images -- --verifie dit ce qu'il ferait, n'écrit rien
//
// Il ne TOUCHE JAMAIS aux fichiers d'origine : il en écrit de nouveaux,
// à côté. La vraie page de vente continue de servir les siens, et le
// chantier ne change rien à ce qui est en ligne.
//
// La liste et les tailles cibles vivent dans `lib/sales/imagesV2.ts`,
// avec la raison de chaque exclusion. Voir son en-tête : les SVG restent
// vectoriels, les GIF animés ne sont pas touchés, et l'`og:image` non
// plus.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = path.join(RACINE, "public/v/tiquiz");
const VERIFIE = process.argv.includes("--verifie");

function meurs(m) {
  console.error(`\n✗ ${m}\n`);
  process.exit(1);
}

// Le module est du TypeScript : on le lit plutôt que de l'importer, pour
// que ce script n'ait besoin d'aucun chargeur (même choix que les fonds).
const src = fs.readFileSync(path.join(RACINE, "lib/sales/imagesV2.ts"), "utf8");
const IMAGES = [...src.matchAll(
  /\{ fichier: "([^"]+)", naturelle: \[(\d+), (\d+)\], afficheeMax: \[(\d+), (\d+)\], cible: (\d+) \}/g,
)].map((m) => ({
  fichier: m[1],
  naturelle: [Number(m[2]), Number(m[3])],
  afficheeMax: [Number(m[4]), Number(m[5])],
  cible: Number(m[6]),
}));
if (IMAGES.length === 0) meurs("aucune image dans lib/sales/imagesV2.ts : le motif a bouge");

const nomReduit = (f, l) => `${f.replace(/\.[a-z0-9]+$/i, "")}-${l}.webp`;

let avant = 0;
let apres = 0;
let ecrits = 0;

for (const img of IMAGES) {
  const source = path.join(DOSSIER, img.fichier);
  if (!fs.existsSync(source)) meurs(`${img.fichier} est introuvable`);

  // LE FICHIER FAIT FOI, jamais la table : si l'image a été remplacée
  // depuis la mesure, on refuse plutôt que de réduire à l'aveugle.
  const meta = await sharp(source).metadata();
  if (meta.width !== img.naturelle[0] || meta.height !== img.naturelle[1]) {
    meurs(
      `${img.fichier} fait ${meta.width}x${meta.height}, la table dit ` +
        `${img.naturelle[0]}x${img.naturelle[1]}. Remesure avant de reduire.`,
    );
  }
  if (img.cible >= meta.width) {
    meurs(`${img.fichier} : la cible (${img.cible}) n'est pas plus petite que le reel`);
  }
  // La marge Retina, refaite ICI : la table pourrait être éditée à la
  // main, et une cible trop basse dégraderait pour de bon.
  if (img.cible < img.afficheeMax[0] * 3) {
    meurs(`${img.fichier} : la cible ${img.cible} est sous trois fois l'affichage`);
  }

  const cible = path.join(DOSSIER, nomReduit(img.fichier, img.cible));
  const poidsAvant = fs.statSync(source).size;
  avant += poidsAvant;

  if (VERIFIE) {
    console.log(
      `  ${img.fichier.padEnd(24)} ${meta.width}x${meta.height} -> ${img.cible}px  ` +
        `(${Math.round(poidsAvant / 1024)} Ko, affiche a ${img.afficheeMax[0]}px)`,
    );
    continue;
  }

  await sharp(source)
    // `inside` garde le RATIO, `withoutEnlargement` interdit d'inventer
    // des pixels. On réduit, on ne recadre jamais.
    .resize({ width: img.cible, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    // 88 est visuellement sans perte à cette taille, et l'effort maximum
    // ne coûte que du temps de construction.
    .webp({ quality: 88, effort: 6 })
    .toFile(cible);

  const poidsApres = fs.statSync(cible).size;
  apres += poidsApres;
  ecrits++;
  const dim = await sharp(cible).metadata();
  if (dim.width !== img.cible) {
    meurs(`${img.fichier} : la sortie fait ${dim.width}px au lieu de ${img.cible}`);
  }
  console.log(
    `  ${img.fichier.padEnd(24)} ${Math.round(poidsAvant / 1024)} Ko -> ` +
      `${Math.round(poidsApres / 1024)} Ko  (${dim.width}x${dim.height})`,
  );
}

if (VERIFIE) {
  console.log(`\n${IMAGES.length} images a reduire, ${Math.round(avant / 1024)} Ko aujourd'hui.\n`);
  process.exit(0);
}

console.log(
  `\n✓ ${ecrits} images reduites : ${Math.round(avant / 1024)} Ko -> ` +
    `${Math.round(apres / 1024)} Ko  (${Math.round((1 - apres / avant) * 100)} % de moins)\n`,
);
