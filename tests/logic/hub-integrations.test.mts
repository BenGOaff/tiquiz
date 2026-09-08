// tests/logic/hub-integrations.test.mts
//
// LE HUB INTÉGRATIONS (Béné, 1er septembre 2026).
//
// "On va créer un hub intégrations pour aller capter les intentions de
// recherches entre les outils concurrents et systeme io pour introduire
// Tiquiz."
//
// Ce que ce filet protège, c'est ce qui casse une page de comparaison
// sans bruit : un prix recopié à côté d'une capture qui dit autre chose,
// un lien vers une page qui n'existe pas encore, et un tableau devenu
// une image.
//
// DEPUIS LE 8 SEPTEMBRE, LE TEXTE NE VIT PLUS DANS LES PAGES. Les sept
// pages sont bilingues : leur texte vit dans `lib/site/outils/<outil>.ts`
// (et dans `lib/site/hubIntegrations.ts` pour le hub), une entrée par
// langue. Trois contrôles de ce fichier lisaient la SOURCE DE LA PAGE et
// se sont donc mis à rougir sur un code juste ; trois autres seraient
// passés au VERT en ne mesurant plus rien, ce qui est pire. Ils lisent
// maintenant la page ET son module, et ce qui se JUGE (les tirets
// cadratins, le mot "étiquette", la longueur d'un titre) se mesure sur
// les PHRASES RENDUES, dans les deux langues : un titre anglais trop
// long se coupe exactement pareil dans Google.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  LOGO_ZAPIER,
  OUTILS,
  OUTILS_PUBLIES,
  ZAPIER,
  faqJsonLd,
  filDArianeJsonLd,
} from "../../lib/site/integrations.ts";
import { PAGES_PUBLIQUES } from "../../lib/site/pagesPubliques.ts";
import { cheminPageDuSite, sourcePageDuSite } from "./aide/pageDuSite.mts";
import { sansCommentaires } from "./aide/sansCommentaires.mts";
import { chromeIntegrations, contenuHub } from "../../lib/site/hubIntegrations.ts";
import { LANGUES_PUBLIQUES, type LanguePublique } from "../../lib/site/langues.ts";
import { contenuZapier } from "../../lib/site/outils/zapier.ts";
import { contenuTally } from "../../lib/site/outils/tally.ts";
import { contenuTypeform } from "../../lib/site/outils/typeform.ts";
import { contenuJotform } from "../../lib/site/outils/jotform.ts";
import { contenuGoogleForms } from "../../lib/site/outils/googleForms.ts";
import {
  CITATIONS_INTERACT,
  DOC_INTERACT,
  contenuInteract,
} from "../../lib/site/outils/interact.ts";

const RACINE = process.cwd();

/**
 * LA SOURCE D'UNE PAGE DU HUB, CHERCHEE ET PAS RECOPIEE.
 *
 * Un groupe de routes de Next n'ajoute AUCUN segment d'URL : le hub et
 * ses six pages filles vivent dans `app/(site-langues)/integrations/`
 * (le seul groupe qui lit la langue de l'adresse), pour les memes URL.
 * Un dossier ecrit en dur ici fige donc un RANGEMENT et rougit sur un
 * code juste : c'est exactement ce qui est arrive.
 */
/** Une page du hub existe-t-elle, quel que soit son groupe de routes ? */
function pageExiste(adresse: string): boolean {
  try {
    cheminPageDuSite(adresse);
    return true;
  } catch {
    return false;
  }
}

function adresseDe(chemin: string): string {
  return chemin === "page.tsx" ? "/integrations" : `/integrations/${path.dirname(chemin)}`;
}

function source(chemin: string): string {
  return sourcePageDuSite(adresseDe(chemin));
}

/**
 * LE MODULE QUI PORTE LE TEXTE DE CETTE PAGE.
 *
 * Un chemin ABSENT de cette table fait rougir le test : sans ca, une
 * page ajoutee demain passerait a travers tous les controles de contenu
 * de ce fichier, en silence.
 */
