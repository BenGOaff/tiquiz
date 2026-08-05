// tests/logic/partner-readout.test.mts
//
// Jocelyne, 4 août 2026 : trois semaines à réparer une question qui
// n'avait rien, en suivant des conseils.
//
// En cherchant d'où venaient ces conseils, on a trouvé pire que ce
// qu'on croyait : **le coach de l'Atelier ne recevait AUCUN chiffre de
// funnel.** Le pont ne transmettait que quatre compteurs cumulés (vues,
// complétions, leads, partages), sur tout le compte. Pas de
// démarrages, donc la fuite d'entrée invisible. Pas de détail par
// question, donc rien de vrai à dire sur une question précise.
//
// Un modèle à qui on demande d'aider sur des stats qu'il ne voit pas ne
// répond pas "je ne sais pas" : il généralise la méthode, ça sonne
// juste, et l'élève applique.
//
// Ce fichier fige ce que le pont transmet, et surtout ce qu'il refuse
// de transmettre.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const READOUT = readFileSync(new URL("../../lib/partner/readout.ts", import.meta.url), "utf8");
const ROUTE = readFileSync(
  new URL("../../app/api/partner/metrics/route.ts", import.meta.url),
  "utf8",
);

// ── Ce que le coach reçoit enfin ─────────────────────────────────────

test("le pont transmet les démarrages", () => {
  // Sans eux, la fuite d'entrée est invisible : c'est exactement le
  // trou par lequel Jocelyne perdait la moitié de ses visiteurs.
  assert.ok(/event_type", "start"|event_type",\s*"start"/.test(READOUT));
  assert.ok(/starts:/.test(READOUT), "les démarrages sortent dans les compteurs");
});

test("il transmet le verdict du parcours, pas des pourcentages bruts", () => {
  // Deux endroits qui recalculent la même décision finissent toujours
  // par dire deux choses différentes. C'est le défaut qui nous poursuit
  // depuis juin (partage, score, alignement, colonnes, aperçu).
  assert.ok(/renderFullFunnelVerdict\(/.test(READOUT));
  assert.ok(/funnelVerdict:/.test(READOUT));
});

test("il transmet la provenance, pour trancher page ou audience", () => {
  assert.ok(/renderTrafficForPrompt\(/.test(READOUT));
  assert.ok(/trafficVerdict:/.test(READOUT));
});

test("il transmet ce qu'on a le droit de conclure sur les questions", () => {
  assert.ok(/readFunnelSignal\(/.test(READOUT));
  assert.ok(/questionSignal:/.test(READOUT));
});

test("le funnel par question est recalé sur les questions VIVANTES", () => {
  // Sinon on recommence le drame d'Adeline : une question supprimée qui
  // continue de figurer dans le diagnostic.
  assert.ok(/buildLiveFunnel\(/.test(READOUT));
});

// ── Ce qu'il refuse de transmettre ───────────────────────────────────

test("pas de verdict quand il y a plusieurs quiz", () => {
  // Additionner les questions 3 de cinq quiz différents ne produit
  // aucune information. Le coach doit demander de choisir un quiz.
  assert.ok(/scope: "account"/.test(READOUT));
  assert.ok(
    /if \(!quizId\) return EMPTY_ACCOUNT;/.test(READOUT),
    "sans quiz désigné, aucun verdict n'est fabriqué",
  );
});

test("le quiz d'un autre compte ne remonte jamais", () => {
  // Un jeton de connexion ne doit pas devenir une clé universelle.
  assert.ok(/quiz\.user_id !== userId\) return EMPTY_ACCOUNT/.test(READOUT));
});

test("le verdict vide vaut null, jamais une chaîne vide", () => {
  // Une chaîne vide ressemble à un verdict et n'en est pas un : le
  // coach doit pouvoir distinguer "pas de donnée" de "rien à signaler".
  assert.ok(/renderFullFunnelVerdict\(fullFunnel\) \|\| null/.test(READOUT));
});

// ── Le quart non porté, trouvé le 5 août ─────────────────────────────

test("le funnel du coach est borné à la cohorte comparable", () => {
  // La page stats, la page analytics et le rapport IA bornaient déjà le
  // funnel sur `structure_changed_at` depuis le 4 août. Le coach, non :
  // il appelait la RPC avec `p_since: null`.
  //
  // Donc l'élève modifiait son quiz, demandait au coach, et le coach
  // pouvait encore voir la fausse chute à l'endroit exact qu'elle
  // venait de retoucher. C'est à dire relancer la boucle sur le seul
  // écran où elle pose ses questions. Une correction écrite à plusieurs
  // endroits ne se porte jamais qu'à moitié.
  assert.ok(/resolveCohortSince\(/.test(READOUT), "la cohorte est résolue");
  assert.ok(/p_since: cohortSince/.test(READOUT), "et elle est passée à la RPC");
  assert.ok(
    !/p_since: null/.test(READOUT),
    "plus aucun appel non borné ne subsiste dans ce fichier",
  );
});

test("la colonne de cohorte est lue à part, pour ne rien casser en prod", () => {
  // La nommer dans le select principal ferait échouer la requête
  // entière si la migration n'est pas encore appliquée : le coach
  // perdrait TOUS les chiffres au lieu d'en perdre le bornage.
  assert.ok(/select\("structure_changed_at"\)/.test(READOUT));
});

test("le coach reçoit aussi la comparaison entre ses quiz", () => {
  // "Sur ton quiz TDAH, 8 sur 10 commencent, contre 5 sur 10 ici."
  // Déjà rédigé par Tiquiz, comme les deux autres verdicts : c'est ce
  // qui garantit que le coach et l'écran de stats disent la même phrase.
  assert.ok(/renderStartRateVerdict\(/.test(READOUT));
  assert.ok(/startRateVerdict/.test(READOUT));
});

test("vues douteuses : aucune comparaison n'est envoyée", () => {
  // Le rapport dirait au même endroit "taux à interpréter avec
  // prudence" et "tu démarres à 52%".
  assert.ok(/if \(viewsReliable\) \{/.test(READOUT));
});

// ── Le garde-fou structurel ──────────────────────────────────────────

test("l'endpoint partenaire renvoie bien la lecture", () => {
  assert.ok(/buildPartnerReadout\(/.test(ROUTE));
  assert.ok(/ok: true, metrics, readout/.test(ROUTE));
});

test("la lecture reste derrière la double authentification", () => {
  // Secret partagé app à app + jeton de connexion de l'élève. Le
  // readout porte plus d'informations que les compteurs : il n'a pas le
  // droit d'être moins protégé.
  const beforeReadout = ROUTE.slice(0, ROUTE.indexOf("buildPartnerReadout("));
  assert.ok(/x-partner-secret/.test(beforeReadout));
  assert.ok(/invalid_token/.test(beforeReadout));
});
