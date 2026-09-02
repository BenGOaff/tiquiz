// tests/logic/page-vente-v2.test.mts
//
// LA VERSION DE TRAVAIL DE LA PAGE DE VENTE.
//
// Ce filet porte sur ce qui coûterait cher si ça régressait, et pas sur
// la mise en page : le rendu se regarde dans un navigateur, il ne se
// teste pas ici. Ce qui se teste, c'est ce qui casserait EN SILENCE.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ORDRE_V2,
  POPUP_BETA,
  CORRECTIONS_V2,
  SCRIPTS_RETIRES,
  blocsNeufs,
  sectionsAttendues,
  verifierPlan,
} from "@/lib/sales/planV2";
import { estUnChantier, estPagePublique, CHANTIERS } from "@/lib/sales/chantier";

const RACINE = process.cwd();
const CAPTURE = path.join(RACINE, "content/sales/tiquiz.html");
const V2 = path.join(RACINE, "content/sales/tiquiz-v2.html");
const DOSSIER = path.join(RACINE, "content/sales/v2");

/** Les sections de premier niveau, appariées par une PILE. */
function sectionsDe(html: string): string[] {
  const re = /<section\b[^>]*>|<\/section>/gi;
  let m: RegExpExecArray | null, pile = 0, debut = 0;
  const ids: string[] = [];
  while ((m = re.exec(html))) {
    if (m[0][1] !== "/") { if (pile === 0) debut = m.index; pile++; }
    else { pile--; if (pile === 0) ids.push(/id="([^"]+)"/.exec(html.slice(debut, debut + 300))?.[1] ?? "?"); }
  }
  assert.equal(pile, 0, "les balises <section> ne s'apparient pas");
  return ids;
}

// ---------------------------------------------------------------------
// LA PORTE : un chantier n'est jamais servi comme la vraie page.
// ---------------------------------------------------------------------

test("un chantier exige la clé même sur le domaine public, et n'est jamais indexable", () => {
  assert.equal(estUnChantier("tiquiz-v2"), true);
  assert.equal(estUnChantier("TIQUIZ-V2  "), true, "la casse et les espaces ne doivent pas ouvrir la porte");
  assert.equal(estUnChantier("tiquiz"), false, "la vraie page n'est pas un chantier");

  // Sur l'hôte public, la vraie page est publique et le chantier ne l'est
  // JAMAIS. C'est le seul test qui empêche la v2 de partir en ligne.
  assert.equal(estPagePublique(true, "tiquiz"), true);
  assert.equal(estPagePublique(true, "tiquiz-v2"), false);
  assert.equal(estPagePublique(false, "tiquiz"), false);
});

test("le sens de l'erreur est sûr : un slug inconnu n'est pas pris pour un chantier", () => {
  // Un oubli laisse une page en chantier FERMÉE (elle n'est pas dans la
  // liste, donc elle passe par `isSalesOpen`). C'est l'inverse qui serait
  // dangereux, et c'est pour ça que la liste nomme les chantiers plutôt
  // que les pages publiques.
  assert.equal(estUnChantier(""), false);
  assert.equal(estUnChantier(null), false);
  assert.equal(estUnChantier(undefined), false);
  assert.ok(CHANTIERS.has("tiquiz-v2"));
});

// ---------------------------------------------------------------------
// LE PLAN : aucune section ne se perd, aucun bloc neuf ne manque.
// ---------------------------------------------------------------------

test("le plan couvre EXACTEMENT les sections de la capture", () => {
  const ids = sectionsDe(fs.readFileSync(CAPTURE, "utf8"));
  const verdict = verifierPlan(ids);
  assert.deepEqual(verdict.manquantes, [], "ces sections disparaîtraient de la v2 sans un mot");
  assert.deepEqual(verdict.enTrop, [], "le plan réclame des sections qui n'existent plus dans la capture");
  assert.equal(verdict.ok, true);
});

test("aucune section n'est placée deux fois", () => {
  const ids = sectionsAttendues();
  assert.equal(new Set(ids).size, ids.length);
});

