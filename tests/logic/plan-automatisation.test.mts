// tests/logic/plan-automatisation.test.mts
//
// Béné, 1er septembre 2026 : "un onglet Automatisation qui explique le
// workflow et les tags précis à créer dans Systeme.io. Pas un truc
// générique, un truc réel."
//
// Le "pas générique" est TOUT l'enjeu, et c'est ce que ce fichier fige :
// on n'annonce une étape que pour un tag qui part VRAIMENT. Les six
// familles n'ont pas les mêmes conditions, et une liste qui les récite
// toutes enverrait la créatrice construire des workflows sur des tags
// qu'elle n'aura jamais.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  construirePlanAutomatisation,
  tagsDeScorePossibles,
  tagsDuProfil,
} from "../../lib/automatisation/planSysteme.ts";

const CLE = { sio_api_key_id: "cle-1" };

// ── Un QUIZ : ce sont les profils qui étiquettent ────────────────────

test("un workflow par profil, nommé par le tag de la créatrice", () => {
  const plan = construirePlanAutomatisation({ ...CLE, mode: "quiz" }, [
    { title: "Profil A", sio_tag_names: ["profil-a"] },
    { title: "Profil B", sio_tag_names: ["profil-b"] },
  ]);
  const profils = plan.etapes.filter((e) => e.type === "profil");
  assert.equal(profils.length, 2);
  assert.equal(profils[0].tag, "profil-a");
  assert.equal(profils[0].contexte, "Profil A");
  assert.equal(profils[0].action, "campagne");
  // Le workflow porte le NOM DU TAG : deux noms différents pour la même
  // chose obligent à faire la correspondance de tête à chaque relecture.
  assert.equal(profils[0].nomWorkflow, "profil-a");
});

test("un profil sans tag est SIGNALÉ, pas inventé", () => {
  const plan = construirePlanAutomatisation({ ...CLE, mode: "quiz" }, [
    { title: "Profil A", sio_tag_names: ["profil-a"] },
    { title: "Profil orphelin" },
  ]);
  assert.equal(plan.etapes.filter((e) => e.type === "profil").length, 1);
  const manque = plan.manques.find((m) => m.type === "tag-profil");
  assert.ok(manque, "le profil sans tag doit remonter");
  assert.equal(manque!.contexte, "Profil orphelin");
  assert.equal(manque!.bloquant, false);
});

test("l'ancien champ de tag unique sert de repli", () => {
  assert.deepEqual(tagsDuProfil({ sio_tag_name: "ancien" }), ["ancien"]);
  // Le tableau gagne quand il est rempli.
  assert.deepEqual(tagsDuProfil({ sio_tag_name: "ancien", sio_tag_names: ["neuf"] }), ["neuf"]);
  assert.deepEqual(tagsDuProfil({ sio_tag_names: [" ", ""] }), []);
});

test("un quiz n'annonce JAMAIS le tag de capture", () => {
  // Il n'est appliqué que sur les sondages : promettre un workflow
  // dessus enverrait la créatrice attendre un tag qui ne part pas.
  const plan = construirePlanAutomatisation(
    { ...CLE, mode: "quiz", sio_capture_tag: "capture-quiz" },
    [{ title: "A", sio_tag_names: ["a"] }],
  );
  assert.equal(plan.etapes.some((e) => e.type === "capture-sondage"), false);
});

// ── Un SONDAGE : la capture et les réponses ──────────────────────────

test("un sondage étiquette par la capture et par les réponses", () => {
  const plan = construirePlanAutomatisation(
    { ...CLE, mode: "survey", sio_capture_tag: "sondage-fait" },
    [],
    [
      { options: [{ sio_tag_name: "aime-le-bleu", text: "Le bleu" }, { sio_tag_name: "" }] },
      { options: [{ sio_tag_name: "aime-le-bleu" }, { sio_tag_name: "aime-le-vert" }] },
    ],
  );
  assert.equal(plan.etapes.filter((e) => e.type === "capture-sondage").length, 1);
  const reponses = plan.etapes.filter((e) => e.type === "reponse-sondage");
  // UNE étape par tag distinct : deux règles sur le même tag feraient
  // partir la campagne deux fois.
  assert.deepEqual(reponses.map((e) => e.tag), ["aime-le-bleu", "aime-le-vert"]);
  assert.equal(reponses[0].contexte, "Le bleu");
});

test("un sondage sans tag de capture est signalé", () => {
  const plan = construirePlanAutomatisation({ ...CLE, mode: "survey" }, []);
  assert.ok(plan.manques.some((m) => m.type === "tag-capture"));
});

// ── Ce que Tiquiz fait DÉJÀ : ne pas le refaire ──────────────────────

