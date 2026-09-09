// scripts/importer-blog-en.mjs
//
// IMPORTER LES ARTICLES ANGLAIS DE `tipote.blog`.
//
// Béné, 8 septembre 2026 : "les articles existent déjà ici :
// https://www.tipote.blog/posts (je m'occupe des images de couverture,
// reprends celles qui sont déjà dans le corps de l'article)".
//
// -- ON LIT LE MODÈLE DE LA PAGE, JAMAIS LE HTML RENDU ----------------
//
// Chaque page Systeme.io embarque `window.__PRELOADED_STATE__` : le
// contenu bloc par bloc, avec son type. C'est du JavaScript et pas du
// JSON (`\x3c`, `\'`), donc c'est Node qui sait le lire, pas un
// remplacement de chaînes fait à la main. C'est la règle du 29 août,
// écrite pour l'import français.
//
// DEUX RACINES existent, `BlogPostBody` ET `BlogPageBody` : oublier la
// seconde a sorti l'étude de cas Jocelyne à zéro bloc, sans un mot.
//
// -- IL FUSIONNE, IL N'ÉCRASE PLUS (8 septembre 2026) ------------------
//
// Ce script ÉCRASAIT le fichier, et c'était une bombe à retardement :
// le relancer aujourd'hui remettrait les 27 images sur le CDN de
// Systeme.io (donc perdrait leurs 27 textes alternatifs, qui se posent
// à partir du chemin LOCAL) et annulerait toutes les corrections de
// `faitsEn.ts`. Mesuré côté français le 8 septembre, où le même geste a
// coûté 62 images et 62 `alt` d'un coup.
//
// Il passe donc par `fusionner` : les blocs du disque sont reconduits
// tels quels, seuls les blocs que la source a en plus sont insérés.
//
// ET IL AVAIT SA PROPRE COPIE DE `blocsDe`, avec les deux bugs du
// 29 août dedans (`BulletList` sans cas, `RawHtml` sauté sans regarder
// ce qu'il porte). Mesuré : 6 listes à puces perdues dans
// `create-quiz-systeme-io`. Les deux importateurs appellent maintenant
// le MÊME module, `lib/blog/importBlocs.ts`, qui est testé.
//
// -- CE SCRIPT N'ÉCRIT QUE LE BRUT --------------------------------------
//
// Il ne corrige RIEN. Les faits faux, les liens morts et les phrases
// restées en français vivent dans `lib/blog/faitsProgrammeEn.ts` et
// s'appliquent par `npm run blog:reparer`. Deux raisons : une passe qui
// corrige pendant qu'elle importe ne se relit pas, et un ré-import
// écraserait les corrections faites à la main.
//
// Usage :  node scripts/importer-blog-en.mjs [--verifie]

import fs from "node:fs";
import path from "node:path";

import { blocsDe, fusionner, restesVides } from "../lib/blog/importBlocs.ts";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "content/blog/en");
const VERIFIE = process.argv.includes("--verifie");

// LES QUATRE ARTICLES, ET LEUR JUMEAU FRANÇAIS.
//
// L'appariement est ÉCRIT, jamais deviné : `hreflang` apparie deux
// adresses, et deux slugs qui ne se ressemblent pas (`17-reasons...` et
// `17-raisons...`) ne peuvent pas s'apparier tout seuls. Une paire
// fausse enverrait un lecteur anglais sur un article français.
const ARTICLES = [
  { source: "/17-reasons-to-launch-business-quiz", slug: "17-reasons-to-launch-business-quiz", traductionDe: "17-raisons-lancer-quiz-business" },
  { source: "/capturing-emails-quiz-strategy", slug: "capturing-emails-quiz-strategy", traductionDe: "collecter-emails-quiz-strategie" },
  { source: "/create-quiz-systeme-io", slug: "create-quiz-systeme-io", traductionDe: "comment-creer-quiz-systeme-io" },
  { source: "/monthly-recurring-income-tiquiz-affiliate", slug: "monthly-recurring-income-tiquiz-affiliate", traductionDe: "rente-mensuelle-affiliation-tiquiz" },
];

const BASE = "https://www.tipote.blog";

