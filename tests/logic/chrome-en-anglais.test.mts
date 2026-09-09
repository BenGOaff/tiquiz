// tests/logic/chrome-en-anglais.test.mts
//
// LE CHROME DU SITE SUIT LA LANGUE DE LA PAGE, SANS RIEN PROMETTRE DE
// FAUX (8 septembre 2026).
//
// CE QUI A ETE MESURE, sur le serveur, avant d'ecrire une ligne :
// `/en/generateur-de-quiz` et les quatre articles anglais du blog
// rendaient leur contenu en anglais et leur menu en francais
// (« Fonctionnalites Tarifs Blog L'Atelier du Quiz Affiliation A propos
// Aide Se connecter Creer un compte gratuit »), avec le pied de page
// entier en francais dessous. C'est le reproche du client anglophone du
// 7 septembre, transpose au site public, et il tombe exactement sur les
// pages ou atterrissent les lecteurs qu'on veut recuperer de
// `tipote.blog`.
//
// LA REGLE QUE CE FICHIER TIENT, et c'est un compromis assume :
//
//   un libelle passe en anglais UNIQUEMENT quand la page derriere est
//   vraiment lisible en anglais. Un libelle reste francais est donc une
//   INFORMATION, pas un oubli : il dit que la page derriere est
//   francaise.
//
// Traduire une entree d'un coup promettrait de l'anglais derriere le
// clic. C'est un mensonge, pas une commodite, et c'est l'interdit
// numero un de Bene.
//
// AU 8 SEPTEMBRE AU SOIR, toutes les pages INTERNES du menu portent
// leur `en` : la regle ne retire donc plus rien aujourd'hui, elle
// protege la prochaine page ajoutee sans sa traduction.
//
// Verifie en rejouant TROIS versions fautives (un `en` pose sur une
// page sans version anglaise, le pied revenu a `l.libelle`, une adresse
// d'`APP_MULTILANGUE` prefixee en `/en/signup`) : les trois rougissent.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MENU,
  PIED,
  CTA_MENU,
  LIEN_CONNEXION,
  CHROME_SITE,
  hrefPourLangue,
  libellePourLangue,
  titrePourLangue,
  estLienExterne,
  type LienSite,
} from "@/lib/site/nav";
import { LANGUES_PUBLIQUES, type LanguePublique } from "@/lib/site/langues";
import { PAGES_PUBLIQUES, languesDePage } from "@/lib/site/pagesPubliques";
import { ADRESSES_LEGALES_FR } from "@/lib/site/adressesLegales";
import { motsDuBlog } from "@/lib/blog/motsDuBlog";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const RACINE = process.cwd();

/**
 * LA SOURCE LIT LE FICHIER SANS SES COMMENTAIRES.
 *
 * Un test qui mesure la presence ou l'ORDRE de quelque chose dans un
 * fichier tombe sinon sur sa propre explication : c'est arrive trois
 * fois dans ce depot (le 3 septembre sur `offres-par-profil`, le
 * 2 septembre sur la reprise de l'embed).
 */
