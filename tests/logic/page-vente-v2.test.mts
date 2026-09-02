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
  FONDS_CONVERTIS,
  blocsNeufs,
  sectionsAttendues,
  verifierPlan,
} from "@/lib/sales/planV2";
import { estUnChantier, estPagePublique, CHANTIERS } from "@/lib/sales/chantier";
import { CORRECTIONS_FAQ, rangerFaq, type QuestionFaq } from "@/lib/sales/faqV2";
import { ICONES_V2, FAMILLES_RETIREES } from "@/lib/sales/iconesV2";
import { ALT_IMAGES_V2, LOGO, altDe, nonClassees } from "@/lib/sales/altImagesV2";
import {
  IMAGES_SURDIMENSIONNEES,
  DENSITE_COUVERTE,
  nomReduit,
  hauteurCible,
} from "@/lib/sales/imagesV2";
import {
  AVANTAGES_NOUVEAUX,
  AVANTAGES_PLUS,
  avantagesDuPlan,
  estPalierPlus,
  tousLesAvantages,
} from "@/lib/checkout/avantages";

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

/**
 * Les REGLES CSS d'un bloc neuf : sans les commentaires, mais AVEC le
 * <style>. `texteVisible` retire les deux, et une assertion sur une
 * regle y serait donc toujours fausse sans le dire.
 */
function regles(fichier: string): string {
  return fs
    .readFileSync(path.join(DOSSIER, fichier), "utf8")
    .replace(/<!--[\s\S]*?-->/g, " ");
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

// ---------------------------------------------------------------------
// LA FAQ. Elle avait cessé de s'ouvrir, et ma mesure disait le contraire.
// ---------------------------------------------------------------------

test("la FAQ est cliquable sans une ligne de JavaScript", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  const details = (v2.match(/<details class="tqv-faq-q">/g) ?? []).length;
  assert.equal(details, 16, "il n'y a pas 16 questions dépliables");
  // `<details>` natif : ça ne peut pas se casser en retirant un script,
  // et c'est précisément comme ça que l'accordéon d'origine est mort.
  assert.ok(!/tqv-faq[\s\S]{0,4000}?addEventListener/.test(v2), "la FAQ dépend d'un script");
});

test("aucune question de la FAQ ne se perd entre les groupes", () => {
  const brut = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
    fs.readFileSync(CAPTURE, "utf8"),
  )![1];
  let questions = JSON.parse(brut).mainEntity as QuestionFaq[];
  for (const c of CORRECTIONS_FAQ) {
    questions = JSON.parse(JSON.stringify(questions).split(c.cherche).join(c.remplace));
  }
  const range = rangerFaq(questions);
  assert.deepEqual(range.orphelines.map((q) => q.name), [], "ces questions disparaîtraient de la page");
  assert.deepEqual(range.inconnues, [], "le plan nomme des questions qui n'existent pas");
});

test("les données structurées de la FAQ repartent avec la section", () => {
  // RÉGRESSION RÉELLE, attrapée par ma propre sonde : le JSON-LD vivait
  // DANS la section, donc la remplacer l'emportait. Google perdait les
  // 16 questions en silence, sur la page qu'on veut faire remonter.
  const v2 = fs.readFileSync(V2, "utf8");
  const blocs = [...v2.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocs.length, 1, "il devrait y avoir exactement un bloc de données structurées");
  const d = JSON.parse(blocs[0][1].replace(/\\u003c/g, "<"));
  assert.equal(d["@type"], "FAQPage");
  assert.equal(d.mainEntity.length, 16);
  // Et il porte le texte CORRIGÉ : une structure qui dirait autre chose
  // que la page serait une deuxième version du contenu.
  assert.ok(d.mainEntity.some((q: { name: string }) => q.name.startsWith("Faut-il un abonnement payant")));
  assert.ok(!JSON.stringify(d).includes("obligé(e)"), "le JSON-LD garde une formulation genrée");
  assert.ok(!JSON.stringify(d).includes("hello@tipote.com"), "le JSON-LD garde l'ancienne adresse");
});

// ---------------------------------------------------------------------
// LES AVANTAGES : une seule liste pour la grille ET le bon de commande.
// ---------------------------------------------------------------------

