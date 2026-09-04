// tests/logic/site-public.test.mts
//
// LE SITE PUBLIC DE tiquiz.fr (Béné, 30 août 2026).
//
// "Il faut construire toutes les autres pages de mon site tiquiz.fr
// pour tout basculer de systeme io vers notre domaine et augmenter son
// ranking, sa fiabilité etc." + "il doit être facile à naviguer,
// fournir les bons liens, un menu, un footer etc... un truc
// professionnel quoi."
//
// Ce que ce filet protège, c'est la mécanique qui casse ces pages sans
// bruit : une page construite que personne ne peut atteindre, un lien
// légal qui ne mène nulle part, et un chiffre de commission qui ment.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ADRESSES_LEGALES_FR,
  CTA_MENU,
  MENU,
  PIED,
  attributsLien,
  cheminsDuSite,
  estLienExterne,
} from "../../lib/site/nav.ts";
import { PAGES_PUBLIQUES } from "../../lib/site/pagesPubliques.ts";
import {
  REGLES,
  TAUX,
  commissionCents,
  gainAtelier,
  horsTaxes,
  tableauDesGains,
} from "../../lib/site/programmeAffiliation.ts";
import {
  RUBRIQUES,
  articlesDeLaRubrique,
  rubriqueDe,
  rubriquesNonVides,
  trouverRubrique,
} from "../../lib/blog/rubriques.ts";
import { listerArticles } from "../../lib/blog/articles.ts";

// --- NAVIGATION -------------------------------------------------------

test("toute page publique est atteignable depuis le pied de page", () => {
  // C'est LE contrôle qui compte. Une page annoncée dans le sitemap et
  // qu'aucun humain ne peut trouver depuis le site est une page qui ne
  // sert a rien : Google l'indexe, personne ne la lit.
  const joignables = new Set(cheminsDuSite());
  const orphelines = PAGES_PUBLIQUES.map((p) => p.chemin).filter((c) => !joignables.has(c));
  assert.deepEqual(orphelines, [], "pages declarees mais absentes du menu et du pied : " + orphelines);
});

test("les six documents legaux sont dans le pied de page", () => {
  const dansLePied = new Set(PIED.flatMap((c) => c.liens.map((l) => l.href)));
  for (const adresse of Object.keys(ADRESSES_LEGALES_FR)) {
    assert.ok(dansLePied.has(adresse), `${adresse} n'est nulle part dans le pied de page`);
  }
});

test("chaque adresse legale francaise vise une page qui existe", () => {
  const racine = process.cwd();
  for (const [source, cible] of Object.entries(ADRESSES_LEGALES_FR)) {
    const page = path.join(racine, "app", cible.slice(1), "page.tsx");
    assert.ok(
      fs.existsSync(page),
      `${source} redirige vers ${cible}, qui n'a pas de page (${page})`,
    );
  }
});

test("un lien legal ou externe s'ouvre dans un nouvel onglet", () => {
  // Regle Bene du 24 aout : le visiteur peut etre au milieu d'un quiz
  // ou d'un bon de commande, le renvoyer ailleurs lui fait tout
  // recommencer.
  for (const adresse of Object.keys(ADRESSES_LEGALES_FR)) {
    const a = attributsLien(adresse);
    assert.equal(a.target, "_blank", `${adresse} fait quitter la page`);
    assert.ok(a.rel?.includes("noopener"), `${adresse} laisse une poignee via window.opener`);
  }
  const externe = attributsLien("https://affiliate.tipote.com/");
  assert.equal(externe.target, "_blank");
  // Une page interne ordinaire, elle, reste dans l'onglet.
  assert.deepEqual(attributsLien("/blog"), {});
});

test("le menu reste court, et il mene quelque part", () => {
  assert.ok(MENU.length <= 5, "au dela de 5 entrees un menu ne se lit plus, il se parcourt");
  for (const l of [...MENU, CTA_MENU]) {
    assert.ok(l.href.startsWith("/") || estLienExterne(l.href), `lien douteux : ${l.href}`);
    assert.ok(l.libelle.trim().length > 0, "un lien sans libelle");
  }
});

test("aucun tiret cadratin ni chevron dans les textes du site", () => {
  // Regle absolue de Bene : ces caracteres trahissent le texte genere.
  const textes = [
    ...MENU.map((l) => l.libelle),
    CTA_MENU.libelle,
    ...PIED.flatMap((c) => [c.titre, ...c.liens.map((l) => l.libelle)]),
    ...PAGES_PUBLIQUES.flatMap((p) => [p.titre, p.resume]),
    ...REGLES.flatMap((r) => [r.titre, r.texte]),
    ...RUBRIQUES.flatMap((r) => [r.libelle, r.chapeau]),
  ];
  for (const t of textes) {
    assert.ok(!/[—–]/.test(t), `tiret cadratin dans : ${t}`);
    assert.ok(!/[«»]/.test(t), `chevron francais dans : ${t}`);
    assert.ok(!/·[a-z]/.test(t), `point median dans : ${t}`);
  }
});