function source(chemin: string): string {
  return readFileSync(join(RACINE, chemin), "utf8")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

/** Tous les liens du chrome, menu, pied, et les deux boutons. */
function tousLesLiens(): LienSite[] {
  return [...MENU, ...PIED.flatMap((c) => c.liens), CTA_MENU, LIEN_CONNEXION];
}

/** Les langues que le SITEMAP declare pour ce chemin. */
function languesDeclarees(href: string): readonly LanguePublique[] {
  const page = PAGES_PUBLIQUES.find((p) => p.chemin === href);
  return page ? languesDePage(page) : [];
}

describe("le chrome du site suit la langue de la page", () => {
  test("chaque libelle anglais mene VRAIMENT a une page anglaise", () => {
    // Le coeur de la regle. Un `en` qui ne sert nulle part est une
    // declaration MORTE : elle ne ment pas (la fonction la refuse) mais
    // le prochain passage la lirait comme une promesse tenue, et il
    // preterait a `libellePourLangue` un comportement qu'elle n'a pas.
    const morts: string[] = [];
    for (const l of tousLesLiens()) {
      if (!l.en) continue;
      if (libellePourLangue(l, "en") !== l.en) morts.push(l.href);
    }
    assert.deepEqual(
      morts,
      [],
      `ces liens declarent un libelle anglais que rien ne sert : ${morts.join(", ")}`,
    );
  });

  test("un `en` pose sur une page SANS version anglaise ne s'affiche jamais", () => {
    // Le sens de l'erreur : on ne peut pas mentir par inadvertance.
    //
    // -- LA FIXTURE EST SYNTHETIQUE, ET C'EST LA QUATRIEME REECRITURE --
    //
    // Ce test pointait vers une VRAIE page du site sans version
    // anglaise. Il en a use QUATRE : `/a-propos`, `/integrations`,
    // `/affiliation`, puis `/newsletter`, et les quatre ont fini
    // traduites. Sa ligne de premisse l'a sauve a chaque fois (sans
    // elle il serait passe au vert en ne mesurant plus rien), mais au
    // 8 septembre au soir il ne reste AUCUNE page interne francaise
    // seule : la fixture n'avait plus ou se poser.
    //
    // Elle est donc INVENTEE, et c'est ce qui la rend stable : un
    // chemin que rien ne declare ne peut pas etre traduit un jour. Le
    // test mesure le COMPORTEMENT de `libellePourLangue` (elle refuse
    // un `en` que rien ne sert), plus le fait qu'il mesure quelque
    // chose (la fixture est bien inconnue des trois sources).
    const inconnue = "/cette-page-n-existe-pas-tq";
    assert.deepEqual(
      languesDeclarees(inconnue),
      [],
      "la fixture doit rester inconnue du sitemap, sinon ce test ne mesure plus rien",
    );
    assert.equal(
      hrefPourLangue(inconnue, "en"),
      inconnue,
      "la fixture doit rester inconnue de la reecriture /en/",
    );
    const menteur: LienSite = { href: inconnue, libelle: "Une page", en: "A page" };
    assert.equal(libellePourLangue(menteur, "en"), "Une page");
  });

  test("une adresse servie par l'APP se traduit sans jamais etre prefixee", () => {
    // `/login` et `/signup` parlent deja sept langues (cookie,
    // `Accept-Language`, domaine), donc leur LIBELLE peut passer en
    // anglais. Mais il n'existe aucun `/en/signup` : prefixer leur
    // ADRESSE ferait un 404 dans le menu, sur toutes les pages a la
    // fois.
    for (const href of ["/login", "/signup"]) {
      assert.equal(hrefPourLangue(href, "en"), href, `${href} ne doit pas etre prefixe`);
    }
    assert.equal(libellePourLangue(LIEN_CONNEXION, "en"), "Sign in");
    assert.equal(libellePourLangue(CTA_MENU, "en"), "Create a free account");
  });

  test("un document legal se traduit sans etre prefixe", () => {
    // Meme mecanique : les six adresses francaises redirigent vers un
    // document servi par l'app, en 5 langues.
    const legal = PIED.flatMap((c) => c.liens).filter((l) =>
      Object.prototype.hasOwnProperty.call(ADRESSES_LEGALES_FR, l.href),
    );
    assert.ok(legal.length >= 6, "le pied doit encore porter les adresses legales francaises");
    for (const l of legal) {
      assert.equal(hrefPourLangue(l.href, "en"), l.href);
      if (l.en) assert.equal(libellePourLangue(l, "en"), l.en);
    }
  });

  test("le titre d'une colonne se traduit SANS condition", () => {
    // Ce n'est pas un lien : il ne promet aucune destination, il dit
    // seulement ce qu'il y a dessous.
    for (const colonne of PIED) {
      assert.equal(titrePourLangue(colonne, "fr"), colonne.titre);
      assert.equal(titrePourLangue(colonne, "en"), colonne.titreEn);
      assert.ok(colonne.titreEn.trim().length > 0, `${colonne.titre} n'a pas de titre anglais`);
    }
  });

  test("en francais, RIEN ne bouge", () => {
    // La garantie qui compte pour Bene : les adresses francaises
    // commencent a ranker, et le chrome francais est celui d'hier.
    for (const l of tousLesLiens()) {
      assert.equal(libellePourLangue(l, "fr"), l.libelle);
      assert.equal(hrefPourLangue(l.href, "fr"), l.href);
    }
  });

  test("un lien EXTERNE n'est jamais prefixe", () => {
    const externes = tousLesLiens().filter((l) => estLienExterne(l.href));
    assert.ok(externes.length > 0, "le chrome porte encore des liens sortants");
    for (const l of externes) assert.equal(hrefPourLangue(l.href, "en"), l.href);
  });

  test("les deux composants du chrome DELEGUENT, ils ne recopient rien", () => {
    // Un libelle recopie dans le JSX echappe a la table qui decide,
    // donc il reste francais sur une page anglaise sans que rien ne le
    // dise. C'est exactement ce que « Se connecter » ecrit en dur dans
    // `SiteHeader` faisait avant le 8 septembre.
    for (const chemin of ["components/site/SiteHeader.tsx", "components/site/SiteFooter.tsx"]) {
      const src = source(chemin);
      assert.ok(
        src.includes("libellePourLangue"),
        `${chemin} doit passer par libellePourLangue`,
      );
      assert.ok(src.includes("CHROME_SITE"), `${chemin} doit lire CHROME_SITE`);
      assert.ok(
        !/\{\s*l\.libelle\s*\}/.test(src),
        `${chemin} affiche encore l.libelle en dur`,
      );
      assert.ok(
        !/\{\s*colonne\.titre\s*\}(?!\s*\})/.test(src.replace(/key=\{colonne\.titre\}/g, "")),
        `${chemin} affiche encore colonne.titre en dur`,
      );
      assert.ok(
        !/Se connecter|Ouvrir le menu|Navigation principale|Fait en France/.test(src),
        `${chemin} porte encore une phrase francaise ecrite en dur`,
      );
    }
  });

  test("le chrome anglais n'a ni tiret cadratin ni typographie francaise", () => {
    // La regle du 7 juin (aucun em-dash user-visible) vaut dans toutes
    // les langues, et la ponctuation anglaise COLLE : c'est la faute
    // du 8 septembre sur le blog anglais, ou ma propre table posait
    // « 40 % » dans un texte anglais.
    const anglais = [
      ...Object.values(CHROME_SITE.en),
      ...tousLesLiens().map((l) => l.en ?? ""),
      ...PIED.map((c) => c.titreEn),
    ].filter(Boolean);
    assert.ok(anglais.length > 10, "le chrome anglais doit porter du texte");
    for (const phrase of anglais) {
      assert.ok(!/[—–]/.test(phrase), `tiret cadratin dans « ${phrase} »`);
      assert.ok(!/\d\s%/.test(phrase), `pourcentage detache dans « ${phrase} »`);
      assert.ok(!/\s[?!;](\s|$)/.test(phrase), `espace avant ponctuation dans « ${phrase} »`);
    }
  });

  test("aucune langue publique n'est oubliee dans CHROME_SITE", () => {
    // Une langue absente rendrait `undefined` sur chaque libelle
    // d'accessibilite : la page s'afficherait, et un lecteur d'ecran
    // n'entendrait rien.
    for (const langue of LANGUES_PUBLIQUES) {
      const t = CHROME_SITE[langue];
      assert.ok(t, `CHROME_SITE n'a pas la langue ${langue}`);
      for (const [cle, valeur] of Object.entries(t)) {
        assert.ok(valeur.trim().length > 0, `${langue}.${cle} est vide`);
      }
    }
    // Et les deux langues disent des choses DIFFERENTES : un copier
    // coller du francais dans l'objet anglais passerait tous les
    // controles ci dessus.
    assert.notEqual(CHROME_SITE.fr.navigation, CHROME_SITE.en.navigation);
    assert.notEqual(CHROME_SITE.fr.promesse, CHROME_SITE.en.promesse);
  });
});

