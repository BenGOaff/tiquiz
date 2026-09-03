// tests/logic/on-dit-tag.test.mts
//
// Béné, 1er septembre 2026 : "ne dis jamais étiquette, nulle part, on
// parle bien de tag en français aussi. Supprime tout ce que tu appelles
// étiquette partout pour dire tag, et mets tags bordel !"
//
// La raison est PRODUIT, pas stylistique : c'est le mot que Systeme.io
// affiche. Son menu CRM en français dit "Tag". Une consigne qui dit
// "étiquette" envoie la créatrice chercher un mot qui n'existe pas sur
// son écran, au moment précis où elle suit une marche à suivre clic par
// clic.
//
// ET ÇA VAUT PAR LANGUE, PAS DANS L'ABSOLU. Vérifié sur ses captures :
// leur interface dit "Tag" en français, en italien, en portugais et en
// anglais, mais "Etiquetas" en ESPAGNOL. Y écrire "tag" rendrait la
// consigne fausse.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const INTERDIT = /étiquet|etiquet/i;

test("aucune étiquette dans le français vu par les créatrices", () => {
  const src = readFileSync(new URL("../../messages/fr.json", import.meta.url), "utf8");
  const fautifs = src.split("\n").filter((l) => INTERDIT.test(l));
  assert.deepEqual(fautifs, [], "le mot est revenu dans messages/fr.json");
});

test("ni en italien, ni en portugais : leur interface dit Tag aussi", () => {
  for (const loc of ["it", "pt", "pt-BR"]) {
    const brut = readFileSync(new URL(`../../messages/${loc}.json`, import.meta.url), "utf8");
    const d = JSON.parse(brut) as Record<string, unknown>;

    // ON VISE PAR LA CLÉ, PAS PAR DES MOTS DANS LE TEXTE. Un premier
    // jet cherchait "sio" dans la phrase : il matchait "conver-sio-ne"
    // et faisait rougir la traduction du libellé Google Ads, qui n'a
    // rien à voir avec un tag Systeme.io.
    const fautifs: string[] = [];
    const visite = (o: unknown, chemin: string) => {
      if (typeof o === "string") {
        const parleDeTag = /automatisation\.|sioTag|sio_tag|csvColumns\.tag|ExportSio/i.test(chemin);
        if (parleDeTag && /etichett|etiquet/i.test(o)) fautifs.push(chemin);
        return;
      }
      if (o && typeof o === "object") {
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) visite(v, `${chemin}.${k}`);
      }
    };
    visite(d, "");
    assert.deepEqual(fautifs, [], `${loc} : un tag Systeme.io s'appelle encore autrement`);
  }
});

test("L'ESPAGNOL GARDE SON MOT, et c'est OBLIGATOIRE", () => {
  // Leur bouton s'appelle "Etiqueta añadida". Écrire "tag" enverrait la
  // créatrice cliquer sur quelque chose qui n'existe pas. Cette
  // exemption reste ÉCRITE : sans elle, le prochain passage la prendrait
  // pour un oubli et "finirait le travail".
  const src = readFileSync(new URL("../../messages/es.json", import.meta.url), "utf8");
  assert.ok(
    /etiqueta/i.test(src),
    "l'espagnol a perdu son mot : la consigne ne correspond plus à leur écran",
  );
});

