// scripts/reparer-blog.mjs
//
// REMET D'APLOMB LE CONTENU IMPORTÉ DU BLOG (Béné, 30 août 2026).
//
// "certains liens sont débiles comme 'C'est pour ça que Tiquiz existe'
// qui mène vers l'affiliate center et pas vers Tiquiz..."
//
// Elle a raison, et ce n'était pas un cas isolé : l'import du 29 août a
// laissé trois familles de défauts, toutes invisibles à la relecture
// parce que le TEXTE, lui, est juste. Seule la destination ment.
//
//   1. DES LIENS QUI MÈNENT AILLEURS QUE CE QU'ILS PROMETTENT.
//      Sept liens de lecture pointaient sur `affiliate.tipote.com`,
//      c'est à dire sur la connexion à l'espace affilié, alors que la
//      phrase dit "teste Tiquiz". Le lecteur clique pour essayer le
//      produit et tombe sur un formulaire qui ne le concerne pas.
//
//   2. QUATRE URL CONCATÉNÉES PAR L'IMPORT LUI MÊME.
//      `systeme.io/fr?sa=<id>fr/blog/exemples-lead-magnets` : le lien
//      affilié a été recollé devant un chemin. Ces URL sont MORTES,
//      personne n'a jamais pu les suivre.
//
//   3. LA PONCTUATION MANGÉE AVEC LES CHEVRONS.
//      En remplaçant `«` et `»` par des guillemets droits, l'import a
//      emporté l'espace qui les entourait : `Donc"c'est gratuit"`,
//      `parles "funnel de conversion"à une maman`.
//
// -- LA DÉCISION SE PREND SUR LE COUPLE (DESTINATION, TEXTE) ----------
//
// C'est le point à ne pas simplifier. `affiliate.tipote.com` est une
// destination JUSTE quand la phrase parle du programme d'affiliation,
// et FAUSSE quand elle dit "teste Tiquiz". Un remplacement à l'aveugle
// sur l'URL casserait les liens légitimes de l'article d'affiliation ;
// c'est pour ça que le script lit le texte de chaque lien.
//
// LE SCRIPT EST IDEMPOTENT : relancé sur un contenu propre il ne change
// rien et le DIT. C'est ce qui permet de le repasser après le prochain
// import au lieu de refaire ces corrections à la main.
//
//   npm run blog:reparer    # écrit
//   npm run blog:verifier   # ne fait que compter
//
// (Les deux passent `--experimental-strip-types` : le script importe la
// règle de reponctuation depuis `lib/`, en TypeScript, pour que le test
// et lui appliquent LA MÊME.)
//
// Le script répare, `tests/logic/blog.test.mts` interdit la rechute.

import fs from "node:fs";
import path from "node:path";

import { reponctuer } from "../lib/blog/reponctuation.ts";
import { corrigerFaits } from "../lib/blog/faitsProgramme.ts";
import { poserAlt } from "../lib/blog/altImages.ts";
import {
  corrigerStructure,
  nettoyerMiseEnPage,
  normaliserNiveauxTitres,
  retirerBanniereEnTete,
} from "../lib/blog/miseEnPage.ts";

const DOSSIER = path.join(process.cwd(), "content", "blog");
const VERIFIE = process.argv.includes("--verifie");

// Le code affilié Systeme.io de Béné. Il RESTE dans les liens qui vont
// chez eux : ce sont ses commissions, et Systeme.io ne lit que celui là.
const SA = "sa0007878317200141bbe3de2b6644176621db2c6580";

