// tests/logic/flux-generation.test.mts
//
// LE QUIZ S'AFFICHE PENDANT QU'IL S'ÉCRIT, ET LE SERVEUR REND UNE RAISON
// (chantier 3 + tâche #55, 10 septembre 2026).
//
// Ce que Béné verrait sans ces gardes : un spinner d'une minute qui se
// lit "c'est cassé", puis une phrase française sur `/en/`. Les deux
// vivaient dans le même fichier, et c'est pour ça qu'ils se corrigent
// ensemble.
//
// Chaque garde vise un COMPORTEMENT ou un FAIT, jamais une formulation :
// un garde qui fige une écriture empêche de la corriger (leçon payée
// neuf fois la semaine du 5 septembre).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LecteurSseAnthropic,
  PROGRESSION_VIDE,
  evenementAnthropic,
  nouveautes,
  progressionDuFlux,
} from "@/lib/embed/fluxGeneration";
import {
  CLE_PAR_RAISON,
  bornesDuQuota,
  phraseDEchec,
  raisonDuCorps,
} from "@/lib/embed/echecGenerateur";
import { CLES_CARTES, INTERVALLE_CARTES_MS, REPONSES_SIO, carteSuivante, indiceApresReponse } from "@/lib/embed/attente";
import { reponseSystemeIo, evenementGenerationReussie } from "@/lib/analytics/parcours";
import { getEmbedStrings } from "@/components/embed/embed-i18n";
import { FENETRE_HEURES, LIMITE_PAR_EMAIL, LIMITE_PAR_IP } from "@/lib/embed/limites";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const RACINE = new URL("../../", import.meta.url).pathname;
const source = (rel: string) => readFileSync(join(RACINE, rel), "utf8");
const ROUTE = "app/api/embed/quiz/generate/route.ts";
const CLIENT = "components/embed/EmbedPreviewClient.tsx";
const ATTENTE = "components/embed/QuizEnCours.tsx";

// ─────────────────────────────────────────────────────────────────────
// 1. Ce qui est COMPLET dans un JSON en cours d'écriture
// ─────────────────────────────────────────────────────────────────────

// LES ATTENDUS FRANÇAIS PORTENT L'ESPACE INSÉCABLE devant `?` : c'est ce
// que l'aperçu doit afficher, et un test qui attendrait l'espace
// ordinaire rougirait sur une typographie juste.
const QUIZ = {
  title: "Quel créateur es-tu ?",
  introduction: "Deux minutes, et tu sais.",
  questions: [
    { question_text: "Tu préfères \"écrire\" ou parler ?", question_type: "multiple_choice", options: [{ text: "Écrire — toujours", result_index: 0 }, { text: "Parler", result_index: 1 }] },
    { question_text: "Ton dimanche idéal ?", options: [{ text: "Un livre" }, { text: "Une rando" }] },
  ],
  results: [
    { title: "Le bâtisseur", description: "d" },
    { title: "L'explorateur", description: "e" },
  ],
  cta_text: "Voir mon résultat",
};
const TEXTE = JSON.stringify(QUIZ, null, 2);

function couperA(marqueur: string, decalage = 0): string {
  const i = TEXTE.indexOf(marqueur);
  assert.ok(i > -1, `marqueur absent : ${marqueur}`);
  return TEXTE.slice(0, i + decalage);
}

test("rien n'est annoncé tant que rien n'est complet", () => {
  assert.deepEqual(progressionDuFlux("", "fr"), PROGRESSION_VIDE);
  assert.deepEqual(progressionDuFlux("{\n  \"title\": \"Quel créa", "fr"), PROGRESSION_VIDE);
  assert.deepEqual(progressionDuFlux("Voici ton quiz :", "fr"), PROGRESSION_VIDE);
});

test("le titre part dès que sa chaîne est fermée, et pas avant", () => {
  const avant = couperA('es-tu ?"', 0);
  assert.equal(progressionDuFlux(avant, "fr").titre, null);
  const apres = couperA('es-tu ?"', 'es-tu ?"'.length);
  assert.equal(progressionDuFlux(apres, "fr").titre, "Quel créateur es-tu ?");
});

