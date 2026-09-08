// tests/logic/page-auteur.test.mts
//
// LA PAGE AUTEUR EXISTE DANS LES DEUX LANGUES, ET ELLE DIT LES MEMES
// FAITS (8 septembre 2026).
//
// Bene : "je bosse sur la landing, continue la traduction de tout stp."
// Et, le meme jour : "il faut a chaque fois utiliser le champ
// semantique, les expressions, tournures de phrases, ponctuation etc.
// propre a chaque langue, c'est pas uniquement du mot a mot."
//
// CE QUE CE FICHIER TIENT, et les quatre moities comptent ensemble :
//
//  1. le TEXTE existe vraiment dans les deux langues (une langue
//     declaree sans son texte servirait du francais sous une adresse
//     anglaise, la page s'afficherait parfaitement, et Google
//     indexerait du contenu duplique) ;
//  2. les FAITS ne bougent pas d'une langue a l'autre. C'est SON
//     histoire : les 387 EUR de pension, les 34 ans, les 30 000 EUR
//     perdus, les deux ans. Une traduction qui en deplace un ecrirait
//     une autre vie que la sienne, et personne ne le verrait ;
//  3. l'anglais est ecrit EN ANGLAIS : aucune espace devant `?` et
//     `:`, aucun tiret cadratin, les montants au format anglais ;
//  4. la page ne porte AUCUNE phrase et prefixe ses liens par
//     `hrefPourLangue` : ecrire `/en/` a la main fabriquerait un 404 au
//     bout des boutons de fin de page, parce que `/newsletter`,
//     `/support` et `/` n'ont pas de version anglaise.
//
// Verifie en rejouant TROIS versions fautives (un `alt` francais garde
// en anglais, un montant traduit en "30,000 EUR" au lieu de "€30,000",
// la page revenue dans `app/(site)/`) : les trois rougissent.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LANGUES_PUBLIQUES, LANGUE_SANS_PREFIXE } from "@/lib/site/langues";
import { PAGES_PUBLIQUES, languesDePage } from "@/lib/site/pagesPubliques";
import { hrefPourLangue } from "@/lib/site/nav";
import { CHEMIN_A_PROPOS, contenuAPropos } from "@/lib/site/aPropos";

import { cheminPageDuSite } from "./aide/pageDuSite.mts";

/** Toutes les chaines qui SE LISENT, quelle que soit leur profondeur. */
function textes(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(textes);
  if (valeur && typeof valeur === "object") return Object.values(valeur).flatMap(textes);
  return [];
}

function tout(langue: (typeof LANGUES_PUBLIQUES)[number]): string {
  return textes(contenuAPropos(langue)).join(" • ");
}

/**
 * LES NOMBRES DU RECIT, separateur de milliers NORMALISE.
 *
 * `30 000 €` en francais et `€30,000` en anglais sont le MEME fait : ce
 * qui doit rester identique est le nombre, pas sa graphie.
 */
function nombres(s: string): string[] {
  return [...s.replace(/(\d)[  \s,](?=\d{3}\b)/g, "$1").matchAll(/\d+/g)]
    .map((m) => m[0])
    .sort();
}

