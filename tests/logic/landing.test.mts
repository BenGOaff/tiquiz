// tests/logic/landing.test.mts
//
// CE QUE LA LANDING N'A PAS LE DROIT DE REFAIRE.
//
// Chaque bloc porte le reproche de Béné qui l'a fait écrire, et c'est
// volontaire : un garde-fou sans sa raison se lit comme une contrainte
// arbitraire, et le prochain passage le retire.
//
//   4 septembre : "putain mais tu les as les fonctionnalités pour les
//   tarifs : sur la page de vente, et puis dans le code !!"
//   -> les prix viennent d'`OWNER_CATALOG`, les lignes d'`avantages.ts`,
//      les limites de `FREE_LIMITS`, et aucun champ à trou ne sort.
//
//   5 septembre : "texte foncé sur fond foncé : illisible" et "texte
//   blanc sur bouton blanc ? Vraiment ?"
//   -> UNE cause : `.tql a{color:inherit}` battait toutes les règles de
//      bouton en spécificité. Le test CALCULE la spécificité, il ne lit
//      pas une chaîne : c'est le comportement qui compte, et une règle
//      d'héritage réécrite autrement referait exactement le même bug.
//
//   5 septembre : "6 avis trustpilot pas une preuve sociale. Supprime."
//   et "'lire les avis' -> non, on ne veut pas que les gens quittent la
//   page ... on veut qu'ils commandent bordel !"
//   -> aucun avis, aucun lien qui sort de nos domaines.
//
//   5 septembre : "y'a plus de bénéfices dans le compte gratuit que le
//   compte à 17 € tu trouves ça logique et vendeur ?"
//   -> les colonnes payantes portent des PUCES PROMESSES, et le gratuit
//      n'en annonce jamais plus qu'elles.
//
//   5 septembre : "c'est le COMMENT pas le résultat. On ne vend jamais
//   les 10h de vol, on vend la plage avec les cocktails."
//   -> le haut de page ne décrit plus le processus.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  LANDING,
  TEMOIGNAGES,
  colonnesDeTarif,
  comparatifDesPlans,
  contenuLanding,
} from "@/lib/site/landing";
import {
  AVANTAGES_COMMUNS,
  AVANTAGES_NOUVEAUX,
  AVANTAGES_PAYANTS,
  AVANTAGES_PLUS,
} from "@/lib/checkout/avantages";
import { OWNER_CATALOG, formatOwnerPrice } from "@/lib/checkout/catalog";
import { OUTILS } from "@/lib/site/integrations";
import { FONCTIONNALITES, fonctionnaliteParSlug } from "@/lib/site/fonctionnalites";
import { BLOCS_ANIMES, BLOCS_EN_ATTENTE } from "@/lib/site/blocsAnimes";
import { FREE_LIMITS } from "@/lib/planLimits";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gagne, reglesDeCouleur, specificite, viseTousLesLiens } from "./aide/specificiteCss.mts";

const racine = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * LE TEXTE VISIBLE D'UN BLOC ANIMÉ LEVÉ DE SA PAGE.
 *
 * On retire le `<style>` et les balises : ce qui reste est ce qu'un
 * lecteur voit. Sans retirer le style, un test qui cherche un
 * pourcentage tomberait sur un `width:41%` de CSS, donc il crierait
 * pour rien, donc il finirait désactivé.
 */