test("les quatre blocs neufs existent sur le disque", () => {
  const attendus = blocsNeufs();
  assert.equal(attendus.length, 4);
  for (const f of attendus) {
    const p = path.join(DOSSIER, f);
    assert.ok(fs.existsSync(p), `${f} est absent de content/sales/v2/`);
    assert.ok(fs.readFileSync(p, "utf8").includes("<section"), `${f} ne porte pas de <section>`);
  }
});

test("chaque bloc du plan porte un rôle écrit", () => {
  // Sans le rôle, on ne peut pas relire l'ordre sans ouvrir la page, et
  // c'est comme ça qu'on empile trois fois le même temps du parcours.
  // Le seuil est BAS exprès : « LE PRIX » est un rôle parfait, et un
  // test qui le refuse pousse à rallonger une phrase juste pour lui
  // plaire. On attrape le rôle vide ou le mot unique sans verbe, rien de
  // plus.
  for (const b of ORDRE_V2) assert.ok(b.role.trim().length >= 5, JSON.stringify(b));
});

// ---------------------------------------------------------------------
// LE FICHIER CONSTRUIT. `npm run vente:v2` doit avoir tourné.
// ---------------------------------------------------------------------

test("la v2 construite est dans l'ordre du plan, blocs neufs compris", () => {
  const html = fs.readFileSync(V2, "utf8");
  const attendu = ORDRE_V2.map((b) =>
    b.genre === "origine" ? b.id : "section-" + b.fichier.replace(/\.html$/, ""),
  );
  const trouve = sectionsDe(html);
  // Les blocs neufs portent leur propre id : on compare les seules
  // sections d'origine dans l'ordre, plus la présence des neufs.
  assert.equal(trouve.length, ORDRE_V2.length, "il manque ou il y a des sections en trop");
  const originesAttendues = ORDRE_V2.filter((b) => b.genre === "origine").map((b) => (b as { id: string }).id);
  const originesTrouvees = trouve.filter((id) => id.startsWith("section-") && !id.startsWith("section-v2-"));
  assert.deepEqual(originesTrouvees, originesAttendues, "les sections d'origine ne sont pas dans l'ordre du plan");
  for (const id of ["section-v2-funnel", "section-v2-ou", "section-v2-tourne", "section-v2-pourtoi"]) {
    assert.ok(trouve.includes(id), `${id} est absent de la page construite`);
  }
  void attendu;
});

test("LE MÉCANISME passe devant les bénéfices", () => {
  // C'est LA correction de structure du chantier : tant qu'on n'a pas dit
  // comment ça marche, chaque bénéfice annoncé est une promesse en l'air.
  const ordre = ORDRE_V2.map((b) => (b.genre === "origine" ? b.id : b.fichier));
  const mecanique = ordre.indexOf("section-3fe5bb60");
  for (const benefice of ["section-52544404", "section-c5554325", "section-d572b05d", "section-8ad090d2"]) {
    assert.ok(mecanique < ordre.indexOf(benefice), `${benefice} passe avant le mécanisme`);
  }
});

test("la qualification passe AVANT le prix, la preuve avant la qualification", () => {
  const ordre = ORDRE_V2.map((b) => (b.genre === "origine" ? b.id : b.fichier));
  assert.ok(ordre.indexOf("section-3a798764") < ordre.indexOf("cest-pour-toi.html"));
  assert.ok(ordre.indexOf("cest-pour-toi.html") < ordre.indexOf("section-518f489a"));
  assert.ok(ordre.indexOf("section-518f489a") < ordre.indexOf("section-25c05a06"), "la FAQ suit le prix");
});

// ---------------------------------------------------------------------
// LA VENTE BÊTA : elle n'existe plus, nulle part.
// ---------------------------------------------------------------------

