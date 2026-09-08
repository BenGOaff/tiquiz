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
import {
  CE_QUE_LIA_ECRIT,
  CE_QUIL_NE_FAIT_PAS,
  CHEMIN_GENERATEUR,
  ETAPES,
  FAQ,
  GENERATIONS_PAR_HEURE,
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

test("le nombre de générations annoncé est celui que le code applique", () => {
  // ON NE RECOPIE PAS UN CHIFFRE DANS UNE PAGE QUI PROMET QUELQUE CHOSE.
  // `HOURLY_LIMIT_PER_IP` n'est pas exporté (c'est une constante interne
  // du limiteur) : on la LIT dans sa source, ce qui reste une mesure et
  // pas une recopie. Le jour où elle bouge, la page ment, et ce test
  // rougit avant la visiteuse.
  const source = readFileSync(join(RACINE, "lib/embed/rateLimit.ts"), "utf-8");
  const m = /const HOURLY_LIMIT_PER_IP\s*=\s*(\d+)/.exec(source);
  assert.ok(m, "HOURLY_LIMIT_PER_IP a disparu ou a change de forme");
  assert.equal(
    GENERATIONS_PAR_HEURE,
    Number(m![1]),
    "la page annonce un nombre de generations que le limiteur n'applique pas",
  );
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

test("le cadre de la page ne ROGNE pas l'éditeur", () => {
  // L'editeur est en `h-screen` chez lui (QuizDetailClient). Une boite
  // plus courte que son contenu, avec `overflow-hidden`, lui couperait
  // le bas SANS qu'aucune capture ne le dise : un debordement n'est une
  // perte que s'il est rogne, et la il le serait.
  const editeur = readFileSync(join(RACINE, "components/quiz/QuizDetailClient.tsx"), "utf-8");
  assert.ok(
    editeur.includes('"h-screen flex flex-col bg-background overflow-hidden"'),
    "la racine de l'editeur a change de hauteur : relire cadreDuGenerateur",
  );
  const cadre = cadreDuGenerateur("page");
  assert.ok(cadre.editeur.includes("h-screen"), "la boite est plus courte que l'editeur");
  assert.ok(
    !/h-\[\d+vh\]/.test(cadre.editeur),
    "une hauteur en vh plus petite que 100 rognerait le bas de l'editeur",
  );
  // Et dans une iframe, aucune boite : le document est a lui tout seul.
  assert.equal(cadreDuGenerateur("iframe").editeur, "");
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