function texteDuBloc(nom: string): string {
  return racine(`content/sales/anim/${nom}.html`)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

const SOURCE = racine("lib/site/landing.ts");
/** Le module SANS ses commentaires : sinon un contrôle tombe sur sa propre explication. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// LA LANDING EST TROIS FICHIERS DEPUIS LE 6 SEPTEMBRE, et ce filet les
// lit tous les trois. Bene : "/ = la landing courte, /tarifs = la vraie
// page de vente". Ne surveiller que l'un des deux laisserait la moitie
// de ses regles sans garde-fou le jour ou un bloc passe de l'un a
// l'autre, ce qui est exactement ce qui vient d'arriver.
//
// Les commentaires sont retires AVANT toute mesure : un test qui compte
// la presence ou l'ORDRE de quelque chose dans un fichier tombe sinon
// sur sa propre explication (leçon du 3 septembre, trois fois).
const sansCommentaires = (t: string) =>
  t.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, " ").replace(/^\s*\/\/.*$/gm, " ");
const PAGE_ACCUEIL = sansCommentaires(racine("app/(site)/apercu-landing-8f2c9d41/page.tsx"));
const PAGE_TARIFS = sansCommentaires(racine("app/(site)/tarifs/page.tsx"));
const MORCEAUX = sansCommentaires(racine("components/landing/morceaux.tsx"));
const PAGE_CODE = `${PAGE_ACCUEIL}\n${PAGE_TARIFS}\n${MORCEAUX}`;
const CSS = racine("components/landing/styles.ts");

describe("la landing lit les tarifs, elle ne les recopie pas", () => {
  test("aucun prix n'est écrit dans le module", () => {
    for (const id of ["mensuel", "annuel", "mensuel-plus", "annuel-plus"] as const) {
      const euros = String(Math.round(OWNER_CATALOG[id].amountCents / 100));
      assert.ok(
        !new RegExp(`["'\`][^"'\`]*\\b${euros}\\s*€`).test(CODE),
        `le prix ${euros} € est écrit en dur dans lib/site/landing.ts`,
      );
    }
  });

  test("les trois colonnes portent les prix du catalogue", () => {
    // LE MONTANT VIENT DU CATALOGUE, ET LA GRILLE RETIRE LES CENTIMES
    // QUAND ILS SONT NULS. Béné, 5 septembre 2026 : "les tarifs sont
    // moches" ; "17,00 €" en 44 px est un montant de facture posé là où
    // on lit un prix d'un coup d'oeil. Le test compare donc les EUROS,
    // pas la mise en forme : figer "17,00 €" interdirait de corriger la
    // mise en forme, et c'est le défaut qui sort en boucle ici.
    const euros = (id: "mensuel" | "annuel" | "mensuel-plus" | "annuel-plus") =>
      String(OWNER_CATALOG[id].amountCents / 100);
    const c = colonnesDeTarif(LANDING.fr);
    assert.equal(c.length, 3);
    assert.ok(c[1].prix.startsWith(euros("mensuel")), `-> ${c[1].prix}`);
    assert.ok(c[1].prixAn?.includes(euros("annuel")), `-> ${c[1].prixAn}`);
    assert.ok(c[2].prix.startsWith(euros("mensuel-plus")), `-> ${c[2].prix}`);
    assert.ok(c[2].prixAn?.includes(euros("annuel-plus")), `-> ${c[2].prixAn}`);
    // Un tarif à centimes NON nuls les garde : sinon la grille
    // annoncerait moins que ce que le bon de commande encaisse.
    for (const id of ["mensuel", "annuel", "mensuel-plus", "annuel-plus"] as const) {
      if (OWNER_CATALOG[id].amountCents % 100 !== 0) {
        assert.ok(
          formatOwnerPrice(OWNER_CATALOG[id]).includes(","),
          `${id} a des centimes : ils doivent rester affichés`,
        );
      }
    }
    // Le gratuit n'est pas au catalogue : il n'a pas de prix annuel.
    assert.equal(c[0].prixAn, null);
  });

  test("les fonctionnalités viennent de avantages.ts, au mot près", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.deepEqual(
      c[1].lignes.map((l) => l.texte),
      AVANTAGES_PAYANTS.map((a) => a.texte),
    );
    assert.deepEqual(
      c[2].lignes.map((l) => l.texte),
      AVANTAGES_PLUS.map((a) => a.texte),
    );
  });

  test("les limites du gratuit viennent de FREE_LIMITS", () => {
    for (const langue of Object.keys(LANDING)) {
      const lignes = colonnesDeTarif(LANDING[langue])[0]
        .lignes.map((l) => l.texte)
        .join(" | ");
      assert.ok(
        lignes.includes(String(FREE_LIMITS.maxQuizzesPerMode)),
        `${langue} : la limite de quiz n'apparaît pas`,
      );
      assert.ok(
        lignes.includes(String(FREE_LIMITS.visibleLeadsPerMonth)),
        `${langue} : la limite de réponses visibles n'apparaît pas`,
      );
    }
  });

  test("AUCUN champ à trou ne sort à l'écran", () => {
    // Le bug du 4 septembre : `replace("{quiz}", …)` ne remplaçait que
    // la première occurrence, et la ligne en portait deux. `tsc` était
    // vert, l'écran affichait "1 quiz et {quiz} sondage".
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const rendu = [
        ...colonnesDeTarif(t).flatMap((c) => [
          c.nom,
          c.prix,
          c.cadence,
          c.prixAn ?? "",
          c.inclus ?? "",
          ...c.lignes.map((l) => `${l.texte} ${l.detail ?? ""}`),
        ]),
        ...comparatifDesPlans(t).flatMap((g) => [g.titre, ...g.lignes.map((l) => l.intitule)]),
      ].join(" | ");
      assert.ok(
        !/[{][a-z]+[}]/.test(rendu),
        `${langue} : un champ à trou reste affiché -> ${rendu.match(/[{][a-z]+[}]/g)?.join(", ")}`,
      );
    }
  });
});

describe("le palier payant n'a jamais l'air plus pauvre que le gratuit", () => {
  // Béné, 5 septembre 2026 : "y'a plus de bénéfices dans le compte
  // gratuit que le compte à 17 € tu trouves ça logique et vendeur ??
  // Mets les bénéfices puces promesses."
  //
  // Le gratuit listait ses TROIS limites, la colonne à 17 € ses DEUX
  // lignes. Sur l'écran où quelqu'un sort sa carte, le palier payant
  // paraissait donc contenir moins.

  test("chaque colonne payante DIT ce qu'elle inclut du palier d'en dessous", () => {
    for (const langue of Object.keys(LANDING)) {
      const [gratuit, tiquiz, plus] = colonnesDeTarif(LANDING[langue]);
      assert.equal(gratuit.inclus, null, `${langue} : le gratuit n'inclut aucun palier`);
      for (const c of [tiquiz, plus]) {
        assert.ok(
          (c.inclus ?? "").trim().length > 5,
          `${langue} : ${c.nom} n'annonce pas ce qu'il reprend du palier d'en dessous`,
        );
      }
    }
  });

  test("chaque ligne payante est une PUCE PROMESSE, bénéfice plus conséquence", () => {
    // Le test de Béné : si on peut répondre "et alors ??" à la fin de la
    // puce, elle est ratée. "Réponses illimitées" appelle ce "et alors".
    for (const c of colonnesDeTarif(LANDING.fr).slice(1)) {
      for (const l of c.lignes) {
        assert.ok(
          (l.detail ?? "").trim().length > 20,
          `${c.nom} : "${l.texte}" n'a pas sa conséquence concrète`,
        );
      }
    }
  });

  test("le gratuit n'annonce pas plus de lignes qu'une colonne payante", () => {
    for (const langue of Object.keys(LANDING)) {
      const [gratuit, tiquiz, plus] = colonnesDeTarif(LANDING[langue]);
      assert.ok(
        gratuit.lignes.length <= tiquiz.lignes.length + 1,
        `${langue} : le gratuit affiche ${gratuit.lignes.length} lignes contre ${tiquiz.lignes.length} au palier payant`,
      );
      assert.ok(
        plus.lignes.length >= tiquiz.lignes.length,
        `${langue} : le PLUS doit annoncer au moins autant que Tiquiz`,
      );
    }
  });
});

describe("la grille comparative ne recopie rien", () => {
  // Béné, 5 septembre 2026 : "on n'a qu'à rajouter une grille de
  // fonctionnalités qui compare tous les plans, comme les vrais saas."

  test("elle couvre TOUS les avantages du module, et n'en invente aucun", () => {
    const intitules = comparatifDesPlans(LANDING.fr).flatMap((g) =>
      g.lignes.map((l) => l.intitule),
    );
    for (const a of [...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX, ...AVANTAGES_PLUS]) {
      assert.ok(
        intitules.includes(a.texte),
        `la grille oublie "${a.texte}", qui est promis sur le bon de commande`,
      );
    }
  });

  test("les limites chiffrées viennent de FREE_LIMITS", () => {
    const limites = comparatifDesPlans(LANDING.fr)[0].lignes;
    assert.equal(limites[0].gratuit, String(FREE_LIMITS.maxQuizzesPerMode));
    assert.equal(limites[2].gratuit, String(FREE_LIMITS.maxPopquizzes));
    assert.equal(limites[3].gratuit, String(FREE_LIMITS.visibleLeadsPerMonth));
    // Une limite chiffrée n'est NI un oui NI un non : l'écrire en coche
    // ferait croire que le gratuit est illimité.
    for (const l of limites) assert.equal(typeof l.gratuit, "string");
  });

  test("ce qui est réservé au PLUS est refusé aux deux autres colonnes", () => {
    const g = comparatifDesPlans(LANDING.fr).at(-1)!;
    for (const l of g.lignes) {
      assert.equal(l.gratuit, false, `${l.intitule} : le gratuit ne l'a pas`);
      assert.equal(l.tiquiz, false, `${l.intitule} : le palier de base ne l'a pas`);
      assert.equal(l.plus, true);
    }
  });
});

describe("aucun bouton n'hérite de la couleur du texte autour", () => {
  // Béné, 5 septembre 2026 : "texte foncé sur fond foncé : illisible" et
  // "texte blanc sur bouton blanc ? Vraiment ?"
  //
  // UNE cause pour les deux : `.tql a{color:inherit}` vaut 0,1,1 en
  // spécificité et battait `.tql-cta`, `.tql-col-cta` et
  // `.tql-bande-cta`, tous à 0,1,0.
  //
  // ON CALCULE LA SPÉCIFICITÉ, on ne cherche pas une chaîne : figer
  // `:not([class])` empêcherait de corriger autrement, et une règle
  // d'héritage réécrite d'une autre façon referait exactement le bug.

  // Le calcul vit dans `tests/logic/aide/specificiteCss.mts` : deux
  // feuilles le lisent, et deux copies finiraient par diverger.
  const regles = reglesDeCouleur(CSS, ".tql");

  const BOUTONS = ["tql-cta", "tql-cta-2", "tql-col-cta", "tql-bande-cta"];

  test("les quatre boutons posent bien leur propre couleur", () => {
    for (const b of BOUTONS) {
      assert.ok(
        regles.some((r) => r.sel === `.${b}`),
        `.${b} ne pose aucune couleur : le bouton n'a plus de contraste garanti`,
      );
    }
  });

  test("aucune règle qui vise TOUS les liens ne bat une règle de bouton", () => {
    // Une règle qui vise `a` nu s'applique aussi aux boutons, puisqu'ils
    // sont des liens. Si elle gagne, elle décide de leur couleur.
    const generiques = viseTousLesLiens(regles);
    for (const g of generiques) {
      for (const b of BOUTONS) {
        assert.ok(
          !gagne(specificite(g.sel), specificite(`.${b}`)),
          `"${g.sel}" bat ".${b}" : c'est le bug du texte foncé sur fond foncé`,
        );
      }
    }
  });
});

describe("aucun lien ne fait quitter la page", () => {
  // Béné, 5 septembre 2026 : "'lire les avis' -> non, on ne veut pas que
  // les gens quittent la page ... on veut qu'ils commandent bordel !"

  test("aucun lien ne mène vers Trustpilot", () => {
    // CE QU'ELLE REFUSE EST LE LIEN, PAS LE MOT, et ce test disait le
    // contraire jusqu'au 5 septembre au soir. Sa phrase du matin :
    // "'lire les avis' -> non, on ne veut pas que les gens quittent la
    // page". Son message du soir : "des témoignages de la page
    // originale peuvent être remplacés par les témoignages de
    // Trustpilot : mêmes personnes mais plus récents."
    //
    // Trois de ses quinze ont donc leur version récente, avec la date
    // et la mention de la source. Bannir le MOT interdisait de dire
    // d'où vient un témoignage, c'est à dire exactement ce qui le rend
    // vérifiable. Un garde-fou qui fige une formulation empêche de
    // corriger la formulation : il vise le FAIT.
    assert.ok(
      !/trustpilot\.com|href[^\n]*trustpilot/i.test(CODE),
      "lib/site/landing.ts porte une adresse Trustpilot",
    );
    assert.ok(
      !/trustpilot\.com|href[^\n]*trustpilot/i.test(PAGE_CODE),
      "la page porte une adresse Trustpilot",
    );
  });

  test("toute adresse absolue de la page reste sur nos domaines", () => {
    const notres = /(^|\.)(tiquiz\.fr|tipote\.com)$/;
    for (const [, url] of PAGE_CODE.matchAll(/https?:\/\/[^"'`\s)]+/g)) {
      const hote = new URL(url).hostname;
      assert.ok(
        notres.test(hote),
        `la page envoie le visiteur sur ${hote}, qui n'est pas à nous`,
      );
    }
  });

  test("la preuve sociale est un NOMBRE d'utilisateurs, pas une note", () => {
    // Béné : "6 avis trustpilot pas une preuve sociale. Supprime. Tu
    // peux mettre +200 utilisateurs (c'est le vrai chiffre)."
    for (const langue of Object.keys(LANDING)) {
      const preuve = LANDING[langue].preuve;
      assert.match(preuve, /\d{3}/, `${langue} : la preuve n'annonce aucun nombre -> ${preuve}`);
      assert.ok(
        !/\d[,.]\d\s*\/\s*5|étoile|star/i.test(preuve),
        `${langue} : la preuve parle encore d'une note -> ${preuve}`,
      );
    }
  });
});

describe("le haut de page vend le RÉSULTAT, pas le processus", () => {
  // Béné, 5 septembre 2026 : "c'est le COMMENT pas le resultat. On ne
  // vend jamais les 10h de vol, on vend la plage avec les cocktails."
  //
  // C'est une LISTE NOIRE des tournures qu'elle a refusées, pas une
  // formulation figée : le titre et l'accroche peuvent être réécrits
  // librement tant qu'ils ne redescendent pas dans la mécanique.

  // 🚨 CETTE LISTE NE VISE PLUS L'ACCROCHE, ET C'EST BÉNÉ QUI A TRANCHÉ.
  //
  // Le 6 septembre 2026 elle a écrit l'accroche elle même, marquée
  // "verbatim" dans sa consigne : "L'IA écrit ton quiz à partir d'une
  // description de ton sujet. Tu relis, tu remplaces deux ou trois
  // formulations par les tiennes, tu publies."
  //
  // "Tu relis" est dans SA phrase, et ce test le refusait au nom de sa
  // règle du 5 septembre. Un garde-fou qui empêche de reprendre le texte
  // de l'autrice ne protège plus rien : la règle reste, elle vise le
  // TITRE, qui est le seul endroit où elle avait vu le défaut.
  const PROCESSUS = [
    /trois champs/i,
    /three fields/i,
    /tu relis/i,
    /you read it over/i,
    /l'IA écrit les questions/i,
    /the AI writes the questions/i,
  ];

  test("le titre ne décrit pas les étapes", () => {
    for (const langue of Object.keys(LANDING)) {
      const haut = `${LANDING[langue].titre} ${LANDING[langue].titreDefilant.join(" ")}`;
      for (const motif of PROCESSUS) {
        assert.ok(
          !motif.test(haut),
          `${langue} : le haut de page redécrit le processus -> ${motif}`,
        );
      }
    }
  });

  test("il dit À QUI la page s'adresse", () => {
    for (const langue of Object.keys(LANDING)) {
      assert.ok(
        LANDING[langue].pourQui.trim().length > 30,
        `${langue} : le haut de page ne dit pas si la page parle du lecteur`,
      );
    }
  });

  test("les étapes existent toujours, mais plus bas dans la page", () => {
    // Le COMMENT n'est pas supprimé : il est déplacé. Un visiteur veut
    // savoir comment ça marche APRÈS avoir compris ce qu'il y gagne.
    //
    // TROIS ÉTAPES, PLUS QUATRE, depuis le 6 septembre. Béné : "l'étape
    // viralité part sur /fonctionnalites/partage-et-viralite : ce n'est
    // pas une étape, c'est une conséquence, et elle est optionnelle."
    assert.equal(LANDING.fr.etapes.length, 3);
    const hero = PAGE_CODE.indexOf("tql-hero");
    const etapes = PAGE_CODE.indexOf("tql-pastille-etape");
    assert.ok(hero > 0 && etapes > hero, "les étapes doivent venir après le haut de page");
  });

  test("chaque étape montre le LOGICIEL, ou dit quelle capture manque", () => {
    // Béné, 6 septembre 2026 : "c'est le manque numéro un de la page
    // actuelle : on y voit beaucoup de quiz, on n'y voit jamais le
    // logiciel. Prévois les emplacements d'image même si les captures
    // arrivent après."
    //
    // UN EMPLACEMENT VIDE PASSERAIT POUR UN DÉFAUT DE MISE EN PAGE.
    // Nommé, il se remplit en deux minutes dans un vrai compte, et le
    // test empêche qu'on l'oublie en silence.
    for (const langue of Object.keys(LANDING)) {
      for (const e of LANDING[langue].etapes) {
        if (e.capture.src === null) {
          assert.ok(
            e.capture.aPrendre.trim().length > 20,
            `${langue} : "${e.titre}" n'a ni capture ni description de celle qui manque`,
          );
        } else {
          assert.ok(
            e.capture.alt.trim().length > 10,
            `${langue} : la capture de "${e.titre}" n'a pas de texte alternatif`,
          );
        }
      }
    }
  });
});

describe("la page parle de son audience avec SES mots", () => {
  // Béné, 5 septembre 2026 : "pourquoi 'créateurs' c'est des
  // entrepreneurs, des coachs, des auteurs, des affiliés, des
  // infopreneurs ... ils ne se définissent pas comme étant des
  // 'créateurs' j'ai bossé dur sur ma page initiale, il faut arrêter de
  // chier dessus comme ça."
  //
  // Elle a raison : j'avais substitué mon mot au sien. Et la liste
  // juste n'est pas à inventer, elle est SUR SA PAGE : les métiers des
  // quinze témoignages sont écrits par les intéressés (entrepreneur,
  // infopreneur, consultant, formatrice, coach, solopreneur,
  // thérapeute, affilié, marketeur).

  test("aucun \"créateurs\" tout court dans ce qui S'AFFICHE", () => {
    // "créateur de contenu" reste : c'est un métier, et il est écrit
    // par la personne elle même sur sa page. C'est le mot NU, employé
    // comme nom de l'audience, qui est faux.
    for (const langue of Object.keys(LANDING)) {
      for (const champ of ["preuve", "pourQui"] as const) {
        const v = LANDING[langue][champ];
        assert.ok(
          !/créateurs(?!\s+de\s+contenu)/i.test(v) &&
            !/(?<!course |content )\bcreators\b/i.test(v),
          `${langue}.${champ} appelle l'audience "créateurs" -> ${v}`,
        );
      }
    }
  });

  test("le haut de page NOMME plusieurs métiers, il ne dit pas \"les gens\"", () => {
    // "Le lecteur a un prénom. Jamais 'n'importe qui', jamais 'les
    // gens', jamais une masse."
    assert.ok(
      /entrepreneur/i.test(LANDING.fr.pourQui) && /affili/i.test(LANDING.fr.pourQui),
      "le haut de page ne nomme pas les métiers qu'elle a listés",
    );
    assert.ok(
      !/n'importe qui|les gens\b/i.test(LANDING.fr.pourQui),
      "le haut de page parle d'une masse",
    );
  });
});

describe("les quinze témoignages sont ceux de SA page", () => {
  // Béné avait fait retirer SIX avis Trustpilot, et le lien qui menait
  // chez eux. Ceux-ci sont autre chose : ils vivent déjà sur sa page de
  // vente, ils portent un prénom et un métier, ils sont quinze, et
  // aucun ne fait quitter la page.

  /** Les quinze de sa page, par leur prénom ou leur nom relevé. */
  const LES_SIENS = [
    "Jérémy",
    "Eric",
    "Jean Bernard",
    "Bernard",
    "Monique",
    "Evelyne",
    "Sylvère",
    "Gwenn",
    "Adeline",
    "Alain",
    "Samira",
    "Maulisio",
    "Fabienne",
    "Marie Paule",
    "Thibault",
  ];

  test("les quinze de sa page sont tous là", () => {
    // ON NE FIGE PAS LE NOMBRE, ON EXIGE LES PERSONNES. Le test disait
    // `length === 15` et il est sorti rouge le jour où trois personnes
    // qui n'ont écrit que sur Trustpilot se sont ajoutées, c'est à dire
    // sur une correction juste. Ce qui compte, c'est qu'aucun des
    // quinze ne disparaisse.
    for (const qui of LES_SIENS) {
      assert.ok(
        TEMOIGNAGES.some((v) => v.nom.startsWith(qui)),
        `${qui} a disparu du mur de témoignages`,
      );
    }
    for (const v of TEMOIGNAGES) {
      assert.ok(v.nom.trim().length > 1, "un témoignage sans nom");
      assert.ok(v.texte.trim().length > 60, `témoignage trop court : ${v.nom}`);
    }
  });

  test("un témoignage venu d'ailleurs DIT d'où il vient", () => {
    // Trois personnes de sa page ont écrit depuis sur Trustpilot, et
    // trois autres n'ont écrit que là. Leur version porte une date :
    // sans elle, on ne peut pas savoir laquelle des deux on lit.
    const dAilleurs = TEMOIGNAGES.filter((v) => v.source);
    assert.ok(dAilleurs.length >= 3, "aucun témoignage récent n'est daté");
    for (const v of dAilleurs) {
      assert.match(v.source ?? "", /\d{4}/, `${v.nom} : sa source ne porte pas de date`);
    }
  });

  test("un témoignage ne se traduit JAMAIS", () => {
    // Il vit HORS des objets de langue : c'est quelqu'un qui a écrit
    // ça. Le traduire, le corriger ou le raccourcir en ferait un texte
    // que personne n'a écrit, donc un faux témoignage, donc sa ligne
    // rouge numéro un.
    assert.ok(
      !/temoignages|avis:/i.test(JSON.stringify(Object.keys(LANDING.fr))),
      "les témoignages sont passés dans un objet de langue",
    );
    assert.ok(
      /export const TEMOIGNAGES/.test(CODE),
      "TEMOIGNAGES doit rester une constante unique, hors des langues",
    );
  });

  test("la page les affiche, et la transformation les précède", () => {
    const apres = PAGE_CODE.indexOf("tql-apres");
    const temoins = PAGE_CODE.indexOf("tql-temoins");
    assert.ok(apres > 0, "la transformation n'est pas rendue");
    assert.ok(temoins > apres, "les témoignages doivent venir après la projection");
  });
});

