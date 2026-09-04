// scripts/extraire-faq-vente.mjs
//
// LA FAQ VIENT DE SA PAGE DE VENTE, ELLE NE SE RÉÉCRIT PAS.
//
// Béné, 4 septembre 2026 : "et la FAQ bordel tu as déjà tout sur la page
// de vente : pourquoi tu ne reproduis pas ??"
//
// Elle a raison. Les 16 questions et leurs réponses vivent dans le
// `FAQPage` en données structurées de `content/sales/tiquiz.html`, et le
// regroupement en 5 groupes existe déjà dans `lib/sales/faqV2.ts`, écrit
// le 2 septembre pour sa page v2. Il n'y avait rien à inventer, seulement
// à lire.
//
// LE JSON-LD EST LA SOURCE, PAS LE DOM. Les questions y sont APPARIÉES
// avec leurs réponses ; dans le DOM il faudrait deviner quel paragraphe
// répond à quel titre, et une seule paire décalée donnerait une réponse
// qui ne correspond pas à sa question.
//
// LE SCRIPT REFUSE DE FINIR EN SILENCE : une question que les groupes ne
// nomment pas serait PERDUE de l'écran tout en restant dans les données
// structurées. Google lirait une réponse que la lectrice ne voit pas.
//
// Lancer :  npm run faq:extraire

import { readFileSync, writeFileSync } from "node:fs";
import { CORRECTIONS_FAQ, appliquerCorrectionsFaq, rangerFaq } from "../lib/sales/faqV2.ts";

const SOURCE = "content/sales/tiquiz.html";
const SORTIE = "content/faq-vente.json";

const html = readFileSync(SOURCE, "utf8");

function desechapper(t) {
  return t
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const blocs = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
let questions = null;
for (const b of blocs) {
  let d;
  try {
    d = JSON.parse(desechapper(b[1].trim()));
  } catch {
    continue;
  }
  for (const item of Array.isArray(d) ? d : [d]) {
    if (item && item["@type"] === "FAQPage" && Array.isArray(item.mainEntity)) {
      questions = item.mainEntity;
    }
  }
}
if (!questions) {
  console.error(`REFUS : aucun FAQPage exploitable dans ${SOURCE}.`);
  process.exit(1);
}

/**
 * Le texte d'une réponse.
 *
 * UN LIEN NE SE PERD PAS EN DEVENANT DU TEXTE. Retirer les balises d'un
 * coup laissait la dernière réponse dire "Par email en cliquant ici >>",
 * c'est à dire une invitation à cliquer sur rien, sur la seule ligne de
 * la FAQ qui promet une réponse humaine. L'adresse remplace donc le
 * texte du lien, et les chevrons décoratifs partent avec.
 */
function texte(brut) {
  return desechapper(
    String(brut || "")
      .replace(/<a[^>]*href="mailto:([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2")
      .replace(/<a[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** Les corrections de `faqV2.ts`, par la MÊME fonction que la page v2. */
function corriger(t) {
  return appliquerCorrectionsFaq(t).texte;
}

const propres = questions.map((q) => ({
  name: corriger(desechapper(q.name || "").trim()),
  acceptedAnswer: { text: corriger(texte(q.acceptedAnswer?.text)) },
}));

const { groupes, orphelines, inconnues } = rangerFaq(propres);

if (orphelines.length) {
  console.error("REFUS : ces questions ne sont dans AUCUN groupe, donc elles disparaitraient :");
  for (const o of orphelines) console.error("   -", o.name);
  console.error("Ajoute-les a GROUPES_FAQ dans lib/sales/faqV2.ts.");
  process.exit(1);
}
if (inconnues.length) {
  console.error("REFUS : ces debuts de question sont nommes dans les groupes et introuvables :");
  for (const i of inconnues) console.error("   -", i);
  process.exit(1);
}

const vides = propres.filter((q) => q.acceptedAnswer.text.length < 15);
if (vides.length) {
  console.error("REFUS : ces questions n'ont pas de reponse exploitable :");
  for (const v of vides) console.error("   -", v.name);
  process.exit(1);
}

const muets = propres.filter((q) => /cliquant ici|clique ici|ici >>/i.test(q.acceptedAnswer.text));
if (muets.length) {
  console.error("REFUS : ces reponses invitent a cliquer sur rien (le lien a ete perdu) :");
  for (const m of muets) console.error("   -", m.name);
  process.exit(1);
}

const dehors = propres.filter((q) => /—|–/.test(q.name + q.acceptedAnswer.text));
if (dehors.length) {
  console.error("ATTENTION : tiret cadratin dans", dehors.length, "question(s). Regle du 7 juin.");
}

const doc = {
  _source: `${SOURCE}, bloc FAQPage. Genere par scripts/extraire-faq-vente.mjs, NE PAS editer a la main.`,
  groupes: groupes.map((g) => ({
    titre: g.titre,
    questions: g.questions.map((q) => ({ q: q.name, r: q.acceptedAnswer.text })),
  })),
};
writeFileSync(SORTIE, JSON.stringify(doc, null, 2) + "\n", "utf8");

console.log(`${propres.length} questions rangees en ${doc.groupes.length} groupes.`);
for (const g of doc.groupes) console.log(`   ${String(g.questions.length).padStart(2)}  ${g.titre}`);
console.log(`\nEcrit dans ${SORTIE}.`);
