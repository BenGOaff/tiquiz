// tests/logic/hub-en-anglais.test.mts
//
// LE HUB INTEGRATIONS EXISTE DANS LES DEUX LANGUES, SES SIX PAGES
// FILLES NON, ET LA PAGE LE DIT (8 septembre 2026).
//
// Bene : "je bosse sur la landing, continue la traduction de tout stp."
// Et, le meme jour : "il faut a chaque fois utiliser le champ
// semantique, les expressions, tournures de phrases, ponctuation etc.
// propre a chaque langue, c'est pas uniquement du mot a mot."
//
// CE QUE CE FICHIER TIENT, et les moities comptent ENSEMBLE :
//
//  1. le TEXTE existe vraiment dans les deux langues. Une langue
//     declaree sans son texte servirait du francais sous une adresse
//     anglaise, la page s'afficherait parfaitement, et Google
//     indexerait du contenu duplique ;
//  2. l'anglais est ecrit EN ANGLAIS : aucune espace devant `? : ; !`,
//     aucun montant a la francaise, aucun tiret cadratin ;
//  3. le TABLEAU se traduit sans perdre sa structure : `outilsPourLangue`
//     garde le nom, le slug et le logo, et ne change que les trois
//     champs de texte ;
//  4. les SIX PAGES FILLES restent en francais, et `outilsLangueDesPages`
//     le DIT. Ce garde-fou s'auto-corrige : le jour ou une page fille
//     declare l'anglais, il exige que la ligne disparaisse ;
//  5. la page DELEGUE : aucune phrase du module recopiee dedans, et
//     aucun `/en/` ecrit a la main (le prefixe se calcule).
//
// Verifie en rejouant CINQ versions fautives : les cinq rougissent.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LANGUES_PUBLIQUES, LANGUE_SANS_PREFIXE } from "@/lib/site/langues";
import { PAGES_PUBLIQUES, languesDePage } from "@/lib/site/pagesPubliques";
import { hrefPourLangue } from "@/lib/site/nav";
import { OUTILS, outilsPourLangue, ENFANTS_DU_HUB } from "@/lib/site/integrations";
import { CHEMIN_HUB, contenuHub, chromeIntegrations } from "@/lib/site/hubIntegrations";

import { sourcePageDuSite, cheminPageDuSite } from "./aide/pageDuSite.mts";

/** Toutes les chaines qui SE LISENT, quelle que soit leur profondeur. */
function textes(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(textes);
  if (valeur && typeof valeur === "object") return Object.values(valeur).flatMap(textes);
  return [];
}

function tout(langue: (typeof LANGUES_PUBLIQUES)[number]): string {
  return [...textes(contenuHub(langue)), ...textes(chromeIntegrations(langue))].join(" | ");
}

