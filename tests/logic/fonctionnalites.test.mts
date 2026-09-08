// tests/logic/fonctionnalites.test.mts
//
// LES PAGES DE FONCTIONNALITÉS.
//
// Béné, 5 septembre 2026 : "je veux aussi une page avec le détail de
// chaque fonctionnalité pour creuser le sujet : sur la landing on
// présente pourquoi cette fonctionnalité + les bénéfices + comment ça
// marche en une phrase. Sur la page détail on détaille comment ça
// marche avec des screenshot etc."
//
// CE QUE CE FILET TIENT, ET POURQUOI CHAQUE POINT COMPTE :
//
//   - une page qui VEND une fonctionnalité retirée du produit est le
//     pire mensonge possible : chaque entrée nomme le fichier qui la
//     rend vraie, et le test vérifie que ce fichier existe ;
//   - une capture d'écran absente et NON DITE passe pour un oubli ;
//   - une deuxième liste de textes entre la landing et la page
//     détaillée diverge en six mois, c'est le défaut le plus cher de ce
//     dépôt ;
//   - une page déclarée dans le sitemap et introuvable depuis le site
//     est une page que Google indexe et que personne ne lit.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import {
  CHROME_FONCTIONNALITES,
  fonctionnalites,
  fonctionnaliteParSlug,
  libellePalier,
} from "../../lib/site/fonctionnalites.ts";
import { LANGUES_PUBLIQUES } from "../../lib/site/langues.ts";
import { PAGES_PUBLIQUES } from "../../lib/site/pagesPubliques.ts";
import { cheminsDuSite } from "../../lib/site/nav.ts";
import { CSS } from "@/components/fonctionnalites/styles";
import { gagne, reglesDeCouleur, specificite, viseTousLesLiens } from "./aide/specificiteCss.mts";
import { cheminPageDuSite, sourcePageDuSite } from "./aide/pageDuSite.mts";

// LA LANDING EST DEUX FICHIERS DEPUIS LE 6 SEPTEMBRE. `/` est la
// landing courte, `/tarifs` la vraie page de vente : les guards qui
// portent sur "ce que la landing fait" les lisent tous les deux.
const PAGE_LANDING =
  readFileSync("app/(site)/apercu-landing-8f2c9d41/page.tsx", "utf8") +
  "\n" +
  sourcePageDuSite("/tarifs");
// LES DEUX PAGES SE CHERCHENT, ELLES NE S'ECRIVENT PAS EN DUR : un
// groupe de routes n'ajoute aucun segment d'URL, donc `/fonctionnalites`
// peut changer de groupe sans que son adresse bouge. Le 8 septembre, ce
// deplacement a fait rougir deux fichiers de tests sur un code juste.
const CHEMIN_HUB = cheminPageDuSite("/fonctionnalites");
const PAGE_HUB = readFileSync(CHEMIN_HUB, "utf8");
const PAGE_DETAIL = readFileSync(
  CHEMIN_HUB.replace(/page\.tsx$/, "[slug]/page.tsx"),
  "utf8",
);

// LE FRANCAIS EST LA STRUCTURE : c'est lui qui porte les slugs, les
// paliers, les sources et les voisines. Les tests de contenu portent
// donc sur lui, et un bloc a part verifie que chaque langue declaree le
// couvre en entier.
const FONCTIONNALITES = fonctionnalites("fr");

