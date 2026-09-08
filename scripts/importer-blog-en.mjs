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

function etat(html) {
  const m = html.match(/window\.__PRELOADED_STATE__\s*=\s*(.*?);?\s*<\/script>/s);
  if (!m) throw new Error("aucun __PRELOADED_STATE__ dans la page");
  // eslint-disable-next-line no-eval
  return eval(`(${m[1]})`);
}

// NOTRE GABARIT NE CONNAIT QUE h2 ET h3 (`lib/blog/articles.ts`).
// Ses pages descendent jusqu'a h4 : le laisser passer donnerait un
// niveau que le sommaire ne sait pas ranger, donc un titre qui
// disparait de la table des matieres sans un mot.
function niveauDuTitre(html) {
  const m = String(html).match(/<h([1-6])\b/i);
  const n = m ? Number(m[1]) : 2;
  return n <= 2 ? 2 : 3;
}

function texteNu(html) {
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function ancre(texte) {
  return texteNu(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Marche l'arbre et rend nos blocs.
 *
 * `ContentTable` et `HorizontalLine` sont IGNORÉS : le sommaire est
 * reconstruit par notre gabarit (`lib/blog/gabarit.ts`) à partir des
 * titres, donc en garder un deuxième donnerait deux sommaires qui
 * divergent au premier renommage de titre.
 */
function blocsDe(ents, racine, fichiers, images) {
  const out = [];
  const vu = new Set();

  const marcher = (id) => {
    if (vu.has(id)) return;
    vu.add(id);
    const e = ents[id];
    if (!e) return;

    switch (e.type) {
      case "Headline": {
        const contenu = e.content ?? e.html ?? "";
        const texte = texteNu(contenu);
        if (texte) out.push({ type: "titre", niveau: niveauDuTitre(contenu), texte, id: ancre(texte) });
        return;
      }
      case "Text": {
        const contenu = e.content ?? e.html ?? "";
        if (texteNu(contenu)) out.push({ type: "html", html: contenu });
        return;
      }
      case "Image": {
        const f = fichiers?.[String(e.fileId)];
        if (f?.path) {
          images.add(f.path);
          out.push({ type: "image", src: f.path, alt: "" });
        }
        return;
      }
      case "Button": {
        const texte = texteNu(e.text ?? "");
        if (texte) out.push({ type: "cta", texte, url: e.linkUrl ?? "" });
        return;
      }
      case "Faq": {
        const items = [];
        for (const c of e.childIds ?? []) {
          const it = ents[c];
          if (!it) continue;
          vu.add(c);
          const reponse = (it.childIds ?? [])
            .map((k) => {
              vu.add(k);
              return ents[k]?.content ?? ents[k]?.html ?? "";
            })
            .join("");
          if (it.title) items.push({ question: texteNu(it.title), reponse });
        }
        // LA FORME EST CELLE QUE `lib/blog/articles.ts` DECLARE
        // (`questions`, `url`), jamais celle de Systeme.io. Un champ
        // mal nomme ne leve rien : le bloc se rend VIDE, et ca ne se
        // voit que sur la page.
        if (items.length) out.push({ type: "faq", questions: items });
        return;
      }
      case "RawHtml":
        // Les `RawHtml` de ces pages ne portent QUE du JSON-LD, et il
        // pointe sur l'ancien domaine avec `inLanguage: "fr"`. Notre
        // gabarit émet le sien : en garder un deuxième donnerait deux
        // FAQPage contradictoires sur la même page.
        return;
      case "ContentTable":
      case "HorizontalLine":
        return;
      default:
        for (const c of e.childIds ?? []) marcher(c);
    }
  };

  for (const c of racine.childIds ?? []) marcher(c);
  return out;
}

async function main() {
  const html = await (await fetch(`${BASE}/posts`)).text();
  const st = etat(html);
  const brut = st?.blog?.blogPostListing;
  const listing = typeof brut === "string" ? JSON.parse(brut) : brut;
  const parChemin = new Map((listing?.posts ?? []).map((p) => [p.path, p]));

  if (!VERIFIE) fs.mkdirSync(SORTIE, { recursive: true });
  const images = new Set();
  const rapport = [];

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

    const blocs = blocsDe(ents, racine, s.files, images);
    if (blocs.length === 0) throw new Error(`zero bloc extrait : ${a.source}`);

    const article = {
      slug: a.slug,
      langue: "en",
      traductionDe: a.traductionDe,
      titre: meta.name,
      description: meta.description ?? "",
      motsCles: [],
      publieLe: new Date((meta.dateTs ?? 0) * 1000).toISOString().slice(0, 10),
      couverture: `/blog/img/en/${a.slug}.webp`,
      couvertureSource: meta.image ?? "",
      blocs,
    };

    if (!VERIFIE) {
      fs.writeFileSync(
        path.join(SORTIE, `${a.slug}.json`),
        `${JSON.stringify(article, null, 2)}\n`,
        "utf8",
      );
    }
    const compte = {};
    for (const b of blocs) compte[b.type] = (compte[b.type] ?? 0) + 1;
    rapport.push(`${a.slug}  ${blocs.length} blocs  ${JSON.stringify(compte)}`);
  }

  console.log(rapport.join("\n"));
  console.log(`\n${images.size} images distinctes dans les corps.`);
  if (VERIFIE) console.log("\n--verifie : rien n'a ete ecrit.");
}

await main();
