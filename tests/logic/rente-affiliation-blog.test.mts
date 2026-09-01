// tests/logic/rente-affiliation-blog.test.mts
//
// L'ARTICLE QUI RECRUTE LES AFFILIÉS NE PROMET QUE CE QUE LE SYSTÈME PAIE.
//
// Béné, 1er septembre 2026 : "rente mensuelle tiquiz : il manque tous
// les tableaux et les images .. bref l'article est pourri et cassé".
//
// Trois choses étaient vraies dans cette phrase, et une quatrième qu'elle
// n'a pas eu à dire :
//
//  1. les TABLEAUX avaient disparu à l'import (trois titres se
//     suivaient sans rien entre eux) ;
//  2. la section 4 promettait 50 % à vie sur des plans Tipote de 19 à
//     917 €/mois, sur un produit qui n'est pas en vente ;
//  3. SIX endroits du même article annonçaient un versement "le 10 de
//     chaque mois" et "sans seuil de versement", alors qu'il y a un
//     seuil de 20 € et un délai de 30 jours ;
//  4. le 40 % était écrit comme un plafond alors que c'est la première
//     marche d'un barème qui va jusqu'à 70 %. L'article SOUS-vendait le
//     programme, ce qui est l'autre façon de mentir.
//
// C'est l'article qui recrute les gros affiliés. Un chiffre faux ici ne
// se découvre qu'au premier virement, et à ce moment là c'est fini.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  RENTE_ATELIER_CENTS,
  TABLEAUX,
  euros,
  poserTableaux,
  renteUnitaireCents,
} from "@/lib/blog/tableauxRente";
import { tauxCommissionPct } from "@/lib/site/recompenseAffiliation";

const DOSSIER = path.join(process.cwd(), "content", "blog");

function article(slug: string) {
  return JSON.parse(fs.readFileSync(path.join(DOSSIER, `${slug}.json`), "utf8"));
}

/** Tout le texte du blog, tous fichiers confondus. */
function toutLeBlog(): string {
  return fs
    .readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".json"))
    .map((f) => fs.readFileSync(path.join(DOSSIER, f), "utf8"))
    .join("\n");
}

const RENTE = article("rente-mensuelle-affiliation-tiquiz");
const TEXTE_RENTE = JSON.stringify(RENTE);

test("les trois tableaux perdus a l'import sont revenus", () => {
  const tableaux = RENTE.blocs.filter(
    (b: { type?: string; html?: string }) => b.type === "html" && b.html?.includes("<table>"),
  );
  // Deux tableaux de rente (mensuel, annuel), le bareme des marches et
  // le comparatif des criteres.
  assert.equal(tableaux.length, TABLEAUX.length, "un tableau manque ou a ete pose en double");
});

test("aucun titre de l'article n'est suivi d'un autre titre", () => {
  // C'est le symptome exact qu'elle a vu : "2.1", "2.2" et "2.3"
  // s'enchainaient, parce que les tableaux entre eux avaient saute.
  const blocs = RENTE.blocs as { type: string; texte?: string }[];
  for (let i = 0; i < blocs.length - 1; i++) {
    if (blocs[i].type !== "titre" || blocs[i + 1].type !== "titre") continue;
    // Un titre de section suivi de son premier sous-titre est normal.
    const parent = blocs[i].texte ?? "";
    const enfant = blocs[i + 1].texte ?? "";
    const numero = /^(\d+)\./.exec(parent)?.[1];
    assert.ok(
      numero && enfant.startsWith(`${numero}.`),
      `"${parent}" est suivi de "${enfant}" sans rien entre les deux`,
    );
  }
});

test("les montants des tableaux sont ceux que le versement produira", () => {
  // Le tableau ne se relit pas : il se RECALCULE, avec les memes
  // fonctions que le simulateur de la page d'affiliation. Deux calculs
  // separes pour le meme chiffre finissent toujours par se contredire,
  // et c'est l'affilie qui decouvre l'ecart sur son premier virement.
  for (const n of [1, 10, 20, 30, 50]) {
    const mensuel = renteUnitaireCents("mensuel", n);
    const annuel = renteUnitaireCents("annuel", n);
    assert.ok(
      TEXTE_RENTE.includes(euros(mensuel * n * 12).replace(/ /g, " ")) ||
        TEXTE_RENTE.includes(euros(mensuel * n * 12)),
      `${n} filleuls mensuels : ${euros(mensuel * n * 12)} absent du tableau`,
    );
    assert.ok(
      TEXTE_RENTE.includes(euros(annuel * n)),
      `${n} filleuls annuels : ${euros(annuel * n)} absent du tableau`,
    );
  }
});