describe("chaque fonctionnalité dit vrai, et le prouve", () => {
  test("le fichier cité en source existe vraiment", () => {
    // C'EST LE CONTRÔLE QUI COMPTE. Une fonctionnalité retirée du
    // produit ferait rougir la page qui la vend, au lieu de continuer à
    // la promettre pendant des mois.
    for (const f of FONCTIONNALITES) {
      assert.ok(
        existsSync(f.source),
        `${f.slug} cite ${f.source}, qui n'existe pas`,
      );
    }
  });

  test("chaque fonctionnalité nomme la capture qui lui manque", () => {
    // Je ne peux pas produire ces captures d'ici : la seule que l'app
    // sait rendre vient de `/visual-test`, la fixture des tests
    // visuels, qui porte un bandeau "Mode aperçu" et un quiz de démo
    // écrit sans accents. Un espace laissé vide passerait pour un
    // oubli ; nommé, il se remplit en deux minutes.
    for (const f of FONCTIONNALITES) {
      assert.ok(f.capture.trim().length > 20, `${f.slug} ne dit pas quelle capture il lui faut`);
    }
  });

  test("un bénéfice porte sa conséquence, pas une étiquette", () => {
    // Le test de Béné : "est-ce qu'on peut répondre 'et alors ??' à la
    // fin de la puce". "Réponses illimitées" appelle ce "et alors" ;
    // "ton quiz peut décoller un mardi sans qu'un email se floute" non.
    //
    // CE QUI EST MESURÉ, ET POURQUOI PAS UNE LONGUEUR. Mon premier jet
    // exigeait 70 caractères, et il a rejeté deux puces parfaitement
    // bonnes ("Pas de site ? Ton quiz EST la page, avec sa propre
    // adresse.", 59). Un seuil de longueur fige une FORME, pas le fait.
    //
    // Ce qui sépare vraiment une étiquette d'une puce promesse, c'est
    // la STRUCTURE : une étiquette est un groupe nominal nu ("Réponses
    // illimitées"), une puce est une PHRASE (elle se termine) qui porte
    // une CHARNIÈRE (`,` `:` `?`) introduisant la conséquence. Les deux
    // manquent à une étiquette, donc les deux sont exigés.
    for (const f of FONCTIONNALITES) {
      assert.ok(f.benefices.length >= 2, `${f.slug} n'a qu'un bénéfice`);
      for (const b of f.benefices) {
        assert.ok(
          /[.!?]$/.test(b.trim()) && /[,:?]\s/.test(b),
          `${f.slug} : "${b.slice(0, 40)}..." est une étiquette, pas une puce promesse`,
        );
      }
    }
  });

  test("et ce contrôle attrape vraiment une étiquette", () => {
    // Un garde-fou qui ne peut plus échouer ment. On lui donne ce qu'il
    // existe pour refuser, et on exige qu'il le refuse : sinon le
    // relâchement ci dessus l'aurait vidé de son sens sans le dire.
    const estUnePucePromesse = (b: string) =>
      /[.!?]$/.test(b.trim()) && /[,:?]\s/.test(b);
    for (const etiquette of [
      "Réponses illimitées.",
      "Quiz illimités",
      "IA intégrée.",
      "Export CSV.",
    ]) {
      assert.ok(!estUnePucePromesse(etiquette), `"${etiquette}" passe pour une puce promesse`);
    }
    for (const puce of FONCTIONNALITES[0].benefices) {
      assert.ok(estUnePucePromesse(puce), `"${puce}" devrait passer`);
    }
  });

  test("aucun tiret cadratin dans ce qui s'affiche", () => {
    for (const f of FONCTIONNALITES) {
      const tout = [f.nom, f.resume, f.pourquoi, f.commentCourt, f.ou, ...f.benefices,
        ...f.detail.flatMap((d) => [d.titre, ...d.corps] as string[])].join(" ");
      assert.ok(!/[—–]/.test(tout), `${f.slug} porte un tiret cadratin`);
    }
  });

  test("les slugs sont uniques et lisibles dans une URL", () => {
    const vus = new Set<string>();
    for (const f of FONCTIONNALITES) {
      assert.match(f.slug, /^[a-z0-9-]+$/, `${f.slug} n'est pas un slug`);
      assert.ok(!vus.has(f.slug), `${f.slug} en double`);
      vus.add(f.slug);
      assert.equal(fonctionnaliteParSlug(f.slug, "fr")?.nom, f.nom);
    }
    assert.equal(fonctionnaliteParSlug("nawak", "fr"), null);
  });

  test("les trois paliers sont nommés, et PLUS n'est pas payant", () => {
    // "payant" ne veut pas dire PLUS : le guide d'automatisation est
    // dans les quatre paliers payants, l'analyse IA seulement dans les
    // deux paliers PLUS. Les confondre ferait promettre sur la page ce
    // que le bon de commande ne donne pas.
    assert.notEqual(libellePalier("payant", "fr"), libellePalier("plus", "fr"));
    for (const f of FONCTIONNALITES) {
      assert.ok(libellePalier(f.palier, "fr"), `${f.slug} : palier inconnu`);
    }
  });
});

