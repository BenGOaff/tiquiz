// scripts/importer-blog-fr.mjs
//
// RE-IMPORTER LE CORPS DES ARTICLES FRANÇAIS.
//
// Béné, 8 septembre 2026 : "ben il faut corriger, c'est toi qui a
// importé mes articles ! Ou un autre agent mais en tous cas on peut
// pas laisser de la merde !!"
//
// Elle a raison. Quatre articles avaient perdu du contenu à l'import du
// 29 août, et le script qui les avait importés N'EXISTAIT PLUS dans le
// dépôt : personne ne pouvait donc ni retrouver la cause, ni rejouer
// l'import. Seul l'importateur ANGLAIS avait survécu.
//
// -- LES DEUX CAUSES, MESURÉES SUR LES PAGES SOURCES ------------------
//
//   1. `BulletList` N'ÉTAIT PAS TRAITÉ. Ce type porte son contenu dans
//      `.content`, exactement comme un `Text`, et il n'a AUCUN enfant.
//      Il tombait donc dans le `default:` qui marche les `childIds`,
//      et il ne produisait rien. Six listes perdues dans
//      `strategie-quiz-marketing-tiquiz`, une dans le comparatif.
//
//   2. `RawHtml` ÉTAIT SAUTÉ SANS REGARDER CE QU'IL PORTE. La raison
//      écrite à côté disait "les RawHtml de ces pages ne portent QUE du
//      JSON-LD" : c'était vrai des QUATRE pages anglaises, et faux des
//      pages françaises, où ce sont des blocs de CONTENU (le comparatif
//      des 8 outils, les 4 outils retenus, le coût réel, le traitement
//      des données). Cinq blocs perdus dans le seul comparatif.
//
//      C'est la faute du 1er août : une règle écrite pour un cas,
//      appliquée telle quelle à un autre.
//
// -- ON N'ÉCRASE RIEN : ON FUSIONNE, ET LA FUSION NE PEUT QU'AJOUTER --
//
// C'est la décision qui tient tout le script, et elle a été prise sur
// une MESURE. Un ré-import franc remplacerait les blocs existants, et
// il coûterait trois choses invisibles :
//
//   - LES IMAGES. La source pointe sur le CDN de Systeme.io, avec un
//     nom haché ; nos fichiers sont locaux et RENOMMÉS (mesuré :
//     22 des 62 images ne se déduisent pas du nom de la source). Un
//     ré-import franc mettrait 62 images sur un CDN qui ne nous
//     appartient pas, dont 22 qu'on ne saurait plus rattacher.
//   - LES TEXTES ALTERNATIFS. Ils sont posés par `poserAlt` À PARTIR
//     DU CHEMIN LOCAL : avec un chemin de CDN, la table ne reconnaît
//     plus rien et les 62 `alt` disparaissent en silence.
//   - LES CORRECTIONS. La page source porte encore les prix d'avant le
//     6 août, les anciens liens et les promesses corrigées le 31 août.
//
// Donc : les blocs existants sont RECONDUITS TELS QUELS, et seuls les
// blocs que la source a en plus sont insérés à leur place. Un bloc
// n'est jamais retiré, jamais réécrit. Le titre, la description, les
// mots clés, la date et la couverture ne sont pas touchés non plus.
//
// `npm run blog:reparer` repasse derrière : il est idempotent, et il
// REFUSE quand une règle ne mord pas.
//
// Usage :  node scripts/importer-blog-fr.mjs [--verifie]

import fs from "node:fs";
import path from "node:path";

// LES DÉCISIONS VIVENT DANS LE MODULE, PAS ICI.
//
// Ce script va chercher les pages sur le réseau : aucun test ne peut le
// lancer. Les règles d'extraction et de fusion sont donc dans
// `lib/blog/importBlocs.ts`, où elles se testent. Une logique enfermée
// dans un script n'est pas testable, donc elle n'est pas testée, et
// c'est LÀ que le bug du 29 août s'était installé.
import { blocsDe, fusionner, restesVides } from "../lib/blog/importBlocs.ts";
import { cheminMiniature } from "../lib/blog/video.ts";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "content/blog");
const VERIFIE = process.argv.includes("--verifie");

const BASE = "https://www.tipote.fr";

