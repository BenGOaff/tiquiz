// tests/logic/tracking-affilie-partout.test.mts
//
// LE TRACKING AFFILIE COUVRE CHAQUE PAGE DU SITE ET DU BLOG.
//
// Béné, 6 septembre 2026 : "n'oublie pas le tracking affilié partout,
// sur toutes les pages du site et du blog".
//
// -- CE QUI A ÉTÉ MESURÉ AVANT D'ÉCRIRE CE FICHIER ---------------------
//
// Le middleware pose déjà le cookie sur TOUTES ses sorties, et son
// `matcher` couvre tout sauf les fichiers statiques. Rien ne manquait
// donc au moment où elle l'a demandé, et je le dis dans ce sens là :
// ce test ne corrige pas un trou, il EMPÊCHE d'en creuser un.
//
// Et c'est exactement le genre de trou qui ne se voit sur aucun écran.
// L'en-tête du middleware le dit depuis le 24 août : "sans cette ligne,
// une affiliée qui envoie du monde sur tiquiz.fr n'est payée sur RIEN,
// et le symptôme est le pire qui soit puisqu'il n'y en a aucun. Tout
// marche, l'argent rentre, et la commission n'existe pas."
//
// -- LES TROIS MOITIÉS, ET IL FAUT LES TROIS --------------------------
//
// 1. le COOKIE : chaque réponse du middleware passe par `poseSa`, sinon
//    une page servie sans cookie perd le lien pour de bon (le visiteur
//    ne repassera pas par l'adresse affiliée) ;
// 2. le CLIC : `clicASignaler` doit répondre oui sur le chemin de chaque
//    page, sinon l'affiliée voit sa page s'afficher et son compteur
//    rester à zéro ;
// 3. la PORTE : le `matcher` doit laisser passer ces chemins, sinon les
//    deux premiers ne s'exécutent jamais.
//
// Un test qui n'en tiendrait qu'une passerait au vert sur un site où
// l'affiliation ne marche plus.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { clicASignaler } from "../../lib/affiliate/signalerClic.ts";
import { PAGES_PUBLIQUES } from "../../lib/site/pagesPubliques.ts";
import { RUBRIQUES } from "../../lib/blog/rubriques.ts";
import { listerArticles } from "../../lib/blog/articles.ts";

const PAGE = "text/html,application/xhtml+xml";

const middleware = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");

/**
 * Toutes les adresses qu'un visiteur peut recevoir dans un lien affilié.
 *
 * ELLES SONT DÉRIVÉES, JAMAIS RECOPIÉES. Une liste écrite à la main ici
 * oublierait la prochaine page ajoutée, c'est à dire exactement celle
 * sur laquelle le trou s'ouvrirait. C'est la mécanique des deux listes
 * qui divergent, payée cinq fois dans ce dépôt.
 */
function toutesLesPages(): string[] {
  return [
    // La racine : le lien affilié canonique (`tiquiz.fr/?ref=jocelyne`).
    "/",
    ...PAGES_PUBLIQUES.map((p) => p.chemin),
    ...RUBRIQUES.map((r) => `/blog/rubrique/${r.id}`),
    ...listerArticles().map((a) => `/blog/${a.slug}`),
    // Les deux écrans où le lien finit par se transformer en argent.
    "/signup",
    "/commande/mensuel",
  ];
}

// -- 1. LE CLIC EST COMPTÉ SUR CHAQUE PAGE -----------------------------

test("chaque page du site et du blog compte le clic affilie", () => {
  const pages = toutesLesPages();
  // Le site en porte plus d'une vingtaine : un jour où cette liste
  // reviendrait vide, le test passerait au vert sans rien vérifier.
  assert.ok(pages.length > 20, `seulement ${pages.length} pages listees`);

  const muettes = pages.filter(
    (pathname) => !clicASignaler({ ref: "jocelyne", pathname, accept: PAGE }),
  );
  assert.deepEqual(
    muettes,
    [],
    `ces pages ne compteraient AUCUN clic affilie : ${muettes.join(", ")}`,
  );
});

