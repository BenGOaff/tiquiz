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
// IL REFUSE dans quatre cas, et c'est tout son interet :
//   - une correction qui ne trouve AUCUNE cible (une correction qu'on
//     croit appliquee, leçon du 4 septembre) ;
//   - la section Tipote introuvable ou mal bornee ;
//   - un interdit qui survit a la reparation ;
//   - une image qui sort SANS texte alternatif.

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
import { poserAltEn } from "../lib/blog/altImagesEn.ts";
// LES DEUX MÊMES NETTOYAGES QUE LE FRANÇAIS.
//
// Un garde-fou qui ne protège qu'un des deux jumeaux ne protège
// personne : les articles anglais viennent du même éditeur, où un bloc
// se duplique d'un clic, et une traduction peut très bien finir sur un
// titre dont la section n'a pas été écrite.
import { retirerTitreOrphelin, retirerBlocsEnDouble } from "../lib/blog/miseEnPage.ts";

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
  if (b.type === "image") {
    // LE TEXTE ALTERNATIF EST POSE AVANT D'ETRE CORRIGE.
    //
    // Mesure du 8 septembre : 27 images sur 27 arrivaient de
    // `tipote.blog` SANS aucun `alt`. `poserAltEn` lit la table
    // ANGLAISE (`lib/blog/altImagesEn.ts`) ; une image absente de la
    // table garde le sien, exactement comme la regle francaise du
    // 31 aout.
    //
    // L'ORDRE COMPTE : la ponctuation anglaise doit passer sur le texte
    // POSE, pas seulement sur celui qui venait de l'import. Sans ca, un
    // `alt` ecrit avec une espace devant un `?` sortirait tel quel.
    const img = { ...b };
    if (poserAltEn(img)) compteur.set("alt", (compteur.get("alt") ?? 0) + 1);
    return { ...img, alt: corrigerChaine(img.alt, compteur) };
  }
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
  const propres = retirerBlocsEnDouble(retirerTitreOrphelin(remplacerSection(a.blocs, compteur)));
  // `compteur` est une MAP : y poser une propriete ne compte RIEN.
  // Le total et `compteur.size` lisent tous ses cles.
  if (propres.length !== a.blocs.length) {
    compteur.set("bloc nettoye", (compteur.get("bloc nettoye") ?? 0) + (a.blocs.length - propres.length));
  }
  a.blocs = propres.map((b) => corrigerBloc(b, compteur));

  const apres = JSON.stringify(a, null, 2) + "\n";
  corriges.set(nom, apres);
  if (apres !== avant) {
    if (!VERIFIE) fs.writeFileSync(chemin, apres);
    ecrits.push(nom);
  }
}

// ── CE QUI N'A TROUVE AUCUNE CIBLE ──
//
// UNE REGLE SILENCIEUSE NE VEUT PAS DIRE LA MEME CHOSE SELON LE MOMENT.
// Sur un import frais, elle est fausse. Sur un contenu deja corrige,
// c'est le resultat attendu.
//
// Le premier discriminant etait un drapeau de CORPUS ("au moins une
// regle a mordu"), et il s'est casse le 8 septembre au soir : un import
// qui rend du texte neuf dans UN article le fait basculer, et les
// regles des AUTRES articles, deja corrigees, sont alors denoncees
// comme fausses. Un controle par corpus ne peut pas repondre a une
// question par regle.
//
// ON COMPARE DONC CE QUI SE COMPARE : une regle qui n'a pas mordu est
// fausse SEULEMENT si son texte d'arrivee est introuvable lui aussi.
// Son `vers` present est une PREUVE que la correction a deja eu lieu,
// pas une deduction.
const toutLeCorrige = [...corriges.values()].join("\n");
const dejaLa = (vers) => {
  const v = String(vers ?? "").trim();
  // Un `vers` trop court se retrouverait par hasard dans n'importe quel
  // article : on ne s'en sert comme preuve que s'il est SPECIFIQUE,
  // c'est a dire long, ou porteur d'un nom de domaine.
  const specifique = v.length >= 20 || /[a-z0-9-]+\.[a-z]{2,}/i.test(v);
  return specifique && toutLeCorrige.includes(JSON.stringify(v).slice(1, -1));
};

// UNE REGLE QUI SUPPRIME NE PEUT PAS SE PROUVER, ET ON LE DIT.
//
// Son texte d'arrivee est VIDE : il n'y a donc rien a retrouver dans le
// contenu corrige, et "la phrase a bien ete supprimee" est
// indistinguable de "le motif ne correspond a rien". Inventer une
// preuve serait pire que l'absence de preuve.
//
// Elles sont donc exemptees du controle, et COMPTEES : une exemption
// silencieuse deviendrait un trou ou n'importe quelle regle fausse
// pourrait se ranger.
const supprime = (r) => String(r.vers ?? "").trim() === "";
const nbSuppressions = FAITS_EN.filter(supprime).length;