test("le bareme affiche va de 40 % a 70 %, comme celui qui paie", () => {
  assert.equal(tauxCommissionPct(0), 40);
  assert.equal(tauxCommissionPct(1), 45);
  assert.equal(tauxCommissionPct(11), 50);
  assert.equal(tauxCommissionPct(51), 70);
  for (const t of [40, 45, 50, 55, 60, 65, 70]) {
    assert.ok(TEXTE_RENTE.includes(`${t} %`), `la marche a ${t} % n'est pas dans l'article`);
  }
});

test("l'Atelier du Quiz remplace la promesse Tipote, avec son vrai montant", () => {
  assert.equal(RENTE_ATELIER_CENTS, 2742, "70 % du HT de 47 EUR");
  assert.ok(TEXTE_RENTE.includes("27,42"), "le montant de l'Atelier n'est pas annonce");
  assert.ok(TEXTE_RENTE.includes("atelierduquiz.fr"), "l'article ne mene pas a l'Atelier");
});

test("AUCUN article ne promet de commission sur Tipote", () => {
  // Tipote n'est pas en vente : ni ses plans (19 a 917 EUR/mois), ni son
  // taux (50 %), ni le "x14 sur ta rente" ne sont verifiables. Le blog
  // est ce qui recrute les affilies : ce qu'il promet doit exister.
  const blog = toutLeBlog();
  for (const promesse of ["917", "39,60", "49,50", "ecosysteme Tipote", "écosystème Tipote"]) {
    assert.ok(!blog.includes(promesse), `le blog promet encore "${promesse}"`);
  }
});

test("le blog n'annonce plus un versement sans seuil ni un versement le 10", () => {
  // Il y a un seuil (20 EUR) et un delai (30 jours), et le versement a
  // lieu ENTRE le 10 et le 13. L'espace affilie le dit correctement
  // depuis le 26 aout ; le blog promettait l'inverse a six endroits.
  const blog = toutLeBlog();
  for (const faux of [
    "sans seuil",
    "le 10 de chaque mois",
    "le 10 du mois",
    "Pas de seuil de versement",
  ]) {
    assert.ok(!blog.includes(faux), `le blog annonce encore "${faux}"`);
  }
  assert.ok(TEXTE_RENTE.includes("entre le 10 et le 13"), "la vraie fenetre n'est pas dite");
  assert.ok(TEXTE_RENTE.includes("20 €"), "le seuil de 20 EUR n'est pas dit");
});

test("poser les tableaux deux fois ne les pose pas deux fois", () => {
  // Ce pipeline tourne a chaque reparation. Une insertion qui n'est pas
  // idempotente empile les tableaux un peu plus a chaque passage, et
  // personne ne le voit avant que la page ne soit illisible.
  const blocs = JSON.parse(JSON.stringify(RENTE.blocs));
  assert.equal(poserTableaux(blocs), 0, "rien a reposer sur un contenu deja d'aplomb");
  const sansTableaux = blocs.filter(
    (b: { type?: string; html?: string }) => !(b.type === "html" && b.html?.includes("<table>")),
  );
  assert.equal(poserTableaux(sansTableaux), TABLEAUX.length);
  assert.equal(poserTableaux(sansTableaux), 0, "le second passage ne doit rien reposer");
});

test("les mots cles passent par la meme correction que le texte", () => {
  // Deux d'entre eux portaient une promesse fausse ("paiement le 10 du
  // mois", "affiliation sans seuil") et echappaient au pipeline : un
  // chiffre faux reste faux quand il sert de mot cle.
  const script = fs.readFileSync(
    path.join(process.cwd(), "scripts", "reparer-blog.mjs"),
    "utf8",
  );
  assert.match(script, /motsCles: a\.motsCles\.map\(texte\)/);
});