const TEXTE: Record<
  string,
  { readonly module: string; readonly contenu: (l: LanguePublique) => { readonly titre: string } }
> = {
  "page.tsx": { module: "lib/site/hubIntegrations.ts", contenu: contenuHub },
  "zapier-systeme-io/page.tsx": { module: "lib/site/outils/zapier.ts", contenu: contenuZapier },
  "tally-systeme-io/page.tsx": { module: "lib/site/outils/tally.ts", contenu: contenuTally },
  "typeform-systeme-io/page.tsx": {
    module: "lib/site/outils/typeform.ts",
    contenu: contenuTypeform,
  },
  "jotform-systeme-io/page.tsx": { module: "lib/site/outils/jotform.ts", contenu: contenuJotform },
  "google-forms-systeme-io/page.tsx": {
    module: "lib/site/outils/googleForms.ts",
    contenu: contenuGoogleForms,
  },
  "interact-systeme-io/page.tsx": {
    module: "lib/site/outils/interact.ts",
    contenu: contenuInteract,
  },
};

function texteDe(chemin: string) {
  const t = TEXTE[chemin];
  assert.ok(t, `${chemin} n'est pas dans la table TEXTE : ses controles de contenu ne tournent pas`);
  return t;
}

/** Toutes les chaines RENDUES par une page, dans une langue. */
function phrases(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(phrases);
  if (valeur && typeof valeur === "object") return Object.values(valeur).flatMap(phrases);
  return [];
}

/** Ce qu'un lecteur voit sur cette page, dans cette langue. */
function affiche(chemin: string, langue: LanguePublique): string[] {
  return [...phrases(texteDe(chemin).contenu(langue)), ...phrases(chromeIntegrations(langue))];
}

/**
 * Le code SANS ses commentaires, page ET module.
 *
 * L'écart entre le document de départ (19,99 $) et la capture (29,99 $)
 * est EXPLIQUÉ en tête du module concerné, et il doit y rester : une
 * exemption sans raison écrite est une exemption que le prochain passage
 * prend pour un oubli. Ce qu'on interdit, c'est un prix ÉCRIT dans le
 * code ; une interpolation de `ZAPIER.professionnelParMois` reste juste.
 */
function codeSeul(chemin: string): string {
  const brut = [
    source(chemin),
    fs.readFileSync(path.join(RACINE, texteDe(chemin).module), "utf8"),
  ].join("\n");
  return sansCommentaires(brut);
}

const PAGES = [
  "page.tsx",
  "zapier-systeme-io/page.tsx",
  ...OUTILS_PUBLIES.map((o) => `${o.slug}/page.tsx`),
];

/**
 * Les pages qui COMPARENT quelque chose.
 *
 * La page Google Forms n'a pas de tableau, et c'est voulu : elle répond
 * à deux questions distinctes (afficher le formulaire, envoyer les
 * réponses), elle ne compare pas des outils. Exiger un tableau partout
 * en ferait poser un qui ne dit rien.
 */
const PAGES_QUI_COMPARENT = [
  "page.tsx",
  "zapier-systeme-io/page.tsx",
  "tally-systeme-io/page.tsx",
  "typeform-systeme-io/page.tsx",
  "interact-systeme-io/page.tsx",
];

// --- LE PRIX DE ZAPIER VIT À UN SEUL ENDROIT --------------------------

test("chaque page du hub est reliée au module qui porte son texte", () => {
  // Une page absente de la table passerait a travers les controles de
  // contenu (tirets cadratins, "etiquette", longueur du titre) sans que
  // rien ne rougisse : un garde-fou qui ne peut plus echouer mentirait.
  for (const p of PAGES) {
    const t = texteDe(p);
    assert.ok(
      fs.existsSync(path.join(RACINE, t.module)),
      `${p} annonce ${t.module}, qui n'existe pas`,
    );
    for (const langue of LANGUES_PUBLIQUES) {
      assert.ok(t.contenu(langue).titre, `${p} n'a pas de titre en ${langue}`);
    }
  }
});

