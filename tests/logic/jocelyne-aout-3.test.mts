// tests/logic/jocelyne-aout-3.test.mts
//
// LE TEST QUI REJOUE CE QU'ELLE A VRAIMENT VU.
//
// Le 3 août 2026 à 08h24, notre analyse IA a écrit à Jocelyne, mot pour
// mot :
//
//   "La perte entre vues (113) et Q1 (55 sessions) est le vrai trou du
//    funnel: presque la moitié des visiteurs ne démarre même pas le quiz.
//    Une fois lancés, les gens vont jusqu'au bout, le drop-off question
//    par question est quasi nul (1.8 à 2.2%), sauf Q7 qui affiche 6%, le
//    seul point de friction interne."
//
// La première phrase est juste, et c'est la seule qui comptait : 58
// personnes perdues sur l'écran d'accueil. La deuxième lui a coûté trois
// semaines. 6% de 55 sessions, c'est TROIS personnes, et ces trois
// personnes s'étaient arrêtées sur la Q6, pas sur la Q7.
//
// Elle a réécrit la question, réordonné les réponses, puis l'a
// supprimée. Aucune de ces corrections ne POUVAIT produire d'effet.
//
// Le champ `priority` était `null` dans les deux analyses stockées :
// elle a reçu un paragraphe avec deux constats concurrents et aucun
// classement. Entre "la moitié ne démarre pas" (qui ressemble à un
// problème de trafic, donc hors de sa main) et "le seul point de
// friction interne" (qui ressemble à une action précise), elle a choisi
// le second. N'importe qui aurait choisi le second.
//
// Ce test rejoue ses chiffres réels. Il doit rester vert pour toujours.

import { test } from "node:test";
import assert from "node:assert/strict";

import { readFunnelSignal, MIN_LOST, MIN_DROP_PCT } from "../../lib/quiz/funnelSignal.ts";

/**
 * Ses chiffres du 3 août, reconstruits depuis le texte de l'analyse :
 * 55 sessions entrées en Q1, une érosion de 1 à 2 personnes par
 * question, et le fameux "6%" en Q7 (3 personnes sur 50).
 */
const steps = [
  { questionIndex: 0, views: 55, answers: 54 },
  { questionIndex: 1, views: 54, answers: 53 },
  { questionIndex: 2, views: 53, answers: 52 },
  { questionIndex: 3, views: 52, answers: 51 },
  { questionIndex: 4, views: 51, answers: 50 },
  { questionIndex: 5, views: 50, answers: 47 }, // les 3 partants sont ICI
  { questionIndex: 6, views: 47, answers: 46 }, // la "Q7" accusée
  { questionIndex: 7, views: 46, answers: 45 },
];

test("aucune question n'est designee sur les chiffres de Jocelyne", () => {
  const signal = readFunnelSignal(steps);

  assert.equal(signal.kind, "steady", "55 sessions et 3 partants ne font pas un point chaud");
  assert.equal(signal.hotspot, null, "nommer une question ici, c'est commenter trois personnes");
});

test("les deux seuils qui ecartent la Q7, chacun suffirait", () => {
  // Ceinture et bretelles : si un jour quelqu'un baisse un seuil, l'autre
  // tient encore. Les deux ensemble, c'est ce qui rend le test durable.
  const lost = 50 - 47;
  const dropPct = (lost / 50) * 100;

  assert.ok(lost < MIN_LOST, `3 partants restent sous le plancher de ${MIN_LOST}`);
  assert.ok(dropPct < MIN_DROP_PCT, `6% reste sous le seuil de ${MIN_DROP_PCT}%`);
});

test("une vraie chute reste nommee, sinon le seuil ne sert a rien", () => {
  // Le risque du correctif inverse : devenir muet sur tout. Ici la moitié
  // d'une étape part d'un coup, et ça doit se voir.
  const brutal = [
    { questionIndex: 0, views: 120, answers: 118 },
    { questionIndex: 1, views: 118, answers: 60 },
    { questionIndex: 2, views: 58, answers: 57 },
  ];
  const signal = readFunnelSignal(brutal);

  assert.equal(signal.kind, "hotspot");
  assert.equal(
    signal.hotspot?.questionIndex,
    1,
    "la chute se porte sur la question qu'ils ont VUE, jamais sur la suivante",
  );
});

test("la question accusee est toujours la suivante de celle qui subit", () => {
  // C'est l'inversion exacte du bandeau du 3 août : il annonçait la Q7
  // quand les gens s'arrêtaient sur la Q6.
  const brutal = [
    { questionIndex: 0, views: 120, answers: 118 },
    { questionIndex: 1, views: 118, answers: 60 },
    { questionIndex: 2, views: 58, answers: 57 },
  ];
  const { hotspot } = readFunnelSignal(brutal);

  assert.equal(hotspot?.neverReachedIndex, hotspot!.questionIndex + 1);
});
