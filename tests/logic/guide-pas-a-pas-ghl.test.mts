// tests/logic/guide-pas-a-pas-ghl.test.mts
//
// LE GUIDE PAS À PAS GOHIGHLEVEL, ET LES MOTS DE L'ÉDITEUR QUI NE
// PARLENT PLUS DE SYSTEME.IO (Béné, 15 septembre 2026).
//
// Trois retours du même test sur son sous-compte GoHighLevel :
//   - "j'ai 'tag systemeio' comme label. Faudra corriger tout ça, dans
//     toutes les langues... Juste tag à appliquer aux personnes qui ont
//     obtenu ce profil" ;
//   - "je ne vois aucun bouton tester t'as fumé" (il existait : une
//     icône seule, avec le mot en `title`, donc visible au survol) ;
//   - "sur chaque carte de connexion à un outil tiers, il faudra un
//     lien qui s'ouvre dans une nouvelle fenêtre avec le step by step
//     comme quizify : illustré, guidé à chaque étape".
//
// Ce que ce fichier tient :
//   1. le guide est une SUITE d'étapes numérotées, chacune dit dans
//      quel produit elle se passe, et chacune nomme sa capture ;
//   2. il ne parle plus du jeton privé (retiré de l'écran le
//      15 septembre) : un guide qui décrit un bouton disparu envoie
//      chercher au mauvais endroit ;
//   3. le bouton Tester porte son mot, pas seulement un `title` ;
//   4. les libellés de tag de l'éditeur ne nomment plus Systeme.io,
//      dans les 7 langues : la destination peut être GoHighLevel ;
//   5. la carte porte un lien vers le guide, dans un nouvel onglet.
//
// Vérifié en rejouant les versions d'avant : chaque garde rougit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { contenuGoHighLevel } from "@/lib/site/outils/gohighlevel";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const racine = process.cwd();
const lire = (p: string) => readFileSync(join(racine, p), "utf8");
const LANGUES = ["fr", "en", "es", "it", "ar", "pt", "pt-BR"] as const;

function phrasesDe(o: unknown, sortie: string[] = []): string[] {
  if (typeof o === "string") sortie.push(o);
  else if (Array.isArray(o)) for (const v of o) phrasesDe(v, sortie);
  else if (o && typeof o === "object") for (const v of Object.values(o as Record<string, unknown>)) phrasesDe(v, sortie);
  return sortie;
}

// ── 1. LE GUIDE : une action par étape, le produit, la capture ────────

test("le guide GoHighLevel est une suite d'étapes numérotées, et chacune dit où elle se passe et quoi photographier", () => {
  const fr = contenuGoHighLevel("fr");
  const en = contenuGoHighLevel("en");
  assert.ok(fr.etapes.length >= 8, `au moins huit étapes, il y en a ${fr.etapes.length}`);
  assert.equal(en.etapes.length, fr.etapes.length, "l'anglais a le même nombre d'étapes que le français");
  for (const t of [fr, en]) {
    for (const [i, e] of t.etapes.entries()) {
      assert.ok(e.titre.trim().length > 0, `${t.langue} étape ${i + 1} : un titre`);
      assert.ok(e.ou === "tiquiz" || e.ou === "gohighlevel", `${t.langue} étape ${i + 1} : dit dans quel produit on est`);
      assert.ok(e.corps.length > 0 && e.corps.every((c) => c.length > 0), `${t.langue} étape ${i + 1} : un corps`);
      assert.ok(e.capture.aFaire.trim().length > 20, `${t.langue} étape ${i + 1} : nomme l'écran à photographier`);
      if (e.capture.image) {
        assert.ok(
          existsSync(join(racine, "public/integrations", e.capture.image.fichier)),
          `${t.langue} étape ${i + 1} : la capture ${e.capture.image.fichier} n'existe pas dans public/integrations`,
        );
        assert.ok(e.capture.image.largeur > 0 && e.capture.image.hauteur > 0 && e.capture.image.alt.length > 0);
      }
    }
    // Le guide alterne les deux produits : un guide qui ne se passerait
    // que dans Tiquiz n'expliquerait pas le workflow, et c'est lui qui
    // fait que le tag sert à quelque chose.
    assert.ok(t.etapes.some((e) => e.ou === "gohighlevel"), `${t.langue} : au moins une étape chez GoHighLevel`);
    assert.ok(t.etapes.some((e) => e.ou === "tiquiz"), `${t.langue} : au moins une étape dans Tiquiz`);
    assert.ok(t.ou.tiquiz.length > 0 && t.ou.gohighlevel.length > 0 && t.captureAAjouter.length > 0 && t.etapeMot.length > 0);
  }
});

test("le guide ne décrit plus le jeton privé, retiré de l'écran le 15 septembre", () => {
  for (const langue of ["fr", "en"] as const) {
    for (const ph of phrasesDe(contenuGoHighLevel(langue))) {
      assert.ok(!/jeton|token|Private Integrations/i.test(ph), `${langue} : une phrase décrit encore le jeton : ${ph}`);
    }
  }
});