/** La source de la page, sans ses commentaires : ils CITENT les motifs. */
function sourcePage(): string {
  return readFileSync(cheminPageDuSite(CHEMIN_A_PROPOS), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

describe("la page auteur existe dans les deux langues", () => {
  test("chaque langue publique a son texte, et il est vraiment different", () => {
    // `contenuAPropos` est type sur un `Record` des langues prefixees,
    // donc en oublier une ne compile pas. Ce test attrape l'autre
    // moitie : une langue dont on aurait recopie le francais.
    for (const langue of LANGUES_PUBLIQUES) {
      const t = contenuAPropos(langue);
      assert.equal(t.langue, langue, `contenuAPropos("${langue}") annonce ${t.langue}`);
      const vides = textes(t).filter((s) => s.trim() === "");
      assert.deepEqual(vides, [], `${langue} porte une chaine vide`);
    }
    for (const langue of LANGUES_PUBLIQUES) {
      if (langue === LANGUE_SANS_PREFIXE) continue;
      assert.notEqual(
        tout(langue),
        tout(LANGUE_SANS_PREFIXE),
        `${langue} recopie le francais mot pour mot`,
      );
    }
  });

  test("SES FAITS sont les memes dans les deux langues", () => {
    // 387, 34, 27, 30 000, deux ans, 2020, 30 ans d'experience, deux
    // mois, sept jours. Un chiffre qui bouge a la traduction raconte
    // une autre vie que la sienne, et rien a l'ecran ne le dirait.
    const attendus = nombres(tout(LANGUE_SANS_PREFIXE));
    for (const langue of LANGUES_PUBLIQUES) {
      if (langue === LANGUE_SANS_PREFIXE) continue;
      assert.deepEqual(
        nombres(tout(langue)),
        attendus,
        `les nombres de ${langue} ne sont plus ceux du francais`,
      );
    }
  });

  test("l'anglais est ecrit EN ANGLAIS, pas en francais traduit", () => {
    const en = tout("en");

    // La typographie francaise inserait une espace devant `? : ; !` :
    // appliquee a l'anglais, c'est la faute du 1er aout dans l'autre
    // sens, une regle ecrite pour une langue posee sur une autre.
    const espaces = [...en.matchAll(/\S[   ]+[?:;!]/g)].map((m) => m[0]);
    assert.deepEqual(espaces, [], `espace francaise devant une ponctuation : ${espaces.join(", ")}`);

    // Le symbole passe DEVANT en anglais, jamais derriere le nombre.
    const montantsFrancais = [...en.matchAll(/\d[\d   ,.]*\s*(?:€|EUR)/g)].map((m) => m[0]);
    assert.deepEqual(montantsFrancais, [], `montant a la francaise : ${montantsFrancais.join(", ")}`);

    // La regle du 7 juin, valable dans toutes les langues.
    assert.ok(!/[—–]/.test(en), "un tiret cadratin dans le texte anglais");

    // Et le portrait ne garde pas son texte alternatif francais : c'est
    // la seule ligne qu'une lectrice aveugle anglophone entend.
    assert.notEqual(contenuAPropos("en").altPortrait, contenuAPropos("fr").altPortrait);
  });

  test("les donnees structurees suivent la langue", () => {
    // `knowsAbout` dit a un moteur de QUOI elle parle : le laisser en
    // francais sur une page anglaise decrirait une personne dans une
    // langue que la page ne sert pas.
    const fr = contenuAPropos("fr").jsonLd;
    const en = contenuAPropos("en").jsonLd;
    assert.notEqual(en.jobTitle, fr.jobTitle);
    assert.notEqual(en.orgDescription, fr.orgDescription);
    assert.notDeepEqual(en.knowsAbout, fr.knowsAbout);
    assert.equal(en.knowsAbout.length, fr.knowsAbout.length);
  });

  test("le sitemap declare les deux langues de /a-propos", () => {
    // Une page traduite mais non declaree n'a ni URL anglaise dans le
    // sitemap, ni `hreflang`, ni lien depuis le menu : la traduction
    // existe et personne ne l'atteint.
    const page = PAGES_PUBLIQUES.find((p) => p.chemin === CHEMIN_A_PROPOS);
    assert.ok(page, "/a-propos a disparu du sitemap");
    assert.deepEqual([...languesDePage(page)].sort(), [...LANGUES_PUBLIQUES].sort());
    assert.equal(hrefPourLangue(CHEMIN_A_PROPOS, "en"), "/en/a-propos");
  });

  test("la page DELEGUE son texte, et ne prefixe aucun lien a la main", () => {
    const src = sourcePage();

    // Aucune phrase en dur : le francais et l'anglais vivent dans le
    // meme module, sinon ils divergent au premier correctif.
    //
    // ON CHERCHE LES VRAIES PHRASES DU MODULE, jamais un mot choisi a
    // la main. Mon premier jet interdisait la sous-chaine "About", et
    // il a rougi sur `knowsAbout`, la propriete schema.org du JSON-LD :
    // un garde-fou qui tombe sur son propre echafaudage est pire qu'un
    // garde-fou absent. Une phrase entiere du module, elle, ne peut
    // apparaitre dans la page que si quelqu'un l'y a recopiee.
    for (const langue of LANGUES_PUBLIQUES) {
      for (const phrase of textes(contenuAPropos(langue))) {
        if (phrase.length < 20) continue;
        assert.ok(
          !src.includes(phrase),
          `la page recopie "${phrase.slice(0, 40)}..." au lieu de lire le module`,
        );
      }
    }
    assert.ok(src.includes("contenuAPropos("), "la page n'appelle plus contenuAPropos");

    // Les liens passent par `hrefPourLangue`. Ecrire `/en/` a la main
    // fabriquerait un 404 : `/newsletter`, `/support` et `/` n'ont pas
    // de version anglaise, et `/blog` a des slugs differents.
    assert.ok(src.includes("hrefPourLangue"), "la page ne prefixe plus ses liens");
    assert.ok(!/["'`]\/en\//.test(src), "un prefixe /en/ ecrit a la main");

    // Un lien legal ne fait JAMAIS quitter la page (regle du 24 aout).
    assert.match(
      src,
      /href="\/mentions-legales"[\s\S]{0,120}target="_blank"/,
      "le lien des mentions legales doit ouvrir un onglet",
    );
  });

  test("elle vit dans le groupe qui sait lire la langue de l'adresse", () => {
    // Un groupe de routes n'ajoute aucun segment d'URL : `/a-propos`
    // reste `/a-propos`. Mais seul `(site-langues)` lit l'en-tete pose
    // par le middleware, donc c'est le seul ou le chrome et les liens
    // peuvent suivre `/en/`. `cheminPageDuSite` refuse aussi le cas ou
    // deux groupes serviraient la meme URL.
    assert.equal(cheminPageDuSite(CHEMIN_A_PROPOS), "app/(site-langues)/a-propos/page.tsx");
  });
});