// --- LE PROGRAMME D'AFFILIATION --------------------------------------

test("la commission se calcule sur le HT, jamais sur le TTC", () => {
  // 40 % de 17,00 € TTC font 6,80 €, et c'est FAUX : la base est le HT,
  // donc 5,67 €. L'ecart de 1,13 € par vente etait invisible, et c'est
  // le bug d'argent trouve le 26 aout.
  assert.equal(horsTaxes(1700), 1417);
  assert.equal(commissionCents("mensuel"), 567);
  assert.notEqual(commissionCents("mensuel"), 680);
});

test("les taux affiches sont ceux que Tipote applique", () => {
  // Duplication ASSUMEE : les taux vivent dans le depot qui PAIE. Ce
  // test les fige pour qu'un changement d'un seul cote fasse rougir.
  assert.equal(TAUX.tiquiz, 0.4);
  assert.equal(TAUX.atelier, 0.7);
});

test("les quatre paliers vendus ont chacun leur ligne", () => {
  const lignes = tableauDesGains();
  assert.equal(lignes.length, 4);
  for (const l of lignes) {
    assert.match(l.gain, /\d/, "un gain sans chiffre");
    assert.ok(
      l.rythme === "chaque mois" || l.rythme === "chaque année",
      "le rythme doit etre dit : 56,67 € par an et 5,67 € par mois ne se comparent pas",
    );
  }
  // "PLUS" en capitales, c'est sa convention de marque.
  assert.ok(lignes.some((l) => l.palier.includes("PLUS")), lignes.map((l) => l.palier).join(", "));
  assert.ok(!lignes.some((l) => /\bPlus\b/.test(l.palier)), "un palier ecrit 'Plus' et pas 'PLUS'");
});

test("l'Atelier a son propre taux, et il est plus haut", () => {
  const { prix, gain } = gainAtelier();
  assert.match(prix, /47/);
  // 70 % du HORS TAXES (47 / 1,2 x 0,7), pas du TTC. Le premier jet
  // annoncait 32,90 €, soit 5,48 € de plus que ce qui sera verse : sa
  // propre page annonce 27,42 €, et c'est elle qui a raison.
  assert.match(gain, /27,42/);
});

test("l'espace avant % et € est INSECABLE", () => {
  // Sa regle de typographie francaise. Un espace ordinaire laisse "20"
  // en fin de ligne et "€" a la ligne suivante, ce qui est exactement
  // ce que la regle interdit.
  const textes = [...REGLES.map((r) => r.texte), ...tableauDesGains().map((l) => l.gain)];
  for (const t of textes) {
    const fautes = [...t.matchAll(/\d ([%€])/g)].map((m) => m[0]);
    assert.deepEqual(fautes, [], `espace secable avant ${fautes.join(", ")} dans : ${t}`);
  }
});

test("les regles annoncees citent les seuils reels", () => {
  const tout = REGLES.map((r) => `${r.titre} ${r.texte}`).join(" ");
  assert.match(tout, /1 an/, "la duree du cookie doit etre annoncee");
  assert.match(tout, /30 jours/, "le delai avant versement doit etre annonce");
  assert.match(tout, /20\s€/, "le minimum de versement doit etre annonce");
  assert.match(tout, /10 et le 13/, "le calendrier doit etre annonce");
  assert.match(tout, /à vie/, "le rattachement a vie doit etre annonce");
});

// --- LES RUBRIQUES DU BLOG -------------------------------------------

test("chaque rubrique proposee a au moins un article", () => {
  // Une pastille qui mene a une page vide se lit "c'est casse".
  for (const r of rubriquesNonVides()) {
    assert.ok(articlesDeLaRubrique(r.id).length > 0, `${r.id} est vide`);
  }
});

test("chaque article publie est classe", () => {
  // Un article non classe reste visible dans "tous les articles", donc
  // ce n'est pas une erreur. Mais aujourd'hui ils le sont tous, et on
  // veut le savoir si un nouvel article arrive sans rubrique.
  const orphelins = listerArticles().filter((a) => rubriqueDe(a.slug) === null);
  assert.deepEqual(
    orphelins.map((a) => a.slug),
    [],
    "articles sans rubrique : ils n'apparaitront sous aucune pastille",
  );
});