describe("un seul texte pour deux écrans", () => {
  test("la page détaillée LIT le module, elle ne récrit rien", () => {
    assert.match(PAGE_DETAIL, /fonctionnaliteParSlug/);
    // ON VISE LE FAIT, PAS LA FORMULATION : le hub doit LIRE le module.
    // Figer `FONCTIONNALITES.map` a fait rougir ce test le jour ou la
    // liste est devenue une fonction par langue, sur une correction
    // juste. C'est la huitieme fois dans ce depot.
    assert.match(PAGE_HUB, /from "@\/lib\/site\/fonctionnalites"/);
    assert.match(PAGE_HUB, /\bfonctionnalites\(/);
  });

  test("les phrases du module ne sont recopiées nulle part", () => {
    // Une deuxième version des mêmes arguments donnerait, dans six
    // mois, une landing qui promet ce que la page détaillée ne décrit
    // plus. C'est le défaut le plus cher de ce dépôt.
    for (const f of FONCTIONNALITES) {
      for (const source of [PAGE_LANDING, PAGE_HUB, PAGE_DETAIL]) {
        assert.ok(
          !source.includes(f.resume),
          `"${f.resume.slice(0, 30)}..." est recopié dans une page`,
        );
      }
    }
  });
});

describe("les pages sont trouvables", () => {
  test("les huit sont déclarées dans le sitemap", () => {
    const declares = new Set(PAGES_PUBLIQUES.map((p) => p.chemin));
    assert.ok(declares.has("/fonctionnalites"), "le hub n'est pas déclaré");
    for (const f of FONCTIONNALITES) {
      assert.ok(
        declares.has(`/fonctionnalites/${f.slug}`),
        `/fonctionnalites/${f.slug} manque au sitemap`,
      );
    }
  });

  test("elles sont atteignables depuis le site", () => {
    // Par leur HUB, qui est dans le pied de page. Un pied de page à
    // quatorze liens de plus ne se lit plus, il se parcourt.
    const joignables = new Set(cheminsDuSite());
    for (const f of FONCTIONNALITES) {
      assert.ok(
        joignables.has(`/fonctionnalites/${f.slug}`),
        `/fonctionnalites/${f.slug} est orpheline`,
      );
    }
  });

  test("le maillage relie les huit pages entre elles, et au tarif", () => {
    // 🚨 CE TEST A CHANGE DE CIBLE LE 6 SEPTEMBRE.
    //
    // Il comptait les `<EnSavoirPlus slug="...">` de la landing longue,
    // qui portait les quatorze sections. La landing courte n'en porte
    // plus aucune : les chercher la ferait rougir un travail juste.
    //
    // CE QUI COMPTE MAINTENANT, ET C'EST SA CONSIGNE : "chaque page
    // /fonctionnalites/<slug> pointe vers /tarifs et vers deux autres
    // pages fonctionnalites liees." Une page de detail atteinte depuis
    // une recherche est un cul-de-sac si elle ne mene qu'au tarif.
    for (const f of FONCTIONNALITES) {
      assert.equal(f.liees.length, 2, `${f.slug} ne cite pas deux voisines`);
      for (const slug of f.liees) {
        assert.ok(fonctionnaliteParSlug(slug, "fr"), `${f.slug} cite ${slug}, qui n'existe pas`);
        assert.notEqual(slug, f.slug, `${f.slug} se cite elle meme`);
      }
    }
    assert.ok(
      /"\/tarifs"/.test(PAGE_DETAIL),
      "la page de detail ne mene pas au tarif",
    );
    assert.ok(
      /"\/tarifs"/.test(PAGE_HUB),
      "le hub ne mene pas au tarif",
    );
    // ET LA LANDING MENE AU HUB : sans ca, les huit pages ne sont
    // atteignables que depuis le pied de page.
    assert.ok(
      /href="\/fonctionnalites"/.test(PAGE_LANDING),
      "la landing ne renvoie jamais vers les fonctionnalites",
    );
  });
});

describe("le bouton de la page detaillee reste lisible", () => {
  // MESURE, 5 septembre 2026 : le bouton "Creer mon compte gratuit"
  // sortait rgb(90,110,246) SUR rgb(90,110,246). Bleu sur bleu, contraste
  // 1:1, invisible. La cause, demandee au navigateur et pas devinee :
  //
  //   .tqf a    -> var(--b)   (0,1,1)   gagne
  //   .tqf-cta  -> #fff       (0,1,0)
  //
  // C'est mot pour mot le bug des boutons illisibles de la landing, le
  // meme jour, dans l'autre feuille. Le calcul est donc partage.
  const regles = reglesDeCouleur(CSS, ".tqf");
  const BOUTONS = ["tqf-cta"];

  test("le bouton pose bien sa propre couleur", () => {
    for (const b of BOUTONS) {
      assert.ok(
        regles.some((r) => r.sel === `.${b}`),
        `.${b} ne pose aucune couleur : le bouton n'a plus de contraste garanti`,
      );
    }
  });

  test("aucune regle qui vise TOUS les liens ne bat le bouton", () => {
    for (const g of viseTousLesLiens(regles)) {
      for (const b of BOUTONS) {
        assert.ok(
          !gagne(specificite(g.sel), specificite(`.${b}`)),
          `"${g.sel}" bat ".${b}" : c'est le bug du bleu sur bleu`,
        );
      }
    }
  });

  test("le texte de la carte du hub pose sa couleur", () => {
    // La carte EST un lien : sans couleur explicite, son titre et son
    // resume heritent du bleu des liens, donc ils se lisent comme des
    // liens et le bleu ne sert plus a rien.
    for (const sel of [".tqf-carte h2", ".tqf-carte p"]) {
      assert.ok(
        regles.some((r) => r.sel === sel),
        `${sel} ne pose aucune couleur : le texte de la carte herite du bleu des liens`,
      );
    }
  });
});

describe("chaque langue declaree couvre les huit pages", () => {
  // Bene, 8 septembre 2026 : "toutes les pages et memes les articles
  // doivent etre multilangues, j'espere que tu as anticipe."
  //
  // LE COMPILATEUR REFUSE DEJA UNE LANGUE INCOMPLETE : `TRADUCTIONS`
  // est un `Record<SlugFonctionnalite, ...>`, donc un slug oublie ne
  // compile pas. Ce qu'il ne peut PAS voir, c'est un texte laisse en
  // francais dans l'objet anglais, ni une ponctuation francaise dans une
  // phrase anglaise : ca s'affiche parfaitement, et ca ne se voit qu'en
  // lisant la page.

  test("les huit slugs, les paliers et les voisines sont les MEMES dans toutes les langues", () => {
    // La STRUCTURE vit une seule fois : le slug, le palier, la source,
    // les voisines et le visuel viennent du francais, une langue
    // n'apporte que du TEXTE. Sans ca, `/en/fonctionnalites/<slug>` et
    // `/fonctionnalites/<slug>` pourraient designer deux pages
    // differentes, et `hreflang` les apparierait quand meme.
    for (const langue of LANGUES_PUBLIQUES) {
      const liste = fonctionnalites(langue);
      assert.equal(liste.length, FONCTIONNALITES.length, `${langue} : pas le meme nombre`);
      for (let i = 0; i < liste.length; i += 1) {
        assert.equal(liste[i].slug, FONCTIONNALITES[i].slug, `${langue} : slug ${i} differe`);
        assert.equal(liste[i].palier, FONCTIONNALITES[i].palier, `${langue} : palier differe`);
        assert.equal(liste[i].visuel, FONCTIONNALITES[i].visuel, `${langue} : visuel differe`);
        assert.deepEqual(liste[i].liees, FONCTIONNALITES[i].liees, `${langue} : voisines`);
        assert.equal(liste[i].source, FONCTIONNALITES[i].source, `${langue} : source`);
      }
    }
  });

  test("aucune langue ne rend le texte d'une autre", () => {
    // Le piege exact : un slug oublie dans une traduction compile tres
    // bien si on l'y recopie du francais, et la page anglaise affiche
    // alors une carte francaise au milieu de sept anglaises.
    const fr = fonctionnalites("fr");
    for (const langue of LANGUES_PUBLIQUES) {
      if (langue === "fr") continue;
      const liste = fonctionnalites(langue);
      for (let i = 0; i < liste.length; i += 1) {
        assert.notEqual(liste[i].nom, fr[i].nom, `${langue} : ${fr[i].slug} garde le nom francais`);
        assert.notEqual(
          liste[i].resume,
          fr[i].resume,
          `${langue} : ${fr[i].slug} garde le resume francais`,
        );
      }
    }
  });

  test("le chrome existe dans toutes les langues, et il compte les pages", () => {
    for (const langue of LANGUES_PUBLIQUES) {
      const t = CHROME_FONCTIONNALITES[langue];
      assert.ok(t, `${langue} : aucun chrome`);
      for (const [cle, valeur] of Object.entries(t)) {
        if (typeof valeur === "function") continue;
        assert.ok(String(valeur).trim().length > 0, `${langue} : ${cle} est vide`);
      }
      // LE NOMBRE VIENT DE LA LISTE : le chapo a annonce "quatorze"
      // pendant que la liste en portait huit.
      assert.match(t.chapoHub(FONCTIONNALITES.length), new RegExp(`${FONCTIONNALITES.length}`));
    }
  });

  test("la typographie anglaise est anglaise", () => {
    // Meme faute que le blog anglais du 8 septembre, et elle etait
    // MIENNE : `40 %` avec une espace et `17 EUR` au lieu de `$29.99`.
    // Une regle ecrite pour une langue, appliquee telle quelle a une
    // autre : c'est la faute du 1er aout.
    const liste = fonctionnalites("en");
    for (const f of liste) {
      const tout = [
        f.nom,
        f.resume,
        f.pourquoi,
        f.commentCourt,
        f.ou,
        f.capture,
        ...f.benefices,
        ...f.detail.flatMap((d) => [d.titre, ...d.corps] as string[]),
      ].join("\n");
      assert.ok(!/\d\s%/.test(tout), `${f.slug} : un pourcentage decolle, a l'anglaise il se colle`);
      assert.ok(!/\s[?!;](\s|$)/.test(tout), `${f.slug} : une espace devant une ponctuation`);
      assert.ok(!/\w\s:(\s|$)/.test(tout), `${f.slug} : une espace devant un deux-points`);
      assert.ok(!/[—–]/.test(tout), `${f.slug} : un tiret cadratin`);
    }
    // Et le chrome anglais aussi : c'est lui qui porte les titres de
    // section, donc les phrases les plus lues de la page.
    const t = CHROME_FONCTIONNALITES.en;
    assert.ok(!/\s:/.test(t.ouCaSePasse), "le chrome anglais garde une espace avant le deux-points");
    assert.ok(!/[—–]/.test(Object.values(t).filter((v) => typeof v === "string").join(" ")));
  });
});