test("le texte français du guide ne porte ni tiret cadratin ni chevron", () => {
  for (const ph of phrasesDe(contenuGoHighLevel("fr"))) {
    assert.ok(!/[—–«»]/.test(ph), `chevron ou tiret cadratin : ${ph}`);
  }
});

test("la page rend chaque étape avec sa capture, ou l'encadré qui la nomme", () => {
  const src = sansCommentaires(lire("app/(site-langues)/integrations/gohighlevel/page.tsx"));
  assert.ok(/t\.etapes\.map\(\(e, n\)/.test(src), "la page numérote les étapes");
  assert.ok(/\{t\.ou\[e\.ou\]\}/.test(src), "la page affiche dans quel produit on est");
  assert.ok(/e\.capture\.image \? \(\s*<Capture/.test(src), "une capture posée est rendue par Capture");
  assert.ok(/\{t\.captureAAjouter\}/.test(src) && /\{e\.capture\.aFaire\}/.test(src), "une capture manquante est NOMMÉE à l'écran");
});

// ── 2. LE BOUTON TESTER PORTE SON MOT ─────────────────────────────────

test("le bouton Tester de la fenêtre GoHighLevel porte son mot, pas seulement un title", () => {
  const src = sansCommentaires(lire("components/connexions/GoHighLevelManager.tsx"));
  const bouton = /<Button([^>]*)onClick=\{\(\) => tester\(c\.id\)\}([^>]*)>([\s\S]*?)<\/Button>/.exec(src);
  assert.ok(bouton, "le bouton Tester existe");
  const attrs = bouton![1] + bouton![2];
  assert.ok(!/size="icon"/.test(attrs), "ce n'est plus un bouton icône");
  assert.ok(/\{t\("tester"\)\}/.test(bouton![3]), "le mot Tester est DANS le bouton, visible sans survol");
});

// ── 3. LES LIBELLÉS DE TAG NE NOMMENT PLUS SYSTEME.IO ─────────────────

test("les libellés de tag de l'éditeur parlent du geste, pas de Systeme.io, dans les 7 langues", () => {
  const CLES = ["previewResultTagLabel", "optionSioTagLabel", "shareTagLabel", "optionSioScoreTags", "surveyLeadTagHint"] as const;
  for (const langue of LANGUES) {
    const d = JSON.parse(lire(`messages/${langue}.json`)) as { quizEditor: Record<string, unknown> & { csvColumns: Record<string, string> } };
    for (const k of CLES) {
      const v = d.quizEditor[k];
      assert.equal(typeof v, "string", `${langue} : ${k} existe`);
      assert.ok(!/systeme\.?io/i.test(v as string), `${langue} : ${k} nomme encore Systeme.io : ${v}`);
      assert.ok(!/[—–«»]/.test(v as string), `${langue} : ${k} porte un tiret cadratin ou un chevron`);
    }
    assert.ok(!/systeme\.?io/i.test(d.quizEditor.csvColumns.tag), `${langue} : la colonne CSV du tag nomme encore Systeme.io`);
    // "Tag" tout court ne dit pas À QUI il s'applique : c'est le mot du
    // geste qu'elle a demandé.
    assert.ok((d.quizEditor.previewResultTagLabel as string).length > 12, `${langue} : le libellé du profil dit le geste`);
  }
  // Le mot est "tag" sauf en espagnol, où Systeme.io dit "etiqueta"
  // (règle du 1er septembre).
  const es = JSON.parse(lire("messages/es.json")) as { quizEditor: Record<string, string> };
  assert.ok(/etiqueta/i.test(es.quizEditor.previewResultTagLabel));
  const fr = JSON.parse(lire("messages/fr.json")) as { quizEditor: Record<string, string> };
  assert.ok(/\btag\b/i.test(fr.quizEditor.previewResultTagLabel) && !/étiquette/i.test(fr.quizEditor.previewResultTagLabel));
});

// ── 4. LA CARTE MÈNE AU GUIDE, DANS UN NOUVEL ONGLET ──────────────────

test("chaque carte d'outil disponible porte un lien vers son guide, ouvert dans un nouvel onglet", () => {
  const src = sansCommentaires(lire("components/connexions/ConnexionsTab.tsx"));
  const lien = /\{f\.aide && \(\s*<a\s+href=\{guide\(f\.aide\)\}\s+target="_blank"\s+rel="noopener noreferrer"[\s\S]*?\{t\("guide"\)\}[\s\S]*?<\/a>/.exec(src);
  assert.ok(lien, "le lien vers le guide est sur la carte, en target _blank avec noopener");
  for (const langue of LANGUES) {
    const d = JSON.parse(lire(`messages/${langue}.json`)) as { connexions: { guide: string } };
    assert.ok(d.connexions.guide.length > 4, `${langue} : le libellé du guide dit que c'est un pas à pas`);
  }
});
