// tests/logic/charge-avec-le-html.test.mts
//
// LA CHARGE DU QUIZ PART AVEC LE HTML, ET ELLE N'ETEINT RIEN AU PASSAGE
// (chantier 2 de Bene, 9 septembre 2026).
//
// Ce que ces gardes protegent, dans l'ordre du plus cher au moins cher :
//
// 1. LES CHIFFRES DE LA CREATRICE. Le viewer avait deja une prop qui
//    saute l'appel d'API : `previewData`. La reutiliser aurait ete la
//    solution en une ligne, et elle aurait coupe EN SILENCE le suivi des
//    vues, des demarrages et des completions de TOUS les quiz en ligne,
//    plus la reprise de session et le brouillon de reponse : neuf
//    comportements sont gates dessus. C'est la faute du 1er aout, une
//    logique ecrite pour un cas appliquee telle quelle a un autre.
//    D'ou une prop SEPAREE, `donneesServeur`, qui ne fait qu'amorcer
//    l'etat.
//
// 2. UN SEUL CALCUL POUR LES DEUX PORTES. La page et la route appellent
//    `chargerQuizPublic`. Recalculer la charge cote page donnerait deux
//    reponses pour le meme quiz selon la porte empruntee : c'est le
//    defaut sorti six fois dans ce depot (les reseaux de partage, le
//    score, l'alignement du sous-titre, la disposition des reponses).
//
// 3. AUCUN BROUILLON SERVI A UN INCONNU. La page appelle avec un jeton
//    d'embed NUL et un utilisateur NUL : elle ne peut donc livrer qu'un
//    quiz actif. Les apercus continuent de passer par le client, qui
//    envoie ses cookies.
//
// CE QUE CES GARDES NE PROUVENT PAS, ET IL FAUT LE DIRE :
// `chargerQuizPublic` importe `supabaseAdmin`, qui LEVE au chargement
// quand les variables d'environnement manquent. Aucun test ne peut donc
// l'appeler : ce qui le concerne est lu dans sa SOURCE, commentaires
// retires. Seule la recomposition (`chargeDuViewer`) est pure, donc
// vraiment exercee.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargeDuViewer } from "@/lib/quiz/chargeViewer";
import { sansCommentaires } from "./aide/sansCommentaires.mts";
import { SOURCE_CHARGE_PUBLIQUE } from "./aide/chargePublique.mts";

const lire = (rel: string) =>
  sansCommentaires(readFileSync(new URL(rel, import.meta.url), "utf8"));

const VIEWER = lire("../../components/quiz/PublicQuizClient.tsx");
const PAGE = lire("../../app/q/[quizId]/page.tsx");
const ROUTE = lire("../../app/api/quiz/[quizId]/public/route.ts");
const MODULE = sansCommentaires(SOURCE_CHARGE_PUBLIQUE);

describe("la recomposition, la seule chose qu'on peut vraiment appeler", () => {
  test("elle met les questions et les resultats a plat sur le quiz", () => {
    const charge = chargeDuViewer({
      quiz: { id: "q1", title: "Mon quiz" },
      questions: [{ id: "a" }, { id: "b" }],
      results: [{ id: "r" }],
    });
    assert.equal(charge.id, "q1");
    assert.equal(charge.title, "Mon quiz");
    assert.deepEqual(charge.questions, [{ id: "a" }, { id: "b" }]);
    assert.deepEqual(charge.results, [{ id: "r" }]);
  });

  test("un quiz sans question s'affiche quand meme", () => {
    // Une creatrice qui vient de creer son quiz doit voir son ecran
    // d'accueil, pas un plantage sur un `.map` d'un `undefined`.
    const charge = chargeDuViewer({ quiz: { id: "q1" }, questions: null, results: undefined });
    assert.deepEqual(charge.questions, []);
    assert.deepEqual(charge.results, []);
  });

  test("les questions passees gagnent sur celles de la ligne", () => {
    // La ligne `quizzes` ne porte pas de colonne `questions`, mais si
    // elle en portait une un jour, c'est la liste chargee qui compte.
    const charge = chargeDuViewer({
      quiz: { id: "q1", questions: "une valeur parasite" },
      questions: [{ id: "a" }],
      results: [],
    });
    assert.deepEqual(charge.questions, [{ id: "a" }]);
  });

  test("un quiz absent ne fabrique pas un objet a moitie", () => {
    const charge = chargeDuViewer({ quiz: null, questions: [], results: [] });
    assert.deepEqual(charge, { questions: [], results: [] });
  });
});