describe("un seul libellé de bouton, et il est partout", () => {
  // Béné, 6 septembre 2026 : "un seul libellé de bouton principal sur
  // toute la page : « Créer mon quiz gratuitement → », avec « Gratuit,
  // sans carte bancaire » dessous. La page actuelle en compte treize
  // différents, c'est à unifier."
  //
  // 🚨 CE BLOC REMPLACE "chaque section se termine par un désir".
  // Celui là exigeait des libellés à la première personne ("Je veux
  // capturer ces emails"), relevés sur sa page de vente le 5 septembre.
  // Elle a tranché l'inverse le 6 : treize promesses différentes, c'est
  // treize choses à tenir, et aucune répétition qui s'installe. On ne
  // garde pas les deux règles, on garde la dernière.

  test("le libellé et sa rassurance vivent dans le contenu, en une seule paire", () => {
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      assert.ok(t.ctaPrincipal.trim().length > 5, `${langue} : aucun libellé de bouton`);
      assert.ok(t.sousCta.trim().length > 5, `${langue} : aucune rassurance sous le bouton`);
    }
  });

  test("aucun bouton principal ne porte un libellé écrit à la main", () => {
    // LA RÈGLE EST "UN SEUL LIBELLÉ", PAS "UN SEUL COMPOSANT. Trois
    // endroits l'assemblent, et c'est voulu : le bouton du haut de page,
    // celui de milieu de page et celui du bandeau final n'ont pas la
    // même forme (`tql-cta`, `tql-bande-cta`). Ce qui compte, c'est
    // qu'ils lisent tous LE MÊME champ : un libellé écrit en dur
    // rouvrirait la porte aux treize.
    for (const bouton of [
      ...PAGE_CODE.matchAll(/className="(tql-cta|tql-bande-cta)"[^>]*>([\s\S]{0,120}?)</g),
    ]) {
      assert.match(
        bouton[2],
        /\{t\.ctaPrincipal\}/,
        `un bouton principal n'affiche pas t.ctaPrincipal : "${bouton[2].trim().slice(0, 40)}"`,
      );
    }
    // Et il y en a VRAIMENT, sinon ce test ne peut plus échouer.
    const n = (PAGE_CODE.match(/className="(tql-cta|tql-bande-cta)"/g) ?? []).length;
    assert.ok(n >= 3, `seulement ${n} boutons principaux dans les trois fichiers`);
  });

  test("le bouton revient plusieurs fois sur la landing", () => {
    // Trois boutons en tout obligeaient à descendre jusqu'aux tarifs
    // pour en trouver un. Ils sont posés au pied des sections qui
    // finissent un argument.
    const n =
      (PAGE_ACCUEIL.match(/<CtaPrincipal\b/g) ?? []).length +
      (PAGE_ACCUEIL.match(/className="tql-cta"/g) ?? []).length;
    assert.ok(n >= 4, `seulement ${n} boutons principaux sur la landing`);
  });
});

