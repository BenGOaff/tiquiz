// tests/logic/site-en-anglais.test.mts
//
// LE SITE PUBLIC EN ANGLAIS : LES URL, ET CE QU'ELLES ANNONCENT.
//
// Béné, 8 septembre 2026 : "j'ai des users anglophones qui me trouvent
// sur tipote.blog avec les articles en anglais : on doit les récupérer
// sur le blog tiquiz.fr avec les articles et pages en anglais." Et,
// dans le même message : "je ne veux pas changer les URL actuelles
// parce qu'elles commencent à ranker doucement."
//
// -- CE QUI BLOQUAIT, MESURÉ AVANT D'ÉCRIRE UNE LIGNE -----------------
//
// La langue venait du COOKIE `ui_locale`, et de rien d'autre. Aucun
// segment de langue dans aucune adresse, aucun `hreflang` dans tout le
// dépôt. `tiquiz.fr/tarifs` était donc UNE adresse qui changeait de
// langue selon le cookie du visiteur, et un robot n'envoie jamais de
// cookie : il n'existait AUCUNE URL anglaise à indexer.
//
// -- LES QUATRE MOITIÉS, ET IL FAUT LES QUATRE ------------------------
//
// 1. l'ADRESSE : `/en/<chemin>` existe et rend l'anglais ;
// 2. le FRANÇAIS NE BOUGE PAS : aucun `/fr/`, jamais ;
// 3. la CANONIQUE : chaque page annonce SA langue, pas la première de
//    la liste. Une canonique qui pointerait toujours sur le français
//    ferait juger l'anglais comme du contenu dupliqué, et la page
//    s'afficherait parfaitement pendant tout ce temps ;
// 4. l'AFFILIATION ET LE COMPTEUR survivent au préfixe. C'est SA
//    consigne du même jour : "le générateur pourra être offert en lead
//    magnet par mes affiliés qui les enverront direct sur cette page
//    avec leur ref."
//
// Un test qui n'en tiendrait qu'une passerait au vert sur un site où
// l'anglais n'est pas indexé, ou sur un site où une affiliée n'est plus
// payée sur les pages anglaises.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  LANGUES_PUBLIQUES,
  LANGUE_SANS_PREFIXE,
  alternatesDeLangue,
  cheminPourLangue,
  langueDuChemin,
} from "../../lib/site/langues.ts";
import { PAGES_PUBLIQUES, languesDePage } from "../../lib/site/pagesPubliques.ts";
import { clicASignaler } from "../../lib/affiliate/signalerClic.ts";
import { vueASignaler } from "../../lib/trafic/vueASignaler.ts";

const RACINE = path.resolve(import.meta.dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(RACINE, p), "utf8");

/** La source SANS ses commentaires : un contrôle qui mesure une présence
 *  ou un ORDRE dans un fichier tombe sinon sur sa propre explication. */
function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ─────────────────────────────────────────────────────────────────────
// 1. L'ADRESSE, ET LE FRANÇAIS QUI NE BOUGE PAS
// ─────────────────────────────────────────────────────────────────────

test("le francais n'a AUCUN prefixe : les URL deja indexees ne bougent pas", () => {
  assert.equal(LANGUE_SANS_PREFIXE, "fr");
  assert.equal(cheminPourLangue("/tarifs", "fr"), "/tarifs");
  assert.equal(cheminPourLangue("/blog/mon-article", "fr"), "/blog/mon-article");
  assert.equal(cheminPourLangue("/", "fr"), "/");
});

test("l'anglais vit sous /en/, et le decoupage rend le chemin nu", () => {
  assert.equal(cheminPourLangue("/tarifs", "en"), "/en/tarifs");

  const en = langueDuChemin("/en/tarifs");
  assert.equal(en.langue, "en");
  assert.equal(en.cheminNu, "/tarifs");
  assert.equal(en.ditDansLUrl, true);

  const fr = langueDuChemin("/tarifs");
  assert.equal(fr.langue, "fr");
  assert.equal(fr.cheminNu, "/tarifs");
  assert.equal(fr.ditDansLUrl, false, "une adresse sans prefixe ne se prononce pas");
});