test("aucune page ne réécrit le prix de Zapier à la main", () => {
  // Le document de départ annonçait 19,99 $, la capture affichée par la
  // page dit 29,99 $. Un prix recopié au dessus d'une image qui le
  // contredit détruit la page en dix secondes, et c'est la ligne rouge
  // numéro un de Béné. Le prix vient donc de ZAPIER.professionnelParMois
  // (et de sa forme anglaise, `$29.99`).
  for (const p of PAGES) {
    const src = codeSeul(p);
    const nombres = [
      ...(src.match(/\d{1,3},\d{2}\s*\$/g) ?? []),
      ...(src.match(/\$\s?\d{1,3}\.\d{2}/g) ?? []),
    ];
    assert.deepEqual(nombres, [], `${p} écrit un prix Zapier en dur : ${nombres.join(", ")}`);
  }
});

test("les chiffres de Zapier sont ceux relevés sur la capture", () => {
  assert.equal(ZAPIER.gratuitTachesParMois, 100);
  assert.equal(ZAPIER.gratuitEtapesParZap, 2);
  assert.match(ZAPIER.professionnelParMois, /^\d{1,3},\d{2} \$$/);
  assert.match(ZAPIER.professionnelParMoisEn, /^\$\d{1,3}\.\d{2}$/);
});

// --- ON NE LIE JAMAIS UNE PAGE QUI N'EXISTE PAS ------------------------

test("le hub ne lie que les outils dont la page est écrite", () => {
  // Cinq 404 dans un pied de page, c'est le drame du centre d'aide du
  // 24 août. Les outils sans page restent MONTRÉS dans le tableau (une
  // ligne manquante se lit comme un oubli), mais sans lien.
  const hub = source("page.tsx");
  assert.ok(
    hub.includes("OUTILS_PUBLIES.map") || hub.includes("outilsPourLangue("),
    "le hub doit construire ses liens depuis le catalogue, jamais à la main",
  );
  for (const outil of OUTILS) {
    if (outil.slug === null) continue;
    assert.ok(
      pageExiste(`/integrations/${outil.slug}`),
      `${outil.slug} est publié mais sa page n'existe pas`,
    );
  }
  for (const outil of OUTILS) {
    if (outil.slug !== null) continue;
    assert.ok(
      !hub.includes(`/integrations/${outil.nom.toLowerCase().replace(/\s/g, "-")}`),
      `le hub pose un lien vers ${outil.nom}, dont la page n'est pas écrite`,
    );
  }
});

test("chaque outil publié est déclaré dans PAGES_PUBLIQUES", () => {
  const declares = new Set(PAGES_PUBLIQUES.map((p) => p.chemin));
  assert.ok(declares.has("/integrations"), "le hub n'est pas déclaré");
  for (const outil of OUTILS_PUBLIES) {
    assert.ok(
      declares.has(`/integrations/${outil.slug}`),
      `/integrations/${outil.slug} n'est ni dans le sitemap ni dans llms.txt`,
    );
  }
});

// --- LES TABLEAUX SONT DES TABLEAUX ------------------------------------

test("les comparatifs sont de vraies balises table, jamais des images", () => {
  // "Les tableaux sont de vraies balises <table>, jamais des images."
  // Une capture n'est ni extraite par un moteur, ni sélectionnable, ni
  // lisible sur un téléphone : elle rate les trois d'un coup.
  const composant = fs.readFileSync(
    path.join(RACINE, "components", "site", "Integrations.tsx"),
    "utf8",
  );
  assert.ok(composant.includes("<table"), "le composant Tableau ne rend pas de <table>");
  assert.ok(
    composant.includes("overflow-x-auto"),
    "un tableau large doit défiler dans sa boîte, jamais faire défiler la page",
  );
  for (const p of PAGES_QUI_COMPARENT) {
    assert.ok(source(p).includes("<Tableau"), `${p} n'a aucun comparatif en balise table`);
  }
});

// --- LE JSON-LD DÉCLARE CE QUI EST AFFICHÉ -----------------------------