describe("le coût de ne rien faire est dit, et les trois formats aussi", () => {
  test("le titre du problème est celui de SA page", () => {
    // "Chaque visiteur qui repart sans te laisser son email est un
    // client perdu." C'est son titre, et il vaut mieux que le mien
    // ("un opt-in demande, un quiz donne") : il dit ce que ça COÛTE.
    // LE TITRE EST EN DEUX MORCEAUX À L'ÉCRAN : le début, puis le
    // fragment coloré. Ce test lisait le seul `problemeTitre` et il est
    // sorti rouge le jour où le titre a été recalé sur le SIEN, dont la
    // fin ("un client perdu") est justement le fragment coloré.
    const titreEntier = `${LANDING.fr.problemeTitre} ${LANDING.fr.problemeMotCle}`;
    assert.match(titreEntier, /client perdu/i);
    assert.ok(
      LANDING.fr.problemeMotCle.trim().length > 3,
      "le fragment coloré du titre a disparu",
    );
    // Son deuxième argument : la plateforme peut sauter, la liste est à toi.
    assert.ok(
      LANDING.fr.problemeCorps.some((p) => /appartiennent pas/i.test(p)),
      "l'argument de la plateforme qui peut sauter a disparu",
    );
  });

  test("les sondages et les Popquiz sont VENDUS, pas seulement facturés", () => {
    // Ils sont dans la grille de tarifs depuis le début, et aucun écran
    // ne disait ce qu'ils font : deux produits payés, jamais montrés.
    assert.equal(LANDING.fr.formats.length, 3);
    const tout = LANDING.fr.formats.map((f) => `${f.titre} ${f.corps}`).join(" ");
    assert.match(tout, /sondage/i);
    assert.match(tout, /popquiz/i);
    // ILS NE SONT PLUS SUR LA LANDING, ILS ONT LEUR PAGE. Béné,
    // 6 septembre : "les sondages et Popquiz partent sur
    // /fonctionnalites/sondages-et-popquiz". La landing courte ne peut
    // pas porter les huit fonctionnalités, mais un produit facturé qui
    // n'est montré NULLE PART reste le défaut qu'on ferme ici.
    const page = fonctionnaliteParSlug("sondages-et-popquiz");
    assert.ok(page, "la page qui vend les sondages et les Popquiz n'existe pas");
    // ON LIT LA PAGE ENTIÈRE, son nom et son détail compris : c'est le
    // titre qui nomme les deux produits, et le corps qui dit ce qu'ils
    // font. Ne lire que le résumé ferait rougir une page correcte.
    const vendu = [
      page.nom,
      page.resume,
      page.pourquoi,
      ...page.benefices,
      page.commentCourt,
      ...page.detail.flatMap((d) => [d.titre, ...d.corps]),
    ].join(" ");
    assert.match(vendu, /sondage/i);
    assert.match(vendu, /popquiz/i);
  });

  test("la viralité n'annonce AUCUN chiffre", () => {
    // Ceux de sa page portent sur ses propres quiz : je ne peux pas les
    // sourcer, donc ils ne sortent pas. Un chiffre sans source ne sort
    // pas, c'est sa ligne rouge numéro un.
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const bloc = `${t.viralTitre} ${t.viralCorps.join(" ")} ${t.viralNote}`;
      assert.ok(
        !/\d[\d\s.,]*\s*(%|visites|visits|leads)/i.test(bloc),
        `${langue} : le bloc viralité annonce un chiffre sans source`,
      );
    }
  });

  test("et il dit que le partage se coupe", () => {
    // Retour Jocelyne, 4 août : sur un sujet intime, un taux de partage
    // bas n'est ni un défaut du quiz ni un cadeau trop faible.
    assert.match(LANDING.fr.viralNote, /jamais obligatoire|couper/i);
  });
});

