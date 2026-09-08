// scripts/reparer-blog-en.mjs
//
// REPARE LES QUATRE ARTICLES ANGLAIS, ET REFUSE DE FINIR EN SILENCE.
//
//   npm run blog:reparer-en              applique
//   npm run blog:reparer-en -- --verifie dit ce qu'il ferait, n'ecrit rien
//
// L'import (`importer-blog-en.mjs`) ne corrige RIEN, expres : un
// re-import ecraserait toute retouche faite a la main dans le JSON. La
// regle vit donc dans `lib/blog/faitsEn.ts`, ce script l'applique, et
// `tests/logic/blog-en.test.mts` appelle LA MEME source : le contenu
// est propre quand la reparation ne change plus rien.
//
// IL REFUSE dans trois cas, et c'est tout son interet :
//   - une correction qui ne trouve AUCUNE cible (une correction qu'on
//     croit appliquee, leçon du 4 septembre) ;
//   - la section Tipote introuvable ou mal bornee ;
//   - un interdit qui survit a la reparation.

import fs from "node:fs";
import path from "node:path";
const RACINE = process.cwd();
const DOSSIER = path.join(RACINE, "content", "blog", "en");
const VERIFIE = process.argv.includes("--verifie");

// Le module de regles est en TypeScript : il est charge par le MEME
// pont que les tests logiques (`--experimental-strip-types` plus
// l'alias `@/`, poses dans le script npm). Aucune dependance, aucun
// build, et surtout UNE seule source de verite pour la reparation et
// pour le test.
import {
  LIENS_EN,
  TEXTES_DE_LIEN_EN,
  FAITS_EN,
  SECTION_TIPOTE,
  QUESTIONS_RETIREES_EN,
  INTERDITS_EN,
  retirerTirets,
  ponctuationAnglaise,
} from "../lib/blog/faitsEn.ts";

/** Compte les remplacements, sans expression reguliere : les motifs sont du HTML. */
function remplacer(texte, de, vers, compteur, cle) {
  if (!de || !texte.includes(de)) return texte;
  let n = 0;
  let out = texte;
  while (out.includes(de)) {
    out = out.replace(de, vers);
    n += 1;
    if (n > 50) break;
  }
  compteur.set(cle, (compteur.get(cle) ?? 0) + n);
  return out;
}

/**
 * Le mot "Systeme.io" etait auto-lie vers une adresse qui n'existe pas.
 * On DEBALLE le lien et on garde le texte : les articles francais n'en
 * portent aucun, et 54 liens sortants de plus ne servent personne.
 */
function deballerAutoliens(texte) {
  return texte.replace(
    /<a href="http:\/\/Systeme\.io"[^>]*>([\s\S]*?)<\/a>/g,
    (_, dedans) => dedans,
  );
}

function corrigerChaine(texte, compteur) {
  let t = deballerAutoliens(texte);
  for (const l of LIENS_EN) t = remplacer(t, l.de, l.vers, compteur, `lien ${l.de}`);
  for (const l of TEXTES_DE_LIEN_EN) t = remplacer(t, l.de, l.vers, compteur, `texte ${l.de}`);
  for (const f of FAITS_EN) t = remplacer(t, f.de, f.vers, compteur, `fait ${f.de.slice(0, 60)}`);
  // La ponctuation PASSE EN DERNIER : les remplacements ci dessus posent
  // du texte anglais, et `retirerTirets` en produit ("FAQ: ..."). Passer
  // avant laisserait ce qu'on vient d'ecrire sans controle.
  return ponctuationAnglaise(retirerTirets(t));
}

function corrigerBloc(b, compteur) {
  if (b.type === "html") return { ...b, html: corrigerChaine(b.html, compteur) };
  if (b.type === "titre") return { ...b, texte: corrigerChaine(b.texte, compteur) };
  if (b.type === "cta")
    return { ...b, texte: corrigerChaine(b.texte, compteur), url: corrigerChaine(b.url, compteur) };
  if (b.type === "image") return { ...b, alt: corrigerChaine(b.alt, compteur) };
  if (b.type === "faq") {
    const gardees = b.questions.filter(
      (q) => !QUESTIONS_RETIREES_EN.some((r) => r.question === q.question),
    );
    const retirees = b.questions.length - gardees.length;
    if (retirees > 0) compteur.set("faq retiree", (compteur.get("faq retiree") ?? 0) + retirees);
    return {
      ...b,
      questions: gardees.map((q) => ({
        question: corrigerChaine(q.question, compteur),
        reponse: corrigerChaine(q.reponse, compteur),
      })),
    };
  }
  return b;
}