test("les nouveautés sont dans les six colonnes de tarif", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  for (const a of AVANTAGES_NOUVEAUX) {
    const n = v2.split(a.texte).length - 1;
    assert.ok(n >= 6, `« ${a.texte} » apparaît ${n} fois, il en faut au moins 6 (une par colonne)`);
  }
  const gen = AVANTAGES_PLUS.find((a) => a.texte.includes("générateurs"))!;
  assert.ok(v2.includes(gen.texte), "les générateurs ne sont pas dans la grille");
});

test("le bon de commande et la grille disent la MÊME chose", () => {
  // Deux listes de la même chose divergent toujours, et ici la
  // divergence vivrait sur l'écran où quelqu'un sort sa carte.
  const commande = fs.readFileSync(path.join(RACINE, "app/commande/[produit]/page.tsx"), "utf8");
  assert.ok(commande.includes("AVANTAGES_NOUVEAUX"), "le bon de commande réécrit sa propre liste");
  assert.ok(commande.includes("AVANTAGES_PLUS"), "le bon de commande n'annonce pas ce que Plus ajoute");
  // Et il ne recopie AUCUN des textes à la main.
  for (const a of tousLesAvantages()) {
    assert.ok(!commande.includes(a.texte), `« ${a.texte} » est recopié en dur dans le bon de commande`);
  }
});

test("chaque avantage cite le code qui le rend vrai", () => {
  for (const a of tousLesAvantages()) {
    assert.ok(a.source.length > 8, `« ${a.texte} » n'a pas de source`);
  }
});

test("un palier Plus est lu sur le catalogue, jamais deviné", () => {
  assert.equal(estPalierPlus("mensuel-plus"), true);
  assert.equal(estPalierPlus("annuel-plus"), true);
  assert.equal(estPalierPlus("mensuel"), false);
  assert.equal(estPalierPlus("annuel"), false);
  // Le PLUS passe en premier : c'est ce qui justifie l'écart de prix.
  assert.equal(avantagesDuPlan("mensuel-plus")[0], AVANTAGES_PLUS[0]);
  assert.ok(!avantagesDuPlan("mensuel").includes(AVANTAGES_PLUS[0]));
});

// ---------------------------------------------------------------------
// LA FORME : les blocs neufs se fondent dans la page.
// ---------------------------------------------------------------------

test("les blocs neufs ont le padding de la page", () => {
  // MESURÉ : toutes les sections de contenu sont en 100px / 100px. Les
  // miennes étaient à 70, et ça se voyait.
  for (const f of blocsNeufs()) {
    const s = fs.readFileSync(path.join(DOSSIER, f), "utf8");
    assert.ok(/padding:100px 20px\}/.test(s), `${f} n'a pas le padding de la page`);
  }
});