test("un chemin qui COMMENCE par les memes lettres n'est pas une langue", () => {
  // `/entreprise` commence par "en" : le decoupage doit exiger le
  // segment entier, sinon une page francaise serait servie en anglais.
  const p = langueDuChemin("/entreprise");
  assert.equal(p.ditDansLUrl, false);
  assert.equal(p.cheminNu, "/entreprise");
});

// ─────────────────────────────────────────────────────────────────────
// 2. LA CANONIQUE ANNONCE SA PROPRE LANGUE
// ─────────────────────────────────────────────────────────────────────

test("chaque langue est canonique sur SON adresse", () => {
  const fr = alternatesDeLangue("https://tiquiz.fr", "/tarifs", "fr");
  const en = alternatesDeLangue("https://tiquiz.fr", "/tarifs", "en");
  assert.ok(fr && en);

  assert.equal(fr.canonical, "https://tiquiz.fr/tarifs");
  assert.equal(
    en.canonical,
    "https://tiquiz.fr/en/tarifs",
    "une canonique anglaise qui pointe sur le francais fait juger l'anglais comme du duplicata",
  );

  // Les DEUX portent la meme table de paires : c'est ce qui apparie les
  // deux adresses aux yeux de Google.
  assert.deepEqual(fr.languages, en.languages);
  assert.equal(fr.languages.fr, "https://tiquiz.fr/tarifs");
  assert.equal(fr.languages.en, "https://tiquiz.fr/en/tarifs");
  assert.equal(fr.languages["x-default"], "https://tiquiz.fr/tarifs");
});

test("une page qui n'a PAS d'anglais ne declare aucune paire anglaise", () => {
  const seul = alternatesDeLangue("https://tiquiz.fr", "/a-propos", "fr", ["fr"]);
  assert.ok(seul);
  assert.equal(seul.languages.en, undefined, "annoncer une page absente est pire que rien");
  assert.equal(seul.canonical, "https://tiquiz.fr/a-propos");
});

test("une langue servie sans adresse a elle reste canonique sur l'adresse qui existe", () => {
  // Le cas du `?lang=` d'apercu et du cookie : le TEXTE est anglais,
  // l'ADRESSE est francaise, et c'est l'adresse qui est indexee.
  const a = alternatesDeLangue("https://tiquiz.fr", "/a-propos", "en", ["fr"]);
  assert.ok(a);
  assert.equal(a.canonical, "https://tiquiz.fr/a-propos");
});

// ─────────────────────────────────────────────────────────────────────
// 3. LE SITEMAP N'ANNONCE QUE CE QUI EXISTE
// ─────────────────────────────────────────────────────────────────────

test("le sitemap derive les langues de la page, il ne les recopie pas", () => {
  const src = sansCommentaires(lire("app/sitemap.ts"));
  assert.match(
    src,
    /languesDePage\(p\)/,
    "une deuxieme liste de langues divergerait de celle des pages",
  );
  assert.match(src, /cheminPourLangue\(p\.chemin, langue\)/);
});

test("les pages sans texte anglais ne portent que le francais", () => {
  for (const p of PAGES_PUBLIQUES) {
    const langues = languesDePage(p);
    assert.ok(langues.includes("fr"), `${p.chemin} doit exister en francais`);
    for (const l of langues) {
      assert.ok(
        (LANGUES_PUBLIQUES as readonly string[]).includes(l),
        `${p.chemin} declare une langue que le site public ne sert pas : ${l}`,
      );
    }
  }
});

test("/tarifs est la page anglaise du jour, et son texte existe vraiment", () => {
  const tarifs = PAGES_PUBLIQUES.find((p) => p.chemin === "/tarifs");
  assert.ok(tarifs, "la page /tarifs doit rester declaree");
  assert.ok(languesDePage(tarifs).includes("en"));

  // Le texte anglais doit EXISTER : declarer la langue sans l'ecrire
  // ferait servir du francais sous `/en/tarifs`.
  const landing = lire("lib/site/landing.ts");
  assert.match(landing, /langue:\s*"en"/, "l'objet de langue anglais a disparu de la landing");
});