/** Remplace les blocs entre le titre qui ouvre et celui qui ferme. */
function remplacerSection(blocs, compteur) {
  const i = blocs.findIndex((b) => b.type === "titre" && b.texte === SECTION_TIPOTE.ouvre);
  if (i < 0) return blocs;
  const j = blocs.findIndex((b) => b.type === "titre" && b.texte === SECTION_TIPOTE.ferme);
  if (j <= i) {
    throw new Error(
      `La section a remplacer est ouverte sans etre fermee : "${SECTION_TIPOTE.ferme}" est introuvable apres "${SECTION_TIPOTE.ouvre}". On n'ecrit rien.`,
    );
  }
  compteur.set("section Tipote", j - i);
  return [...blocs.slice(0, i), ...SECTION_TIPOTE.blocs, ...blocs.slice(j)];
}

const compteur = new Map();
const ecrits = [];
/** Le contenu CORRIGE, garde en memoire : c'est lui qu'on controle. */
const corriges = new Map();

for (const nom of fs.readdirSync(DOSSIER).filter((f) => f.endsWith(".json") && f !== "index.json")) {
  const chemin = path.join(DOSSIER, nom);
  const avant = fs.readFileSync(chemin, "utf8");
  const a = JSON.parse(avant);

  a.titre = corrigerChaine(a.titre, compteur);
  a.description = corrigerChaine(a.description, compteur);
  a.motsCles = (a.motsCles ?? []).map((m) => corrigerChaine(m, compteur));
  a.blocs = remplacerSection(a.blocs, compteur).map((b) => corrigerBloc(b, compteur));

  const apres = JSON.stringify(a, null, 2) + "\n";
  corriges.set(nom, apres);
  if (apres !== avant) {
    if (!VERIFIE) fs.writeFileSync(chemin, apres);
    ecrits.push(nom);
  }
}

// ── CE QUI N'A TROUVE AUCUNE CIBLE ──
const muettes = [];
for (const l of LIENS_EN) if (!compteur.has(`lien ${l.de}`)) muettes.push(`lien   ${l.de}`);
for (const l of TEXTES_DE_LIEN_EN)
  if (!compteur.has(`texte ${l.de}`)) muettes.push(`texte  ${l.de}`);
for (const f of FAITS_EN)
  if (!compteur.has(`fait ${f.de.slice(0, 60)}`)) muettes.push(`fait   ${f.de.slice(0, 90)}`);

// ── CE QUI SURVIT A LA REPARATION ──
//
// On controle le contenu CORRIGE, jamais le fichier sur le disque : en
// `--verifie` rien n'est ecrit, donc relire le disque ferait dire au
// controle que TOUT survit, sur une reparation parfaitement bonne. Un
// controle qui ne distingue pas ce qu'il est cense distinguer est pire
// qu'un controle absent.
const restants = [];
for (const [nom, txt] of corriges) {
  for (const i of INTERDITS_EN) {
    const m = txt.match(i.motif);
    if (m) restants.push(`${nom} : ${m[0]}  (${i.pourquoi})`);
  }
}

console.log(`${ecrits.length} article(s) ${VERIFIE ? "a corriger" : "corriges"} : ${ecrits.join(", ") || "aucun"}`);
const total = [...compteur.values()].reduce((s, n) => s + n, 0);
console.log(`${total} correction(s) appliquee(s), ${compteur.size} regle(s) ont mordu.`);

// UNE REGLE MUETTE NE VEUT PAS DIRE LA MEME CHOSE SELON LE MOMENT.
//
// Sur un import FRAIS, une regle qui ne mord pas est une regle fausse :
// son motif ne correspond a rien, et on croit une correction appliquee
// alors qu'elle ne l'est pas (lecon du 4 septembre,
// `appliquerCorrectionsFaq`).
//
// Sur un contenu DEJA corrige, aucune regle ne peut mordre, et c'est
// exactement le resultat attendu : le contenu est propre quand la
// reparation ne change plus rien. Le test appelle cette meme
// mecanique, donc un refus systematique la rendrait ininvocable deux
// fois de suite.
//
// LE DISCRIMINANT EST DONC "combien ont mordu", pas "il en reste une" :
// des regles qui mordent A COTE de regles muettes disent que celles la
// sont fausses ; zero morsure sur toute la table dit que le travail est
// deja fait. Un controle qui ne distingue pas les deux est pire qu'un
// controle absent.
const dejaCorrige = compteur.size === 0;
if (muettes.length && !dejaCorrige) {
  console.error(`\n${muettes.length} regle(s) n'ont trouve AUCUNE cible :`);
  for (const m of muettes) console.error("   " + m);
}
if (restants.length) {
  console.error(`\n${restants.length} interdit(s) survivent :`);
  for (const r of restants) console.error("   " + r);
}
if ((muettes.length && !dejaCorrige) || restants.length) {
  console.error(
    "\nUne correction qui ne mord pas est une correction qu'on croit appliquee : on ne finit pas en silence.",
  );
  process.exit(1);
}
console.log(
  dejaCorrige
    ? "Rien a corriger : l'anglais est deja d'aplomb, et rien d'interdit n'y survit."
    : "Rien ne survit de ce qui est interdit.",
);