test("une question part quand son OBJET est fermé, jamais à moitié écrite", () => {
  // Au milieu de la première question : le titre est là, aucune question.
  const milieu = couperA('"Parler"');
  const p1 = progressionDuFlux(milieu, "fr");
  assert.equal(p1.titre, "Quel créateur es-tu ?");
  assert.equal(p1.questions.length, 0);

  // Juste après la fermeture de la première : une seule, avec ses options.
  const finQ1 = TEXTE.indexOf("}", TEXTE.indexOf('"Parler"'));
  const finObjetQ1 = TEXTE.indexOf("}", finQ1 + 1);
  const p2 = progressionDuFlux(TEXTE.slice(0, finObjetQ1 + 1), "fr");
  assert.equal(p2.questions.length, 1);
  assert.equal(p2.questions[0].texte, "Tu préfères \"écrire\" ou parler ?");
  assert.deepEqual(p2.questions[0].options, ["Écrire, toujours", "Parler"]);
  assert.equal(p2.resultats.length, 0);
});

test("le quiz entier : titre, deux questions, deux profils, dans l'ordre", () => {
  const p = progressionDuFlux("```json\n" + TEXTE + "\n```", "fr");
  assert.equal(p.titre, "Quel créateur es-tu ?");
  assert.deepEqual(p.questions.map((q) => q.texte), ["Tu préfères \"écrire\" ou parler ?", "Ton dimanche idéal ?"]);
  assert.deepEqual(p.resultats, ["Le bâtisseur", "L'explorateur"]);
});

test("l'aperçu est du texte PROPRE : tiret cadratin retiré, typographie française posée", () => {
  const fr = progressionDuFlux(TEXTE, "fr");
  // `sanitizeAiText` retire le tiret cadratin ; `applyFrenchTypography`
  // pose l'espace insécable devant `?`. Les deux règles de Béné valent
  // aussi pour les dix secondes d'aperçu.
  assert.ok(!/[—–]/.test(JSON.stringify(fr)), "un tiret cadratin arrive à l'écran");
  assert.ok(fr.titre!.endsWith(" ?"), `pas d'espace insécable en français : ${JSON.stringify(fr.titre)}`);
  const en = progressionDuFlux(TEXTE, "en");
  assert.ok(!en.titre!.includes(" "), "la typographie française s'applique à un quiz anglais");
});

test("un objet que JSON refuse est ignoré, le reste continue", () => {
  const casse = TEXTE.replace('"Ton dimanche idéal ?"', '"Ton dimanche idéal ?" oups');
  const p = progressionDuFlux(casse, "fr");
  assert.equal(p.questions.length, 1, "la question saine avant l'objet cassé doit passer");
  assert.equal(p.titre, "Quel créateur es-tu ?");
});

test("`nouveautes` ne renvoie que ce qui vient d'arriver, par index", () => {
  const avant = progressionDuFlux(couperA('"Ton dimanche'), "fr");
  const apres = progressionDuFlux(TEXTE, "fr");
  const ev = nouveautes(avant, apres);
  assert.deepEqual(ev.map((e) => e.type), ["question", "resultat", "resultat"]);
  assert.equal(ev[0].type === "question" && ev[0].index, 1);
  assert.equal(ev[1].type === "resultat" && ev[1].index, 0);
  // Et le titre ne part qu'UNE fois.
  assert.equal(nouveautes(apres, apres).length, 0);
  assert.equal(nouveautes(PROGRESSION_VIDE, apres)[0].type, "titre");
});

// ─────────────────────────────────────────────────────────────────────
// 2. Le flux d'Anthropic, coupé n'importe où par le réseau
// ─────────────────────────────────────────────────────────────────────

test("le lecteur survit à un événement coupé en deux morceaux", () => {
  const l = new LecteurSseAnthropic();
  const debut = 'event: message_start\ndata: {"type":"message_start","message":{"model":"claude-test","usage":{"input_tokens":12}}}\n\n';
  const delta = 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"{\\"title\\": \\"A\\"}"}}\n\n';
  const fin = 'event: ping\ndata: {"type":"ping"}\n\nevent: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":9}}\n\n';
  const tout = debut + delta + fin;
  const coupe = 70;
  const a = l.alimenter(tout.slice(0, coupe));
  const b = l.alimenter(tout.slice(coupe, coupe + 130));
  const c = l.alimenter(tout.slice(coupe + 130));
  const ev = [...a, ...b, ...c, ...l.terminer()];
  assert.deepEqual(ev, [
    { type: "debut", modele: "claude-test", jetonsEntree: 12 },
    { type: "texte", texte: '{"title": "A"}' },
    { type: "fin", stopReason: "end_turn", jetonsSortie: 9 },
  ]);
});