test("les boutons des blocs neufs sont ceux de la page", () => {
  // Relevé sur la page : #5A6EF6, rayon 999px, 18px, et l'animation
  // `tqButtonPulse` que portent les 21 boutons d'origine. Trois styles
  // de bouton sur une page de vente, c'est trois familles à comprendre.
  for (const f of blocsNeufs()) {
    const s = fs.readFileSync(path.join(DOSSIER, f), "utf8");
    if (!/href="#/.test(s)) continue;
    assert.ok(s.includes("tqButtonPulse"), `${f} n'utilise pas l'animation de la page`);
    assert.ok(s.includes("#5A6EF6"), `${f} n'utilise pas la couleur de bouton de la page`);
    assert.ok(s.includes("border-radius:999px"), `${f} n'a pas le rayon de la page`);
  }
});

test("le mini quiz se lit comme un quiz : une question à la fois", () => {
  // Béné, 2 septembre, sur le premier jet en trois colonnes : "est-ce que
  // toi, en tant que visiteur tu comprends que c'est un quiz et que tu
  // dois cliquer ?? [...] pas un 'vrai' quiz, pas pratique, trop
  // compliqué". Un quiz pose UNE question, on clique, on avance.
  //
  // SUR LE TEXTE VISIBLE, pas sur le fichier : mon premier jet comptait
  // 7 boutons radio au lieu de 6, parce que le commentaire qui explique
  // la mécanique écrit un `input type=radio` lui aussi.
  const s = texteVisible("cest-pour-toi.html");
  const css = regles("cest-pour-toi.html");

  assert.equal((s.match(/type="radio"/g) ?? []).length, 6, "trois questions, deux réponses chacune");

  // Les trois étapes existent, et le CSS n'en montre qu'UNE : celle dont
  // la réponse manque. Sans ces règles, tout s'affiche d'un coup et on
  // retombe sur le formulaire en colonnes qu'elle a refusé.
  for (const id of ["ptE1", "ptE2", "ptE3"]) {
    assert.ok(s.includes('id="' + id + '"'), "l'étape " + id + " a disparu");
  }
  assert.ok(css.includes(".tqv-pt-e{display:none}"), "les étapes ne sont plus masquées par défaut");
  assert.ok(css.includes(':not(:has(input[name="pt1"]:checked)) #ptE1{display:block}'), "l'étape 1 ne s'affiche plus toute seule");
  assert.ok(css.includes(':has(input[name="pt2"]:checked):not(:has(input[name="pt3"]:checked)) #ptE3{display:block}'), "l'étape 3 ne dépend plus des deux précédentes");

  // La progression : c'est elle qui dit qu'il y a une suite.
  assert.ok(s.includes("Question 1 sur 3") && s.includes("Question 3 sur 3"), "le rang de la question n'est plus affiché");
  assert.ok(s.includes("tqv-pt-jauge"), "la barre de progression a disparu");

  // Les options doivent RESSEMBLER à des boutons : c'est le reproche de
  // départ, "on ne comprend pas qu'il faut cliquer". Un fond, une
  // bordure de marque, une flèche, et un survol qui bouge.
  assert.ok(/\.tqv-pt-ops label\{[^}]*cursor:pointer/.test(css), "les options ne sont plus cliquables à l'oeil");
  assert.ok(css.includes(".tqv-pt-ops label::after"), "les options n'ont plus leur flèche");
  assert.ok(/\.tqv-pt-ops label:hover\{[^}]*transform:translateY/.test(css), "les options ne réagissent plus au survol");
});

test("trois verdicts : une seule réponse discordante ne fait pas un refus", () => {
  // "trop restrictif" : UNE seconde option sur trois donnait le refus
  // sec. Quelqu'un qui veut des leads ET une maquette au pixel près se
  // faisait renvoyer, alors que Tiquiz lui va très bien sur l'essentiel.
  const s = texteVisible("cest-pour-toi.html");
  for (const c of ["tqv-pt-oui", "tqv-pt-mixte", "tqv-pt-non"]) {
    assert.ok(s.includes(c), "le verdict " + c + " n'existe pas");
  }
  // Le OUI n'est QUE la combinaison a-a-a, le NON que b-b-b, et les SIX
  // autres sont énumérées une par une : c'est verbeux, et ça ne peut pas
  // se tromper de cas.
  assert.ok(regles("cest-pour-toi.html").includes("#pt1a:checked):has(#pt2a:checked):has(#pt3a:checked) .tqv-pt-oui"));
  assert.ok(regles("cest-pour-toi.html").includes("#pt1b:checked):has(#pt2b:checked):has(#pt3b:checked) .tqv-pt-non"));
  const melangees = (regles("cest-pour-toi.html").match(/\.tqv-pt-mixte/g) ?? []).length;
  assert.equal(melangees, 6, "le verdict nuancé ne couvre pas EXACTEMENT les 6 combinaisons mélangées");
  // Et il sait toujours dire non.
  assert.ok(s.includes("Franchement, non."), "le verdict ne sait plus dire non");
});

test("le mini quiz ne dépend d'aucun script et ne capture rien", () => {
  const s = texteVisible("cest-pour-toi.html");
  // Aucun script : c'est ce qui a tué la FAQ d'origine.
  assert.ok(!/<script/i.test(s), "le mini quiz dépend d'un script");
  // Le formulaire est là POUR le bouton Recommencer natif, et pour rien
  // d'autre : sans lui, on ne peut plus rien changer une fois la
  // troisième réponse donnée. Il n'a ni destination ni champ de saisie.
  assert.ok(s.includes('<input type="reset"'), "on ne peut plus recommencer le test");
  assert.ok(!/action=|method=|type="email"|type="text"/i.test(s), "le mini quiz a l'air de capturer quelque chose");

  // La hauteur est RÉSERVÉE autour de la carte, pas dedans : le verdict
  // s'affiche sur place au lieu de pousser la page. Mesuré à 1280x900 et
  // 1440x800 : 763 px dans les CINQ états, repos compris.
  assert.ok(/\.tqv-pt-scene\{min-height:\d+px\}/.test(regles("cest-pour-toi.html")), "la hauteur du verdict n'est plus réservée");
  // La ligne Recommencer vit HORS de la carte, donc min-height ne
  // l'absorbe pas : elle occupe sa place en permanence. En display:none,
  // elle décalait la page de 37 px au moment du verdict.
  assert.ok(regles("cest-pour-toi.html").includes(".tqv-pt-reprise{visibility:hidden"), "la ligne Recommencer décale la page quand elle apparaît");
});

// ---------------------------------------------------------------------
// LA VENTE BÊTA, SUR TOUTE LA PAGE ET DANS LA FAQ.
// ---------------------------------------------------------------------

test("ni la page ni la FAQ ne parlent d'accès à vie payant", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  // « GRATUIT À VIE » reste : c'est le palier gratuit sans limite de
  // durée, et c'est vrai. Ce qu'on traque, c'est l'accès à vie VENDU.
  for (const trace of ["Accès à vie pour", "tiquiz-beta", "vente bêta", "bêta utilisateur"]) {
    assert.ok(!v2.includes(trace), `« ${trace} » traîne encore`);
  }
  assert.ok(v2.includes("GRATUIT À VIE"), "le palier gratuit sans limite de durée a disparu");
});