const muettes = [];
for (const l of LIENS_EN) {
  // Pour un lien, la preuve est sa DESTINATION : une adresse est deja
  // assez specifique pour ne pas se retrouver par hasard, donc pas de
  // plancher de longueur ici.
  if (!compteur.has(`lien ${l.de}`) && !toutLeCorrige.includes(l.vers)) muettes.push(`lien   ${l.de}`);
}
for (const l of TEXTES_DE_LIEN_EN) {
  if (!compteur.has(`texte ${l.de}`) && !dejaLa(l.vers)) muettes.push(`texte  ${l.de}`);
}
for (const f of FAITS_EN) {
  if (!compteur.has(`fait ${f.de.slice(0, 60)}`) && !dejaLa(f.vers) && !supprime(f)) {
    muettes.push(`fait   ${f.de.slice(0, 90)}`);
  }
}

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

// ── LES IMAGES QUI SORTENT SANS TEXTE ALTERNATIF ──
//
// Mesure du 8 septembre : les 27 images des quatre articles arrivaient
// de `tipote.blog` avec un `alt` VIDE, et `ALT_IMAGES_EN` les couvre
// toutes les 27. Une image qui ressort nue veut donc dire une seule
// chose : son chemin a change et la table ne le NOMME plus.
//
// Ca ne casse rien et ca ne se voit sur aucun ecran : la page s'affiche
// exactement pareil, et seuls une lectrice aveugle, Google et un modele
// de langue perdent quelque chose. C'est le genre de trou qui vit des
// mois, donc il fait REFUSER.
//
// On lit le contenu CORRIGE, jamais le disque : en `--verifie` rien
// n'est ecrit, donc le disque dirait "27 images nues" sur une
// reparation parfaitement bonne.
const sansAlt = [];
for (const [nom, txt] of corriges) {
  for (const b of JSON.parse(txt).blocs ?? []) {
    if (b.type === "image" && !String(b.alt ?? "").trim()) sansAlt.push(`${nom} : ${b.src}`);
  }
}

console.log(`${ecrits.length} article(s) ${VERIFIE ? "a corriger" : "corriges"} : ${ecrits.join(", ") || "aucun"}`);
if (nbSuppressions) {
  console.log(
    `${nbSuppressions} regle(s) SUPPRIMENT une phrase : elles sont hors du controle des regles muettes, ` +
      "leur disparition ne se prouve pas.",
  );
}
const total = [...compteur.values()].reduce((s, n) => s + n, 0);
console.log(`${total} correction(s) appliquee(s), ${compteur.size} regle(s) ont mordu.`);

if (muettes.length) {
  console.error(`\n${muettes.length} regle(s) n'ont trouve AUCUNE cible :`);
  for (const m of muettes) console.error("   " + m);
}
if (restants.length) {
  console.error(`\n${restants.length} interdit(s) survivent :`);
  for (const r of restants) console.error("   " + r);
}
if (sansAlt.length) {
  console.error(`\n${sansAlt.length} image(s) sortent SANS texte alternatif :`);
  for (const i of sansAlt) console.error("   " + i);
  console.error("   -> ajoute leur chemin a ALT_IMAGES_EN apres avoir REGARDE l'image.");
}
if (muettes.length || restants.length || sansAlt.length) {
  console.error(
    "\nUne correction qui ne mord pas est une correction qu'on croit appliquee : on ne finit pas en silence.",
  );
  process.exit(1);
}
// LA PHRASE FINALE DIT CE QUI S'EST PASSE, et rien d'autre.
console.log(
  total === 0
    ? "Rien a corriger : l'anglais est deja d'aplomb, et rien d'interdit n'y survit."
    : "Rien ne survit de ce qui est interdit, et aucune image ne sort sans texte alternatif.",
);

// ── LE SOMMAIRE, ECRIT DEPUIS LE CONTENU CORRIGE ──
//
// C'EST LA REPARATION QUI L'ECRIT, JAMAIS L'IMPORT, et ce n'est pas un
// detail d'ordonnancement : la reparation corrige `titre`, `description`
// et `motsCles`. Un sommaire ecrit a l'import porterait donc les
// versions NON corrigees, c'est a dire l'ancien prix et les promesses
// fausses, et ce sommaire est exactement ce qui s'affiche sur la liste
// du blog et dans l'`og:description` d'un partage.
//
// Sens de l'erreur : sans reparation il n'y a pas de sommaire, donc
// aucun article anglais n'est servi. Rien vaut mieux qu'un titre faux.
const sommaire = [...corriges.values()]
  .map((txt) => JSON.parse(txt))
  .map((a) => ({
    slug: a.slug,
    langue: a.langue,
    // L'APPARIEMENT VOYAGE AVEC LE SOMMAIRE : sans lui, retrouver la
    // version anglaise d'un article francais demanderait d'ouvrir les
    // quatre fichiers a chaque rendu de page.
    traductionDe: a.traductionDe,
    titre: a.titre,
    description: a.description,
    publieLe: a.publieLe,
    couverture: a.couverture,
  }))
  // Du plus recent au plus ancien, comme le sommaire francais : les
  // deux listes sont lues par le MEME composant.
  .sort((x, y) => (x.publieLe < y.publieLe ? 1 : x.publieLe > y.publieLe ? -1 : 0));

if (!VERIFIE) {
  fs.writeFileSync(
    path.join(DOSSIER, "index.json"),
    `${JSON.stringify(sommaire, null, 2)}\n`,
    "utf8",
  );
}
console.log(`Sommaire : ${sommaire.length} article(s)${VERIFIE ? " (rien ecrit)" : ""}.`);

