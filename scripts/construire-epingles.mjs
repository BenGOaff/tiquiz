// scripts/construire-epingles.mjs
//
// UNE ÉPINGLE PINTEREST CONFORME PAR ARTICLE (Béné, 30 août 2026).
//
// "aucune image ne peut être repartagée sur Pinterest qui m'aide à faire
// ranker mon site, les images ne sont pas conformes."
//
// -- CE QUE "CONFORME" VEUT DIRE, ET CE QUE ÇA CHANGE ------------------
//
// Pinterest est un flux VERTICAL. Il recommande le 2:3 (1000 x 1500) et
// c'est une contrainte de fond, pas de forme : dans une colonne, une
// image 16/9 occupe trois fois moins de hauteur qu'une épingle voisine,
// donc elle se voit trois fois moins, donc elle ne circule pas. Nos
// couvertures font 1200 x 675, c'est à dire exactement le format qui ne
// marche pas là bas.
//
// L'autre moitié du problème vivait dans le code : le bouton Pinterest
// s'ouvrait SANS `media=`, donc Pinterest demandait au visiteur de
// choisir une image lui même (cf. `lib/partage/urlsReseaux.ts`).
//
// -- POURQUOI ON NE DESSINE PAS DE TEXTE DANS L'IMAGE ------------------
//
// Ses couvertures PORTENT DÉJÀ leur titre, composé, dans sa typographie
// et ses couleurs. Réécrire ce titre par dessus avec la police que
// trouve le serveur donnerait une épingle qui ne ressemble à rien de ce
// qu'elle publie, et qui change d'allure selon la machine qui l'a
// construite. On COMPOSE au lieu de redessiner : sa couverture entière
// (jamais recadrée, règle du 4 août), sur un fond pris DANS l'image elle
// même, avec son logo en pied.
//
// Le fond n'est pas une constante : il est échantillonné sur le bord
// haut de chaque couverture. Une couverture qui ne serait pas marine
// donnerait quand même une épingle sans raccord visible.
//
//   node scripts/construire-epingles.mjs
//
// Les fichiers produits (`public/blog/pin/<slug>.jpg`) sont COMMITTÉS :
// Pinterest va les chercher sur notre domaine au moment de l'épingle, ils
// doivent donc exister sur le serveur, pas être calculés à la demande.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const LARGEUR = 1000;
const HAUTEUR = 1500;
const SORTIE = path.join(process.cwd(), "public", "blog", "pin");
const LOGO = path.join(process.cwd(), "public", "logo-tiquiz.webp");

/**
 * Le fond : la couverture elle même, recadrée en 2:3, floutée et
 * assombrie.
 *
 * Un aplat uni laissait 900 px de vide sur une épingle de 1500 : dans
 * un flux, ce vide se lit comme une image qui n'a pas fini de charger.
 * En reprenant la couverture, la couleur, le grain et la lumière du
 * fond viennent de l'image elle même, donc l'épingle reste juste quelle
 * que soit la couverture, y compris une future qui ne serait pas marine.
 *
 * Le flou est là pour que le fond ne concurrence pas la couverture
 * nette posée par dessus : sans lui, on lit deux fois la même chose.
 */
async function fondFloute(chemin) {
  // L'ASSOMBRISSEMENT DÉPEND DE LA SOURCE, ET C'EST MESURÉ.
  //
  // `brightness: 0.55` a été réglé sur ses couvertures d'articles, qui
  // sont toutes sombres : relevé le 1er septembre, leur luminosité
  // moyenne va de 22 à 40 sur 255. Appliqué à un visuel CLAIR, le même
  // réglage ne fait pas un fond sombre, il fait un fond GRIS : la
  // couleur part, et l'épingle a l'air délavée. C'est ce qui est arrivé
  // au schéma du hub, mesuré à 236.
  //
  // Le seuil est loin des deux groupes (40 d'un côté, 236 de l'autre) :
  // il ne départage rien à la limite, il constate un écart qui existe.
  const stats = await sharp(chemin).stats();
  const moyenne =
    stats.channels.slice(0, 3).reduce((t, c) => t + c.mean, 0) / 3;
  const clair = moyenne > 120;
  return sharp(chemin)
    .resize(LARGEUR, HAUTEUR, { fit: "cover", position: "attention" })
    .blur(42)
    .modulate(
      clair
        ? { brightness: 0.94, saturation: 1.15 }
        : { brightness: 0.55, saturation: 1.1 },
    )
    .toBuffer();
}