test("plus une trace de la vente bêta dans la v2", () => {
  const html = fs.readFileSync(V2, "utf8");
  assert.ok(!html.includes(POPUP_BETA), "le popup de la vente bêta est encore là");
  for (const trace of ["tiquiz-beta", "Accès à vie pour 57", "vente bêta"]) {
    assert.ok(!html.includes(trace), `« ${trace} » traîne encore dans la v2`);
  }
  // Le test doit pouvoir ÉCHOUER : la capture d'origine, elle, les porte.
  const origine = fs.readFileSync(CAPTURE, "utf8");
  assert.ok(origine.includes(POPUP_BETA), "la capture ne porte plus le popup : ce test ne prouve plus rien");
});

// ---------------------------------------------------------------------
// LE BUNDLE QUI RECONSTRUIT LA PAGE.
// ---------------------------------------------------------------------

test("le bundle Systeme.io et ses états ne sont plus servis", () => {
  // MESURÉ : tant qu'ils sont là, le navigateur IGNORE le HTML servi et
  // rejoue la page d'origine depuis le modèle. Les blocs neufs
  // disparaissent, l'ordre revient, le popup revient, et rien à l'écran
  // ne le dit.
  const html = fs.readFileSync(V2, "utf8");
  for (const nom of SCRIPTS_RETIRES.bundles) {
    assert.ok(!html.includes(`/v/tiquiz/${nom}.js`), `le bundle ${nom} est encore servi`);
  }
  for (const nom of SCRIPTS_RETIRES.etats) {
    assert.ok(!html.includes(`window.${nom}=`), `l'état ${nom} est encore servi`);
  }
  // Et la capture, elle, les porte : sinon ce test ne prouverait rien.
  const origine = fs.readFileSync(CAPTURE, "utf8");
  assert.ok(origine.includes("window.__PRELOADED_STATE__="));
});

test("les scripts de Béné, eux, sont TOUS conservés", () => {
  // Tout l'interactif de la page vient d'eux : la bascule mensuel /
  // annuel, le sélecteur de langue, les animations au défilement. En
  // perdre un ne casse rien de visible tout de suite.
  // ON COMPTE LES BALISES, PAS LES CORPS. Mon premier jet ne comptait
  // que les scripts d'au moins 40 caractères, ce qui laissait de côté
  // `window.initialLanguage="fr"` (27) des DEUX côtés : le test échouait
  // sur une arithmétique fausse alors que la construction était juste.
  const compte = (h: string) => (h.match(/<script\b/gi) ?? []).length;
  const origine = fs.readFileSync(CAPTURE, "utf8");
  const v2 = fs.readFileSync(V2, "utf8");
  const retires = SCRIPTS_RETIRES.bundles.length + SCRIPTS_RETIRES.etats.length;
  assert.equal(compte(v2), compte(origine) - retires, "on a perdu (ou gardé) autre chose que le bundle");
});

// ---------------------------------------------------------------------
// LES CORRECTIONS DE TEXTE.
// ---------------------------------------------------------------------

test("chaque correction mord vraiment, et sa raison est écrite", () => {
  const origine = fs.readFileSync(CAPTURE, "utf8");
  const v2 = fs.readFileSync(V2, "utf8");
  for (const c of CORRECTIONS_V2) {
    assert.ok(origine.includes(c.cherche), `« ${c.cherche} » n'existe pas dans la capture : la correction est morte`);
    assert.ok(!v2.includes(c.cherche), `« ${c.cherche} » traîne encore dans la v2`);
    assert.ok(v2.includes(c.remplace), `« ${c.remplace} » n'est pas dans la v2`);
    assert.ok(c.pourquoi.length > 60, "une correction sans raison écrite est une correction que le prochain passage défait");
  }
});

