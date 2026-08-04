// tests/logic/answer-image.test.mts
//
// Béné, 4 août 2026 : "adapte la place de l'image au format de la photo,
// là elles sont tronquées dans les réponses et c'est pourri."
//
// Les vignettes de réponse étaient en `aspect-video object-cover` : la
// boîte imposait son 16/9 et recadrait la photo dedans, coupant le haut
// des titres. La règle inverse était pourtant écrite depuis des mois en
// tête de PublicQuizClient, et contredite quatre fois plus bas.
//
// Une règle écrite en commentaire n'est pas une règle.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { answerImageRender } from "../../lib/quiz/answerImage.ts";

test("sans largeur choisie, l'image prend la largeur et garde son format", () => {
  const r = answerImageRender(null);
  assert.equal(r.className, "w-full h-auto");
  assert.equal(r.style, undefined);
});

test("le comportement historique est le défaut", () => {
  // Aucun quiz existant ne bouge : pas de largeur = pleine largeur.
  assert.deepEqual(answerImageRender(undefined), answerImageRender(null));
});

test("une largeur choisie centre l'image sans la recadrer", () => {
  const r = answerImageRender(60);
  assert.match(r.className, /h-auto/);
  assert.deepEqual(r.style, { width: "60%" });
  assert.ok(!/object-cover|aspect-/.test(r.className), "jamais de recadrage");
});

test("une largeur illisible retombe sur la pleine largeur", () => {
  assert.deepEqual(answerImageRender(Number.NaN), answerImageRender(null));
});

test("plus aucune vignette de réponse n'est recadrée", () => {
  // Le garde-fou qui compte : les quatre endroits (les deux branches du
  // viewer, les deux aperçus d'éditeur) doivent passer par la fonction.
  for (const file of [
    "../../components/quiz/PublicQuizClient.tsx",
    "../../components/quiz/QuizDetailClient.tsx",
    "../../components/quiz/SurveyDetailClient.tsx",
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const line of src.split("\n")) {
      if (!/opt\.image_url/.test(line)) continue;
      assert.ok(
        !/object-cover/.test(line),
        `${file} : une image de réponse est encore recadrée -> ${line.trim()}`,
      );
    }
  }
});