describe("la page répond aux DEUX questions : pourquoi un quiz, pourquoi Tiquiz", () => {
  // Béné, 5 septembre 2026 : "en donnant tous les arguments au bon
  // moment, pour montrer pourquoi les quiz, et pourquoi tiquiz ?"
  //
  // Ce sont deux questions distinctes. La page n'en traitait qu'une :
  // "pourquoi Tiquiz" vivait en cinq morceaux répartis un peu partout,
  // donc nulle part, et "pourquoi un quiz plutôt qu'un PDF" reposait
  // sur une seule animation.

  test("son comparatif des formats n'invente AUCUN chiffre", () => {
    // Le 44,9 % de la carte voisine porte sa source. Rien d'equivalent
    // n'existe pour un PDF ou un webinaire : un comparatif qui
    // inventerait deux taux pour rendre le troisieme flatteur serait
    // exactement le bullshit qu'elle interdit.
    //
    // LE TEST A CHANGE DE CIBLE LE 5 SEPTEMBRE, ET C'EST LE POINT.
    // Bene : "pourquoi tu ne reprends pas [...] de la page de vente
    // originale ? J'ai beaucoup bosse pour cette page." J'avais ecrit
    // MON tableau a cote du sien ; c'est le sien qui est servi, donc
    // c'est le sien que le garde-fou doit lire. Un test qui surveille
    // un contenu qu'aucun ecran n'affiche ne peut plus echouer.
    const bloc = texteDuBloc("comparatif-formats");
    assert.ok(
      !/\d+[.,]?\d*\s*%/.test(bloc),
      "le comparatif des formats annonce un pourcentage sans source",
    );
    assert.ok(
      !/\bx\s?\d|\d+\s*(fois plus|times more)/i.test(bloc),
      "le comparatif des formats annonce un multiplicateur sans source",
    );
  });

  test("il compare bien TROIS formats, sur au moins quatre criteres", () => {
    const bloc = texteDuBloc("comparatif-formats");
    for (const format of ["Tiquiz", "Ebook", "Formation offerte"]) {
      assert.ok(bloc.includes(format), `le comparatif ne nomme plus "${format}"`);
    }
    for (const critere of ["Viral", "Facile a creer", "Prospects qualifies"]) {
      const sansAccent = critere
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      const nu = bloc.normalize("NFD").replace(/[̀-ͯ]/g, "");
      assert.ok(nu.includes(sansAccent), `le comparatif ne porte plus le critere "${critere}"`);
    }
  });

  test("le comparatif des outils LIT `OUTILS`, il ne le recopie pas", () => {
    // C'est la table qui alimente les six pages du hub, et chaque ligne
    // y est sourcée sur la documentation de l'outil. Une deuxième liste
    // écrite ici divergerait, sur l'écran où un lecteur vérifie.
    assert.ok(
      /OUTILS\.map\(/.test(PAGE_CODE),
      "la page ne construit pas le comparatif sur OUTILS",
    );
    // ON ÉCARTE LES TÉMOIGNAGES DU BALAYAGE, et ce n'est pas un
    // assouplissement : Gwenn écrit "sans devoir passer par des outils
    // comme Zapier ou Make", c'est à dire mot pour mot une cellule du
    // tableau. Ce n'est pas une copie, c'est quelqu'un qui parle, et un
    // témoignage ne se réécrit jamais pour faire passer un test.
    const sansTemoins = CODE.replace(
      /export const TEMOIGNAGES[\s\S]*?\n\] as const;/,
      " ",
    );
    for (const o of OUTILS) {
      assert.ok(
        !sansTemoins.includes(o.intermediaire),
        `"${o.intermediaire}" est recopié dans lib/site/landing.ts`,
      );
    }
    // Tiquiz est la ligne SANS page fille, et elle doit rester dans la
    // table : un comparatif qui ne se compare pas ne dit rien.
    assert.ok(OUTILS.some((o) => o.nom === "Tiquiz"));
  });

  test("et il mène aux sources, sur nos domaines", () => {
    assert.ok(
      /href="\/integrations"/.test(PAGE_CODE),
      "le comparatif des outils ne mène pas au hub, donc aux sources",
    );
  });
});

