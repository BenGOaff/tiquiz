// tests/logic/blog-en.test.mts
//
// LES QUATRE ARTICLES ANGLAIS NE REPUBLIENT PAS CE QU'ON A CORRIGE EN
// FRANCAIS.
//
// Bene, 8 septembre 2026 : "on doit les recuperer sur le blog tiquiz.fr
// avec les articles et pages en anglais. Mais il faut que ce soit bien
// fait."
//
// -- CE QUE CE FILET TIENT, ET POURQUOI --------------------------------
//
// Ses quatre articles anglais viennent de `tipote.blog`, ecrits avant le
// 6 aout. Ils portent donc TOUT ce que le francais a paye les 31 aout et
// 1er septembre : l'ancien tarif, la vente beta a vie qui n'existe plus,
// "no threshold", "paid on the 10th", 40 % ecrit comme un plafond, et
// une section entiere sur Tipote qui n'est pas en vente.
//
// Les publier tels quels, ce serait republier en anglais exactement ce
// qu'on vient de corriger en francais, sur les deux pages qui vendent et
// qui recrutent les affilies.
//
// -- IL APPELLE LA MEME FONCTION QUE LE SCRIPT -------------------------
//
// C'est la mecanique de `blog.test.mts` depuis le 31 aout : le contenu
// est propre quand la reparation ne change plus rien. Un test qui
// relirait sa propre liste de chaines finirait par ne plus dire la meme
// chose que le script, et c'est le controle qui mentirait le premier.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  FAITS_EN,
  INTERDITS_EN,
  LIENS_EN,
  ponctuationAnglaise,
  QUESTIONS_RETIREES_EN,
  retirerTirets,
  SECTION_TIPOTE,
  TEXTES_DE_LIEN_EN,
} from "@/lib/blog/faitsEn";

const DOSSIER = path.join(process.cwd(), "content", "blog", "en");

function articles(): { nom: string; brut: string; objet: any }[] {
  return fs
    .readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((nom) => {
      const brut = fs.readFileSync(path.join(DOSSIER, nom), "utf8");
      return { nom, brut, objet: JSON.parse(brut) };
    });
}

// LE TEST NE FIGE PAS LE NOMBRE D'ARTICLES, ET C'EST UNE CORRECTION
// DU 8 SEPTEMBRE AU SOIR.
//
// Il exigeait `tous.length === 4`, le compte du jour ou les quatre
// articles avaient ete importes. Le jour ou les six traductions
// ecrites a la main sont arrivees, il est sorti ROUGE sur un travail
// juste : **un garde-fou qui fige l'etat du jour empeche de finir le
// travail** (la meme faute que les tests qui figeaient un chemin de
// disque ou une formulation).
//
// Ce qui compte n'est pas COMBIEN il y en a, c'est que chacun
// s'apparie avec un article francais qui existe, et qu'aucun francais
// ne soit reclame par deux anglais. Le plancher garde le test d'une
// autre panne : un dossier vide le rendrait muet.
test("chaque article anglais s'apparie avec un article francais qui existe", () => {
  const tous = articles();
  assert.ok(tous.length >= 4, "le dossier anglais n'est pas vide");
  const reclames = new Map<string, string>();
  for (const { nom, objet } of tous) {
    assert.equal(objet.langue, "en", `${nom} declare sa langue`);
    // L'APPARIEMENT EST ECRIT, JAMAIS DEVINE. Les slugs anglais ne
    // ressemblent pas aux francais ("create-quiz-systeme-io" contre
    // "comment-creer-quiz-systeme-io") : les rapprocher par
    // ressemblance donnerait un `hreflang` qui apparie deux articles
    // differents, et Google le croirait.
    assert.ok(objet.traductionDe, `${nom} dit de quel article francais il est la version`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "content", "blog", `${objet.traductionDe}.json`)),
      `${nom} : l'article francais ${objet.traductionDe} existe`,
    );
    // DEUX ANGLAIS QUI RECLAMENT LE MEME FRANCAIS DONNERAIENT DEUX
    // `hreflang` CONTRADICTOIRES sur la meme page francaise, et Google
    // en choisirait un.
    const deja = reclames.get(objet.traductionDe);
    assert.equal(deja, undefined, `${objet.traductionDe} est deja la source de ${deja}`);
    reclames.set(objet.traductionDe, nom);
  }
});