// ---------------------------------------------------------------------
// LE RÉFÉRENCEMENT ET LE CHARGEMENT.
// ---------------------------------------------------------------------

test("la page ne sert plus qu'un seul <h1>", () => {
  // MESURÉ : les deux étaient VISIBLES en même temps, à 1280 comme à
  // 390 px. Ce n'étaient pas deux versions d'un titre, c'étaient les
  // deux moitiés d'une phrase découpées en deux titres de niveau 1.
  const v2 = fs.readFileSync(V2, "utf8");
  const i = v2.indexOf("window.__PRELOADED_STATE__");
  const dom = i < 0 ? v2 : v2.slice(0, i);
  assert.equal((dom.match(/<h1\b/g) ?? []).length, 1);
  const origine = fs.readFileSync(CAPTURE, "utf8");
  const j = origine.indexOf("window.__PRELOADED_STATE__");
  assert.equal((origine.slice(0, j).match(/<h1\b/g) ?? []).length, 2, "la capture n'en a plus deux : ce test ne prouve plus rien");
});

test("les images hors du premier écran sont différées", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  const imgs = v2.match(/<img\b[^>]*>/gi) ?? [];
  const differees = imgs.filter((t) => /loading="lazy"/.test(t)).length;
  // Les huit premières restent immédiates EXPRÈS : différer une image du
  // premier écran la fait arriver plus tard, donc dégrade exactement la
  // mesure qu'on cherche à améliorer.
  assert.ok(differees >= imgs.length - 12, `${differees} différées sur ${imgs.length}`);
  assert.ok(!/^[\s\S]{0,60000}?<img[^>]*loading="lazy"/.test(v2), "une image du premier écran a été différée");
});

// ---------------------------------------------------------------------
// LE POIDS. Trois postes mesurés, et le premier n'était pas le CSS.
// ---------------------------------------------------------------------