test("une rubrique inconnue ne fabrique pas une page vide", () => {
  assert.equal(trouverRubrique("nawak"), null);
  assert.equal(trouverRubrique(""), null);
  assert.equal(trouverRubrique(null), null);
  assert.ok(trouverRubrique("methode"));
  // La casse ne doit pas creer une deuxieme page pour le meme sujet.
  assert.equal(trouverRubrique("METHODE")?.id, "methode");
});

// --- LES VIGNETTES ----------------------------------------------------

test("chaque article a une couverture, et le fichier existe", () => {
  const racine = process.cwd();
  for (const a of listerArticles()) {
    assert.ok(a.couverture, `${a.slug} n'a pas de couverture`);
    const fichier = path.join(racine, "public", a.couverture!.replace(/^\//, ""));
    assert.ok(fs.existsSync(fichier), `${a.slug} pointe sur ${a.couverture}, absent du disque`);
  }
});

test("deux articles ne partagent pas la meme couverture", () => {
  // C'est ce qui arrive quand on renomme des vignettes a la main : une
  // correspondance decalee d'un rang, et deux articles portent la meme
  // image sans que rien ne le dise.
  const vues = new Map<string, string>();
  for (const a of listerArticles()) {
    const deja = vues.get(a.couverture!);
    assert.equal(deja, undefined, `${a.slug} et ${deja} partagent ${a.couverture}`);
    vues.set(a.couverture!, a.slug);
  }
});

// ── LE SITEMAP DU DOMAINE DE VENTE DÉCLARE LES PAGES LÉGALES ──────
//
// Béné, 4 septembre 2026, après le énième refus de validation de
// marque : "je l'ai fait mille fois et mille fois je reviens là donc
// NON c'est pas la solution".
//
// Mesuré ce jour là sur la production, et c'est un trou réel :
// `tiquiz.fr/sitemap.xml` déclarait 29 adresses et AUCUNE page
// légale, alors que `quiz.tipote.com/sitemap.xml` les déclarait toutes
// (`PUBLIC_ROUTES`). Deux listes écrites séparément, elles avaient
// divergé, et c'est le défaut que ce dépôt paie en boucle.
//
// Or c'est `https://tiquiz.fr/privacy` que Google lit dans la
// configuration de marque, et c'est cette page qu'il reproche de "ne
// pas contenir suffisamment de contenu".
//
// ON NE PRÉTEND PAS QUE C'EST LA CAUSE DU REFUS : un relecteur va
// chercher l'adresse directement. Ce test fige le fait que les deux
// branches lisent la MÊME source, pour que la divergence ne puisse pas
// revenir.
describe("les pages légales sont déclarées sur le domaine de vente", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/sitemap.ts"),
    "utf8",
  );
  const sansCommentaires = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  test("les chemins légaux sont DÉRIVÉS, jamais recopiés à la main", () => {
    // La source est `ADRESSES_LEGALES_FR`, qui porte la page canonique
    // en valeur. Une liste recopiée est ce qui a produit la divergence.
    assert.match(sansCommentaires, /ADRESSES_LEGALES_FR/);
    assert.match(sansCommentaires, /CHEMINS_LEGAUX/);
    // Plus aucun chemin légal écrit en dur dans un tableau de routes.
    assert.doesNotMatch(sansCommentaires, /"\/privacy"/);
    assert.doesNotMatch(sansCommentaires, /"\/terms-of-use"/);
  });

  test("la branche du domaine de VENTE les déclare, pas seulement l'app", () => {
    // Les deux branches doivent s'en servir. N'en vérifier qu'une
    // laisserait exactement le trou qu'on vient de fermer.
    const usages = sansCommentaires.match(/CHEMINS_LEGAUX/g) ?? [];
    assert.ok(
      usages.length >= 3,
      `CHEMINS_LEGAUX doit être défini ET lu par les deux branches, vu ${usages.length} fois`,
    );
    assert.match(sansCommentaires, /\$\{HOTE_VENTE\}\$\{chemin\}/);
  });

  test("les six documents légaux sont couverts", () => {
    // Si Béné ajoute une adresse légale demain, elle entre dans les
    // deux sitemaps sans qu'on y pense.
    const canoniques = new Set(Object.values(ADRESSES_LEGALES_FR));
    for (const attendu of ["/privacy", "/terms", "/terms-of-use", "/legal", "/cookies"]) {
      assert.ok(canoniques.has(attendu), `${attendu} doit être une page canonique`);
    }
  });
});