test("rien de ce qui a ete corrige en francais ne survit en anglais", () => {
  for (const { nom, brut } of articles()) {
    for (const i of INTERDITS_EN) {
      const m = brut.match(i.motif);
      assert.equal(m, null, `${nom} porte encore "${m?.[0]}" : ${i.pourquoi}`);
    }
  }
});

test("la reparation ne change plus rien : le contenu est deja d'aplomb", () => {
  // On rejoue exactement ce que le script applique a une chaine. S'il
  // reste quelque chose a corriger, c'est que le contenu deploye n'est
  // pas celui que la table produit.
  const corriger = (t: string): string => {
    let s = t.replace(/<a href="http:\/\/Systeme\.io"[^>]*>([\s\S]*?)<\/a>/g, (_, d) => d);
    for (const l of LIENS_EN) s = s.split(l.de).join(l.vers);
    for (const l of TEXTES_DE_LIEN_EN) s = s.split(l.de).join(l.vers);
    for (const f of FAITS_EN) s = s.split(f.de).join(f.vers);
    return ponctuationAnglaise(retirerTirets(s));
  };
  for (const { nom, objet } of articles()) {
    const champs: string[] = [objet.titre, objet.description, ...(objet.motsCles ?? [])];
    for (const b of objet.blocs) {
      if (b.type === "html") champs.push(b.html);
      else if (b.type === "titre") champs.push(b.texte);
      else if (b.type === "image") champs.push(b.alt ?? "");
      else if (b.type === "cta") champs.push(b.texte, b.url);
      else if (b.type === "faq")
        for (const q of b.questions) champs.push(q.question, q.reponse);
    }
    for (const c of champs) {
      assert.equal(corriger(c), c, `${nom} : la reparation change encore "${c.slice(0, 90)}"`);
    }
  }
});

test("la section sur Tipote est remplacee, pas laissee en place", () => {
  const rente = articles().find((a) => a.nom.startsWith("monthly-recurring"));
  assert.ok(rente, "l'article d'affiliation est la");
  const titres = rente.objet.blocs.filter((b: any) => b.type === "titre").map((b: any) => b.texte);
  assert.ok(
    !titres.includes(SECTION_TIPOTE.ouvre),
    "le titre qui ouvrait la section Tipote a disparu",
  );
  assert.ok(titres.includes(SECTION_TIPOTE.ferme), "la section suivante est toujours la");
  // Ce qui remplace parle de l'Atelier du Quiz, qui est VENDU.
  assert.ok(
    JSON.stringify(rente.objet).includes("Atelier du Quiz"),
    "le remplacement parle de l'Atelier du Quiz, pas d'un produit qui n'est pas en vente",
  );
});

test("les questions de FAQ retirees ne reviennent pas", () => {
  const toutes = new Set<string>();
  for (const { objet } of articles())
    for (const b of objet.blocs)
      if (b.type === "faq") for (const q of b.questions) toutes.add(q.question);
  for (const r of QUESTIONS_RETIREES_EN) {
    assert.ok(!toutes.has(r.question), `la question retiree est revenue : ${r.pourquoi}`);
  }
});