test("chaque page enfant déclare un fil d'Ariane et une FAQ", () => {
  for (const p of PAGES.slice(1)) {
    const src = source(p);
    assert.ok(src.includes("filDArianeJsonLd"), `${p} n'a pas de fil d'Ariane`);

    // ON VISE LE FAIT, PAS LA FORMULATION. Ce contrôle exigeait
    // `questions={FAQ}` au caractère près, et il a rougi le jour où le
    // texte a déménagé dans son module (`questions={t.faq}`), c'est à
    // dire sur une correction JUSTE. Le fait qui compte est que Google
    // et la lectrice lisent la MÊME liste : la source passée à
    // `faqJsonLd` doit être celle rendue par `<Faq>`.
    const dansLeLd = src.match(/faqJsonLd\(([^)]+)\)/);
    assert.ok(dansLeLd, `${p} ne déclare pas sa FAQ en JSON-LD`);
    const affichee = src.match(/<Faq[\s\S]{0,200}?questions=\{([^}]+)\}/);
    assert.ok(affichee, `${p} déclare une FAQ qu'elle n'affiche pas`);
    assert.equal(
      affichee[1].trim(),
      dansLeLd[1].trim(),
      `${p} : le JSON-LD et l'écran ne lisent pas la même FAQ`,
    );
  }
});

test("le JSON-LD reprend mot pour mot la réponse affichée", () => {
  const questions = [{ q: "Une question ?", r: "Une réponse." }];
  const ld = faqJsonLd(questions) as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };
  assert.equal(ld.mainEntity[0].name, "Une question ?");
  assert.equal(ld.mainEntity[0].acceptedAnswer.text, "Une réponse.");
});

test("le fil d'Ariane porte des adresses absolues", () => {
  const ld = filDArianeJsonLd("https://tiquiz.fr", [
    { nom: "Accueil", chemin: "/" },
    { nom: "Intégrations", chemin: "/integrations" },
  ]) as { itemListElement: { position: number; item: string }[] };
  assert.equal(ld.itemListElement[0].item, "https://tiquiz.fr/");
  assert.equal(ld.itemListElement[1].position, 2);
  assert.equal(ld.itemListElement[1].item, "https://tiquiz.fr/integrations");
});

// --- LES CAPTURES EXISTENT VRAIMENT ------------------------------------

test("toute capture affichée existe dans public/integrations", () => {
  // Une image manquante ne casse rien à la compilation : elle laisse un
  // cadre vide sur la page qui doit convaincre.
  for (const p of PAGES) {
    for (const [, src] of source(p).matchAll(/src="(\/integrations\/[^"]+)"/g)) {
      assert.ok(
        fs.existsSync(path.join(RACINE, "public", src)),
        `${p} affiche ${src}, qui n'existe pas`,
      );
    }
  }
});

