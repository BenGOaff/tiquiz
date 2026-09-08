// tests/logic/generateur-page.test.mts
//
// LA PAGE DU GÉNÉRATEUR (/generateur-de-quiz), ET CE QU'ELLE PROMET.
//
// Béné, 8 septembre 2026 : "le générateur de quiz sur une page dédiée,
// optimisée seo, dans le style du blog et des pages de ventes etc."
//
// Ce fichier fige des FAITS, jamais des formulations : le texte de la
// page se réécrit librement, les chiffres et les mécaniques non.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { FREE_LIMITS } from "@/lib/planLimits";
import { QUIZ_LANGUAGES } from "@/lib/quizLanguages";
import { PAGES_PUBLIQUES } from "@/lib/site/pagesPubliques";
import { PIED } from "@/lib/site/nav";
import { cadreDuGenerateur, remisePourLeBouton } from "@/lib/embed/remise";
import { buildQuizGenerationPrompt } from "@/lib/prompts/quiz/system";
import {
  CE_QUE_LIA_ECRIT,
  CE_QUIL_NE_FAIT_PAS,
  CHEMIN_GENERATEUR,
  ETAPES,
  FAQ,
  FENETRE_HEURES,
  LIMITE_PAR_IP,
  LANGUES_ET_VARIANTES,
  applicationJsonLd,
  faqJsonLd,
} from "@/lib/site/generateurQuiz";

const RACINE = process.cwd();
const PAGE = join(RACINE, "app/(site)/generateur-de-quiz/page.tsx");

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
  const reponse = FAQ.find((q) => q.r.includes("La seule borne est technique"));
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
  for (const b of CE_QUE_LIA_ECRIT) {
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
  assert.ok(CE_QUIL_NE_FAIT_PAS.length >= 3);
  for (const r of CE_QUIL_NE_FAIT_PAS) {
    assert.ok(r.refus.trim().length > 0);
    assert.ok(
      r.alaplace.trim().length > 40,
      `"${r.refus}" ne dit pas ce que Tiquiz fait a la place`,
    );
  }
});

test("les limites du gratuit viennent de FREE_LIMITS, jamais recopiées", () => {
  const question = FAQ.find((f) => f.r.includes("floutées"));
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
  const ld = faqJsonLd() as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  assert.equal(ld.mainEntity.length, FAQ.length);
  ld.mainEntity.forEach((e, i) => {
    assert.equal(e.name, FAQ[i].q);
    assert.equal(e.acceptedAnswer.text, FAQ[i].r);
  });
  // `price: "0"` n'est pas une formule : la route de generation ne
  // demande ni compte ni paiement. Si ca changeait, cette ligne
  // deviendrait un mensonge servi a Google.
  const app = applicationJsonLd() as { offers: { price: string }; url: string };
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
  const visible = [
    ...ETAPES.flatMap((e) => [e.titre, e.corps]),
    ...CE_QUE_LIA_ECRIT.flatMap((b) => [b.titre, ...b.corps]),
    ...CE_QUIL_NE_FAIT_PAS.flatMap((r) => [r.refus, r.alaplace]),
    ...FAQ.flatMap((f) => [f.q, f.r]),
  ];
  for (const texte of visible) {
    assert.ok(!/[—–]/.test(texte), `tiret cadratin dans : ${texte.slice(0, 60)}`);
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