test("la ponctuation est ANGLAISE, pas francaise", () => {
  // Bene, 8 septembre : "il faut a chaque fois utiliser le champ
  // semantique, les expressions, tournures de phrases, ponctuation etc
  // .. propre a chaque langue, c'est pas uniquement du mot a mot."
  //
  // MESURE avant d'ecrire la regle : son anglais ecrit "40%" et "$9",
  // jamais "40 %" ni "9 USD". Les 27 espaces devant un pourcentage
  // etaient les MIENS, poses par la table de corrections.
  for (const { nom, brut } of articles()) {
    const pct = brut.match(/[0-9}][  ]%/g) ?? [];
    assert.equal(pct.length, 0, `${nom} : ${pct.length} espace(s) devant un %`);
    const pon = brut.match(/[A-Za-z0-9][  ][:;!?]/g) ?? [];
    assert.equal(pon.length, 0, `${nom} : ${pon.length} espace(s) devant une ponctuation`);
    assert.equal((brut.match(/[0-9] EUR/g) ?? []).length, 0, `${nom} : un montant ecrit "N EUR"`);
    assert.equal((brut.match(/[—–]/g) ?? []).length, 0, `${nom} : un tiret cadratin`);
  }
});

test("ponctuationAnglaise ne touche a rien de technique, et elle est un point fixe", () => {
  // RETIRER une espace est aussi dangereux que d'en inserer (lecon du
  // 3 aout) : ces six chaines ne doivent pas bouger d'un caractere.
  for (const t of [
    "https://tiquiz.fr/signup",
    '<span style="color:red">x</span>',
    "12:30",
    "&nbsp;",
    "a?b=1",
    "Read this: it works",
  ]) {
    assert.equal(ponctuationAnglaise(t), t, `intouchable : ${t}`);
  }
  assert.equal(ponctuationAnglaise("And now ?"), "And now?");
  assert.equal(ponctuationAnglaise("three options : yes"), "three options: yes");
  // IDEMPOTENTE : sans ca le texte derive un peu plus a chaque passage,
  // et personne ne le voit avant que ce soit illisible.
  const une = ponctuationAnglaise("And now ? three options : yes");
  assert.equal(ponctuationAnglaise(une), une);
});