test("un slug qui ressemble a un fichier ferait perdre le clic", () => {
  // LE PIÈGE QUE CE TEST EXISTE POUR ATTRAPER, et il est réel :
  // `clicASignaler` refuse tout chemin qui finit par une extension,
  // pour ne pas compter une image ou un flux comme une visite. Un
  // article dont le slug finirait par `.io` ou `.fr` tomberait donc
  // dans ce refus, et l'affiliée qui le partage ne verrait jamais un
  // seul clic. Mesuré le 6 septembre sur les 11 articles : aucun n'est
  // dans ce cas, et c'est ce que ce test maintient.
  assert.equal(
    clicASignaler({ ref: "jocelyne", pathname: "/blog/quiz-systeme.io", accept: PAGE }),
    false,
    "le refus par extension a disparu : le test ci dessus ne protege plus rien",
  );
});

// -- 2. LE COOKIE EST POSÉ SUR CHAQUE SORTIE ---------------------------

test("aucune sortie du middleware ne rend une reponse sans poseSa", () => {
  // On lit le fichier SANS ses commentaires : ce test mesure la
  // présence de quelque chose dans du code, donc il tomberait sinon sur
  // sa propre explication (règle du 3 septembre).
  const code = middleware
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

  // Le corps de `poseSa` rend `res` sans s'appeler lui même : c'est la
  // seule exception, et elle est bornée à sa propre fonction.
  const debut = code.indexOf("const poseSa =");
  assert.ok(debut > 0, "poseSa a disparu du middleware");
  const fin = code.indexOf("\n  };", debut);
  assert.ok(fin > debut, "le corps de poseSa est introuvable");
  const horsPoseSa = code.slice(0, debut) + code.slice(fin);

  const sorties = horsPoseSa.match(/return\s+(?:poseSa\()?\s*(?:NextResponse|res\b)[^\n]*/g) ?? [];
  assert.ok(sorties.length > 5, `seulement ${sorties.length} sorties trouvees`);

  const nues = sorties.filter((l) => !l.includes("poseSa("));
  assert.deepEqual(
    nues,
    [],
    `ces sorties rendent une reponse sans le cookie affilie : ${nues.join(" | ")}`,
  );
});

test("le cookie affilie n'est jamais mis en cache", () => {
  // Une réponse à `?ref=jocelyne` servie depuis un cache n'arrive jamais
  // jusqu'à nous : le clic n'est pas compté, le cookie n'est pas posé.
  // Pire, un cache partagé servirait le `Set-Cookie` d'UNE affiliée à
  // tous les visiteurs suivants.
  assert.match(middleware, /Cache-Control["'],\s*["']private, no-store/);
});

// -- 3. LA PORTE LAISSE PASSER CES CHEMINS -----------------------------

test("le matcher du middleware couvre le site et le blog", () => {
  const bloc = middleware.slice(middleware.indexOf("export const config"));
  const motif = /matcher:\s*\[\s*"([^"]+)"/.exec(bloc);
  assert.ok(motif, "le matcher du middleware est introuvable");

  // LE MOTIF EST ANCRÉ, et ça n'est pas un détail : Next ancre ses
  // matchers, `RegExp.test` non. Sans les ancres, `/_next/static/...`
  // passait le test parce que le motif se satisfaisait ailleurs dans la
  // chaîne, donc le contrôle ne distinguait pas ce qu'il était censé
  // distinguer. Attrapé en l'exécutant, pas en le relisant.
  const re = new RegExp(`^${motif[1]}$`);
  const dehors = toutesLesPages().filter((p) => !re.test(p));
  assert.deepEqual(
    dehors,
    [],
    `le middleware ne tourne pas sur ces pages, donc aucun cookie : ${dehors.join(", ")}`,
  );

  // Et il continue d'écarter ce qui n'est pas une page : sans ça, chaque
  // fichier statique déclencherait le middleware pour rien.
  assert.equal(re.test("/_next/static/chunks/main.js"), false);
});