/** Les coins arrondis de la couverture nette, en masque alpha. */
function masqueArrondi(largeur, hauteur, rayon) {
  return Buffer.from(
    `<svg width="${largeur}" height="${hauteur}"><rect width="${largeur}" height="${hauteur}" rx="${rayon}" ry="${rayon}" fill="#fff"/></svg>`,
  );
}

const articles = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "content", "blog", "index.json"), "utf8"),
);

// ── LES PAGES QUI NE SONT PAS DES ARTICLES ───────────────────────────
//
// Béné, 1er septembre 2026 : "le format des images ne me permet pas de
// les partager sur pinterest (liste des articles, hub ...)".
//
// Le hub intégrations n'avait qu'une image PAYSAGE (1200 x 630) : elle
// s'épingle, mais elle occupe trois fois moins de hauteur que ses
// voisines dans un flux, donc elle ne circule pas. Il lui faut la même
// épingle 2:3 qu'un article.
//
// UNE PAGE N'ENTRE ICI QUE SI ELLE A UN VISUEL À ELLE. Les six pages
// d'outil (Tally, Typeform, Jotform...) n'en ont pas : leur `og:image`
// est une CAPTURE D'ÉCRAN d'un service tiers. Fabriquer une épingle
// avec, ce serait faire circuler la page de tarifs de Zapier sous le
// nom de Béné. Et on ne peut pas non plus en dessiner une : ce script
// refuse d'écrire du texte dans une image (cf. l'en-tête), parce que la
// police dépend de la machine qui construit. Ces pages attendent donc
// un visuel d'elle, et elles le disent ici plutôt que de recevoir en
// silence une épingle qu'elle n'aurait pas choisie.
const PAGES = [
  {
    slug: "hub-integrations",
    couverture: "/integrations/schema-connexion-systemeio.webp",
  },
];

fs.mkdirSync(SORTIE, { recursive: true });

let faites = 0;
let sautees = 0;
for (const a of [...articles, ...PAGES]) {
  if (!a.couverture) {
    // Sans couverture on ne fabrique RIEN. Une épingle au fond uni ne
    // dit rien de l'article et occupe une place dans un flux.
    console.log(`  (pas de couverture) ${a.slug}`);
    sautees += 1;
    continue;
  }
  const source = path.join(process.cwd(), "public", a.couverture);
  if (!fs.existsSync(source)) {
    console.log(`  MANQUANTE ${a.couverture}`);
    sautees += 1;
    continue;
  }

  const fond = await fondFloute(source);

  // La couverture nette, à 88 % de la largeur : elle respire sur ses
  // côtés au lieu de toucher les bords, et ses coins arrondis la
  // détachent du fond flou.
  const LARGE_COUV = Math.round(LARGEUR * 0.88);
  const brute = await sharp(source).resize({ width: LARGE_COUV }).toBuffer();
  const hCouv = (await sharp(brute).metadata()).height;
  const couverture = await sharp(brute)
    .composite([{ input: masqueArrondi(LARGE_COUV, hCouv, 28), blend: "dest-in" }])
    .png()
    .toBuffer();

  // Le logo en pied, en IMAGE : la marque se reconnaît sans qu'on ait à
  // faire confiance aux polices installées sur la machine qui construit.
  const logo = await sharp(LOGO).resize({ width: 220 }).toBuffer();
  const hLogo = (await sharp(logo).metadata()).height;

  // La couverture est posée un peu au dessus du centre : dans un flux
  // Pinterest, le haut de l'épingle est ce qui est vu en premier.
  const yCouv = Math.round((HAUTEUR - hCouv) * 0.42);

  await sharp(fond)
    .composite([
      { input: couverture, top: yCouv, left: Math.round((LARGEUR - LARGE_COUV) / 2) },
      { input: logo, top: HAUTEUR - hLogo - 80, left: Math.round((LARGEUR - 220) / 2) },
    ])
    // JPEG et pas WebP : Pinterest recompresse, et le JPEG est le format
    // qu'il accepte partout sans surprise.
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(SORTIE, `${a.slug}.jpg`));
  faites += 1;
}

console.log(`Epingles construites : ${faites}, sautees : ${sautees}`);