test("une erreur DANS le flux est lue, un bloc corrompu ne fait pas tomber le reste", () => {
  assert.deepEqual(
    evenementAnthropic('event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}'),
    { type: "erreur", genre: "overloaded_error", message: "Overloaded" },
  );
  assert.equal(evenementAnthropic("event: content_block_delta\ndata: {pas du json"), null);
  assert.equal(evenementAnthropic("event: content_block_start\ndata: {\"type\":\"content_block_start\"}"), null);
  const l = new LecteurSseAnthropic();
  assert.deepEqual(l.alimenter("data: {cassé}\r\n\r\nevent: ping\r\ndata: {\"type\":\"ping\"}\r\n\r\n"), []);
});

// ─────────────────────────────────────────────────────────────────────
// 3. La route : elle streame, elle relaie, elle rend des raisons
// ─────────────────────────────────────────────────────────────────────

test("la route demande le FLUX à Anthropic, et le relaie question par question", () => {
  const code = sansCommentaires(source(ROUTE));
  // DANS LE CORPS ENVOYÉ À ANTHROPIC, pas n'importe où : `decode(value,
  // { stream: true })` porte la même écriture et ne demande rien au
  // modèle. Un garde qui cherchait la chaîne dans tout le fichier est
  // resté vert avec `stream: true` retiré de la requête (rejeu du
  // 10 septembre).
  const debutCorps = code.indexOf("body: JSON.stringify({");
  const finCorps = code.indexOf("}),", debutCorps);
  assert.ok(debutCorps > -1 && finCorps > debutCorps, "le corps de la requête Anthropic est introuvable");
  assert.match(code.slice(debutCorps, finCorps), /stream:\s*true/, "sans `stream: true` dans la requête, le visiteur attend tout d'un coup");
  assert.match(code, /LecteurSseAnthropic/, "la route ne lit pas le flux par le module pur");
  assert.match(code, /nouveautes\(/, "rien n'est relayé pendant l'écriture");
  assert.match(code, /progressionDuFlux\(brut,\s*locale\)/, "la langue du quiz n'est pas passée à l'aperçu");
  // Ce qui vient de devenir complet part au navigateur avec son type.
  assert.match(code, /sse\(n\.type,\s*n\)/, "les nouveautés ne partent pas dans le flux SSE");
});

test("le minuteur couvre la LECTURE du flux, pas seulement les en-têtes", () => {
  const code = sansCommentaires(source(ROUTE));
  const posRead = code.indexOf("reader.read()");
  const posClear = code.indexOf("clearTimeout(timer)");
  assert.ok(posRead > -1 && posClear > -1);
  assert.ok(posRead < posClear, "le minuteur est retiré avant la lecture : une lecture qui traîne n'est bornée par rien");
});

test("chaque sortie d'erreur porte une RAISON connue, jamais une phrase", () => {
  const code = sansCommentaires(source(ROUTE));
  const sorties = code.match(/sse\("error",\s*\{[^}]*\}/g) ?? [];
  assert.ok(sorties.length >= 8, `trop peu de sorties d'erreur trouvées : ${sorties.length}`);
  for (const s of sorties) {
    assert.ok(!/\berror:/.test(s), `une sortie porte encore une phrase : ${s}`);
    assert.match(s, /reason:/, `une sortie sans raison : ${s}`);
  }
  // Les refus AVANT le flux aussi : aucune phrase ne sort de la route.
  assert.ok(!/ok:\s*false,\s*error:/.test(code), "un refus JSON porte encore `error:`");
  // Et toutes les raisons littérales sont de celles que l'écran sait dire.
  const litterales = [...code.matchAll(/reason:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(litterales.length > 0);
  for (const r of litterales) assert.ok(r in CLE_PAR_RAISON, `raison inconnue de l'écran : ${r}`);
});

test("le serveur n'envoie plus de phrase de progression", () => {
  const code = sansCommentaires(source(ROUTE));
  assert.ok(!/step:\s*"[^"]*[éèà…]/.test(code), "une phrase française part encore dans `progress`");
  assert.match(code, /step:\s*"writing"/);
});

// ─────────────────────────────────────────────────────────────────────
// 4. L'écran : il affiche, il traduit, il ne recopie jamais `error`
// ─────────────────────────────────────────────────────────────────────

test("l'écran ne recopie plus `payload.error` ni le message d'une exception", () => {
  const code = sansCommentaires(source(CLIENT));
  assert.ok(!/payload\.error/.test(code), "`payload.error` est encore affiché");
  assert.ok(!/err\.message/.test(code), "le message d'une exception est encore affiché");
  assert.ok(!/j\?\.error|String\(j\.error\)/.test(code), "l'ancienne lecture de `error` est encore là");
  assert.match(code, /phraseDEchec\(/, "l'écran ne traduit pas la raison");
});

test("l'écran range le titre, chaque question et chaque profil quand ils arrivent", () => {
  const code = sansCommentaires(source(CLIENT));
  for (const ev of ["titre", "question", "resultat"]) {
    assert.match(code, new RegExp(`ev === "${ev}"`), `l'événement \`${ev}\` n'est pas écouté`);
  }
  assert.match(code, /<QuizEnCours/, "l'écran d'attente n'est pas monté");
  // Et la réponse à la question utile part dans `generation_reussie`.
  // DANS L'APPEL, pas plus loin dans le fichier : `systemeio` vit aussi
  // dans le rendu (`onSystemeio=`), et un garde qui cherchait le mot
  // après l'appel est resté vert avec le paramètre retiré (rejeu du
  // 10 septembre).
  const posReussie = code.indexOf("evenementGenerationReussie(");
  assert.ok(posReussie > -1, "`generation_reussie` ne part plus du générateur");
  const finAppel = code.indexOf("})", posReussie);
  const appel = code.slice(posReussie, finAppel);
  assert.match(appel, /\bsystemeio\b/, "`systemeio` n'est pas passé à `generation_reussie`");
});

test("le mouvement respecte `prefers-reduced-motion`, les cartes tournent toutes les 4 s", () => {
  const code = sansCommentaires(source(ATTENTE));
  assert.match(code, /motion-safe:/, "une apparition s'anime même pour qui a demandé moins de mouvement");
  assert.ok(!/(?<!motion-safe:)animate-in/.test(code), "un `animate-in` sans `motion-safe:`");
  assert.match(code, /INTERVALLE_CARTES_MS/, "l'intervalle est recopié au lieu d'être lu");
  assert.equal(INTERVALLE_CARTES_MS, 4000, "c'est SA consigne : toutes les 4 secondes");
  assert.equal(carteSuivante(0), 1);
  assert.equal(carteSuivante(2), 0, "la troisième carte doit revenir à la première");
  assert.equal(carteSuivante(5, 0), 0);
});

test("la question Systeme.io ne bloque rien et ses trois réponses sont celles de la mesure", () => {
  for (const r of REPONSES_SIO) {
    assert.equal(reponseSystemeIo(r.valeur), r.valeur, `la mesure refuse ${r.valeur}`);
  }
  assert.equal(indiceApresReponse(null), null, "sans réponse, on n'insiste pas");
  assert.equal(indiceApresReponse("oui"), "genSioIndiceCle");
  assert.equal(indiceApresReponse("non"), "genSioIndiceExport");
  assert.equal(indiceApresReponse("pas-encore"), "genSioIndiceExport");
  const ev = evenementGenerationReussie({ dureeMs: 1200, systemeio: "oui" });
  assert.equal(ev.params.systemeio, "oui");
  assert.ok(!("systemeio" in evenementGenerationReussie({ dureeMs: 1200 }).params));
});

test("les trois cartes et la question sont SES phrases, mot pour mot", () => {
  const fr = getEmbedStrings("fr");
  assert.deepEqual(
    CLES_CARTES.map((c) => fr[c]),
    [
      "Ton quiz s'affichera comme ça, à ta marque.",
      "Le tag partira tout seul dans Systeme.io.",
      "Et tes leads tomberont ici, déjà rangés.",
    ],
  );
  assert.equal(fr.genQuestionSio, "Pendant que j'écris ton quiz : tu utilises Systeme.io ?");
  assert.deepEqual(REPONSES_SIO.map((r) => fr[r.cle]), ["Oui", "Non", "Pas encore"]);
});

// ─────────────────────────────────────────────────────────────────────
// 5. Les phrases : identiques à `erreursIa`, présentes en anglais
// ─────────────────────────────────────────────────────────────────────

test("les raisons IA de l'embed sont MOT POUR MOT celles de `messages/*.json`", () => {
  // Deux copies qui ne peuvent pas diverger : c'est le prix de garder la
  // langue de l'écran dans sa prop plutôt que dans un cookie.
  for (const langue of ["fr", "en"] as const) {
    const messages = JSON.parse(source(`messages/${langue}.json`)).erreursIa as Record<string, string>;
    const t = getEmbedStrings(langue);
    for (const [raison, cle] of Object.entries(CLE_PAR_RAISON)) {
      if (raison === "rate_limited" || cle === "errTopic" || cle === "errAudience") continue;
      if (!(raison in messages)) continue;
      assert.equal(t[cle], messages[raison], `${langue} : ${raison} diverge de erreursIa`);
    }
  }
});

test("chaque clé française nouvelle existe en anglais, sans tiret cadratin", () => {
  const fr = getEmbedStrings("fr");
  const en = getEmbedStrings("en");
  const nouvelles = [
    ...Object.values(CLE_PAR_RAISON),
    ...CLES_CARTES,
    ...REPONSES_SIO.map((r) => r.cle),
    "genQuestionSio", "genSioIndiceCle", "genSioIndiceExport", "genTitreEnCours", "genQuestions", "genProfils", "genQuestionN",
  ];
  for (const cle of nouvelles) {
    assert.ok(fr[cle], `fr : ${cle} manque`);
    assert.ok(en[cle], `en : ${cle} manque`);
    assert.ok(!/[—–]/.test(fr[cle] + en[cle]), `tiret cadratin dans ${cle}`);
  }
  // Un `{n}` en français doit exister en anglais aussi, sinon le nombre
  // ne s'affiche que dans une langue.
  assert.ok(fr.errQuota.includes("{n}") && en.errQuota.includes("{n}"));
  assert.ok(fr.errQuota.includes("{h}") && en.errQuota.includes("{h}"));
});

test("`raisonDuCorps` : une raison inconnue ou l'ancienne forme `error` tombent sur `generic`", () => {
  assert.equal(raisonDuCorps({ reason: "busy" }), "busy");
  assert.equal(raisonDuCorps({ reason: "sujet" }), "sujet");
  assert.equal(raisonDuCorps({ reason: "n-importe-quoi" }), "generic");
  assert.equal(raisonDuCorps({ error: "L'IA a mis trop de temps. Réessaie." }), "generic");
  assert.equal(raisonDuCorps(null), "generic");
  assert.equal(raisonDuCorps("texte brut"), "generic");
});

test("la phrase du quota porte les nombres de la route, sinon ceux du module", () => {
  const t = getEmbedStrings("en");
  const avec = phraseDEchec({ reason: "rate_limited", parLimite: 7, fenetreHeures: 48 }, t);
  assert.ok(avec.includes("7") && avec.includes("48"), avec);
  assert.ok(!avec.includes("{n}") && !avec.includes("{h}"), "un trou reste dans la phrase");
  const sans = phraseDEchec({ reason: "rate_limited" }, t);
  const bornes = bornesDuQuota({});
  assert.equal(bornes.h, FENETRE_HEURES);
  assert.equal(bornes.n, Math.max(LIMITE_PAR_EMAIL, LIMITE_PAR_IP));
  assert.ok(sans.includes(String(FENETRE_HEURES)));
  // Une clé absente du dictionnaire ne s'affiche JAMAIS telle quelle.
  const phrase = phraseDEchec({ reason: "busy" }, { errGeneric: "repli" });
  assert.equal(phrase, "repli");
});