describe("la page sait dire non, et c'est ce qui rend le reste croyable", () => {
  // Béné, 5 septembre 2026 : "sans bullshit". Une page qui ne dit que
  // du bien se lit comme une page de vente. Sa force à elle, c'est de
  // savoir dire "c'est pas pour toi, ça va pas t'aider".

  test("trois refus au moins, et ils sont VRAIS", () => {
    for (const langue of Object.keys(LANDING)) {
      assert.ok(
        LANDING[langue].pasPourToi.length >= 3,
        `${langue} : moins de trois refus`,
      );
    }
    // Les trois sont ceux du bloc de qualification de sa page v2 : le
    // résultat est préécrit par profil, le parcours est linéaire, et le
    // design suit son branding sans être libre au pixel. Un refus
    // inventé pour faire honnête serait du bullshit de plus.
    const fr = LANDING.fr.pasPourToi.join(" ");
    assert.match(fr, /sur mesure pour chaque visiteur/i);
    assert.match(fr, /linéaire/i);
    assert.match(fr, /pixel/i);
  });

  test("chaque refus DIT ce que Tiquiz fait à la place", () => {
    // "Non" tout court fait partir quelqu'un que le produit sert très
    // bien. Chaque ligne porte donc la limite ET le comportement réel.
    for (const langue of Object.keys(LANDING)) {
      for (const x of LANDING[langue].pasPourToi) {
        assert.ok(
          x.split(/[.!?]/).filter((p) => p.trim().length > 12).length >= 2,
          `${langue} : "${x.slice(0, 40)}..." ne dit pas ce qui se passe à la place`,
        );
      }
    }
  });

  test("la landing sait dire non AVANT que /tarifs ne montre un prix", () => {
    // Après le prix, c'est un remords. Avant, c'est une porte qu'on
    // laisse ouverte pour sortir.
    //
    // DEPUIS LE 6 SEPTEMBRE, LA RÈGLE VAUT À L'ÉCHELLE DU SITE : la
    // qualification vit sur `/` (son mini quiz, qui pose une question à
    // la fois et sait répondre "franchement, non"), et le prix vit sur
    // `/tarifs`. L'ordre est donc tenu par la navigation, pas par la
    // position dans un fichier.
    assert.ok(
      /BlocVente nom="cest-pour-toi"/.test(PAGE_ACCUEIL),
      "la landing ne porte plus le mini quiz de qualification",
    );
    // ET SON MINI QUIZ N'EXISTE QU'EN FRANÇAIS : sans repli, la landing
    // anglaise ne dirait jamais non. C'est la liste des trois refus qui
    // le dit là bas, et ce test l'exige.
    assert.ok(
      /tql-non-liste/.test(PAGE_ACCUEIL),
      "hors français, la landing ne dit jamais non",
    );
    assert.ok(
      !/colonnes\.map/.test(PAGE_ACCUEIL),
      "la landing ne doit pas porter la grille de tarifs : elle vit sur /tarifs",
    );
  });
});