// LA SOURCE DE CHAQUE ARTICLE, RELEVÉE le 8 septembre 2026.
//
// Deux de ces pages (`comment-creer-quiz-systeme-io`,
// `strategie-quiz-marketing-tiquiz`) ne sont PAS dans le sommaire de
// `tipote.fr/posts` et répondent quand même : le sommaire n'est donc
// pas la liste des articles, et deviner les chemins depuis lui en
// aurait perdu deux.
const SOURCES = {
  "17-raisons-lancer-quiz-business": "/17-raisons-lancer-quiz-business",
  "avis-tiquiz": "/avis-tiquiz",
  "collecter-emails-quiz-strategie": "/collecter-emails-quiz-strategie",
  "comment-creer-quiz-systeme-io": "/comment-creer-quiz-systeme-io",
  "comparatif-outils-quiz-systeme-io": "/comparatif-outils-quiz-systeme-io",
  "quiz-video-popquiz": "/quiz-video-popquiz",
  "rente-mensuelle-affiliation-tiquiz": "/rente-mensuelle-affiliation-tiquiz",
  "strategie-quiz-marketing-tiquiz": "/strategie-quiz-marketing-tiquiz",
  "vendre-avec-un-quiz": "/vendre-avec-un-quiz",
};

// L'ARTICLE QUI N'A PLUS DE SOURCE, ET LA RAISON ÉCRITE À CÔTÉ.
//
// Cherché le 8 septembre : aucune adresse ne répond sur `tipote.fr` ni
// sur `tipote.blog`, il n'est ni dans le sommaire du blog, ni dans un
// sitemap, et aucune étape de tunnel ne porte son nom. On ne peut donc
// pas rejouer son import, et on n'invente pas ce qui manque.
//
// Une entrée ici est un CONSTAT, jamais un renoncement : le jour où
// Béné republie la page, il suffit de déplacer la ligne dans `SOURCES`.
// L'ARTICLE QU'ON NE FUSIONNE PAS, ET LA RAISON.
//
// `rente-mensuelle-affiliation-tiquiz` est celui qui a été le plus
// corrigé de tout le blog (31 août et 1er septembre). Mesuré : sa page
// source annonce encore un versement "le 10 de chaque mois", 40 % écrit
// comme un plafond, les rentes calculées sur l'ancien tarif à 9 €, et
// une section entière sur Tipote, qui n'est pas en vente. 23 de ses
// blocs ne s'apparient plus avec la source.
//
// Y insérer quoi que ce soit ferait rentrer par la fenêtre les
// promesses fausses qu'on a retirées par la porte.
const PAS_DE_FUSION = {
  "rente-mensuelle-affiliation-tiquiz":
    "sa page source porte encore les promesses corrigees le 31 aout (versement le 10, 40 % comme plafond, rentes a 9 EUR, section Tipote)",
};

const SANS_SOURCE = {
  "cas-client-jocelyne-tdah":
    "aucune adresse ne repond (tipote.fr et tipote.blog), absent du sommaire et des sitemaps",
};

// ── LES VIDÉOS : LE TITRE ET LA MINIATURE ────────────────────────────
//
// `blocsDe` rend un bloc vidéo avec un titre VIDE : le titre appartient
// à YouTube, donc il se lit chez YouTube, et le module d'extraction est
// PUR. Ce qui suit est la moitié qui fait du réseau.
//
// LA MINIATURE EST RECOPIÉE CHEZ NOUS, et ce n'est pas du confort : la
// servir depuis `i.ytimg.com` serait une requête tierce sur CHAQUE
// chargement de l'article, sur une page qui ne porte aucune bannière de
// consentement. C'est exactement ce que le bloc vidéo existe pour
// éviter.
//
// ET ON REFUSE PLUTÔT QUE DE POSER UN CADRE MUET. Un titre vide, c'est
// une légende vide sous une vidéo, et un lien "lire la vidéo" qui ne dit
// pas laquelle : personne ne le verrait avant la cliente.

const DOSSIER_VIDEO = path.join(RACINE, "public/blog/video");

async function titreYouTube(id) {
  const u = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://youtu.be/${id}`)}&format=json`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`oembed ${id} repond ${r.status}`);
  const j = await r.json();
  const t = String(j?.title ?? "").trim();
  if (!t) throw new Error(`oembed ${id} ne rend aucun titre`);
  return t;
}