/** La source de la page, sans ses commentaires : ils CITENT les motifs. */
function sourcePage(): string {
  return sourcePageDuSite(CHEMIN_HUB)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

describe("le hub integrations existe dans les deux langues", () => {
  test("chaque langue publique a son texte, et il est vraiment different", () => {
    // `contenuHub` est type sur un `Record` des langues prefixees, donc
    // en oublier une ne compile pas. Ce test attrape l'autre moitie :
    // une langue dont on aurait recopie le francais.
    for (const langue of LANGUES_PUBLIQUES) {
      const t = contenuHub(langue);
      assert.equal(t.langue, langue, `contenuHub("${langue}") annonce ${t.langue}`);
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

  test("l'anglais est ecrit EN ANGLAIS, pas en francais traduit", () => {
    const en = tout("en");

    // La typographie francaise insere une espace devant `? : ; !` :
    // appliquee a l'anglais, c'est la faute du 1er aout dans l'autre
    // sens, une regle ecrite pour une langue posee sur une autre.
    const espaces = [...en.matchAll(/\S[   ]+[?:;!]/g)].map((m) => m[0]);
    assert.deepEqual(espaces, [], `espace francaise devant une ponctuation : ${espaces.join(", ")}`);

    // Le symbole passe DEVANT en anglais, jamais derriere le nombre.
    // C'est exactement la faute mesuree le 8 septembre sur les articles
    // anglais du blog, ou ma propre table ecrivait 22 fois `17 EUR`.
    const montantsFrancais = [...en.matchAll(/\d[\d   ,.]*\s*(?:€|EUR)/g)].map((m) => m[0]);
    assert.deepEqual(montantsFrancais, [], `montant a la francaise : ${montantsFrancais.join(", ")}`);

    // Un pourcentage se colle en anglais.
    const pourcents = [...en.matchAll(/\d[   ]+%/g)].map((m) => m[0]);
    assert.deepEqual(pourcents, [], `pourcentage a la francaise : ${pourcents.join(", ")}`);

    // La regle du 7 juin, valable dans toutes les langues.
    assert.ok(!/[—–]/.test(en), "un tiret cadratin dans le texte anglais");

    // Et le chrome des briques partagees suit, y compris le libelle du
    // fil d'Ariane, qui ne s'affiche pas et qu'un lecteur d'ecran
    // ANNONCE : un texte qu'on n'affiche pas reste un texte que
    // quelqu'un lit (regle du 8 septembre).
    const chromeFr = chromeIntegrations("fr");
    const chromeEn = chromeIntegrations("en");
    for (const cle of ["filDAriane", "enBref", "faq"] as const) {
      assert.notEqual(chromeEn[cle], chromeFr[cle], `le chrome "${cle}" est reste en francais`);
    }
  });

  test("le TABLEAU se traduit sans perdre sa structure", () => {
    // Le francais rend `OUTILS` LUI MEME : deux tableaux pour la meme
    // langue finiraient par ne plus dire la meme chose.
    assert.equal(outilsPourLangue("fr"), OUTILS, "le francais ne rend plus OUTILS lui meme");

    const en = outilsPourLangue("en");
    assert.equal(en.length, OUTILS.length, "l'anglais a perdu une ligne du tableau");
    for (const [i, o] of OUTILS.entries()) {
      const a = en[i];
      // La structure ne bouge pas : un slug traduit ferait un 404, un
      // logo perdu laisserait une case vide.
      assert.equal(a.nom, o.nom, `la ligne ${i} a change de nom`);
      assert.equal(a.slug, o.slug, `le slug de ${o.nom} a ete traduit`);
      assert.deepEqual(a.logo, o.logo, `le logo de ${o.nom} a bouge`);
      // Et les trois champs de TEXTE, eux, changent vraiment.
      for (const cle of ["intermediaire", "tagParProfil", "resume"] as const) {
        assert.notEqual(a[cle], o[cle], `${o.nom} garde son "${cle}" francais`);
      }
    }
  });

  test("les six pages filles sont en francais, et la page le DIT", () => {
    // GARDE-FOU QUI S'AUTO-CORRIGE. Tant qu'aucune page fille ne
    // declare l'anglais, la ligne d'avertissement est OBLIGATOIRE :
    // sans elle, un lecteur anglophone clique une carte et tombe sur du
    // francais sans avoir ete prevenu. Le jour ou les six pages ont
    // leur texte anglais, ce test exige l'inverse, donc il dit lui meme
    // quoi retirer.
    const filles = PAGES_PUBLIQUES.filter((p) => p.chemin.startsWith(`${CHEMIN_HUB}/`));
    assert.equal(filles.length, ENFANTS_DU_HUB.length, "le sitemap et le hub ne comptent pas pareil");

    const traduites = filles.filter((p) => languesDePage(p).includes("en"));
    if (traduites.length === 0) {
      assert.ok(
        contenuHub("en").outilsLangueDesPages,
        "les pages filles sont en francais : l'anglais doit le dire",
      );
    } else {
      assert.equal(
        traduites.length,
        filles.length,
        `${traduites.length} pages filles sur ${filles.length} sont traduites : finir, ou retirer la langue declaree`,
      );
      assert.equal(
        contenuHub("en").outilsLangueDesPages,
        null,
        "les pages filles ont leur anglais : retire outilsLangueDesPages",
      );
    }

    // Le francais n'a rien a annoncer : ses pages sont dans sa langue.
    assert.equal(contenuHub("fr").outilsLangueDesPages, null);
  });

  test("le sitemap declare les deux langues du hub, et LUI SEUL", () => {
    // Declarer une langue qu'une page n'a pas mettrait son adresse
    // anglaise dans le sitemap ET dans ses `hreflang`, et Google y
    // trouverait du francais : l'anglais serait juge sur du duplique.
    const hub = PAGES_PUBLIQUES.find((p) => p.chemin === CHEMIN_HUB);
    assert.ok(hub, "/integrations a disparu du sitemap");
    assert.deepEqual([...languesDePage(hub)].sort(), [...LANGUES_PUBLIQUES].sort());
    assert.equal(hrefPourLangue(CHEMIN_HUB, "en"), "/en/integrations");

    for (const p of PAGES_PUBLIQUES.filter((x) => x.chemin.startsWith(`${CHEMIN_HUB}/`))) {
      if (languesDePage(p).includes("en")) continue;
      assert.equal(
        hrefPourLangue(p.chemin, "en"),
        p.chemin,
        `${p.chemin} n'a pas d'anglais : son lien ne doit pas etre prefixe`,
      );
    }
  });

  test("la page DELEGUE son texte, et ne prefixe aucun lien a la main", () => {
    const src = sourcePage();

    // Aucune phrase en dur : le francais et l'anglais vivent dans le
    // meme module, sinon ils divergent au premier correctif. On cherche
    // les VRAIES phrases du module, jamais un mot choisi a la main : un
    // mot finit toujours par tomber sur un identifiant (le `knowsAbout`
    // de la page auteur).
    for (const langue of LANGUES_PUBLIQUES) {
      for (const phrase of textes(contenuHub(langue))) {
        if (phrase.length < 20) continue;
        assert.ok(
          !src.includes(phrase),
          `la page recopie "${phrase.slice(0, 40)}..." au lieu de lire le module`,
        );
      }
    }
    assert.ok(src.includes("contenuHub("), "la page n'appelle plus contenuHub");
    assert.ok(src.includes("outilsPourLangue("), "la page n'appelle plus outilsPourLangue");

    // Le prefixe se CALCULE : `/signup` n'a pas de version anglaise, et
    // un `/en/` ecrit a la main y ferait un 404 au bout du bouton.
    assert.ok(src.includes("hrefPourLangue"), "la page ne prefixe plus ses liens");
    assert.ok(!/["'`]\/en\//.test(src), "un prefixe /en/ ecrit a la main");
  });

  test("le titre tient dans ce que Google affiche, dans les deux langues", () => {
    // Le gabarit du site ajoute " · Tiquiz". La borne est a 62 et pas a
    // 60 : "autour de 60" n'est pas un couperet, et le controle doit
    // attraper ce qui depasse VRAIMENT (regle du 1er septembre).
    for (const langue of LANGUES_PUBLIQUES) {
      const titre = `${contenuHub(langue).titre} · Tiquiz`;
      assert.ok(titre.length <= 62, `titre ${langue} trop long (${titre.length}) : ${titre}`);
    }
  });

  test("le hub vit dans le groupe qui sait lire la langue de l'adresse", () => {
    // Un groupe de routes n'ajoute aucun segment d'URL : `/integrations`
    // reste `/integrations`, donc sa canonique et ses `hreflang` ne
    // bougent pas. Mais seul `(site-langues)` lit l'en-tete pose par le
    // middleware, donc c'est le seul ou le chrome et les liens peuvent
    // suivre `/en/`.
    assert.equal(cheminPageDuSite(CHEMIN_HUB), "app/(site-langues)/integrations/page.tsx");
  });
});