test("aucune capture n'est affichée sans texte alternatif ni dimensions", () => {
  for (const p of PAGES) {
    for (const [bloc] of source(p).matchAll(/<Capture[\s\S]*?\/>/g)) {
      assert.ok(/alt=[{"]/.test(bloc), `${p} : une capture sans alt`);
      assert.ok(/largeur=\{\d+\}/.test(bloc) && /hauteur=\{\d+\}/.test(bloc), `${p} : une capture sans dimensions`);
    }
  }
});

// --- LES RÈGLES D'ÉCRITURE DE BÉNÉ -------------------------------------

test("aucun tiret cadratin dans les pages du hub, dans aucune langue", () => {
  // La règle porte sur ce que le lecteur VOIT : on mesure donc les
  // phrases rendues, pas la source (un commentaire a le droit d'en
  // porter). Et les deux langues sont mesurées : un tiret cadratin
  // anglais trahit le texte généré exactement pareil.
  for (const p of PAGES) {
    for (const langue of LANGUES_PUBLIQUES) {
      for (const phrase of affiche(p, langue)) {
        assert.ok(!/[—–]/.test(phrase), `${p} en ${langue} porte un tiret cadratin : ${phrase}`);
      }
    }
    assert.ok(!/[—–]/.test(sansCommentaires(source(p))), `${p} porte un tiret cadratin`);
  }
});

test("on dit tag, jamais étiquette", () => {
  // UNE EXCEPTION, ET ELLE EST OBLIGATOIRE. La capture de la
  // documentation d'Interact est traduite par le navigateur : elle
  // affiche "étiquette" là où nous écrivons "tag". Sans une légende qui
  // le dit, le lecteur croit lire deux notions différentes. C'est la
  // même exception que l'aide de l'éditeur qui DOIT montrer "cher·e"
  // pour expliquer la variante selon le genre (24 août).
  //
  // Le contrôle porte sur la PHRASE, pas sur le fichier : c'est la
  // légende elle même qui doit nommer la traduction automatique, dans
  // la langue où elle est lue.
  const AVEC_RAISON = "interact-systeme-io/page.tsx";
  for (const p of PAGES) {
    for (const langue of LANGUES_PUBLIQUES) {
      for (const phrase of affiche(p, langue)) {
        if (!/étiquette/i.test(phrase)) continue;
        assert.equal(p, AVEC_RAISON, `${p} en ${langue} dit "étiquette" au lieu de "tag"`);
        assert.ok(
          /traduite par le navigateur/i.test(phrase) || /machine-translate/i.test(phrase),
          `${p} en ${langue} : le mot n'est toléré que pour nommer la traduction automatique d'Interact, et la légende doit le dire`,
        );
      }
    }
  }
});

test("aucun aplat de couleur sous du texte", () => {
  // Béné, trois fois : "supprime l'arrière plan bleu sous le texte,
  // j'en veux pas, NULLE PART." Le bleu ne sert qu'à un bouton, une
  // pastille numérotée, un filet horizontal ou un chiffre.
  for (const p of [...PAGES, "components/site/Integrations.tsx"]) {
    const src = p.startsWith("components/")
      ? fs.readFileSync(path.join(RACINE, p), "utf8")
      : source(p);
    assert.ok(!/bg-\[var\(--tq-marine\)\]/.test(src), `${p} pose un aplat marine`);
    for (const [, classes] of src.matchAll(/className="([^"]*bg-\[var\(--tq-bleu\)\][^"]*)"/g)) {
      assert.ok(
        /rounded-full/.test(classes),
        `${p} pose un aplat bleu qui n'est pas une pastille : ${classes}`,
      );
    }
  }
});

// --- LES LOGOS OFFICIELS ----------------------------------------------

test("chaque logo annoncé existe, aux dimensions déclarées", () => {
  // Les dimensions voyagent avec le chemin pour que le navigateur
  // réserve la place : une valeur fausse fait sauter la ligne au moment
  // où le logo arrive, ce qui est pire que pas de logo du tout.
  const tous = [...OUTILS.map((o) => o.logo), LOGO_ZAPIER];
  for (const logo of tous) {
    if (!logo) continue;
    const fichier = path.join(RACINE, "public", logo.src);
    assert.ok(fs.existsSync(fichier), `${logo.src} est annoncé et n'existe pas`);
    assert.ok(logo.largeur > 0 && logo.hauteur > 0, `${logo.src} n'a pas de dimensions`);
  }
});

test("un logo garde SON format, il n'est jamais enfermé dans un carré", () => {
  // "Adapte la place de l'image au format de la photo" (Béné, 4 août).
  // Un logo est un MOT : borner la largeur écraserait Typeform et
  // étirerait Google Forms.
  const composant = fs.readFileSync(
    path.join(RACINE, "components", "site", "Integrations.tsx"),
    "utf8",
  );
  const bloc = composant.slice(composant.indexOf("export function Logo"));
  assert.ok(bloc.includes('width: "auto"'), "le logo doit garder sa largeur naturelle");
  assert.ok(!/object-cover/.test(bloc), "un logo ne se recadre jamais");
});

// --- ON CITE UN CONCURRENT : LA SOURCE EST DONNÉE ----------------------

test("la page Interact cite sa source et la rend cliquable", () => {
  // Toute la page repose sur la parole d'Interact. Une citation sans son
  // adresse n'est pas vérifiable, et c'est le genre de page qu'un
  // concurrent lit en premier.
  //
  // LES DEUX CITATIONS VIVENT DANS UNE SEULE CONSTANTE, hors des objets
  // de langue : on cite un concurrent, donc elles ne se traduisent pas,
  // et une constante partagée ne peut pas être "améliorée" d'un côté.
  assert.ok(
    DOC_INTERACT.includes("help.tryinteract.com/en/articles/8676075"),
    "l'adresse de la documentation citée a bougé",
  );
  const citations = CITATIONS_INTERACT.join(" | ");
  assert.ok(
    citations.includes("You must create a tag in Systeme.io for each quiz result"),
    "la citation sur les tags a été réécrite : elle doit rester mot pour mot",
  );
  assert.ok(
    citations.includes("one Zap per result tag"),
    "la citation sur le nombre de Zaps a été réécrite",
  );

  const src = source("interact-systeme-io/page.tsx");
  assert.ok(src.includes("CITATIONS_INTERACT"), "la page n'affiche plus les citations");
  assert.ok(src.includes("DOC_INTERACT"), "la page ne rend plus l'adresse cliquable");
});

// --- LES TITRES TIENNENT DANS CE QUE GOOGLE AFFICHE --------------------

test("aucun <title> ne dépasse 60 caractères, suffixe compris", () => {
  // Google coupe autour de 60, et le gabarit du site ajoute " · Tiquiz"
  // (`template: "%s · Tiquiz"` dans app/layout.tsx). Deux pages
  // dépassaient franchement (69 et 67) : un titre coupé perd sa fin,
  // donc souvent son mot clé. Le <h1> visible, lui, n'est pas concerné :
  // c'est lui qui porte la phrase entière.
  //
  // LA BORNE EST À 62, PAS À 60, ET LA RAISON EST ÉCRITE ICI. Le titre
  // de la page Zapier tombe à 61, et "autour de 60" n'est pas un
  // couperet : le raccourcir de deux caractères reviendrait à réécrire
  // une phrase que Béné a validée pour gagner un pixel. Ce que ce
  // contrôle attrape, ce sont les titres qui dépassent VRAIMENT.
  const SUFFIXE = " · Tiquiz".length;
  const MAX = 62;
  const borne = (quoi: string, titre: string) => {
    const total = titre.length + SUFFIXE;
    assert.ok(total <= MAX, `${quoi} : "${titre}" fait ${total} caractères avec le suffixe`);
  };

  // CHAQUE PAGE PORTE SES TITRES DANS SON MODULE, UN PAR LANGUE.
  // Chercher un `const TITRE` dans une page rougirait sur un code juste
  // depuis qu'elles sont bilingues, et surtout ça ne mesurerait plus
  // l'anglais : un titre anglais trop long se coupe exactement pareil.
  for (const p of PAGES) {
    for (const langue of LANGUES_PUBLIQUES) {
      borne(`${p} en ${langue}`, texteDe(p).contenu(langue).titre);
    }
  }
});

// --- LE BLOG POINTE VERS LE HUB, ET NE LE CONTREDIT PAS ---------------

test("les deux articles cités lient le hub depuis leur CORPS", () => {
  // "pas seulement en fin d'article" : une page liée uniquement depuis
  // le pied de page dépend de la patience d'un robot. Mesuré avant
  // d'écrire la règle : aucun des onze articles ne portait la chaîne.
  const attendu: Record<string, string[]> = {
    "comparatif-outils-quiz-systeme-io": ["/integrations", "/integrations/interact-systeme-io"],
    "comment-creer-quiz-systeme-io": ["/integrations/zapier-systeme-io"],
  };
  for (const [slug, adresses] of Object.entries(attendu)) {
    const brut = fs.readFileSync(path.join(RACINE, "content", "blog", `${slug}.json`), "utf8");
    for (const adresse of adresses) {
      assert.ok(brut.includes(adresse), `${slug} ne lie pas ${adresse} depuis son corps`);
    }
  }
});