// ─────────────────────────────────────────────────────────────────────
// 4. L'AFFILIATION ET LE COMPTEUR SURVIVENT AU PREFIXE
// ─────────────────────────────────────────────────────────────────────

test("un lien affilie compte sur une adresse anglaise", () => {
  for (const chemin of ["/en/tarifs", "/en/blog/mon-article", "/en/generateur-de-quiz"]) {
    assert.equal(
      clicASignaler({ ref: "jocelyne", pathname: chemin, accept: "text/html" }),
      true,
      `une affiliee qui partage ${chemin} doit voir son clic`,
    );
  }
});

test("une vue est comptee sur une adresse anglaise", () => {
  assert.equal(
    vueASignaler({
      host: "tiquiz.fr",
      pathname: "/en/tarifs",
      accept: "text/html",
      userAgent: "Mozilla/5.0",
    }),
    true,
  );
});

test("la reecriture /en/ pose le cookie affilie, et le compteur tourne AVANT elle", () => {
  const src = sansCommentaires(lire("middleware.ts"));

  // Le cookie : la sortie de la reecriture passe par `poseSa`, comme
  // les onze autres. Sans lui, une affiliee qui envoie du monde sur une
  // page anglaise n'est payee sur rien, et il n'y a AUCUN symptome.
  assert.match(
    src,
    /poseSa\(\s*NextResponse\.rewrite\(url,\s*\{\s*request:\s*\{\s*headers:\s*entetes\s*\}\s*\}\)\s*\)/,
    "la reecriture /en/ doit poser le cookie affilie",
  );

  // L'ORDRE : le clic et la vue se comptent sur le chemin RECU, donc
  // avant que la reecriture ne retire le prefixe.
  const posClic = src.indexOf("clicASignaler(");
  const posVue = src.indexOf("vueASignaler(");
  const posReecriture = src.indexOf("langueDuChemin(");
  assert.ok(posClic > 0 && posVue > 0 && posReecriture > 0);
  assert.ok(
    posClic < posReecriture && posVue < posReecriture,
    "le compteur doit tourner avant la reecriture, sinon /en/ n'est jamais compte",
  );
});

test("l'URL gagne sur le cookie, et c'est la PRECEDENCE qui le dit", () => {
  const src = sansCommentaires(lire("i18n/request.ts"));

  // MON PREMIER JET MESURAIT L'ORDRE DES DEUX `await`, ET IL NE
  // DISTINGUAIT RIEN. `indexOf("langueDeLUrl(")` tombait sur la
  // DECLARATION de la fonction, ecrite plus haut, donc le test restait
  // VERT quand on inversait vraiment les deux lignes. Et surtout ces
  // deux lignes ne decident rien : c'est le `??` qui decide.
  //
  // On vise donc le FAIT : la langue dite par l'URL passe devant, le
  // cookie est son repli. Sans ca, `/en/tarifs` sert du francais a
  // quelqu'un dont le cookie dit "fr", la page s'affiche parfaitement,
  // et Google indexe du francais sous une adresse anglaise.
  assert.match(
    src,
    /dite\s*\?\?\s*\(isSupportedLocale\(raw\)/,
    "l'URL doit passer devant le cookie, et le cookie rester le repli",
  );
  assert.equal(
    /isSupportedLocale\(raw\)\s*\?\s*raw\s*:\s*\)?\s*dite/.test(src),
    false,
    "le cookie ne doit jamais passer devant l'adresse",
  );
});

test("aucun /fr/ n'est fabrique nulle part", () => {
  for (const chemin of ["/", "/tarifs", "/blog/mon-article"]) {
    assert.equal(cheminPourLangue(chemin, "fr").startsWith("/fr/"), false);
  }
  const sitemap = sansCommentaires(lire("app/sitemap.ts"));
  assert.equal(
    /\$\{HOTE_VENTE\}\/fr\//.test(sitemap),
    false,
    "poser /fr/ jetterait le referencement de chaque adresse deja indexee",
  );
});