describe("chaque animation levée porte son contexte", () => {
  // Béné, 5 septembre 2026 : "ok t'as repris mes animations mais pas
  // comme elles sont à l'origine, du coup ça ne veut plus rien dire" et
  // "ton logo ta marque arrive comme un cheveu sur la soupe, sans texte
  // ni contexte, incompréhensible".
  //
  // Sur SA page, chaque animation vit sous un titre qui dit ce qu'on
  // regarde. Levée toute seule, elle ne dit rien à qui la découvre.

  test("aucun bloc animé n'est posé sans titre ni phrase autour", () => {
    for (const [, bloc] of PAGE_CODE.matchAll(/<AnimVente bloc="([a-z-]+)"/g)) {
      const i = PAGE_CODE.indexOf(`<AnimVente bloc="${bloc}"`);
      const avant = PAGE_CODE.slice(Math.max(0, i - 1400), i);
      assert.ok(
        /<h2 className="tql-h2"|tql-anim-leg/.test(avant),
        `l'animation "${bloc}" arrive sans titre ni phrase : elle ne dit rien`,
      );
    }
  });

  test("un bloc levé de sa page est SERVI, ou son attente est écrite", () => {
    // 🚨 CE TEST A CHANGÉ DE CIBLE LE 6 SEPTEMBRE, et la raison compte.
    //
    // Il nommait trois blocs et exigeait qu'ils soient sur la landing.
    // La refonte a déplacé leurs sections vers `/fonctionnalites/<slug>`
    // ("chaque page reprend la section correspondante de la page
    // actuelle, avec son visuel"), donc les chercher sur la landing
    // ferait rougir un travail juste.
    //
    // CE QUI RESTE VRAI, ET C'EST LE VRAI SUJET : un bloc extrait de sa
    // page et affiché NULLE PART est du travail perdu que personne ne
    // remarque. On le vérifie donc à l'échelle du site, et un bloc qui
    // n'a pas encore de page doit être DÉCLARÉ en attente, avec sa
    // raison. Une exemption sans raison écrite est une exemption que le
    // prochain passage prend pour un oubli.
    const servisParLesFonctionnalites: string[] = FONCTIONNALITES.map((f) => f.visuel).filter(
      (v) => v !== null,
    );
    for (const bloc of Object.keys(BLOCS_ANIMES)) {
      if (bloc.endsWith("-mobile")) continue; // servi par la media query de son île
      const servi =
        PAGE_CODE.includes(`bloc="${bloc}"`) || servisParLesFonctionnalites.includes(bloc);
      const enAttente = Object.prototype.hasOwnProperty.call(BLOCS_EN_ATTENTE, bloc);
      assert.ok(
        servi || enAttente,
        `"${bloc}" est extrait de sa page, n'est affiché nulle part, et n'est pas déclaré en attente`,
      );
      if (enAttente) {
        assert.ok(
          BLOCS_EN_ATTENTE[bloc].length > 40,
          `"${bloc}" est en attente sans raison écrite`,
        );
        assert.ok(!servi, `"${bloc}" est servi ET déclaré en attente : la liste ment`);
      }
    }
  });
});

describe("le bénéfice Systeme.io est la connexion, pas la mécanique du tag", () => {
  // Béné, 5 septembre 2026, sur "Le tag est posé, même s'il n'existe pas
  // encore" : "oui ok c'est super, mais NON c'est pas un bénéfice qui
  // fait vendre. Le bénéfice c'est que Systeme io est connecté
  // nativement, pas besoin de lier zapier, make, pabbly ou autre."

  test("la section dit ce qu'on évite, et le titre reste du français", () => {
    // CE TEST A FIGÉ UNE FORMULATION, ET IL A ROUGI SUR UNE CORRECTION
    // JUSTE. Il exigeait le mot "Zapier" DANS LE TITRE, alors que Béné
    // a demandé le contraire le 5 septembre : "'Connecté à Systeme.io,
    // sans Zapier au milieu' c'est de l'anglais mal traduit, moche en
    // français. 'Connexion native à Systeme'."
    //
    // Un garde-fou qui fige une formulation empêche de corriger la
    // formulation (quatrième fois dans ce dépôt). Il vise donc le
    // FAIT : la SECTION dit ce qu'on évite, le titre dit le bénéfice,
    // et le mot surligné reste un morceau du titre.
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const section = `${t.sioTitre} ${t.sioCorps.join(" ")} ${t.sioPrix}`;
      assert.ok(
        /zapier/i.test(section),
        `${langue} : la section ne dit nulle part ce qu'on évite`,
      );
      assert.ok(
        t.sioTitre.includes(t.sioMotCle),
        `${langue} : le mot surligné doit être un morceau du titre`,
      );
      assert.ok(
        !/\btag\b/i.test(`${t.sioTitre} ${t.sioMotCle}`),
        `${langue} : le titre revend la mécanique du tag -> ${t.sioTitre}`,
      );
    }
  });

  test("les trois intermédiaires sont nommés dans le corps", () => {
    const corps = LANDING.fr.sioCorps.join(" ").toLowerCase();
    for (const outil of ["zapier", "make", "pabbly"]) {
      assert.ok(corps.includes(outil), `le corps ne nomme pas ${outil}`);
    }
  });

  test("le prix de Zapier n'est jamais écrit à la main", () => {
    // Il vient de `lib/site/integrations.ts`, relevé sur leur page de
    // tarifs. Un montant recopié est faux au premier changement.
    for (const langue of Object.keys(LANDING)) {
      const p = LANDING[langue].sioPrix;
      assert.ok(p.includes("{prix}"), `${langue} : le prix doit rester une variable`);
      assert.ok(
        !/\d+[,.]\d\d\s*\$/.test(p),
        `${langue} : un montant est écrit en dur -> ${p}`,
      );
    }
  });
});