test("le nombre de langues annoncé est celui du catalogue", async () => {
  // Le chiffre affiché ne se recopie pas : il se COMPTE dans le module
  // qui le sert. C'est la leçon de `faitsProgramme.ts`.
  const src = fs.readFileSync(path.join(RACINE, "lib/quizLanguages.ts"), "utf8");
  const entrees = [...src.matchAll(/\{\s*code:\s*"([^"]+)"/g)].length;
  assert.equal(entrees, 100, "le catalogue a bougé : la page annonce un chiffre qui n'est plus vrai");
  const v2 = fs.readFileSync(V2, "utf8");
  assert.ok(v2.includes("100 langues et variantes"));
  assert.ok(!v2.includes("100+ langues"), "« 100+ » est faux d'une unité");
});

// ---------------------------------------------------------------------
// CE QUE LES BLOCS NEUFS N'ONT PAS LE DROIT D'ÉCRIRE.
// ---------------------------------------------------------------------

test("aucun tiret cadratin dans les blocs neufs", () => {
  for (const f of blocsNeufs()) {
    const s = fs.readFileSync(path.join(DOSSIER, f), "utf8");
    assert.ok(!/[—–]/.test(s), `${f} porte un tiret cadratin`);
  }
});

test("on dit tag, jamais étiquette", () => {
  for (const f of blocsNeufs()) {
    const s = fs.readFileSync(path.join(DOSSIER, f), "utf8");
    assert.ok(!/étiquett/i.test(s), `${f} dit « étiquette » : Systeme.io affiche « Tag » en français`);
  }
});

/** Ce que le VISITEUR lit : sans les commentaires ni le CSS. */
function texteVisible(fichier: string): string {
  return fs
    .readFileSync(path.join(DOSSIER, fichier), "utf8")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
}

test("aucune adresse en dur vers l'ancien tunnel Systeme.io", () => {
  for (const f of blocsNeufs()) {
    const s = texteVisible(f);
    assert.ok(!/tipote\.fr/i.test(s), `${f} renvoie vers l'ancien domaine`);
    assert.ok(!/[?&]sa=/.test(s), `${f} écrit un ?sa= : nos liens portent ?ref=`);
  }
});

test("les blocs neufs ne s'adressent jamais au lecteur au féminin", () => {
  // On ne vend pas qu'à des femmes (Béné, 23 puis 24 août 2026).
  for (const f of blocsNeufs()) {
    const s = texteVisible(f).replace(/<[^>]*>/g, " ");
    assert.ok(!/\btu es (prête|sûre|inscrite|connectée)\b/i.test(s), `${f} accorde au féminin`);
    assert.ok(!/\bprêt·e\b|\binscrit·e\b/i.test(s), `${f} emploie un point médian`);
  }
});

test("chaque bloc neuf mène quelque part", () => {
  // Un bloc de vente sans sortie est un cul-de-sac. Les quatre pointent
  // vers une ancre qui existe VRAIMENT dans la page construite.
  const v2 = fs.readFileSync(V2, "utf8");
  for (const f of blocsNeufs()) {
    const s = fs.readFileSync(path.join(DOSSIER, f), "utf8");
    const ancres = [...s.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    for (const a of ancres) {
      assert.ok(v2.includes(`id="${a}"`), `${f} pointe vers #${a}, qui n'existe pas`);
    }
  }
});

test("les blocs neufs portent leur justification en commentaire", () => {
  // Chaque affirmation d'une page de vente doit être rattachable au code
  // qui la rend vraie. Sans ça, le prochain passage la prend pour une
  // formule commerciale et la réécrit.
  for (const f of blocsNeufs()) {
    const s = fs.readFileSync(path.join(DOSSIER, f), "utf8");
    assert.ok(s.trimStart().startsWith("<!--"), `${f} ne dit pas pourquoi il existe`);
    assert.ok(/lib\/|VÉRIFIÉ|Béné/i.test(s.slice(0, 2000)), `${f} ne cite ni source ni demande`);
  }
});

test("les générateurs sont annoncés comme réservés au palier Plus", () => {
  // `canUseAIAnalysis` les réserve à beta / lifetime / mensuel PLUS /
  // annuel PLUS. Les annoncer sans le dire, c'est une déception à la
  // première ouverture du compte.
  const s = fs.readFileSync(path.join(DOSSIER, "quand-ca-tourne.html"), "utf8");
  assert.ok(/plan Plus/i.test(s));
  const limites = fs.readFileSync(path.join(RACINE, "lib/planLimits.ts"), "utf8");
  assert.ok(/export function canUseAIAnalysis/.test(limites), "le gate a changé de nom : la page ne dit peut-être plus le vrai palier");
});