test("les fonds de section sont servis en WebP, pas en SVG-bitmap", () => {
  // Les cinq « SVG » de fond embarquent chacun quatre bitmaps en base64 :
  // 1638 Ko à eux cinq, contre 316 Ko pour TOUT le CSS de la page.
  // J'avais annoncé « 2552 Ko de CSS » : c'était une erreur de lecture,
  // `performance.getEntriesByType` range sous `initiatorType: "css"` tout
  // ce qu'une feuille va CHERCHER.
  const v2 = fs.readFileSync(V2, "utf8");
  for (const nom of FONDS_CONVERTIS) {
    assert.ok(!v2.includes(`/v/tiquiz/${nom}.svg`), `le fond ${nom} est encore servi en SVG`);
    assert.ok(v2.includes(`/v/tiquiz/${nom}.webp`), `le fond ${nom} n'est pas remplacé`);
    const webp = path.join(RACINE, "public/v/tiquiz", `${nom}.webp`);
    assert.ok(fs.existsSync(webp), `${nom}.webp n'a pas été construit (npm run vente:fonds)`);
    const svg = path.join(RACINE, "public/v/tiquiz", `${nom}.svg`);
    // Le SVG reste sur le disque : la page d'origine s'en sert encore.
    assert.ok(fs.existsSync(svg), `${nom}.svg a été supprimé, la vraie page en a besoin`);
    assert.ok(
      fs.statSync(webp).size < fs.statSync(svg).size / 2,
      `${nom}.webp ne gagne pas la moitié du poids : la conversion a raté`,
    );
  }
});

