// tests/logic/generateur-page.test.mts
//
// LA PAGE DU GÉNÉRATEUR (/generateur-de-quiz), ET CE QU'ELLE PROMET.
//
// Béné, 8 septembre 2026 : "le générateur de quiz sur une page dédiée,
// optimisée seo, dans le style du blog et des pages de ventes etc."
//
// Ce fichier fige des FAITS, jamais des formulations : le texte de la
// page se réécrit librement, les chiffres et les mécaniques non.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { FREE_LIMITS } from "@/lib/planLimits";
import { QUIZ_LANGUAGES } from "@/lib/quizLanguages";
import { PAGES_PUBLIQUES, languesDePage } from "@/lib/site/pagesPubliques";
import { clicASignaler } from "@/lib/affiliate/signalerClic";
import { PIED } from "@/lib/site/nav";
import { cadreDuGenerateur, remisePourLeBouton } from "@/lib/embed/remise";
import { buildQuizGenerationPrompt } from "@/lib/prompts/quiz/system";
import { LANGUES_PUBLIQUES, cheminPourLangue } from "@/lib/site/langues";
import {
  CHEMIN_GENERATEUR,
  CHROME_GENERATEUR,
  FENETRE_HEURES,
  LIMITE_PAR_IP,
  LANGUES_ET_VARIANTES,
  applicationJsonLd,
  ceQueLIaEcrit,
  ceQuilNeFaitPas,
  etapes,
  faq,
  faqJsonLd,
  urlGenerateur,
} from "@/lib/site/generateurQuiz";
import { cheminPageDuSite } from "./aide/pageDuSite.mts";

const RACINE = process.cwd();
// UN GROUPE DE ROUTES N'AJOUTE AUCUN SEGMENT D'URL : ecrire
// `app/(site)/generateur-de-quiz/page.tsx` en dur figerait un RANGEMENT,
// pas une adresse, et rougirait au premier deplacement de groupe (ce qui
// est arrive a deux tests le 8 septembre).
const PAGE = join(RACINE, cheminPageDuSite(CHEMIN_GENERATEUR));

/** Le fichier, sans ses commentaires : un test qui mesure la présence
 *  de quelque chose dans une source tombe sinon sur sa propre
 *  explication (faute refaite cinq fois dans ce dépôt). */