// ── ET LE CODE AUSSI, PAS SEULEMENT LES TRADUCTIONS (3 septembre 2026)
//
// Le 3 septembre, un journal de production affichait encore :
//
//   [sio/tag] l'etiquette newsletter n'existe pas chez Systeme.io.
//   [sio/tag] tiquiz-free est deja posee pour ...
//   ... n'est pas etiquete newsletter.
//
// Béné les LIT : c'est par ces lignes qu'on a diagnostiqué la connexion
// Google ce jour là. Le mot banni vivait donc sous ses yeux, avec en
// prime les accords fautifs que sa correction du 1er septembre avait
// laissés derrière elle ("posee", "etiquette" au féminin alors que
// "tag" est masculin).
//
// Le test d'origine ne balayait que `messages/*.json`. Un garde-fou qui
// ne couvre pas l'endroit où la faute s'est installée ne protège rien.
//
// ON CIBLE LE DOSSIER `lib/sio/`, JAMAIS LA SOUS-CHAÎNE "sio". Filtrer
// les chemins qui CONTIENNENT "sio" ramène `dimenSIOn`, `sesSIOn` et
// `commisSIOn` : c'est le faux positif que le test du dessus raconte
// déjà pour "conver-sio-ne", et il se refait tout seul.
//
// Et "étiquette" au sens LIBELLÉ reste légitime partout ailleurs :
// étiqueter un lien avec utm_source, le libellé d'un axe, le "conversion
// label" de Google Ads. Ce ne sont pas des tags Systeme.io, et les faire
// rougir rendrait le texte faux dans l'autre sens.
test("aucune étiquette dans le code qui parle des tags Systeme.io", () => {
  const dossier = new URL("../../lib/sio/", import.meta.url);
  const fautifs: string[] = [];

  for (const nom of readdirSync(dossier)) {
    if (!nom.endsWith(".ts")) continue;
    const src = readFileSync(new URL(nom, dossier), "utf8");
    src.split("\n").forEach((ligne, i) => {
      if (INTERDIT.test(ligne)) fautifs.push(`lib/sio/${nom}:${i + 1} ${ligne.trim()}`);
    });
  }

  assert.deepEqual(fautifs, [], "le mot banni est revenu dans les journaux que Béné lit");
});

// ── UNE POSE RÉUSSIE SE JOURNALISE (3 septembre 2026)
//
// Seuls l'échec, le refus et le « déjà posé » l'étaient. Répondre à
// « est-ce que cette personne recevra sa campagne ? » demandait donc de
// raisonner par élimination sur ce qui N'ÉTAIT PAS écrit, et c'est ce
// qu'il a fallu faire le 3 septembre pour un vrai compte.
//
// Sur le chemin qui décide si quelqu'un entre dans ses séquences email,
// une déduction n'est pas une mesure.
test("le succès d'une pose de tag laisse une trace, pas seulement l'échec", () => {
  const src = readFileSync(new URL("../../lib/sio/appliquerTag.ts", import.meta.url), "utf8");

  // On lit le CODE, pas les commentaires : sinon l'explication ci-dessus
  // ferait passer le test toute seule.
  const code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // ON VISE LE JOURNAL QUI PRÉCÈDE LE RETOUR DE SUCCÈS, pas "un log qui
  // parle de pose". Premier jet : /console\.log\(`\[sio\/tag\][^`]*pose/,
  // qui matchait le message « est deja pose pour ... » du garde-fou juste
  // au dessus. Retirer le log de succès laissait donc le test VERT, sur
  // le contrôle écrit exprès pour ça.
  //
  // Huitième fois de la semaine : un contrôle qui ne distingue pas ce
  // qu'il est censé distinguer est pire qu'un contrôle absent, et ça vaut
  // pour le test qu'on écrit à l'instant, pas seulement pour les clés
  // d'API.
  const finDeLaPose = code.indexOf('raison: "pose_refusee"');
  const retourOk = code.indexOf('raison: "ok"', finDeLaPose);
  assert.ok(finDeLaPose > 0 && retourOk > finDeLaPose, "la pose a changé de forme");

  const entreLesDeux = code.slice(finDeLaPose, retourOk);
  const succes = entreLesDeux.match(/console\.log\(`[^`]*`\)/);
  assert.ok(succes, "une pose réussie ne laisse aucune ligne : le cas NORMAL est muet");

  // Et elle nomme les deux choses qu'on cherche quand on lit le journal.
  assert.match(succes[0], /\$\{tag\}/, "la ligne ne dit pas QUEL tag");
  assert.match(succes[0], /\$\{adresse\}/, "la ligne ne dit pas POUR QUI");
});