// ── 1. LES DESTINATIONS ─────────────────────────────────────────────
//
// Chaque règle dit ce qu'elle remplace ET pourquoi. Une table sans
// raison écrite est une table que le prochain passage "nettoie" en
// cassant le cas qu'il ne connaît pas.
const REGLES = [
  {
    de: `https://systeme.io/fr?sa=${SA}fr/blog/exemples-lead-magnets`,
    vers: `https://systeme.io/fr/blog/exemples-lead-magnets?sa=${SA}`,
    pourquoi: "URL concatenee : le chemin du blog etait colle apres la query",
  },
  {
    de: `https://systeme.io/fr?sa=${SA}fr?sa=${SA}`,
    vers: `https://systeme.io/fr?sa=${SA}`,
    pourquoi: "le lien affilie a ete colle deux fois",
  },
  {
    de: "https://affiliate.tipote.com/signup",
    vers: "https://tiquiz.fr/signup",
    pourquoi: "liens de LECTURE qui promettent le produit et menaient a l'espace affilie",
  },
  {
    de: "https://www.tipote.fr/atelier-du-quiz",
    vers: "https://atelierduquiz.fr/",
    pourquoi:
      "l'Atelier a son domaine depuis le 30 aout et son middleware capte le ?ref= ; le tunnel Systeme.io ne nous transmet rien",
  },
  {
    de: "https://www.tipote.fr/",
    vers: "https://tiquiz.fr/signup",
    pourquoi: "'creer ton premier quiz gratuitement' menait aux pages de vente de Tipote",
  },
  // Le tableau de bord affilié demande un compte : un lecteur curieux y
  // arrive sur un ecran de connexion. On l'envoie sur la page qui
  // EXPLIQUE le programme, SAUF quand l'adresse est elle-meme le texte
  // du lien (changer sa cible ferait mentir la phrase).
  {
    de: "https://affiliate.tipote.com/",
    vers: "https://tiquiz.fr/affiliation",
    sauf: (texte) => /affiliate\.tipote\.com/i.test(texte),
    pourquoi: "le tableau de bord demande un compte ; la page qui explique, non",
  },
  // Un `http://` en 2026 declenche un avertissement du navigateur, et
  // c'est nous qui l'envoyons.
  ...["mycreativetype.com", "functionofbeauty.com", "tryinteract.com", "kyleads.com",
      "getaiform.com", "involv.me", "involve.me"].map((h) => ({
    de: `http://${h}`,
    vers: `https://${h}`,
    pourquoi: "lien externe en clair",
  })),
];

const compte = new Map();

/** La destination corrigée pour un lien, connaissant SON texte. */
function corrigerLien(href, texteDuLien) {
  for (const r of REGLES) {
    if (!href.includes(r.de)) continue;
    if (r.sauf && r.sauf(texteDuLien)) continue;
    compte.set(r.de, (compte.get(r.de) ?? 0) + 1);
    return href.split(r.de).join(r.vers);
  }
  return href;
}

/** Les `<a href>` d'un fragment, corrigés d'après le texte qu'ils portent. */
function corrigerAncres(html) {
  return html.replace(
    /<a\s+([^>]*?)href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g,
    (tout, av, href, ap, dedans) => {
      const neuf = corrigerLien(href, dedans.replace(/<[^>]+>/g, ""));
      return neuf === href ? tout : `<a ${av}href="${neuf}"${ap}>${dedans}</a>`;
    },
  );
}

// ── 2. LA PONCTUATION MANGÉE PAR L'IMPORT ───────────────────────────
//
// Les trois règles vivent dans `lib/blog/reponctuation.ts`, PAS ici : ce
// script répare, `tests/logic/blog.test.mts` interdit la rechute, et les
// deux doivent appliquer exactement la même règle. Chacun sa copie, et
// l'un finirait par accepter ce que l'autre corrige.

// ── LE PASSAGE ──────────────────────────────────────────────────────

let typo = 0;
let faits = 0;
let alts = 0;
let miseEnPage = 0;
let structure = 0;
let niveaux = 0;
let bannieres = 0;
function texte(s) {
  // LES FAITS D'ABORD, LA PONCTUATION ENSUITE.
  //
  // L'ordre n'est pas cosmétique : les corrections de faits portent sur
  // des PHRASES ENTIÈRES, et la reponctuation change les espaces autour
  // des `€` et des `:`. Reponctuer d'abord ferait que plus aucune
  // phrase ne serait reconnue, et la correction échouerait en silence.
  // C'est le piège de l'ordre des remplacements, déjà payé le 29 août.
  const avecFaits = corrigerFaits(s);
  if (avecFaits !== s) faits += 1;
  const out = reponctuer(avecFaits);
  if (out !== avecFaits) typo += 1;
  return out;
}