function sansCommentaires(chemin: string): string {
  return readFileSync(chemin, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

test("le nombre de quiz annoncé est celui que le compteur applique", () => {
  // ON NE RECOPIE PAS UN CHIFFRE DANS UNE PAGE QUI PROMET QUELQUE CHOSE.
  // Les deux moitiés comptent, et une seule ne prouverait rien :
  //
  //  1. la FAQ INTERPOLE les valeurs (elle ne les réécrit pas) ;
  //  2. le compteur les LIT dans le même module pur, au lieu de porter
  //     son propre littéral.
  //
  // Sans la deuxième, la page pourrait annoncer 2 pendant que le
  // limiteur en applique 10, et personne ne le verrait avant qu'une
  // visiteuse ne se fasse couper.
  const reponse = faq("fr").find((q) => q.r.includes("La seule borne est technique"));
  assert.ok(reponse, "la FAQ ne dit plus quelle est la borne");
  assert.match(
    reponse!.r,
    new RegExp(`${LIMITE_PAR_IP} quiz par ${FENETRE_HEURES} heures`),
    "la FAQ annonce une borne que le module ne porte pas",
  );

  const compteur = sansCommentaires(join(RACINE, "lib/embed/rateLimit.ts"));
  assert.match(
    compteur,
    /from "@\/lib\/embed\/limites"/,
    "le compteur ne lit plus les bornes dans le module pur",
  );
  assert.doesNotMatch(
    compteur,
    /const\s+(LIMITE_PAR_IP|LIMITE_PAR_EMAIL|FENETRE_HEURES)\s*=/,
    "le compteur redéclare une borne au lieu de la lire : les deux vont diverger",
  );
});

test("la page publique n'importe jamais le compteur, qui tire supabaseAdmin", () => {
  // `lib/embed/rateLimit.ts` importe `supabaseAdmin`, qui LÈVE au
  // chargement quand une variable d'environnement manque. Un module lu
  // par une page publique (et par ce runner) qui l'importerait ferait
  // répondre 500 sans base : c'est le drame du 30 août, où un `import`
  // en tête de `commentairesStore.ts` tuait toute la page d'article.
  const page = sansCommentaires(join(RACINE, "lib/site/generateurQuiz.ts"));
  assert.doesNotMatch(page, /lib\/embed\/rateLimit/);
  assert.match(page, /from "@\/lib\/embed\/limites"/);
});

test("le nombre de langues annoncé est celui du catalogue", () => {
  assert.equal(LANGUES_ET_VARIANTES, QUIZ_LANGUAGES.length);
});

test("chaque bloc nomme le fichier qui le rend vrai, et ce fichier existe", () => {
  // Même geste que `lib/site/fonctionnalites.ts` : une fonctionnalité
  // retirée du produit fait rougir la page qui la vend.
  for (const b of ceQueLIaEcrit("fr")) {
    assert.ok(b.source, `${b.titre} ne nomme aucune source`);
    assert.ok(
      existsSync(join(RACINE, b.source)),
      `${b.titre} cite ${b.source}, qui n'existe pas`,
    );
  }
});

test("un refus dit toujours ce qui se passe à la place", () => {
  // Béné, 5 septembre : un refus qui ne dit pas ce qui se passe à la
  // place n'est pas un refus, c'est une excuse.
  const refus = ceQuilNeFaitPas("fr");
  assert.ok(refus.length >= 3);
  for (const r of refus) {
    assert.ok(r.refus.trim().length > 0);
    assert.ok(
      r.alaplace.trim().length > 40,
      `"${r.refus}" ne dit pas ce que Tiquiz fait a la place`,
    );
  }
});

test("les limites du gratuit viennent de FREE_LIMITS, jamais recopiées", () => {
  const question = faq("fr").find((f) => f.r.includes("floutées"));
  assert.ok(question, "la FAQ ne parle plus de ce que le plan gratuit borne");
  assert.ok(
    question!.r.includes(String(FREE_LIMITS.visibleLeadsPerMonth)),
    "le nombre de reponses lisibles ne vient pas de FREE_LIMITS",
  );
  // ET LE MODULE NE PORTE AUCUN CHIFFRE DE PLAN ÉCRIT À LA MAIN : le
  // seul moyen d'être juste au prochain réglage est de le lire.
  const src = readFileSync(join(RACINE, "lib/site/generateurQuiz.ts"), "utf-8");
  assert.ok(
    src.includes("FREE_LIMITS.visibleLeadsPerMonth"),
    "la FAQ recopie une limite au lieu de lire FREE_LIMITS",
  );
});

test("le JSON-LD dit exactement ce que l'écran affiche", () => {
  const questions = faq("fr");
  const ld = faqJsonLd("fr") as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };
  assert.equal(ld.mainEntity.length, questions.length);
  ld.mainEntity.forEach((e, i) => {
    assert.equal(e.name, questions[i].q);
    assert.equal(e.acceptedAnswer.text, questions[i].r);
  });
  // `price: "0"` n'est pas une formule : la route de generation ne
  // demande ni compte ni paiement. Si ca changeait, cette ligne
  // deviendrait un mensonge servi a Google.
  const app = applicationJsonLd("fr") as { offers: { price: string }; url: string };
  assert.equal(app.offers.price, "0");
  assert.ok(app.url.endsWith(CHEMIN_GENERATEUR));
  const routeGeneration = readFileSync(
    join(RACINE, "app/api/embed/quiz/generate/route.ts"),
    "utf-8",
  );
  assert.ok(
    !/getUser\(\)|requireAuth|auth\.getSession/.test(routeGeneration),
    "la generation demande maintenant un compte : le JSON-LD annonce encore price 0 sans compte",
  );
});

test("la page monte le générateur en contexte page, jamais en iframe", () => {
  // C'EST LE FAIT QUI COMPTE : hors iframe, `window.parent` est
  // `window`, donc la remise par message serait un bouton MORT.
  const page = sansCommentaires(PAGE);
  assert.ok(page.includes('contexte="page"'), "la page ne dit pas ou vit le generateur");
  assert.ok(
    !page.includes('contexte="iframe"'),
    "la page dediee se declare dans une iframe : le bouton ne ferait rien",
  );
});

test("hors iframe le bouton NAVIGUE, dans une iframe il envoie un message", () => {
  const jeton = "3f1d4c7e-9a2b-4c8d-9e1f-2a3b4c5d6e7f";
  const page = remisePourLeBouton("page", jeton);
  assert.equal(page.genre, "navigation");
  assert.ok(
    page.genre === "navigation" && page.url.includes(jeton),
    "le jeton ne voyage pas dans la navigation : le quiz serait perdu",
  );
  assert.equal(remisePourLeBouton("iframe", jeton).genre, "message");
});

test("le cadre de la page ne ROGNE pas l'éditeur, et lui rend l'écran", () => {
  // DEUX FAITS, ET LE TEST NE FIGE AUCUNE ÉCRITURE.
  //
  // 1. L'éditeur est en `h-screen` chez lui (`QuizDetailClient`). Une
  //    boîte plus COURTE, avec `overflow-hidden`, lui couperait le bas
  //    SANS qu'aucune capture ne le dise : un débordement n'est une
  //    perte que s'il est rogné, et là il le serait.
  // 2. Béné, 8 septembre : "il faut mettre le véritable éditeur en
  //    pleine page." Une boîte bornée par la colonne d'une page
  //    marketing rend une grille à trois colonnes en 300 px de large,
  //    donc un outil qui a l'air cassé sur la page qui doit donner
  //    envie.
  //
  // La première version de ce test exigeait la chaîne `h-screen` dans
  // la boîte. Il est donc sorti ROUGE le jour où la boîte est passée en
  // surcouche `fixed inset-0`, c'est à dire sur une correction JUSTE :
  // huitième fois qu'un garde-fou qui fige une FORMULATION empêche de
  // corriger la formulation. Il vise maintenant le FAIT.
  const editeur = readFileSync(join(RACINE, "components/quiz/QuizDetailClient.tsx"), "utf-8");
  assert.ok(
    editeur.includes('"h-screen flex flex-col bg-background overflow-hidden"'),
    "la racine de l'editeur a change de hauteur : relire cadreDuGenerateur",
  );

  const cadre = cadreDuGenerateur("page");
  // Le viewport ENTIER, et rien de moins : `fixed inset-0` ou `h-screen`.
  const rendLeViewport = /fixed\s+inset-0/.test(cadre.editeur) || /\bh-screen\b/.test(cadre.editeur);
  assert.ok(rendLeViewport, "la boite est plus courte que l'editeur : son bas serait rogne");
  assert.ok(
    !/h-\[\d+vh\]|max-h-|max-w-/.test(cadre.editeur),
    "une boite bornee rogne l'editeur ou l'ecrase : il lui faut l'ecran",
  );
  // Une surcouche verrouille ce qu'il y a DERRIÈRE, sinon la molette
  // traverse et la page marketing défile sous l'éditeur.
  if (/fixed/.test(cadre.editeur)) {
    assert.ok(cadre.verrouillerLeDefilement, "la surcouche laisse defiler la page derriere");
  }

  // Et dans une iframe, aucune boite ni aucun verrou : le document est
  // a lui tout seul, il n'y a rien derriere.
  assert.equal(cadreDuGenerateur("iframe").editeur, "");
  assert.equal(cadreDuGenerateur("iframe").verrouillerLeDefilement, false);
});

test("l'éditeur pleine page porte un retour vers le générateur", () => {
  // Béné, 8 septembre : "en mettant un bouton pour revenir sur le
  // générateur." Sans lui, la surcouche est un cul-de-sac : le visiteur
  // n'a plus aucun moyen de refaire un quiz, et la page marketing est
  // hors d'atteinte derrière.
  //
  // Le retour vit DANS la barre de l'éditeur, à la place exacte où une
  // créatrice connectée trouve sa flèche : c'est le "on doit coller au
  // mieux à l'intérieur de tiquiz".
  const editeur = sansCommentaires(join(RACINE, "components/quiz/QuizDetailClient.tsx"));
  assert.match(
    editeur,
    /isEmbed && onEmbedRetour/,
    "l'editeur n'offre plus de retour au generateur",
  );
  assert.match(
    editeur,
    /t\("embedBackToGenerator"\)/,
    "le retour n'a pas de libelle traduit : l'interface existe en 7 langues",
  );

  const client = sansCommentaires(join(RACINE, "components/embed/EmbedPreviewClient.tsx"));
  assert.match(client, /onEmbedRetour=\{/, "le generateur ne passe aucun retour a l'editeur");
  // Le retour ne JETTE pas le quiz : il existe en base, son jeton est
  // gardé, et repartir dessus est un clic. Remettre le jeton à vide
  // ferait repartir une deuxième génération sans le quiz déjà écrit.
  assert.ok(
    !/setSessionToken\(""\)/.test(client),
    "le retour vide le jeton : le quiz deja ecrit serait perdu",
  );
});

test("la page est déclarée au sitemap ET atteignable depuis le pied de page", () => {
  assert.ok(
    PAGES_PUBLIQUES.some((p) => p.chemin === CHEMIN_GENERATEUR),
    "la page n'est pas declaree : elle dependrait d'un robot qui suit un lien",
  );
  const liens = PIED.flatMap((c) => c.liens.map((l) => l.href));
  assert.ok(
    liens.includes(CHEMIN_GENERATEUR),
    "aucun humain ne peut trouver la page depuis le site",
  );
});

test("aucun tiret cadratin dans ce que la visiteuse lit", () => {
  // TOUTES LES LANGUES, pas seulement le francais : la regle du 7 juin
  // porte sur ce qu'une visiteuse LIT, quelle que soit la page servie.
  for (const langue of LANGUES_PUBLIQUES) {
    const visible = [
      ...etapes(langue).flatMap((e) => [e.titre, e.corps]),
      ...ceQueLIaEcrit(langue).flatMap((b) => [b.titre, ...b.corps]),
      ...ceQuilNeFaitPas(langue).flatMap((r) => [r.refus, r.alaplace]),
      ...faq(langue).flatMap((f) => [f.q, f.r]),
      ...Object.values(CHROME_GENERATEUR[langue]),
    ];
    for (const texte of visible) {
      assert.ok(!/[—–]/.test(texte), `${langue} : tiret cadratin dans ${texte.slice(0, 60)}`);
    }
  }
});

test("le formulaire public expose les MÊMES réglages que le vrai Tiquiz", () => {
  // Béné, 8 septembre : "pour obtenir la même qualité de quiz, il faut
  // réutiliser la fonction 'créer un quiz avec l'ia' du vrai tiquiz
  // [...] on doit coller au mieux à l'intérieur de tiquiz en fait." Et,
  // nommément : "il faudrait aussi demander au départ si le visiteur
  // veut un quiz scoré ou profil, en expliquant brièvement ce que c'est,
  // pour montrer que les deux sont dispo."
  //
  // C'EST LA DÉCISION QUI BLOQUE : Véronique a perdu deux jours sur un
  // quiz scoré qu'elle voulait par profil (2 août 2026), parce que rien
  // ne le lui avait demandé.
  const form = sansCommentaires(join(RACINE, "components/embed/EmbedForm.tsx"));
  for (const champ of ["format", "quizType", "resultCount", "intention", "tone"]) {
    assert.match(
      form,
      new RegExp(`inputs\\.${champ}\\b`),
      `le formulaire public n'expose pas ${champ} : le visiteur ne voit pas ce que Tiquiz sait faire`,
    );
  }
  // Les deux mécaniques sont EXPLIQUÉES, jamais nommées toutes seules.
  const mots = sansCommentaires(join(RACINE, "components/embed/embed-i18n.ts"));
  assert.match(mots, /typeProfileDesc:/);
  assert.match(mots, /typeScoringDesc:/);

  // ET LE NOMBRE DE QUESTIONS N'EST PLUS UN RÉGLAGE À CÔTÉ DU FORMAT :
  // le vrai formulaire le DÉDUIT (court -> 4, long -> 8), et deux
  // réglages pour une seule décision, c'est un des deux qui mentira.
  assert.ok(
    !/inputs\.questionCount/.test(form),
    "le format ET un compteur de questions : deux reglages pour une decision",
  );
  const route = sansCommentaires(join(RACINE, "app/api/embed/quiz/generate/route.ts"));
  assert.match(
    route,
    /questionCount\s*=\s*format === "long"/,
    "la route ne deduit plus le nombre de questions du format",
  );
});

test("le SUJET du quiz n'est plus lu comme une intention business", () => {
  // C'ÉTAIT UNE CAUSE MESURÉE DU "résultat pas ouf" (Béné, 8 septembre).
  // Le premier champ du générateur public s'appelle "Sujet de ton quiz",
  // et il était poussé dans `intention` : le modèle lisait donc
  // "INTENTION BUSINESS : la productivité pour entrepreneurs débordés"
  // et devait faire servir CHAQUE CTA de résultat à ça.
  const route = sansCommentaires(join(RACINE, "app/api/embed/quiz/generate/route.ts"));
  assert.ok(
    !/intention:\s*topic/.test(route),
    "le sujet repart dans l'intention business : chaque CTA servira un sujet",
  );
  assert.match(route, /sujet:\s*topic/, "le sujet n'a plus de place dans le prompt");

  // Et la fente existe VRAIMENT dans le prompt partagé : sans elle,
  // `sujet` serait passé et jeté en silence.
  const prompt = buildQuizGenerationPrompt({
    objective: "qualifier",
    target: "freelances",
    sujet: "la productivite pour entrepreneurs debordes",
    intention: "vendre ma formation a 27 euros",
  });
  assert.match(prompt.user, /SUJET DU QUIZ : la productivite/);
  assert.match(prompt.user, /INTENTION BUSINESS : vendre ma formation/);
  // Sans sujet, aucune ligne vide : le formulaire de l'app n'a pas ce
  // champ, et une ligne "SUJET DU QUIZ :" nue apprend au modele qu'il
  // peut en inventer un.
  const sansSujet = buildQuizGenerationPrompt({ objective: "qualifier", target: "freelances" });
  assert.ok(!sansSujet.user.includes("SUJET DU QUIZ"), "une ligne SUJET vide part au modele");
});

test("les bornes annoncées au visiteur sont celles qui s'appliquent", () => {
  // Les deux messages de refus annonçaient encore "1h" alors que la
  // fenêtre est passée à 24 h : un message qui promet un délai plus
  // court que le vrai fait revenir quelqu'un pour rien.
  const route = sansCommentaires(join(RACINE, "app/api/embed/quiz/generate/route.ts"));
  assert.ok(
    !/dans 1h|dans 1 h/.test(route),
    "un refus annonce encore une heure : la fenetre est de 24 h",
  );
  assert.match(route, /\$\{FENETRE_HEURES\}/, "le delai est recopie au lieu d'etre lu");
});

// ─────────────────────────────────────────────────────────────────────
// L'AFFILIATION : la page du générateur commissionne comme le reste
// ─────────────────────────────────────────────────────────────────────
//
// Béné, 8 septembre 2026 : "attention le générateur aussi doit prendre
// l'affiliation en compte comme TOUT le site tiquiz.fr. Le générateur
// pourra être offert en lead magnet par mes affiliés qui les enverront
// direct sur cette page avec leur ref."
//
// MESURÉ AVANT D'ÉCRIRE CE BLOC : rien ne manquait. Je le dis dans ce
// sens là, comme le test du 6 septembre : il ne corrige pas un trou, il
// EMPÊCHE d'en creuser un. Et c'est exactement le genre de trou qui ne
// se voit sur aucun écran : la page s'affiche, le quiz se génère, le
// compte se crée, et l'affiliée n'est payée sur rien.
//
// LA CHAÎNE A QUATRE MAILLONS, et il les faut tous les quatre :
//
//   1. le middleware pose `tq_ref` en arrivant sur la page ;
//   2. le clic est COMPTÉ sur ce chemin, sinon l'affiliée voit sa page
//      s'afficher et son compteur rester à zéro ;
//   3. le bouton "Garder mon quiz" NAVIGUE vers `/signup` sur la MÊME
//      origine (un `postMessage` ne poserait rien, et une adresse
//      absolue ferait perdre le cookie) ;
//   4. `/api/auth/signup` relit le cookie et rattache l'inscrit.
//
// Un test qui n'en tiendrait qu'un passerait au vert sur une page où
// l'affiliation est morte.

test("un lien affilié compte sur la page du générateur, en français comme en anglais", () => {
  for (const chemin of ["/generateur-de-quiz", "/en/generateur-de-quiz"]) {
    assert.equal(
      clicASignaler({ ref: "jocelyne", pathname: chemin, accept: "text/html" }),
      true,
      `une affiliée qui envoie du monde sur ${chemin} doit voir son clic`,
    );
  }
});

test("la page du générateur est déclarée, donc le cookie affilié y passe", () => {
  // Le `matcher` du middleware couvre tout sauf les fichiers statiques,
  // et chacune de ses sorties passe par `poseSa`. Ce qui se vérifie
  // ici, c'est que la page est bien DANS la liste des pages publiques :
  // c'est elle que le test du tracking parcourt.
  const chemins = PAGES_PUBLIQUES.map((p) => p.chemin);
  assert.ok(
    chemins.includes("/generateur-de-quiz"),
    "une page hors de cette liste sort du filet du tracking affilié",
  );
});

test("le rattachement lit le cookie posé à l'arrivée, il ne le redemande pas", () => {
  const signup = sansCommentaires(join(RACINE, "app/api/auth/signup/route.ts"));
  assert.match(
    signup,
    /rattacherInscrit\(/,
    "sans lui, l'affiliée perd son prospect à l'expiration du cookie",
  );
  assert.match(
    signup,
    /req\.cookies\.get\(REF_COOKIE\)/,
    "le lien vient du COOKIE posé par le middleware, jamais du corps de la requête",
  );
});

// ─────────────────────────────────────────────────────────────────────
// LES DEUX LANGUES : une structure, un texte par langue
// ─────────────────────────────────────────────────────────────────────
//
// Béné, 8 septembre 2026 : "toutes les pages et mêmes les articles
// doivent être multilangues, j'espère que tu as anticipé."
//
// LE COMPILATEUR REFUSE DÉJÀ une langue incomplète : `TEXTES_EN` est un
// `Record` sur les identifiants, donc en oublier un ne compile pas. Ce
// qu'il ne peut PAS voir, c'est un texte laissé en français dans l'objet
// anglais, ni une ponctuation française dans une phrase anglaise : ça
// s'affiche parfaitement, et Google indexe alors du français sous une
// adresse anglaise.

describe("chaque langue declaree porte vraiment le texte", () => {
  test("la page declare exactement les langues qu'elle sert", () => {
    // Déclarer une langue qu'une page n'a pas met son adresse dans le
    // sitemap ET dans ses `hreflang`, et Google y trouve du français :
    // l'anglais est alors jugé sur du contenu dupliqué.
    const page = PAGES_PUBLIQUES.find((p) => p.chemin === CHEMIN_GENERATEUR);
    assert.ok(page, "la page du generateur n'est plus declaree");
    for (const langue of languesDePage(page!)) {
      assert.ok(
        CHROME_GENERATEUR[langue],
        `${langue} est declaree au sitemap et n'a aucun texte`,
      );
    }
  });

  test("la structure est la MEME dans toutes les langues", () => {
    // Le `source`, l'ordre et les identifiants vivent UNE fois, en
    // français : une langue n'apporte que du texte. Sans ça, deux
    // adresses appariées par `hreflang` désigneraient deux pages
    // différentes.
    const fr = {
      blocs: ceQueLIaEcrit("fr"),
      etapes: etapes("fr"),
      refus: ceQuilNeFaitPas("fr"),
      faq: faq("fr"),
    };
    for (const langue of LANGUES_PUBLIQUES) {
      const blocs = ceQueLIaEcrit(langue);
      assert.equal(blocs.length, fr.blocs.length, `${langue} : pas le meme nombre de blocs`);
      blocs.forEach((b, i) => {
        assert.equal(b.id, fr.blocs[i].id, `${langue} : bloc ${i} n'a pas le meme id`);
        assert.equal(b.source, fr.blocs[i].source, `${langue} : bloc ${b.id} change de source`);
      });
      assert.deepEqual(
        etapes(langue).map((e) => e.id),
        fr.etapes.map((e) => e.id),
        `${langue} : les etapes ne sont plus les memes`,
      );
      assert.deepEqual(
        ceQuilNeFaitPas(langue).map((r) => r.id),
        fr.refus.map((r) => r.id),
        `${langue} : les refus ne sont plus les memes`,
      );
      assert.deepEqual(
        faq(langue).map((q) => q.id),
        fr.faq.map((q) => q.id),
        `${langue} : la FAQ ne pose plus les memes questions`,
      );
    }
  });

  test("aucune langue ne rend le texte d'une autre", () => {
    // Le piège exact : un identifiant recopié du français compile très
    // bien, et la page anglaise affiche alors une carte française au
    // milieu des autres.
    const frBlocs = ceQueLIaEcrit("fr");
    const frFaq = faq("fr");
    for (const langue of LANGUES_PUBLIQUES) {
      if (langue === "fr") continue;
      ceQueLIaEcrit(langue).forEach((b, i) => {
        assert.notEqual(b.titre, frBlocs[i].titre, `${langue} : ${b.id} garde le titre francais`);
      });
      faq(langue).forEach((q, i) => {
        assert.notEqual(q.q, frFaq[i].q, `${langue} : ${q.id} garde la question francaise`);
      });
    }
  });

  test("un refus dit ce qui se passe a la place, dans toutes les langues", () => {
    for (const langue of LANGUES_PUBLIQUES) {
      for (const r of ceQuilNeFaitPas(langue)) {
        assert.ok(r.refus.trim().length > 0, `${langue} : ${r.id} n'a pas de refus`);
        assert.ok(
          r.alaplace.trim().length > 40,
          `${langue} : "${r.refus}" ne dit pas ce que Tiquiz fait a la place`,
        );
      }
    }
  });

  test("le chrome existe en entier dans chaque langue", () => {
    for (const langue of LANGUES_PUBLIQUES) {
      const t = CHROME_GENERATEUR[langue];
      assert.ok(t, `${langue} : aucun chrome`);
      for (const [cle, valeur] of Object.entries(t)) {
        assert.ok(String(valeur).trim().length > 0, `${langue} : ${cle} est vide`);
      }
    }
  });

  test("la typographie anglaise est anglaise", () => {
    // Même faute que le blog anglais du 8 septembre, et elle était
    // MIENNE : `40 %` avec une espace et `17 EUR` au lieu de `$29.99`.
    // Une règle écrite pour une langue, appliquée telle quelle à une
    // autre : c'est la faute du 1er août.
    const tout = [
      ...etapes("en").flatMap((e) => [e.titre, e.corps]),
      ...ceQueLIaEcrit("en").flatMap((b) => [b.titre, ...b.corps]),
      ...ceQuilNeFaitPas("en").flatMap((r) => [r.refus, r.alaplace]),
      ...faq("en").flatMap((f) => [f.q, f.r]),
      ...Object.values(CHROME_GENERATEUR.en),
    ].join("\n");
    assert.ok(!/\d\s%/.test(tout), "un pourcentage decolle : a l'anglaise il se colle");
    assert.ok(!/\s[?!;](\s|$)/.test(tout), "une espace devant une ponctuation");
    assert.ok(!/\w\s:(\s|$)/.test(tout), "une espace devant un deux-points");
  });

  test("le JSON-LD annonce l'adresse de SA langue", () => {
    // Une page anglaise qui annoncerait l'adresse francaise dirait a
    // Google que la version de reference est ailleurs : l'anglais ne
    // serait jamais indexe, et rien a l'ecran ne le dirait.
    for (const langue of LANGUES_PUBLIQUES) {
      const attendu = cheminPourLangue(CHEMIN_GENERATEUR, langue);
      const app = applicationJsonLd(langue) as {
        url: string;
        inLanguage: string;
        offers: { price: string };
      };
      assert.equal(app.url, urlGenerateur(langue), `${langue} : l'URL du JSON-LD n'est pas la sienne`);
      assert.ok(app.url.endsWith(attendu), `${langue} : le JSON-LD annonce ${app.url}`);
      assert.equal(app.inLanguage, langue, `${langue} : inLanguage ne suit pas l'adresse`);
      assert.equal(app.offers.price, "0", `${langue} : le prix annonce n'est plus zero`);

      const questions = faq(langue);
      const ld = faqJsonLd(langue) as { mainEntity: { name: string }[] };
      assert.equal(ld.mainEntity.length, questions.length, `${langue} : la FAQ structuree diverge`);
      assert.equal(ld.mainEntity[0].name, questions[0].q, `${langue} : la FAQ structuree ment`);
    }
  });
});