test("Font Awesome n'est plus chargé, et les quatre icônes sont dessinées", () => {
  // 593 Ko de police Pro pour quatre dessins. On garde les <i> et leurs
  // classes (donc toute la mise en page de la page), on dessine dedans.
  const v2 = fs.readFileSync(V2, "utf8");
  for (const famille of FAMILLES_RETIREES) {
    assert.ok(
      !new RegExp(`@font-face[^}]*${famille.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(v2),
      `la police « ${famille} » est encore déclarée`,
    );
  }
  assert.ok(v2.includes('id="tqv-icones"'), "le CSS des icônes n'est pas posé");
  for (const i of ICONES_V2) {
    assert.ok(v2.includes(`.tqv-ico.${i.classe}::after`), `${i.classe} n'a pas de dessin`);
  }
});

test("aucune icône ne compte sur une police qu'on a retirée", () => {
  // C'est LE risque du retrait : une classe `fa-` oubliée devient un
  // carré vide sur la grille tarifaire, et personne ne le voit avant une
  // cliente. On regarde les attributs `class`, sur n'importe quelle
  // balise et avec les deux sortes de guillemets.
  const v2 = fs.readFileSync(V2, "utf8");
  const connues = new Set(ICONES_V2.map((i) => i.classe));
  const restantes = new Set<string>();
  for (const m of v2.matchAll(/\bclass=("([^"]*)"|'([^']*)')/gi)) {
    for (const c of (m[2] ?? m[3] ?? "").split(/\s+/)) {
      const n = c.toLowerCase();
      if (n.startsWith("fa-") && !connues.has(n)) restantes.add(n);
    }
  }
  assert.deepEqual([...restantes], [], "ces icônes seraient invisibles");
});

test("les deux sortes de guillemets sont marquées", () => {
  // Mon premier jet ne lisait que `class="…"` : 38 icônes marquées sur
  // 128, parce que la grille tarifaire écrit `class='fas fa-check-circle'`.
  // Le compte affiché par le script est ce qui l'a dit.
  const v2 = fs.readFileSync(V2, "utf8");
  const marquees = (v2.match(/\btqv-ico\b/g) ?? []).length;
  const attendues = ICONES_V2.reduce((t, i) => t + i.vues, 0);
  // `-1` : la règle CSS elle même porte le nom de classe.
  assert.ok(marquees - 1 >= attendues, `${marquees - 1} icônes marquées, ${attendues} attendues`);
});

test("une coche est DÉCOUPÉE dans le disque, jamais posée dessus", () => {
  // Un masque CSS ne lit que l'ALPHA : une coche blanche posée sur le
  // disque est opaque, donc elle prend la couleur du disque. Premier
  // essai : 106 pastilles pleines dans la grille tarifaire.
  for (const c of ["fa-check-circle", "fa-chevron-circle-up"]) {
    const i = ICONES_V2.find((x) => x.classe === c)!;
    assert.ok(i.dessin.includes("<mask"), `${c} ne découpe pas son dessin`);
    assert.ok(!/stroke="#fff"/.test(i.dessin), `${c} dessine en blanc par dessus`);
  }
});

test("les dessins sont les nôtres, pas ceux de Font Awesome", () => {
  // Leurs tracés sont sous licence. Les nôtres sont des formes
  // génériques en 24x24 : un cercle, une coche, une flèche, une caméra.
  for (const i of ICONES_V2) {
    assert.ok(i.dessin.length < 700, `${i.classe} porte un tracé trop long pour être redessiné à la main`);
    assert.ok(!/[\d.]{4,},[\d.]{4,},[\d.]{4,},[\d.]{4,}/.test(i.dessin), `${i.classe} ressemble à un tracé importé`);
  }
});

// ---------------------------------------------------------------------
// LES TEXTES ALTERNATIFS. 88 images sur 104 n'en avaient aucun.
// ---------------------------------------------------------------------

test("plus une seule image sans texte alternatif", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  const sans = (v2.match(/<img\b[^>]*>/gi) ?? [])
    // Le pixel de suivi Meta est un 1x1 en display:none, servi par eux :
    // il n'affiche rien, et on ne réécrit pas le code d'un tiers.
    .filter((t) => !/facebook\.com\/tr\?/.test(t))
    .filter((t) => !/\salt=/.test(t));
  assert.equal(sans.length, 0, `${sans.length} images sans alt : ${sans.slice(0, 3).join(" | ")}`);
});

test("un alt vide est une DÉCISION écrite, jamais un oubli", () => {
  // C'est la seule façon de distinguer « décorative, le lecteur d'écran
  // doit l'ignorer » de « personne ne l'a regardée ». Sans la raison à
  // côté, le prochain passage prend le vide pour un trou à combler.
  for (const a of ALT_IMAGES_V2) {
    assert.ok(a.pourquoi.trim().length > 10, `${a.src} n'explique pas son texte`);
    if (a.alt === "") {
      assert.match(a.pourquoi, /[Dd]écorative|logo/, `${a.src} porte un alt vide sans dire pourquoi`);
    }
  }
});

test("aucun alt n'est fabriqué à partir du nom de fichier", () => {
  // Ces fichiers s'appellent « a787cf8c0b74.svg ». Un alt qui reprend
  // ce nom fait entendre douze caractères de hasard à qui écoute.
  for (const a of ALT_IMAGES_V2) {
    if (a.alt === "") continue;
    const nom = a.src.split("/").pop()!.replace(/\.\w+$/, "");
    assert.ok(!a.alt.includes(nom), `${a.src} recopie son nom de fichier`);
    assert.ok(!/^image |^photo |^visuel /i.test(a.alt), `${a.src} annonce « image » : un lecteur d'écran le dit déjà`);
    assert.ok(a.alt.length <= 200, `${a.src} : ${a.alt.length} caractères, c'est un paragraphe`);
    assert.ok(!/[—–]/.test(a.alt), `${a.src} porte un tiret cadratin`);
  }
});

test("le logo dit Tiquiz, parce que c'est ce qu'il affiche", () => {
  // Il portait « Logo Tipote » dans la capture. C'est le logo Tiquiz.
  const v2 = fs.readFileSync(V2, "utf8");
  assert.ok(!/alt="[^"]*Logo Tipote/i.test(v2), "le logo s'annonce encore comme celui de Tipote");
  assert.equal(altDe(LOGO.src), "", "le logo du pied de page double le nom écrit à côté : son alt reste vide");
});

test("toutes les images de la page sont classées", () => {
  // La garde du script REFUSE de construire sur une image inconnue :
  // sans elle, une image ajoutée demain repartirait sans texte, en
  // silence. Ce test dit la même chose sur la page déjà construite.
  // On classe celles qui n'ont RIEN. Une image que Béné a déjà décrite
  // garde son texte : l'écraser en masse ferait perdre les bons (leçon
  // des `alt` du blog, 1er septembre).
  const capture = fs.readFileSync(CAPTURE, "utf8");
  const srcs = (capture.match(/<img\b[^>]*>/gi) ?? [])
    .filter((t) => !/\salt=/.test(t))
    .map((t) => /\ssrc="([^"]+)"/.exec(t)?.[1] ?? "")
    .filter((s) => s.startsWith("/v/tiquiz/"))
    // Le GIF du popup de la vente bêta ne survit pas au retrait de sa
    // section : rien à décrire pour une image que la v2 ne sert plus.
    .filter((s) => fs.readFileSync(V2, "utf8").includes(s));
  const oubliees = nonClassees([...new Set(srcs)]);
  assert.deepEqual(oubliees, [], "des images de la capture ne sont pas classées");
});