// ── LE MEUBLE D'UN ARTICLE ANGLAIS ───────────────────────────────────
//
// Mesure du 8 septembre, en servant `/en/blog/case-study-jocelyne-adhd-quiz` :
// le menu et le pied de page etaient traduits, et TROIS composants
// d'article portaient encore leurs phrases en dur en francais. Un
// lecteur anglophone arrive de `tipote.blog` lisait donc "Copier le
// lien", "Ton avis sur cet article", "Ton prenom", et decouvrait le
// francais au moment exact ou il se trompait d'adresse email.
//
// C'est le reproche du client du 7 septembre ("some parts of the quiz
// UI were in French") sur les pages exactes ou on veut le recuperer.
//
// CE TEST VISE LE FAIT, PAS UNE FORMULATION : il exige que ces phrases
// ne soient plus ECRITES dans les composants, et que chacun DELEGUE a
// `mots.`. Si Bene reecrit une phrase dans `motsDuBlog`, il reste vert.
describe("le meuble d'un article ne parle plus francais en dur", () => {
  const MEUBLE: { fichier: string; phrases: string[] }[] = [
    {
      fichier: "components/site/BoutonCopier.tsx",
      phrases: ["Copier le lien", "Lien copié", "Copie refusée"],
    },
    {
      fichier: "components/site/PartageArticle.tsx",
      phrases: ["Partager sur"],
    },
    {
      fichier: "components/site/EncartCta.tsx",
      phrases: [
        "Un quiz qui tague tes leads",
        "Créer mon quiz gratuitement",
        "Voir ce que fait Tiquiz",
      ],
    },
    {
      fichier: "components/site/Commentaires.tsx",
      phrases: ['"Ton avis sur cet article"', '"1 commentaire"', "Personne n"],
    },
    {
      fichier: "components/site/FormulaireCommentaire.tsx",
      phrases: [
        "Laisser un commentaire",
        "Ton prénom",
        "Ton message",
        "jamais publié",
        "Envoyer",
        "Il manque ton prénom",
      ],
    },
    {
      fichier: "components/site/RailArticle.tsx",
      phrases: ["Dans cet article", "Sommaire de l'article"],
    },
  ];

  for (const { fichier, phrases } of MEUBLE) {
    test(`${fichier} ne porte plus ses phrases en dur`, () => {
      // Les commentaires de ces fichiers RACONTENT la panne, donc ils
      // citent les phrases : sans ce retrait, le test tomberait sur sa
      // propre explication. Les lignes `//` partent AVANT les blocs
      // `/* */` (un `//` peut contenir un `/*`).
      const src = sansCommentaires(
        readFileSync(join(process.cwd(), fichier), "utf8"),
      );
      for (const p of phrases) {
        assert.ok(!src.includes(p), `${fichier} : "${p}" est encore ecrit dans le composant`);
      }
      // ET IL LIT VRAIMENT LA TABLE.
      //
      // CE QUE CE CONTROLE PROUVE, ET CE QU'IL NE PROUVE PAS. Il
      // attrape le composant qui garderait son `import type` sans plus
      // rien lire ; il ne prouve PAS que chaque phrase atteint l'ecran.
      // Deux motifs plus stricts ont ete essayes et rejetes en les
      // rejouant : `{mots.` exige que l'interpolation COMMENCE par
      // `mots.`, donc il rougissait sur un ternaire parfaitement
      // correct (`{etat === "copie" ? mots.lienCopie : ...}`), et un
      // `mots.` unique passait au vert sur un composant dont tous les
      // affichages avaient ete vides. Ce qui garde vraiment le francais
      // dehors, c'est la liste de phrases juste au dessus.
      const lectures = (src.match(/\bmots\.[a-zA-Z]/g) ?? []).length;
      assert.ok(
        lectures >= 2,
        `${fichier} : il importe la table et n'y lit (presque) rien`,
      );
    });
  }

  test("les phrases du meuble existent dans les DEUX langues", () => {
    for (const langue of ["fr", "en"] as const) {
      const m = motsDuBlog(langue);
      const obligatoires = [
        m.partage.copie.copierLeLien, m.partage.copie.lienCopie, m.partage.copie.copieRatee,
        m.partage.surReseau("Pinterest"),
        m.encart.titre, m.encart.corps, m.encart.bouton,
        m.commentaires.titreVide, m.commentaires.titreUn, m.commentaires.titreN(3),
        m.commentaires.aucun, m.commentaires.formulaire.laisserUn, m.commentaires.formulaire.prenom,
        m.commentaires.formulaire.email, m.commentaires.formulaire.emailJamaisPublie, m.commentaires.formulaire.message,
        m.commentaires.formulaire.envoyer, m.commentaires.formulaire.envoiEnCours, m.commentaires.formulaire.piegeLibelle,
        m.commentaires.formulaire.noteEmail, m.commentaires.formulaire.publieFort, m.commentaires.formulaire.publieSuite,
        m.commentaires.formulaire.attenteFort, m.commentaires.formulaire.attenteSuite,
        m.rail.sommaireAria, m.rail.partagerCourt,
      ];
      for (const p of obligatoires) {
        assert.ok(p && p.trim().length > 0, `${langue} : une phrase du meuble est vide`);
        assert.ok(!/—|–/.test(p), `${langue} : tiret cadratin dans "${p}"`);
      }
    }
  });

  // LE SECOND BOUTON DE L'ENCART MENE A `/`, LA PAGE DE VENTE CAPTUREE,
  // EN FRANCAIS. Meme decision que `sommaire.ctaSecondaire` : on
  // n'affiche rien plutot que de promettre une page qui n'existe pas
  // dans cette langue.
  test("l'encart ne propose sa page de vente qu'en francais", () => {
    assert.ok(motsDuBlog("fr").encart.secondaire, "le francais doit avoir son second bouton");
    assert.equal(
      motsDuBlog("en").encart.secondaire,
      null,
      "en anglais, le second bouton mene a une page francaise : il ne s'affiche pas",
    );
  });
});