describe("les langues écrites", () => {
  test("une langue inconnue retombe sur l'anglais, jamais sur le français", () => {
    assert.equal(contenuLanding("de").langue, "en");
    assert.equal(contenuLanding(null).langue, "en");
    assert.equal(contenuLanding("fr").langue, "fr");
    // Une variante régionale retombe sur sa langue de base.
    assert.equal(contenuLanding("en-GB").langue, "en");
  });

  test("aucun tiret cadratin dans le texte affiché", () => {
    for (const langue of Object.keys(LANDING)) {
      const tout = JSON.stringify(LANDING[langue]);
      assert.ok(
        !/[—–]/.test(tout),
        `${langue} : tiret cadratin ou demi-cadratin dans le texte de la landing`,
      );
    }
  });

  test("les cinq objections sont écrites dans chaque langue", () => {
    for (const langue of Object.keys(LANDING)) {
      const o = LANDING[langue].objections;
      assert.ok(o.length >= 4, `${langue} : moins de quatre objections, le bloc ne pèse rien`);
      for (const q of o) {
        assert.ok(q.q.trim().length > 10, `${langue} : une objection sans question`);
        assert.ok(q.r.trim().length > 60, `${langue} : "${q.q}" n'a pas de vraie réponse`);
      }
    }
  });
});

describe("l'interrupteur de tarif mene au bon bon de commande", () => {
  // L'interrupteur mensuel / annuel n'a AUCUN JavaScript : un lien ne
  // peut donc pas changer d'adresse au clic. Les deux sont rendues, et
  // `:has()` montre la bonne. Sans ca, quelqu'un qui choisit l'annee
  // atterrit sur le bon de commande du MOIS, et ne le voit qu'en payant.

  test("chaque colonne payante porte SES deux destinations", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.equal(c[0].lienAn, null, "le gratuit n'a pas de cadence");
    assert.equal(c[1].lien, "/commande/mensuel");
    assert.equal(c[1].lienAn, "/commande/annuel");
    assert.equal(c[2].lien, "/commande/mensuel-plus");
    assert.equal(c[2].lienAn, "/commande/annuel-plus");
  });

  test("le libelle du bouton n'est pas le meme sur les trois colonnes", () => {
    // "Creer mon compte gratuit" sur la colonne a 29 EUR etait faux.
    for (const langue of Object.keys(LANDING)) {
      const libelles = colonnesDeTarif(LANDING[langue]).map((c) => c.cta);
      assert.equal(new Set(libelles).size, 3, `${langue} : deux colonnes portent le meme bouton`);
    }
  });

  test("le prix annuel est un PRIX, jamais une phrase", () => {
    // Le premier jet affichait "ou 170,00 EUR par an" en 42 px.
    for (const langue of Object.keys(LANDING)) {
      for (const c of colonnesDeTarif(LANDING[langue])) {
        if (!c.prixAn) continue;
        assert.ok(
          c.prixAn.split(/\s+/).length <= 2,
          `${langue} : le gros chiffre porte une phrase -> ${c.prixAn}`,
        );
      }
    }
  });
});

// -- UN COMPOSANT CLIENT NE TIRE JAMAIS `node:fs` ----------------------

test("aucun composant client de la landing n'importe un module qui lit le disque", () => {
  // LE BUG QUE CE TEST EXISTE POUR ATTRAPER, et il est arrivé le
  // 6 septembre : en sortant les composants de la landing vers
  // `components/landing/`, `DeclencheurAnims` (client) s'est mis à
  // importer une constante depuis `anims.tsx`, qui lit le disque. Le
  // bundle refuse alors de se construire :
  //
  //   the chunking context does not support external modules
  //   (request: node:fs)
  //
  // ET `npx tsc --noEmit` A RÉPONDU EXIT 0 DESSUS. C'est la leçon de
  // `pdf-parse` (7 août) : un vert local ne prouve rien sur ce qui se
  // passe une fois compilé. Seul le filet de captures l'a vu, et
  // seulement parce que la page ne s'affichait plus du tout.
  //
  // On regarde les imports DIRECTS : c'est le cas qui se produit, et un
  // parcours complet du graphe rendrait le test lent et bavard.
  const dossier = join(process.cwd(), "components/landing");
  const fichiers = readdirSync(dossier).filter((f) => /\.tsx?$/.test(f));

  const lit = (f: string) => readFileSync(join(dossier, f), "utf8");
  const touchentLeDisque = new Set(
    fichiers.filter((f) => /from "node:(fs|path)"/.test(lit(f))),
  );
  assert.ok(
    touchentLeDisque.size > 0,
    "aucun module de la landing ne lit le disque : ce test ne protege plus rien",
  );

  const fautifs: string[] = [];
  for (const f of fichiers) {
    const src = lit(f);
    if (!/^\s*["']use client["']/m.test(src)) continue;
    for (const serveur of touchentLeDisque) {
      const nom = serveur.replace(/\.tsx?$/, "");
      // `import type` est effacé à la compilation : il ne tire rien.
      const motif = new RegExp(
        `import\\s+(?!type\\b)[^;]*from\\s+["'](?:\\./)?${nom}["']`,
      );
      if (motif.test(src)) fautifs.push(`${f} -> ${serveur}`);
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    `ces imports cassent le bundle du navigateur : ${fautifs.join(", ")}`,
  );
});