// ---------------------------------------------------------------------
// LES DIMENSIONS. Sans elles, la page saute pendant qu'elle charge.
// ---------------------------------------------------------------------

test("une image qui sait sa taille la porte", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  const imgs = v2.match(/<img\b[^>]*>/gi) ?? [];
  const dimensionnees = imgs.filter((t) => /\swidth="\d+"/.test(t) && /\sheight="\d+"/.test(t));
  // 25 fichiers restent illisibles (des SVG sans viewBox, des sources
  // distantes) : on les laisse telles quelles plutôt que d'inventer une
  // taille, qui déformerait l'image au lieu de réserver sa place.
  assert.ok(dimensionnees.length >= imgs.length - 30, `${dimensionnees.length} sur ${imgs.length}`);
  for (const t of imgs) {
    const w = /\swidth="(\d+)"/.exec(t)?.[1];
    const h = /\sheight="(\d+)"/.exec(t)?.[1];
    if (w == null && h == null) continue;
    assert.ok(w != null && h != null, `une image ne porte qu'une moitié de ses dimensions : ${t.slice(0, 120)}`);
    assert.ok(Number(w) > 0 && Number(h) > 0, `une dimension vaut zéro : ${t.slice(0, 120)}`);
  }
});

// ---------------------------------------------------------------------
// LES PORTRAITS : 1024 x 1024 pour un affichage en 48 x 48.
// ---------------------------------------------------------------------

test("les images surdimensionnées sont servies à leur taille utile", () => {
  const v2 = fs.readFileSync(V2, "utf8");
  for (const img of IMAGES_SURDIMENSIONNEES) {
    const reduit = nomReduit(img.fichier, img.cible);
    assert.ok(!v2.includes(`/v/tiquiz/${img.fichier}`), `${img.fichier} est encore servi en taille réelle`);
    assert.ok(v2.includes(`/v/tiquiz/${reduit}`), `${reduit} n'est pas servi`);
    const f = path.join(RACINE, "public/v/tiquiz", reduit);
    assert.ok(fs.existsSync(f), `${reduit} n'a pas été construit (npm run vente:images)`);
    // Le fichier d'ORIGINE reste : la vraie page de vente sert le sien,
    // et le chantier ne change rien à ce qui est en ligne.
    assert.ok(
      fs.existsSync(path.join(RACINE, "public/v/tiquiz", img.fichier)),
      `${img.fichier} a été supprimé : la vraie page de vente en a besoin`,
    );
  }
});

test("la cible couvre TROIS fois l'affichage, sur toutes les densités", () => {
  // Deux fois couvre les écrans Retina courants, trois fois couvre aussi
  // les téléphones à très forte densité. Béné : "en faisant attention de
  // ne rien dégrader en qualité pour aucun des devices".
  for (const img of IMAGES_SURDIMENSIONNEES) {
    assert.ok(
      img.cible >= img.afficheeMax[0] * DENSITE_COUVERTE,
      `${img.fichier} : ${img.cible}px pour ${img.afficheeMax[0]}px affichés, c'est sous ${DENSITE_COUVERTE}x`,
    );
    // Et on ne fabrique jamais de pixels.
    assert.ok(img.cible <= img.naturelle[0], `${img.fichier} : la cible dépasse la taille réelle`);
  }
});

test("on RÉDUIT, on ne recadre jamais", () => {
  // Une photo recadrée coupe des visages : c'est le reproche fait aux
  // images de réponse le 4 août.
  for (const img of IMAGES_SURDIMENSIONNEES) {
    const attendue = hauteurCible(img);
    const ratioSource = img.naturelle[0] / img.naturelle[1];
    const ratioCible = img.cible / attendue;
    assert.ok(
      Math.abs(ratioSource - ratioCible) < 0.02,
      `${img.fichier} : le ratio change (${ratioSource.toFixed(3)} -> ${ratioCible.toFixed(3)})`,
    );
  }
  const script = fs.readFileSync(path.join(RACINE, "scripts/reduire-images-vente.mjs"), "utf8");
  assert.ok(script.includes('fit: "inside"'), "le script recadre au lieu de réduire");
  assert.ok(script.includes("withoutEnlargement: true"), "le script peut agrandir une image");
});