test("une formation ou une communauté ne demande AUCUN workflow", () => {
  // Tiquiz ouvre l'accès lui même. Une règle de plus l'ouvrirait deux
  // fois, et ça ne se voit qu'en recevant deux emails.
  const plan = construirePlanAutomatisation({ ...CLE, mode: "quiz" }, [
    { title: "A", sio_tag_names: ["a"], sio_course_id: "form-1" },
  ]);
  const acces = plan.etapes.find((e) => e.type === "acces-automatique");
  assert.ok(acces);
  assert.equal(acces!.action, "rien");
});

// ── Le score : un MOTIF, pas un nom ──────────────────────────────────

test("les tags de score n'existent que s'ils sont cochés", () => {
  const sans = construirePlanAutomatisation({ ...CLE, mode: "quiz" }, []);
  assert.equal(sans.etapes.some((e) => e.type === "score"), false);
});

test("les tags de score sont donnés en VALEURS RÉELLES, pas en exemple", () => {
  const plan = construirePlanAutomatisation(
    {
      ...CLE,
      mode: "quiz",
      locale: "fr",
      sio_score_tags: true,
      score_labels: { low: "Débutant", mid: "En route", high: "Confirmé" },
      scoring_axes: [{ id: "sommeil", label: "Sommeil" }],
    },
    [],
  );
  const global = plan.etapes.find((e) => e.cle === "score-global");
  assert.ok(global);
  assert.equal(global!.motif, true);
  // `slugifyAxisLabel` n'accepte que [a-z0-9_] : "En route" devient
  // `en_route`, avec un SOULIGNÉ. C'est le nom que Systeme.io recevra,
  // donc c'est celui que l'écran doit montrer. Deviner un tiret ici
  // ferait créer une règle sur un tag qui n'arrive jamais.
  assert.deepEqual(global!.valeurs, ["score-debutant", "score-en_route", "score-confirme"]);
  const axe = plan.etapes.find((e) => e.cle === "score-axe-0");
  assert.equal(axe!.contexte, "Sommeil");
  assert.ok(axe!.valeurs!.every((v) => v.startsWith("sommeil-")), axe!.valeurs!.join(","));
});

test("tagsDeScorePossibles suit les libellés de la créatrice", () => {
  const { global } = tagsDeScorePossibles({
    locale: "fr",
    score_labels: { low: "Fragile", mid: "Correct", high: "Solide" },
  });
  assert.deepEqual(global, ["score-fragile", "score-correct", "score-solide"]);
});

// ── Le bonus de partage ──────────────────────────────────────────────

test("un seul workflow pour le bonus de partage", () => {
  const plan = construirePlanAutomatisation(
    { ...CLE, mode: "quiz", sio_share_tag_name: "bonus-partage", virality_enabled: true },
    [{ title: "A", sio_tag_names: ["a"] }, { title: "B", sio_tag_names: ["b"] }],
  );
  const partage = plan.etapes.filter((e) => e.type === "partage");
  assert.equal(partage.length, 1, "un seul, quel que soit le nombre de profils");
  assert.equal(partage[0].action, "email");
});

test("le tag de partage est annoncé même sans bonus de partage activé", () => {
  // Mesuré dans la route de partage : le tag part dès qu'il est
  // renseigné, sans regarder `virality_enabled`.
  const plan = construirePlanAutomatisation(
    { ...CLE, mode: "quiz", sio_share_tag_name: "a-partage" },
    [],
  );
  assert.ok(plan.etapes.some((e) => e.type === "partage"));
});

test("on ne réclame le tag de partage QUE si un bonus est promis", () => {
  const promis = construirePlanAutomatisation({ ...CLE, mode: "quiz", virality_enabled: true }, []);
  assert.ok(promis.manques.some((m) => m.type === "tag-partage"));
  // Les simples boutons de partage ne promettent rien : un avertissement
  // qui sort pour rien finit ignoré.
  const simple = construirePlanAutomatisation({ ...CLE, mode: "quiz", show_result_share: true }, []);
  assert.equal(simple.manques.some((m) => m.type === "tag-partage"), false);
});

// ── Le blocage qui rend tout le reste inutile ────────────────────────

test("sans clé Systeme.io, c'est BLOQUANT et ça passe avant tout", () => {
  const plan = construirePlanAutomatisation({ mode: "quiz" }, [
    { title: "A", sio_tag_names: ["a"] },
  ]);
  const bloquant = plan.manques.find((m) => m.bloquant);
  assert.ok(bloquant, "aucun tag ne part sans clé : il faut le dire");
  assert.equal(bloquant!.type, "cle-api");
});

test("le plan ne contient AUCUNE phrase : l'interface existe en 7 langues", () => {
  const plan = construirePlanAutomatisation(
    { ...CLE, mode: "quiz", sio_share_tag_name: "bonus" },
    [{ title: "Profil A", sio_tag_names: ["profil-a"] }],
  );
  for (const e of plan.etapes) {
    for (const [champ, valeur] of Object.entries(e)) {
      if (typeof valeur !== "string") continue;
      assert.ok(
        !/\s(dans|choisis|crée|va)\s/i.test(valeur),
        `${champ} porte une phrase : ${valeur}`,
      );
    }
  }
});
