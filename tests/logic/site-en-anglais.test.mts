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
  CHEMINS_HORS_REECRITURE,
  serviParUneRouteDeLangue,
} from "../../lib/site/langues.ts";
import { listerArticles } from "../../lib/blog/articles.ts";
import { metadonneesSommaire } from "../../lib/blog/metaSommaire.ts";
import { PAGES_PUBLIQUES, languesDePage } from "../../lib/site/pagesPubliques.ts";
import { CTA_MENU, MENU, PIED, hrefPourLangue } from "../../lib/site/nav.ts";
import { clicASignaler } from "../../lib/affiliate/signalerClic.ts";
import { vueASignaler } from "../../lib/trafic/vueASignaler.ts";

const RACINE = path.resolve(import.meta.dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(RACINE, p), "utf8");

/** La source SANS ses commentaires : un contrôle qui mesure une présence
 *  ou un ORDRE dans un fichier tombe sinon sur sa propre explication. */
function sansCommentaires(src: string): string {
  return src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
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

// ─────────────────────────────────────────────────────────────────────
// 5. LE BLOG A SES PROPRES SEGMENTS `/en/blog/...`
// ─────────────────────────────────────────────────────────────────────

test("un chemin hors reecriture se reconnait par SEGMENT, jamais par debut de chaine", () => {
  assert.equal(serviParUneRouteDeLangue("/blog"), true);
  assert.equal(serviParUneRouteDeLangue("/blog/mon-article"), true);
  assert.equal(serviParUneRouteDeLangue("/blog/rubrique/methode"), true);
  // Le faux positif qu'on rate toujours : un chemin qui COMMENCE par les
  // memes lettres. Sans la comparaison par segment, `/blogueurs`
  // repondrait 404 sous `/en/`.
  assert.equal(serviParUneRouteDeLangue("/blogueurs"), false);
  assert.equal(serviParUneRouteDeLangue("/tarifs"), false);
});

test("chaque chemin exclu de la reecriture a VRAIMENT sa route anglaise", () => {
  // C'est le garde qui compte : une entree ajoutee a la liste sans sa
  // route repondrait 404 sur une page qui existe en francais, et rien
  // ne le dirait avant qu'un lecteur ne clique.
  assert.ok(CHEMINS_HORS_REECRITURE.length > 0, "une liste vide rendrait ce test muet");
  for (const chemin of CHEMINS_HORS_REECRITURE) {
    assert.ok(
      fs.existsSync(path.join(RACINE, "app", "en", chemin.replace(/^\//, ""), "page.tsx")),
      `${chemin} est exclu de la reecriture mais n'a aucune route app/en${chemin}`,
    );
  }
});

test("le middleware EXCLUT ces chemins, et le cookie affilie survit quand meme", () => {
  const src = sansCommentaires(lire("middleware.ts"));
  assert.match(
    src,
    /serviParUneRouteDeLangue\(decoupe\.cheminNu\)/,
    "sans cette exclusion, /en/blog servirait le blog FRANCAIS",
  );
  // Le `next()` de cette branche passe par `poseSa` comme la
  // reecriture : une affiliee qui envoie du monde sur un article
  // anglais doit etre payee comme partout ailleurs.
  assert.match(
    src,
    /poseSa\(\s*NextResponse\.next\(\{\s*request:\s*\{\s*headers:\s*entetes\s*\}\s*\}\)\s*\)/,
    "la branche hors reecriture doit poser le cookie affilie",
  );
});

test("le blog anglais a du contenu, et les deux sommaires partagent leur corps", () => {
  // Un `hreflang` vers un sommaire vide ferait juger l'anglais sur une
  // page qui dit "rien pour le moment".
  assert.ok(listerArticles("en").length > 0, "aucun article anglais : le hreflang mentirait");

  // UN SEUL CORPS. Deux pages qui redessineraient chacune leur sommaire
  // divergeraient en une semaine, et c'est le defaut que ce depot paie
  // en boucle.
  for (const route of ["app/blog/page.tsx", "app/en/blog/page.tsx"]) {
    const src = sansCommentaires(lire(route));
    assert.match(src, /SommaireBlog/, `${route} doit passer par le corps partage`);
    assert.match(src, /metadonneesSommaire\(/, `${route} doit passer par les metadonnees partagees`);
  }
});

test("le sommaire anglais est canonique sur SON adresse, et les deux se citent", () => {
  const en = metadonneesSommaire("en");
  assert.equal(en.alternates?.canonical, "https://tiquiz.fr/en/blog");
  assert.equal(en.alternates?.languages?.en, "https://tiquiz.fr/en/blog");
  assert.equal(en.alternates?.languages?.fr, "https://tiquiz.fr/blog");
  assert.equal(en.alternates?.languages?.["x-default"], "https://tiquiz.fr/blog");

  const fr = metadonneesSommaire("fr");
  assert.equal(fr.alternates?.canonical, "https://tiquiz.fr/blog");
  assert.equal(fr.alternates?.languages?.en, "https://tiquiz.fr/en/blog");
});

test("TOUTE PAGE `/en/` PORTE LE CADRE DU SITE", () => {
  // MESURE DU 8 SEPTEMBRE, en servant les deux adresses :
  //
  //   /blog      -> <header> 1, <footer> 1
  //   /en/blog   -> <header> 0, <footer> 0
  //
  // `app/blog/layout.tsx` n'enveloppe QUE `/blog`. Un segment `/en/`
  // reel n'en herite pas, donc les quatre articles anglais sortaient
  // sans aucune sortie vers le reste du site, sans les liens LEGAUX du
  // pied de page, et sans le maillage interne dont ces pages ont
  // justement besoin pour ranker.
  //
  // Rien ne le disait : la page s'affiche parfaitement. C'est la meme
  // famille que le bloc figé du 5 septembre, ou le geste etait juste et
  // n'atteignait pas sa cible.
  //
  // ON REGARDE LA CHAINE DE LAYOUTS, jamais un fichier nomme : une
  // prochaine page `/en/<x>` posee ailleurs doit rougir ici, et c'est
  // exactement celle qu'on oublierait.
  const racineEn = path.join(RACINE, "app", "en");
  assert.ok(fs.existsSync(racineEn), "app/en doit exister");

  const pages: string[] = [];
  const parcourir = (dossier: string) => {
    for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) parcourir(p);
      else if (e.name === "page.tsx") pages.push(p);
    }
  };
  parcourir(racineEn);
  assert.ok(pages.length > 0, "aucune page /en/ : ce test serait muet");

  for (const page of pages) {
    // On remonte de dossier en dossier jusqu'a `app/en`, comme Next le
    // fait pour composer ses layouts.
    let dossier = path.dirname(page);
    let cadre = false;
    for (;;) {
      const layout = path.join(dossier, "layout.tsx");
      if (fs.existsSync(layout) && /SiteShell/.test(sansCommentaires(fs.readFileSync(layout, "utf8")))) {
        cadre = true;
        break;
      }
      if (path.resolve(dossier) === path.resolve(racineEn)) break;
      dossier = path.dirname(dossier);
    }
    assert.ok(
      cadre,
      `${path.relative(RACINE, page)} sort sans en-tete ni pied de page : aucun layout de sa chaine ne rend SiteShell`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────
// 5. LE CHROME MENE A LA VERSION ANGLAISE QUAND ELLE EXISTE
// ─────────────────────────────────────────────────────────────────────

test("le menu et le pied de page suivent la langue, mais SEULEMENT ou l'anglais existe", () => {
  // MESURE DU 8 SEPTEMBRE, sur `/en/blog` servi :
  //
  //   <a href="/tarifs">Tarifs</a>
  //   <a href="/blog">Blog</a>
  //
  // `/en/tarifs` existe, il est en anglais, il est dans le sitemap, et
  // AUCUN lien du site ne le citait. Une page qu'aucun lien ne designe
  // n'est atteinte par personne : un lecteur ne la trouve jamais, et un
  // robot ne la decouvre que par le sitemap, sans un seul lien interne
  // pour la peser.
  assert.equal(hrefPourLangue("/tarifs", "en"), "/en/tarifs");
  assert.equal(hrefPourLangue("/blog", "en"), "/en/blog");

  assert.equal(hrefPourLangue("/a-propos", "en"), "/en/a-propos");

  // ET ON NE PREFIXE QUE CE QUI EXISTE. Prefixer tout donnerait des
  // 404 dans le menu, sur toutes les pages a la fois.
  //
  // LA PREMISSE EST VERIFIEE, ET ELLE A DEJA BOUGE : ce test portait sur
  // `/integrations`, qui a recu sa version anglaise le 8 septembre. Sans
  // cette ligne il serait passe au vert en ne mesurant plus rien.
  for (const fixture of ["/affiliation", "/affiliation-atelier"]) {
    const page = PAGES_PUBLIQUES.find((p) => p.chemin === fixture);
    assert.ok(page, `${fixture} n'est plus dans PAGES_PUBLIQUES`);
    assert.ok(
      !languesDePage(page).includes("en"),
      `ce test repose sur le fait que ${fixture} n'a pas de version anglaise`,
    );
    assert.equal(hrefPourLangue(fixture, "en"), fixture);
  }

  // UN SLUG D'ARTICLE NE SE TRADUIT PAS PAR UN PREFIXE : l'anglais de
  // `17-raisons-lancer-quiz-business` s'appelle `17-reasons-...`, donc
  // `/en/blog/<slug francais>` est un 404.
  assert.equal(hrefPourLangue("/blog/17-raisons-lancer-quiz-business", "en"), "/blog/17-raisons-lancer-quiz-business");

  // Le francais et les liens sortants ne bougent jamais.
  for (const href of ["/tarifs", "/blog", "/a-propos"]) {
    assert.equal(hrefPourLangue(href, LANGUE_SANS_PREFIXE), href);
  }
  assert.equal(
    hrefPourLangue("https://affiliate.tipote.com/signup", "en"),
    "https://affiliate.tipote.com/signup",
  );
});

test("aucun lien du chrome ne peut mener a une adresse `/en/` qui n'existe pas", () => {
  // LE SENS DE L'ERREUR : un chemin oublie laisse un lien vers le
  // francais, ce qui est le comportement d'aujourd'hui. Un chemin
  // declare a tort donne un 404 dans le menu, sur toutes les pages a la
  // fois, et il ne se voit qu'en cliquant.
  const tous = [CTA_MENU, ...MENU, ...PIED.flatMap((c) => c.liens)];
  assert.ok(tous.length > 10, "le chrome est vide : ce test serait muet");

  let prefixes = 0;
  for (const l of tous) {
    const en = hrefPourLangue(l.href, "en");
    if (en === l.href) continue;
    prefixes += 1;

    // Deux facons d'exister, et une seule suffit :
    //   - la page DECLARE l'anglais, donc le middleware reecrit
    //     `/en/<chemin>` vers elle ;
    //   - un vrai segment `app/en/<chemin>/page.tsx` existe sur disque.
    const declaree = PAGES_PUBLIQUES.some(
      (p) => p.chemin === l.href && languesDePage(p).includes("en"),
    );
    const surDisque = fs.existsSync(path.join(RACINE, "app", en.replace(/^\//, ""), "page.tsx"));
    assert.ok(
      declaree || surDisque,
      `${l.libelle} mene a ${en}, qui n'existe ni comme page declaree en anglais ni comme route app/en/`,
    );
  }

  assert.ok(prefixes > 0, "aucun lien ne bascule en anglais : le chrome ne peut plus fermer l'orphelin");
});

test("aucun appelant de SiteShell n'omet sa langue", () => {
  // LA LANGUE NE SE DEVINE PAS, ET C'EST POUR CA QU'ELLE EST UNE PROP
  // OBLIGATOIRE : `/en/blog` est prerendu au BUILD (aucune requete,
  // donc aucun en-tete a lire) et `/en/tarifs` passe par la reecriture
  // du middleware. Un composant qui lirait l'en-tete lui meme rendrait
  // le premier faux et le second dynamique.
  //
  // `tsc` refuse deja un appel sans la prop. Ce test tient l'autre
  // moitie : qu'il y ait ENCORE des appelants. Un test qui ne peut plus
  // echouer ment.
  const appelants: string[] = [];
  const parcourir = (dossier: string) => {
    for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) parcourir(p);
      else if (/\.tsx$/.test(e.name) && /<SiteShell/.test(fs.readFileSync(p, "utf8"))) appelants.push(p);
    }
  };
  parcourir(path.join(RACINE, "app"));
  assert.ok(appelants.length >= 4, `seulement ${appelants.length} appelant(s) de SiteShell : ce test serait muet`);

  for (const f of appelants) {
    const src = sansCommentaires(fs.readFileSync(f, "utf8"));
    for (const appel of src.match(/<SiteShell[^>]*>/g) ?? []) {
      assert.match(
        appel,
        /langue=/,
        `${path.relative(RACINE, f)} rend SiteShell sans dire sa langue`,
      );
    }
  }
});

/**
 * Le chemin d'URL `chemin` est-il servi par une page de ce groupe de
 * routes ?
 *
 * On DESCEND segment par segment au lieu de coller le chemin entier :
 * un segment dynamique (`[slug]`) ne porte pas le nom qu'on cherche, et
 * un `existsSync` sur le chemin complet repond alors "non" sur une page
 * qui existe et qui repond.
 */
function servieParLeGroupe(groupe: string, chemin: string): boolean {
  let dossier = path.join(RACINE, "app", groupe);
  for (const segment of chemin.split("/").filter(Boolean)) {
    if (fs.existsSync(path.join(dossier, segment))) {
      dossier = path.join(dossier, segment);
      continue;
    }
    const dynamique = fs.existsSync(dossier)
      ? fs.readdirSync(dossier, { withFileTypes: true })
          .filter((e) => e.isDirectory() && /^\[.+\]$/.test(e.name))
          .map((e) => e.name)
      : [];
    if (dynamique.length !== 1) return false;
    dossier = path.join(dossier, dynamique[0]);
  }
  return fs.existsSync(path.join(dossier, "page.tsx"));
}

test("le groupe (site) reste STATIQUE : aucune lecture d'en-tete dans son layout", () => {
  // MESURE DU 8 SEPTEMBRE : 8 des 9 pages de `app/(site)/` n'appellent
  // aucune API dynamique, donc elles sont prerendues au build. Un
  // `headers()` pose dans leur layout commun les rendrait TOUTES
  // dynamiques, sur les pages qui commencent justement a ranker, et
  // pour une langue qu'elles n'ont pas.
  //
  // `/tarifs` est le seul chemin de ce site a exister en anglais : il
  // vit donc dans son propre groupe, `app/(site-langues)/`, qui lui a
  // le droit de lire l'en-tete. Les deux groupes rendent le MEME
  // `SiteShell`, donc il n'y a pas deux chromes a tenir d'accord.
  const site = sansCommentaires(lire("app/(site)/layout.tsx"));
  assert.doesNotMatch(site, /headers\(\)|langueCanonique/, "app/(site)/layout.tsx rendrait tout le groupe dynamique");

  const langues = sansCommentaires(lire("app/(site-langues)/layout.tsx"));
  assert.match(langues, /langueCanonique\(\)/, "le groupe multilingue doit lire la langue de l'ADRESSE");

  // Et les pages multilingues vivent bien la bas, jamais dans `(site)`.
  //
  // ON RESOUT LE CHEMIN SEGMENT PAR SEGMENT, PARCE QU'UNE ROUTE PEUT
  // ETRE DYNAMIQUE : `/fonctionnalites/generation-ia` est servi par
  // `fonctionnalites/[slug]/page.tsx`, et un `path.join` du chemin
  // complet ne le trouve jamais. Le test rougissait donc sur un
  // rangement parfaitement correct.
  for (const p of PAGES_PUBLIQUES) {
    if (!languesDePage(p).includes("en")) continue;
    const dansLangues = servieParLeGroupe("(site-langues)", p.chemin);
    const dansSite = servieParLeGroupe("(site)", p.chemin);
    assert.ok(!dansSite, `${p.chemin} existe en anglais : son chrome ne peut pas etre celui du groupe statique`);
    assert.ok(dansLangues, `${p.chemin} existe en anglais mais n'est pas dans app/(site-langues)/`);
  }
});