test("aucun SVG et aucun GIF dans la liste", () => {
  // Un SVG est VECTORIEL : le rasteriser serait exactement la
  // dégradation qu'on cherche à éviter. Un GIF animé perdrait son
  // animation sans que personne ne le voie avant la mise en ligne.
  for (const img of IMAGES_SURDIMENSIONNEES) {
    assert.ok(!/\.(svg|gif)$/i.test(img.fichier), `${img.fichier} ne doit pas être réduit`);
  }
});

test("l'image des aperçus sociaux n'est PAS touchée", () => {
  // C'est elle que les moteurs et les réseaux affichent : la réduire
  // dégraderait l'aperçu d'un partage.
  const v2 = fs.readFileSync(V2, "utf8");
  const og = /property="og:image" content="([^"]+)"/.exec(v2)?.[1] ?? "";
  assert.ok(og, "la page ne déclare plus d'og:image");
  const nom = og.split("/").pop() ?? "";
  assert.ok(
    !IMAGES_SURDIMENSIONNEES.some((i) => i.fichier === nom),
    "l'image des aperçus sociaux a été réduite",
  );
});

test("les dimensions déclarées suivent le fichier servi", () => {
  // Un `width` qui ment sur la taille réelle réserve la mauvaise place,
  // donc la page saute quand même pendant qu'elle charge.
  const v2 = fs.readFileSync(V2, "utf8");
  for (const img of IMAGES_SURDIMENSIONNEES) {
    const reduit = nomReduit(img.fichier, img.cible);
    for (const balise of v2.match(/<img\b[^>]*>/gi) ?? []) {
      if (!balise.includes(reduit)) continue;
      const w = /\swidth="(\d+)"/.exec(balise)?.[1];
      if (w == null) continue;
      assert.equal(Number(w), img.cible, `${reduit} annonce ${w}px`);
      const h = /\sheight="(\d+)"/.exec(balise)?.[1];
      assert.equal(Number(h), hauteurCible(img), `${reduit} annonce une hauteur fausse`);
    }
  }
});

test("les images qui annonçaient du PNG et portaient du JPEG sont réparées", () => {
  // Deux images étaient CASSÉES, et c'est le retrait du bundle qui les a
  // mises à nu : sur une adresse `data:`, le type déclaré fait foi, donc
  // le navigateur refusait de les décoder. Trouvé en MESURANT la page
  // rendue (`naturalWidth === 0`), pas en la relisant.
  const v2 = fs.readFileSync(V2, "utf8");
  assert.equal(
    (v2.match(/data:image\/png;base64,\/9j\//g) ?? []).length,
    0,
    "une image annonce encore du PNG en portant du JPEG",
  );
  // Et la capture d'origine les porte toujours : on n'a pas fabriqué le
  // problème, et l'étape de réparation a donc toujours quelque chose à
  // faire (un test qui ne peut plus échouer ment).
  const capture = fs.readFileSync(CAPTURE, "utf8");
  assert.ok(
    (capture.match(/data:image\/png;base64,\/9j\//g) ?? []).length > 0,
    "la capture n'en porte plus : retirer l'étape de réparation",
  );
});

test("aucune image tronquée ne reste servie", () => {
  // Un JPEG se termine par `ffd9`. Sans cette marque, les octets
  // manquent et AUCUN navigateur ne peut décoder : la capture d'origine
  // en porte deux, tronquées à la source. On ne sert pas une image qui
  // ne PEUT pas s'afficher.
  const v2 = fs.readFileSync(V2, "utf8");
  for (const m of v2.matchAll(/data:image\/jpeg;base64,(\/9j\/[A-Za-z0-9+/=]+)/g)) {
    const o = Buffer.from(m[1], "base64");
    assert.ok(
      o.length > 2 && o[o.length - 2] === 0xff && o[o.length - 1] === 0xd9,
      "un JPEG en base64 est tronqué et reste servi",
    );
  }
});
