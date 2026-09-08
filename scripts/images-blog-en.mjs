// scripts/images-blog-en.mjs
//
// LES IMAGES DES ARTICLES ANGLAIS VIVENT CHEZ NOUS.
//
// Béné, 8 septembre 2026 : "je m'occupe des images de couverture,
// reprends celles qui sont déjà dans le corps de l'article."
//
// Hotlinker le CDN de Systeme.io tuerait tous les visuels le jour de la
// résiliation (règle du 29 août, écrite pour l'import français). On les
// télécharge, on les recompresse, et les articles pointent chez nous.
//
// -- LA DÉDUPLICATION N'EST PAS UNE ÉCONOMIE DE PLACE ------------------
//
// Ses articles anglais réutilisent des schémas de ses articles
// français. Deux fichiers identiques, c'est aussi deux `alt` à écrire
// deux fois, donc deux occasions d'en oublier un, et deux fichiers à
// remplacer le jour où elle redessine le schéma. On compare les octets
// APRÈS conversion : le CDN sert du PNG, nous du WebP, donc comparer
// les sources ne trouverait jamais rien.
//
// Usage :  node scripts/images-blog-en.mjs [--verifie]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const RACINE = path.resolve(import.meta.dirname, "..");
const ARTICLES = path.join(RACINE, "content/blog/en");
const IMAGES_FR = path.join(RACINE, "public/blog/img");
const IMAGES_EN = path.join(IMAGES_FR, "en");
const VERIFIE = process.argv.includes("--verifie");

const LARGEUR_MAX = 1200;

function empreinte(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Les WebP français déjà déployés, indexés par leurs octets. */
function indexFrancais() {
  const index = new Map();
  for (const f of fs.readdirSync(IMAGES_FR)) {
    if (!f.endsWith(".webp")) continue;
    const p = path.join(IMAGES_FR, f);
    if (!fs.statSync(p).isFile()) continue;
    index.set(empreinte(fs.readFileSync(p)), `/blog/img/${f}`);
  }
  return index;
}

async function enWebp(buf) {
  const im = sharp(buf, { animated: true });
  const meta = await im.metadata();
  // ON RÉDUIT, ON NE RECADRE JAMAIS, et on n'agrandit pas : fabriquer
  // des pixels dégrade sans rien gagner (règle du 2 septembre).
  return im
    .resize({ width: Math.min(LARGEUR_MAX, meta.width ?? LARGEUR_MAX), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function main() {
  const fichiers = fs.readdirSync(ARTICLES).filter((f) => f.endsWith(".json"));
  const index = indexFrancais();
  const dejaEn = new Map();
  if (!VERIFIE) fs.mkdirSync(IMAGES_EN, { recursive: true });

  let telecharges = 0;
  let reutilisesFr = 0;
  let reutilisesEn = 0;
  let octets = 0;
  const rapport = [];

  for (const f of fichiers) {
    const p = path.join(ARTICLES, f);
    const a = JSON.parse(fs.readFileSync(p, "utf8"));
    let n = 0;

    for (const b of a.blocs) {
      if (b.type !== "image" || !/^https?:\/\//.test(b.src ?? "")) continue;
      const source = b.src;
      const brut = Buffer.from(await (await fetch(source)).arrayBuffer());
      const webp = await enWebp(brut);
      const cle = empreinte(webp);
      telecharges += 1;

      const dansFr = index.get(cle);
      const dansEn = dejaEn.get(cle);
      if (dansFr) {
        b.src = dansFr;
        reutilisesFr += 1;
      } else if (dansEn) {
        b.src = dansEn;
        reutilisesEn += 1;
      } else {
        const nom = `${a.slug}-${cle.slice(0, 10)}.webp`;
        const chemin = `/blog/img/en/${nom}`;
        if (!VERIFIE) fs.writeFileSync(path.join(IMAGES_EN, nom), webp);
        dejaEn.set(cle, chemin);
        b.src = chemin;
        octets += webp.length;
      }
      n += 1;
    }

    // La couverture : elle vient du sommaire, et Béné a dit qu'elle
    // s'en occupe. On la télécharge quand même en repli, sinon
    // l'article n'a AUCUNE image de partage tant qu'elle n'a pas
    // livré la sienne, et une carte sans image ne circule pas.
    if (/^https?:\/\//.test(a.couvertureSource ?? "")) {
      const brut = Buffer.from(await (await fetch(a.couvertureSource)).arrayBuffer());
      const webp = await enWebp(brut);
      if (!VERIFIE) fs.writeFileSync(path.join(IMAGES_EN, `${a.slug}.webp`), webp);
      octets += webp.length;
      telecharges += 1;
    }

    if (!VERIFIE) fs.writeFileSync(p, `${JSON.stringify(a, null, 2)}\n`, "utf8");
    rapport.push(`${a.slug}  ${n} images dans le corps`);
  }

  console.log(rapport.join("\n"));
  console.log(
    `\n${telecharges} telechargees, ${reutilisesFr} deja cote francais, ${reutilisesEn} en double dans l'anglais, ${(octets / 1024).toFixed(0)} Ko ecrits.`,
  );
  if (VERIFIE) console.log("--verifie : rien n'a ete ecrit.");
}

await main();