async function poserMiniature(id) {
  const chemin = cheminMiniature(id);
  if (!chemin) throw new Error(`identifiant illisible : ${id}`);
  const sur = path.join(RACINE, "public", chemin.replace(/^\/+/, "").replace(/^blog\//, "blog/"));
  if (fs.existsSync(sur)) return { chemin, deja: true };
  if (VERIFIE) return { chemin, deja: false };

  // `maxresdefault` n'existe pas pour toutes les vidéos : `hqdefault`
  // existe toujours. On essaie la meilleure d'abord, on ne se contente
  // de la petite que si la grande n'est pas là.
  let brut = null;
  for (const nom of ["maxresdefault", "hqdefault"]) {
    const r = await fetch(`https://i.ytimg.com/vi/${id}/${nom}.jpg`);
    if (r.ok) {
      brut = Buffer.from(await r.arrayBuffer());
      break;
    }
  }
  if (!brut) throw new Error(`aucune miniature pour ${id}`);

  const { default: sharp } = await import("sharp");
  fs.mkdirSync(DOSSIER_VIDEO, { recursive: true });
  const ecrit = await sharp(brut)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(sur);
  return { chemin, deja: false, taille: ecrit.size };
}

async function completerVideos(blocs, slug, journal) {
  const out = [];
  for (const b of blocs) {
    if (b.type !== "video") {
      out.push(b);
      continue;
    }
    const titre = String(b.titre ?? "").trim() || (await titreYouTube(b.id));
    const mini = await poserMiniature(b.id);
    journal.push(
      `${slug} : ${b.id} "${titre}"` + (mini.deja ? " (miniature deja la)" : " (miniature posee)"),
    );
    out.push({ ...b, titre });
  }
  return out;
}

function etat(html) {
  const m = html.match(/window\.__PRELOADED_STATE__\s*=\s*(.*?);?\s*<\/script>/s);
  if (!m) throw new Error("aucun __PRELOADED_STATE__ dans la page");
  // eslint-disable-next-line no-eval
  return eval(`(${m[1]})`);
}

async function main() {
  const rapport = [];
  const videosPosees = [];
  const restes = restesVides();

  for (const [slug, chemin] of Object.entries(SOURCES)) {
    const fichier = path.join(SORTIE, `${slug}.json`);
    if (!fs.existsSync(fichier)) throw new Error(`article absent du disque : ${slug}`);
    const existant = JSON.parse(fs.readFileSync(fichier, "utf8"));

    const reponse = await fetch(`${BASE}${chemin}`);
    if (!reponse.ok) throw new Error(`${chemin} repond ${reponse.status}`);
    const s = etat(await reponse.text());
    const ents = s?.page?.entities ?? {};
    const racine = Object.values(ents).find(
      (e) => e.type === "BlogPostBody" || e.type === "BlogPageBody",
    );
    if (!racine) throw new Error(`aucune racine de corps : ${chemin}`);

    const blocs = blocsDe(ents, racine, s.files, restes, slug);
    if (blocs.length === 0) throw new Error(`zero bloc extrait : ${chemin}`);

    if (PAS_DE_FUSION[slug]) {
      rapport.push(`${slug.padEnd(38)} PAS FUSIONNE, ${PAS_DE_FUSION[slug]}`);
      continue;
    }

    const anciens = existant.blocs;
    let fusion;
    try {
      fusion = fusionner(anciens, blocs);
    } catch (e) {
      throw new Error(`${slug} : ${e.message}`);
    }
    const fusionnes = await completerVideos(fusion.blocs, slug, videosPosees);

    const article = { ...existant, blocs: fusionnes };
    if (!VERIFIE) {
      fs.writeFileSync(fichier, `${JSON.stringify(article, null, 2)}\n`, "utf8");
    }

    const ajoutes = fusionnes.length - anciens.length;
    rapport.push(
      `${slug.padEnd(38)} ${String(anciens.length).padStart(3)} -> ${String(fusionnes.length).padStart(3)}` +
        ` (${ajoutes ? `+${ajoutes} bloc(s) rendus` : "rien a rendre"})` +
        (fusion.retrouves.length ? `  [${fusion.retrouves.length} deja la, corriges]` : "") +
        (fusion.doublons.length ? `  [${fusion.doublons.length} doublon(s) de la source ecarte(s)]` : ""),
    );
  }

  console.log(rapport.join("\n"));

  for (const [slug, pourquoi] of Object.entries(SANS_SOURCE)) {
    console.log(`\n${slug} : PAS REIMPORTE, ${pourquoi}.`);
  }

  // UN TYPE INCONNU SE DIT. Il ne fait pas échouer l'import (le
  // contenu déjà extrait vaut mieux qu'un refus), mais il ne disparaît
  // plus en silence : c'est ce silence qui a coûté ce chantier.
  if (restes.schemas.length) {
    console.log("\nSCHEMAS SVG ECARTES (notre gabarit ne rend pas de SVG en ligne) :");
    for (const v of restes.schemas) console.log(`  ${v}`);
  }

  if (videosPosees.length) {
    console.log("\nVIDEOS POSEES :");
    for (const v of videosPosees) console.log(`  ${v}`);
  }

  // Ne restent ici que les adresses dont `idYouTube` ne tire aucun
  // identifiant : un autre hebergeur, une adresse tronquee.
  if (restes.videos.length) {
    console.log("\nVIDEOS NON POSEES (adresse illisible ou hebergeur inconnu) :");
    for (const v of restes.videos) console.log(`  ${v}`);
  }

  if (restes.perdus.size) {
    console.log("\nTYPES NON TRAITES, a regarder :");
    for (const [t, n] of [...restes.perdus].sort((a, b) => b[1] - a[1])) console.log(`  ${n}x ${t}`);
  }

  if (VERIFIE) console.log("\n--verifie : rien n'a ete ecrit.");
}

await main();