// L'ARTICLE QU'ON NE FUSIONNE PAS, ET LA RAISON.
//
// Son jumeau français est exclu pour la même raison, mesurée le
// 8 septembre : la page source annonce encore un versement "le 10 de
// chaque mois", 40 % écrit comme un plafond, les rentes calculées sur
// l'ancien tarif, et une section entière sur Tipote, qui n'est pas en
// vente. C'est exactement ce que `SECTION_TIPOTE` et `FAITS_EN` ont
// retiré : y réinsérer quoi que ce soit ferait rentrer par la fenêtre
// les promesses fausses sorties par la porte.
const PAS_DE_FUSION = {
  "monthly-recurring-income-tiquiz-affiliate":
    "sa page source porte encore les promesses corrigees par faitsEn.ts (versement le 10, 40 % comme plafond, section Tipote)",
};

function etat(html) {
  const m = html.match(/window\.__PRELOADED_STATE__\s*=\s*(.*?);?\s*<\/script>/s);
  if (!m) throw new Error("aucun __PRELOADED_STATE__ dans la page");
  // eslint-disable-next-line no-eval
  return eval(`(${m[1]})`);
}

async function main() {
  const html = await (await fetch(`${BASE}/posts`)).text();
  const st = etat(html);
  const brut = st?.blog?.blogPostListing;
  const listing = typeof brut === "string" ? JSON.parse(brut) : brut;
  const parChemin = new Map((listing?.posts ?? []).map((p) => [p.path, p]));

  if (!VERIFIE) fs.mkdirSync(SORTIE, { recursive: true });
  const rapport = [];
  const restes = restesVides();

  for (const a of ARTICLES) {
    const meta = parChemin.get(a.source);
    if (!meta) throw new Error(`article introuvable dans le sommaire : ${a.source}`);

    const page = await (await fetch(`${BASE}${a.source}`)).text();
    const s = etat(page);
    const ents = s?.page?.entities ?? {};
    const racine = Object.values(ents).find(
      (e) => e.type === "BlogPostBody" || e.type === "BlogPageBody",
    );
    if (!racine) throw new Error(`aucune racine de corps : ${a.source}`);

    const blocs = blocsDe(ents, racine, s.files, restes, a.slug);
    if (blocs.length === 0) throw new Error(`zero bloc extrait : ${a.source}`);

    const fichier = path.join(SORTIE, `${a.slug}.json`);
    if (!fs.existsSync(fichier)) throw new Error(`article absent du disque : ${a.slug}`);
    const existant = JSON.parse(fs.readFileSync(fichier, "utf8"));

    if (PAS_DE_FUSION[a.slug]) {
      rapport.push(`${a.slug.padEnd(42)} PAS FUSIONNE, ${PAS_DE_FUSION[a.slug]}`);
      continue;
    }

    // SEULS LES BLOCS BOUGENT. Le titre, la description, les mots clés,
    // la date et la couverture sont ceux du disque : ils ont été
    // corrigés depuis, et la page source porte encore les anciens.
    let fusion;
    try {
      fusion = fusionner(existant.blocs, blocs);
    } catch (e) {
      throw new Error(`${a.slug} : ${e.message}`);
    }

    if (!VERIFIE) {
      fs.writeFileSync(
        fichier,
        `${JSON.stringify({ ...existant, blocs: fusion.blocs }, null, 2)}\n`,
        "utf8",
      );
    }
    const ajoutes = fusion.blocs.length - existant.blocs.length;
    rapport.push(
      `${a.slug.padEnd(42)} ${String(existant.blocs.length).padStart(3)} -> ` +
        `${String(fusion.blocs.length).padStart(3)}` +
        ` (${ajoutes ? `+${ajoutes} bloc(s) rendus` : "rien a rendre"})` +
        (fusion.retrouves.length ? `  [${fusion.retrouves.length} deja la, corriges]` : "") +
        (fusion.doublons.length ? `  [${fusion.doublons.length} doublon(s) ecarte(s)]` : ""),
    );
  }

  console.log(rapport.join("\n"));
  for (const [slug, pourquoi] of Object.entries(PAS_DE_FUSION)) {
    if (!rapport.some((l) => l.startsWith(slug))) console.log(`\n${slug} : ${pourquoi}.`);
  }
  if (restes.schemas.length) {
    console.log("\nSCHEMAS SVG ECARTES :");
    for (const v of restes.schemas) console.log(`  ${v}`);
  }
  if (restes.videos.length) {
    console.log("\nVIDEOS NON POSEES :");
    for (const v of restes.videos) console.log(`  ${v}`);
  }
  if (restes.perdus.size) {
    console.log("\nTYPES NON TRAITES, a regarder :");
    for (const [t, n] of [...restes.perdus].sort((x, y) => y[1] - x[1])) console.log(`  ${n}x ${t}`);
  }
  if (VERIFIE) console.log("\n--verifie : rien n'a ete ecrit.");
}

await main();