describe("la prop n'est PAS previewData, et elle n'eteint rien", () => {
  test("elle ne gate ni le suivi, ni la session, ni le brouillon", () => {
    // LE GARDE QUI COMPTE. `previewData` eteint neuf comportements ; si
    // `donneesServeur` apparait sur une de ces lignes, tous les quiz en
    // ligne perdent leurs chiffres sans qu'un seul ecran ne le dise.
    const interdits = ["track", "sessionKey", "draftKey", "isPreviewMode"];
    const fautives = VIEWER.split("\n")
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => l.includes("donneesServeur"))
      .filter(({ l }) => interdits.some((mot) => l.includes(mot)));
    assert.deepEqual(
      fautives.map(({ n, l }) => `${n}: ${l.trim()}`),
      [],
      "donneesServeur ne doit gater aucun de ces comportements",
    );
  });

  test("le mode apercu ne se declenche pas sur une visite publique", () => {
    // `isPreviewMode` coupe la capture du lead. L'y faire entrer
    // reviendrait a ne plus capter une seule adresse.
    const ligne = VIEWER.split("\n").find((l) => l.includes("const isPreviewMode ="));
    assert.ok(ligne, "isPreviewMode a disparu : ce garde ne mesure plus rien");
    assert.ok(!ligne.includes("donneesServeur"), ligne);
  });

  test("les neuf gardes de previewData sont toujours la", () => {
    // Sans ce compte, retirer un garde ferait passer le test ci dessus
    // au vert en ne mesurant plus rien.
    const gardes = (VIEWER.match(/previewData/g) ?? []).length;
    assert.ok(gardes >= 12, `previewData n'apparait que ${gardes} fois`);
  });

  test("elle amorce l'etat et evite l'appel, c'est tout", () => {
    assert.match(VIEWER, /useState<PublicQuizData \| null>\(previewData \?\? donneesServeur\?\.quiz/);
    assert.match(VIEWER, /useState\(!previewData && !donneesServeur\)/);
    assert.match(VIEWER, /if \(donneesServeur\) return;/);
  });
});

describe("une seule porte de calcul", () => {
  test("la page APPELLE la fonction, elle ne la recalcule pas", () => {
    assert.match(PAGE, /import \{[^}]*chargerQuizPublic[^}]*\} from "@\/lib\/quiz\/chargerQuizPublic"/);
    assert.match(PAGE, /await chargerQuizPublic\(\{/);
  });

  test("la route aussi, et elle ne construit plus la charge elle meme", () => {
    assert.match(ROUTE, /await chargerQuizPublic\(\{/);
    assert.ok(
      !ROUTE.includes("renderedQuiz"),
      "la route recompose encore la charge : deux calculs pour le meme quiz",
    );
  });

  test("le client recompose par la MEME fonction que la page", () => {
    assert.match(VIEWER, /chargeDuViewer\(\{/);
    assert.ok(
      !/\.\.\.json\.quiz/.test(VIEWER),
      "le client recompose encore a la main",
    );
  });
});

describe("aucun brouillon servi a un inconnu", () => {
  test("la page charge sans jeton et sans session", () => {
    const i = PAGE.indexOf("await chargerQuizPublic({");
    assert.ok(i > 0);
    const appel = PAGE.slice(i, i + 200);
    assert.match(appel, /jetonEmbed: null/);
    assert.match(appel, /utilisateurConnecte: null/);
  });

  test("elle n'injecte que sur un quiz actif, et jamais sur un ?embed=", () => {
    assert.match(PAGE, /if \(meta && !embed\)/);
  });

  test("la route, elle, relit bien la session du createur", () => {
    // Sinon l'apercu d'un brouillon depuis l'editeur repondrait 404.
    assert.match(ROUTE, /getSupabaseServerClient\(\)/);
    assert.match(ROUTE, /utilisateurConnecte = user\?\.id \?\? null/);
  });
});

describe("le domaine perso d'une creatrice ne sert que SES quiz", () => {
  // Trouve en lisant les erreurs non lues de cette page, pendant le
  // chantier 2. `resolveCustomDomainOwner` rendait `null` aussi bien
  // pour "on n'est pas sur un domaine perso" que pour "la requete a
  // echoue" : dans le second cas le controle de locataire etait donc
  // SAUTE, et le domaine d'une creatrice pouvait servir le quiz de
  // quelqu'un d'autre. C'est exactement ce que le commentaire de
  // `CUSTOM_HOST_HEADER` interdit, en nommant l'hameconnage.
  test("les trois etats sont distingues", () => {
    assert.match(PAGE, /surUnDomainePerso: false/);
    assert.match(PAGE, /surUnDomainePerso: true, lisible: false/);
    assert.match(PAGE, /surUnDomainePerso: true,\s*lisible: true/);
  });

  test("un registre illisible ne sert RIEN", () => {
    // Le sens du repli est asymetrique : un 404 de trop pendant une
    // panne coute une page, servir sans verifier coute le quiz d'une
    // creatrice affiche chez une autre.
    assert.match(PAGE, /if \(!locataire\.lisible\) notFound\(\);/);
  });

  test("l'erreur du registre est CRIEE", () => {
    assert.match(PAGE, /registre des domaines perso illisible/);
  });
});

describe("ce qui ne doit jamais sortir", () => {
  test("ni user_id ni project_id ne partent chez le visiteur", () => {
    // Ils partent maintenant dans le HTML, donc lisibles a la source de
    // la page : le strip compte deux fois plus qu'avant.
    assert.match(MODULE, /const \{ user_id: _uid, project_id: _pid, \.\.\.quizPublic \} = quizRow;/);
  });

  test("le module dit qu'il ne pose aucun en-tete de cache", () => {
    // Les en-tetes vivent dans la route : elle seule repond en HTTP, et
    // la page ne doit surtout pas rendre cette reponse cacheable.
    assert.ok(!MODULE.includes("Cache-Control"), "le module pose des en-tetes HTTP");
    assert.match(MODULE, /const prive = Boolean\(embedToken\) \|\| isOwnerPreview;/);
  });
});