/**
 * LE HTML D'UN BLOC : la mise en page D'ABORD, le texte ensuite.
 *
 * L'ordre compte, pour la même raison que faits-puis-ponctuation : les
 * corrections de structure portent sur des fragments de HTML ENTIERS, et
 * la reponctuation change les espaces à l'intérieur. Reponctuer avant
 * ferait que plus aucun fragment ne serait reconnu, et la correction
 * échouerait en silence.
 */
function html(s) {
  const cor = corrigerStructure(s);
  if (cor.corriges > 0) structure += cor.corriges;
  const propre = nettoyerMiseEnPage(cor.html);
  if (propre !== cor.html) miseEnPage += 1;
  return texte(corrigerAncres(propre));
}

function reparerBloc(b) {
  if (b.type === "html") return { ...b, html: html(b.html) };
  if (b.type === "titre") return { ...b, texte: texte(b.texte) };
  if (b.type === "image") {
    // LE TEXTE ALTERNATIF, POSÉ S'IL MANQUE.
    //
    // 33 images sur 76 n'en avaient aucun : ni lecteur d'écran, ni
    // Google, ni modèle de langue ne savaient ce qu'elles montrent, et
    // les schémas de ce blog portent l'essentiel de l'argumentaire.
    //
    // `poserAlt` n'écrase jamais un `alt` existant : le remplacer en
    // masse ferait perdre ceux qui sont bons.
    const image = { ...b, alt: texte(b.alt) };
    if (poserAlt(image)) alts += 1;
    return image;
  }
  if (b.type === "cta") return { ...b, texte: texte(b.texte), url: corrigerLien(b.url, b.texte) };
  if (b.type === "faq") {
    return {
      ...b,
      questions: b.questions.map((q) => ({
        question: texte(q.question),
        reponse: html(q.reponse),
      })),
    };
  }
  return b;
}

function reparerArticle(a) {
  const out = { ...a, titre: texte(a.titre), description: texte(a.description) };
  if (Array.isArray(a.blocs)) {
    // LES NIVEAUX DE TITRE SE RECALENT SUR TOUT L'ARTICLE, donc APRÈS
    // le passage bloc par bloc : la règle a besoin de voir la suite
    // complète pour savoir quel niveau ouvre les sections.
    const sansBanniere = retirerBanniereEnTete(a.blocs, String(a.couverture ?? ""));
    if (sansBanniere.length !== a.blocs.length) bannieres += 1;
    const avant = sansBanniere.map(reparerBloc);
    const apres = normaliserNiveauxTitres(avant);
    if (JSON.stringify(apres) !== JSON.stringify(avant)) niveaux += 1;
    out.blocs = apres;
  }
  return out;
}

let ecrits = 0;
const fichiers = fs.readdirSync(DOSSIER).filter((f) => f.endsWith(".json"));
for (const f of fichiers) {
  const chemin = path.join(DOSSIER, f);
  const avant = fs.readFileSync(chemin, "utf8");
  const objet = JSON.parse(avant);
  const apres =
    JSON.stringify(Array.isArray(objet) ? objet.map(reparerArticle) : reparerArticle(objet), null, 2) + "\n";
  if (apres !== avant) {
    ecrits += 1;
    if (!VERIFIE) fs.writeFileSync(chemin, apres);
  }
}

console.log(`Fichiers ${VERIFIE ? "a corriger" : "reecrits"} : ${ecrits}/${fichiers.length}`);
console.log(`Fragments reponctues : ${typo}`);
console.log(`Faits du programme corriges : ${faits}`);
console.log(`Textes alternatifs poses : ${alts}`);
console.log(`Blocs dont la mise en page a ete nettoyee : ${miseEnPage}`);
console.log(`Fragments de structure repares : ${structure}`);
console.log(`Articles dont les niveaux de titre ont ete recales : ${niveaux}`);
console.log(`Bannieres en double retirees : ${bannieres}`);
for (const r of REGLES) {
  const n = compte.get(r.de) ?? 0;
  if (n > 0) console.log(`  ${n}x  ${r.de}\n        -> ${r.vers}   (${r.pourquoi})`);
}
// UN SCRIPT QUI FINIT EN SILENCE NE PROUVE RIEN.
if (ecrits === 0) console.log("Rien a corriger : le contenu est deja d'aplomb.");
