// tests/logic/funnel-cohort.test.mts
//
// La dernière couche du drame Jocelyne (4 août 2026), et la seule qui
// pouvait encore la piéger demain.
//
// Prouvé sur ses données réelles, dans UNE SEULE semaine et sur un seul
// quiz : 9 sessions ont atteint la 9e question, 8 ont plafonné à la 8e.
// Les secondes n'ont pas abandonné, la question n'existait plus. La
// courbe affichait pourtant une marche que personne n'avait produite.
//
// Le piège est une boucle fermée : elle modifie -> une fausse chute
// apparaît à l'endroit modifié -> l'écran la désigne -> elle modifie.

import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

import {
  structureChanged,
  resolveCohortSince,
  summarizeFunnelCohort,
} from "../../lib/quiz/funnelCohort.ts";

// ── Ce qui compte comme un changement de structure ───────────────────

test("une question supprimee change la structure", () => {
  // Le cas de Jocelyne, mot pour mot.
  assert.equal(structureChanged(["a", "b", "c"], ["a", "b"]), true);
});

test("une question ajoutee change la structure", () => {
  assert.equal(structureChanged(["a", "b"], ["a", "b", null]), true);
});

test("une question deplacee change la structure", () => {
  // Elle l'a fait aussi : "je les ai changées de place". Déplacer décale
  // la position de tout ce qui suit, donc l'historique d'avant ne se
  // compare plus à celui d'après.
  assert.equal(structureChanged(["a", "b", "c"], ["a", "c", "b"]), true);
});

test("un echange simultane ajout + suppression est vu", () => {
  // Longueurs égales : le piège classique d'une comparaison paresseuse.
  assert.equal(structureChanged(["a", "b"], ["a", null]), true);
});

test("reecrire le texte ne change PAS la structure", () => {
  // Et c'est essentiel : reformuler une question est exactement ce qu'on
  // veut pouvoir mesurer. Repartir de zéro à chaque reformulation
  // rendrait toute amélioration invérifiable.
  assert.equal(structureChanged(["a", "b", "c"], ["a", "b", "c"]), false);
});

// ── Depuis quand on lit la cohorte comparable ────────────────────────

test("on retient la borne la PLUS RECENTE", () => {
  // Prendre la plus ancienne laisserait rentrer les sessions d'une autre
  // version : ce serait exactement le bug qu'on corrige.
  const periode = "2026-07-05T00:00:00.000Z";
  const structure = "2026-08-03T10:00:00.000Z";
  assert.equal(resolveCohortSince(periode, structure), structure);
  assert.equal(resolveCohortSince(structure, periode), structure);
});

test("sans modification connue, on garde la periode", () => {
  const periode = "2026-07-05T00:00:00.000Z";
  assert.equal(resolveCohortSince(periode, null), periode);
});

test("colonne absente ou illisible : on retombe sur depuis toujours", () => {
  // FAIL-OPEN. La colonne n'existe pas encore en prod, ou le quiz n'a
  // jamais été modifié depuis le déploiement : on rend la donnée telle
  // quelle. Mieux vaut le comportement d'avant qu'un écran vide.
  assert.equal(resolveCohortSince(null, null), null);
  assert.equal(resolveCohortSince(null, ""), null);
  assert.equal(resolveCohortSince(null, "   "), null);
  assert.equal(resolveCohortSince(null, "pas une date"), null);
  assert.equal(resolveCohortSince(undefined, undefined), null);
});

// ── Les deux lectures cote a cote ────────────────────────────────────

test("les chiffres de Jocelyne, separes comme ils auraient du l'etre", () => {
  // Semaine du 3 août : 18 personnes depuis sa suppression, 66 en tout.
  const comparable = [{ views: 18 }, { views: 17 }];
  const total = [{ views: 66 }, { views: 65 }];
  const c = summarizeFunnelCohort(comparable, total);

  assert.equal(c.comparable, 18);
  assert.equal(c.total, 66);
  assert.equal(c.stale, 48, "48 personnes ont repondu a une autre version");
  assert.equal(c.singleVersion, false);
});

test("quiz jamais modifie : une seule lecture, comme avant", () => {
  // Sans ça, on afficherait deux chiffres identiques l'un sous l'autre,
  // ce qui se lit comme un bug.
  const steps = [{ views: 40 }, { views: 38 }];
  const c = summarizeFunnelCohort(steps, steps);
  assert.equal(c.stale, 0);
  assert.equal(c.singleVersion, true);
});

test("le denominateur saute les questions sans donnee", () => {
  // Une question ajoutée après coup n'a aucun event. La prendre comme
  // première étape donnerait 0 personne entrée dans le quiz.
  const steps = [
    { views: 0, hasData: false },
    { views: 31 },
    { views: 30 },
  ];
  assert.equal(summarizeFunnelCohort(steps, steps).total, 31);
});

test("stale ne devient jamais negatif", () => {
  // Deux requêtes prises à un instant différent peuvent se croiser.
  // Afficher "-2 personnes ont vu une autre version" serait pire que le
  // bug qu'on corrige.
  const c = summarizeFunnelCohort([{ views: 12 }], [{ views: 10 }]);
  assert.equal(c.stale, 0);
  assert.equal(c.singleVersion, true);
});

test("aucune donnee du tout ne casse rien", () => {
  const c = summarizeFunnelCohort([], []);
  assert.equal(c.comparable, 0);
  assert.equal(c.total, 0);
  assert.equal(c.stale, 0);
});

// ── La règle s'applique PARTOUT où on lit un funnel ──────────────────
//
// Une règle appliquée à un seul écran ne tient pas : c'est comme ça que
// l'alignement du sous-titre est revenu quatre fois. Ici les trois
// lecteurs doivent borner leur cohorte, sinon l'un d'eux continuera à
// désigner une question sur une fausse marche.

const readers = [
  ["l'analytics d'un quiz", "../../app/api/quiz/[quizId]/analytics/route.ts"],
  ["la page Mes stats", "../../app/api/stats/route.ts"],
  ["l'analyse IA", "../../lib/quiz/insights.ts"],
] as const;

for (const [label, path] of readers) {
  test(`${label} borne sa cohorte`, () => {
    const src = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(src, /structure_changed_at/, `${label} doit lire le repère de modification`);
  });
}

test("l'ecrivain date le changement de structure", () => {
  // Sans ce marqueur, les trois lecteurs ci-dessus n'ont rien à lire.
  const src = readFileSync(
    new URL("../../app/api/quiz/[quizId]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /structureChanged\(/);
  assert.match(src, /structure_changed_at/);
});

test("dater la structure ne fait jamais echouer une sauvegarde", () => {
  // La colonne peut manquer en prod. Perdre le quiz d'une créatrice pour
  // un repère de statistiques serait une régression bien pire que le bug
  // qu'on corrige.
  const src = readFileSync(
    new URL("../../app/api/quiz/[quizId]/route.ts", import.meta.url),
    "utf8",
  );
  const block = src.slice(src.indexOf("if (structureChanged("));
  const end = block.indexOf("\n    }");
  const body = end > 0 ? block.slice(0, end) : block.slice(0, 800);
  assert.ok(!/return NextResponse/.test(body), "un echec ici ne doit pas interrompre le PATCH");
  assert.match(body, /console\.warn/, "il doit laisser une trace");
});