test("aucun prix de concurrent n'est recopie a la main", () => {
  // Les montants Typeform et Zapier viennent de `liensIntegrations.ts`,
  // la MEME source que le francais depuis le 1er septembre. Son anglais
  // annonçait "$59/month" et "$88/month", perimes : un chiffre recopie
  // est un chiffre faux au prochain changement, et il vit ici a
  // l'endroit exact ou un lecteur va verifier.
  const src = fs.readFileSync(path.join(process.cwd(), "lib", "blog", "faitsEn.ts"), "utf8");
  const sansCommentaires = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const vers = [...sansCommentaires.matchAll(/vers:\s*(`[\s\S]*?`|"[^"]*")/g)].map((m) => m[1]);
  for (const v of vers) {
    const m = v.match(/\$\d[\d.,]*\s*\/?\s*month/);
    assert.equal(m, null, `un prix mensuel est ecrit a la main : ${m?.[0]}`);
  }
  assert.ok(
    sansCommentaires.includes("TYPEFORM_PLUS_PAR_MOIS_USD") &&
      sansCommentaires.includes("ZAPIER_PRO_PAR_MOIS_USD"),
    "les deux prix sont LUS dans liensIntegrations.ts",
  );
});

test("chaque image anglaise est chez nous, et aucune ne manque", () => {
  const refs = new Set<string>();
  for (const { objet } of articles()) {
    if (objet.couverture) refs.add(objet.couverture);
    for (const b of objet.blocs)
      if (b.type === "image") {
        refs.add(b.src);
        if (b.mobile) refs.add(b.mobile);
      }
  }
  for (const r of refs) {
    // Hotlinker le CDN de Systeme.io tuerait tous les visuels le jour de
    // la resiliation (regle du 29 aout).
    assert.ok(r.startsWith("/blog/img/"), `image servie par nous : ${r}`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public", r)),
      `l'image existe sur le disque : ${r}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────
// LE SOMMAIRE ANGLAIS, ET LA LANGUE QUI NE SE DEVINE PAS
// ─────────────────────────────────────────────────────────────────────

test("le sommaire anglais est ECRIT depuis le contenu corrige", () => {
  const sommaire = JSON.parse(fs.readFileSync(path.join(DOSSIER, "index.json"), "utf8"));
  const tous = articles();
  assert.equal(sommaire.length, tous.length, "un article, une ligne de sommaire");

  const parSlug = new Map(tous.map((a) => [a.objet.slug, a.objet]));
  for (const ligne of sommaire) {
    const complet = parSlug.get(ligne.slug);
    assert.ok(complet, `le sommaire annonce ${ligne.slug}, qui existe sur le disque`);

    // LE SOMMAIRE NE PEUT PAS PORTER UN TITRE QUE L'ARTICLE NE PORTE
    // PLUS, et c'est tout l'interet de le faire ecrire par la
    // REPARATION plutot que par l'import : la reparation corrige
    // `titre` et `description`, et ce sont exactement les deux chaines
    // qui s'affichent sur la liste du blog et dans l'`og:description`
    // d'un partage. Ecrit a l'import, le sommaire republierait l'ancien
    // prix sur la page la plus visitee du blog.
    assert.equal(ligne.titre, complet.titre, `${ligne.slug} : meme titre des deux cotes`);
    assert.equal(
      ligne.description,
      complet.description,
      `${ligne.slug} : meme description des deux cotes`,
    );
    assert.equal(ligne.langue, "en", `${ligne.slug} declare sa langue dans le sommaire`);
    assert.equal(
      ligne.traductionDe,
      complet.traductionDe,
      `${ligne.slug} : l'appariement voyage avec le sommaire`,
    );
  }

  // Aucun interdit ne survit dans le sommaire non plus : c'est un
  // fichier a part, et un controle qui ne regarderait que les articles
  // laisserait passer une description fausse sur la page de liste.
  const brut = fs.readFileSync(path.join(DOSSIER, "index.json"), "utf8");
  for (const i of INTERDITS_EN) {
    const m = brut.match(i.motif);
    assert.equal(m, null, `le sommaire porte encore "${m?.[0]}" : ${i.pourquoi}`);
  }
});

test("la langue est un PARAMETRE de la lecture, jamais un defaut devine", async () => {
  const { listerArticles, lireArticle, tousLesSlugs, adressesDeLArticle } = await import(
    "@/lib/blog/articles"
  );

  // Les deux langues repondent, et elles ne se melangent pas.
  const fr = listerArticles("fr");
  const en = listerArticles("en");
  assert.ok(fr.length >= 10, "le blog francais repond");
  // ON NE FIGE PAS LE COMPTE : voir le premier test de ce fichier. Ce
  // qui se mesure, c'est que chaque anglais existe et s'apparie.
  assert.ok(en.length >= 4, "le blog anglais repond");
  const slugsFr = new Set(tousLesSlugs("fr"));
  for (const a of en) {
    assert.ok(!slugsFr.has(a.slug), `${a.slug} n'existe que du cote anglais`);
    // UN DEFAUT A "fr" SERVIRAIT DU FRANCAIS SOUS UNE ADRESSE ANGLAISE,
    // et la page s'afficherait parfaitement : c'est la forme de panne
    // que tout ce chantier existe pour empecher. Un slug anglais lu
    // dans le dossier francais doit donc rendre `null`, pas un article.
    assert.equal(lireArticle(a.slug, "fr"), null, `${a.slug} est introuvable en francais`);
    assert.ok(lireArticle(a.slug, "en"), `${a.slug} est lisible en anglais`);
  }

  // L'APPARIEMENT REND LES DEUX ADRESSES, DANS LES DEUX SENS.
  for (const a of en) {
    const complet = lireArticle(a.slug, "en")!;
    const depuisEn = adressesDeLArticle(a.slug, "en");
    const depuisFr = adressesDeLArticle(complet.traductionDe!, "fr");
    assert.deepEqual(depuisEn, depuisFr, `${a.slug} : la meme paire vue des deux cotes`);
    assert.equal(depuisEn.fr, `/blog/${complet.traductionDe}`);
    assert.equal(depuisEn.en, `/en/blog/${a.slug}`);
  }

  // ET UN ARTICLE FRANCAIS SANS VERSION ANGLAISE N'EN ANNONCE AUCUNE.
  //
  // Declarer une paire vers une page absente est pire que n'en
  // declarer aucune : Google la suit et tombe sur un 404.
  //
  // LA FIXTURE EST SYNTHETIQUE, ET C'EST UNE CORRECTION DU 8 SEPTEMBRE
  // AU SOIR. Le test exigeait `orphelins.length > 0`, c'est a dire
  // qu'il PRENAIT SA FIXTURE DANS LE CONTENU VIVANT : les six articles
  // francais qui n'avaient pas encore de traduction. Le jour ou les
  // dix ont eu la leur, il est sorti rouge sur un travail juste.
  // C'est la lecon de la fixture du chrome (8 septembre) : quand un
  // test mesure un COMPORTEMENT, la fixture doit etre inventee, pas
  // empruntee. Un slug que rien ne declare ne sera jamais traduit.
  assert.equal(
    adressesDeLArticle("cet-article-n-existe-pas-tq", "fr").en,
    undefined,
    "un article sans version anglaise n'en annonce aucune",
  );
  // Et sur les vrais orphelins tant qu'il en reste. Zero est
  // aujourd'hui le bon compte : les dix francais ont leur anglais.
  const traduits = new Set(
    en.map((a) => lireArticle(a.slug, "en")!.traductionDe),
  );
  for (const a of fr.filter((x) => !traduits.has(x.slug))) {
    assert.equal(
      adressesDeLArticle(a.slug, "fr").en,
      undefined,
      `${a.slug} n'annonce aucune version anglaise`,
    );
  }
});

test("CHAQUE IMAGE ANGLAISE PORTE UN TEXTE ALTERNATIF, EN ANGLAIS", () => {
  // MESURE DU 8 SEPTEMBRE, avant d'ecrire une ligne : **27 images sur
  // 27** arrivaient de `tipote.blog` avec un `alt` VIDE. C'est 100 %,
  // la ou le francais etait a 43 % le 31 aout.
  //
  // Un `alt` vide coute trois choses d'un coup, et aucune ne se voit a
  // l'ecran : une lectrice aveugle n'entend rien (ou s'entend epeler
  // "17-reasons-to-launch-business-quiz-4ce3c7f955"), Google ne sait
  // pas ce que le schema montre, et un modele de langue non plus. Ces
  // schemas portent l'essentiel de l'argumentaire.
  const dossier = path.join(process.cwd(), "content", "blog", "en");
  const sans: string[] = [];
  let vues = 0;
  for (const f of fs.readdirSync(dossier).filter((n) => n.endsWith(".json") && n !== "index.json")) {
    for (const b of JSON.parse(fs.readFileSync(path.join(dossier, f), "utf8")).blocs ?? []) {
      if (b?.type !== "image") continue;
      vues += 1;
      if (!String(b.alt ?? "").trim()) sans.push(`${f} ${b.src}`);
    }
  }
  // Sans ce compte, le test passerait au vert le jour ou plus aucune
  // image n'est servie : un test qui ne peut plus echouer ment.
  assert.ok(vues >= 20, `${vues} images seulement : le contenu a bouge, relis la table`);
  assert.deepEqual(sans, [], "images sans texte alternatif : relance npm run blog:reparer-en");
});

test("un `alt` anglais decrit ce qu'on voit, et il est ECRIT en anglais", async () => {
  const { ALT_IMAGES_EN } = await import("@/lib/blog/altImagesEn");
  const valeurs = Object.values(ALT_IMAGES_EN);
  assert.ok(valeurs.length >= 25, "la table s'est videe");

  for (const [src, alt] of Object.entries(ALT_IMAGES_EN)) {
    // Un lecteur d'ecran annonce DEJA que c'est une image.
    assert.ok(
      !/^(image|photo|screenshot|illustration) (of|showing)/i.test(alt),
      `${src} : commence par "image of"`,
    );
    assert.ok(alt.length >= 20, `${src} : trop court pour dire quelque chose`);
    // Au dela, un lecteur d'ecran coupe et Google tronque.
    assert.ok(alt.length <= 200, `${src} : ${alt.length} caracteres, c'est trop long`);
    assert.ok(!/[—–]/.test(alt), `${src} : tiret cadratin`);

    // ET IL EST EN ANGLAIS. C'est la raison d'etre de cette table :
    // deux chemins sont PARTAGES avec les articles francais, donc une
    // seule table poserait du francais dans une page anglaise, sur la
    // seule ligne qu'une lectrice aveugle anglophone entend. C'est le
    // reproche du client du 7 septembre, transpose au blog.
    assert.ok(
      !/\b(le|la|les|des|une|dans|avec|pour|sur|qui|sont|leur)\b/i.test(alt),
      `${src} : ce texte a l'air ecrit en francais`,
    );
    // La typographie anglaise ne pose pas d'espace devant une
    // ponctuation, et un pourcentage s'y colle (regle du 8 septembre).
    assert.ok(!/\s[?!:;%]/.test(alt), `${src} : espace devant une ponctuation`);
  }
});

test("les deux chemins PARTAGES avec le francais rendent deux textes differents", async () => {
  // LE CAS QUI JUSTIFIE LA DEUXIEME TABLE, et il est mesure :
  // `/blog/img/quiz-buzzfeed.webp` et `/blog/img/quiz-kerastase.webp`
  // vivent dans les DEUX corpus. Une table unique servirait le meme
  // texte aux deux langues, donc du francais dans une page anglaise.
  const { ALT_IMAGES } = await import("@/lib/blog/altImages");
  const { ALT_IMAGES_EN } = await import("@/lib/blog/altImagesEn");
  const partages = Object.keys(ALT_IMAGES_EN).filter((c) => c in ALT_IMAGES);
  assert.ok(partages.length > 0, "aucun chemin partage : ce test ne prouve plus rien");
  for (const c of partages) {
    assert.notEqual(ALT_IMAGES_EN[c], ALT_IMAGES[c], `${c} : les deux tables disent la meme chose`);
  }
});

test("`poserAltEn` GAGNE sur ce qu'elle nomme, et se tait sur le reste", async () => {
  const { poserAltEn, ALT_IMAGES_EN } = await import("@/lib/blog/altImagesEn");
  const [connu] = Object.keys(ALT_IMAGES_EN);

  const vide: { src: string; alt: string } = { src: connu, alt: "" };
  assert.equal(poserAltEn(vide), true);
  assert.equal(vide.alt, ALT_IMAGES_EN[connu]);

  // La table gagne sur un `alt` deja pose : c'est la correction du
  // 1er septembre cote francais, un texte herite de l'import ne doit
  // pas bloquer la correction.
  const mauvais: { src: string; alt: string } = { src: connu, alt: "tiquiz quiz" };
  assert.equal(poserAltEn(mauvais), true);
  assert.equal(mauvais.alt, ALT_IMAGES_EN[connu]);

  // Mais une image ABSENTE de la table garde le sien : on ne perd aucun
  // texte correct venu d'ailleurs.
  const inconnue: { src: string; alt: string } = {
    src: "/blog/img/en/pas-dans-la-table.webp",
    alt: "a text to keep",
  };
  assert.equal(poserAltEn(inconnue), false);
  assert.equal(inconnue.alt, "a text to keep");

  // Et une pose qui ne change rien rend `false` : sinon le script
  // compterait une correction a chaque passage, et son compteur ne
  // distinguerait plus "j'ai pose 27 alt" de "je n'ai rien fait".
  assert.equal(poserAltEn({ src: connu, alt: ALT_IMAGES_EN[connu] }), false);
});
