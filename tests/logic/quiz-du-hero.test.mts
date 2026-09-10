// tests/logic/quiz-du-hero.test.mts
//
// LE QUIZ DU HAUT DE PAGE : son barème, et le lien qu'il pose.
//
// Béné, 9 septembre 2026 : « Le bouton du résultat pointe vers
// /generateur-de-quiz avec sujet, audience et objectif dans l'URL. Les
// six cartes "Six quiz prêts à générer" aussi. »
//
// Ce que ce filet tient, et aucun de ces défauts ne se voit à l'écran :
//
//   - un profil que le barème ne peut jamais attribuer (Véronique,
//     1er août : l'alerte rouge sur un quiz qui marche) ;
//   - un ex aequo tranché autrement d'un passage à l'autre, donc deux
//     résultats différents pour les mêmes réponses ;
//   - un brief qui diverge entre la carte et le bouton du résultat ;
//   - une source oubliée, donc une génération rangée en `direct` ;
//   - un texte recopié DÉJÀ encodé, donc `%C3%AA` dans le formulaire ;
//   - un barème anglais différent du français, donc deux visiteurs qui
//     cliquent la même chose et n'obtiennent pas le même profil.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PROFILS_HERO,
  briefsDuHero,
  lienDeLaCarte,
  lienDuProfil,
  pointsDesReponses,
  profilGagnant,
  quizHero,
  type CleProfil,
  type Gains,
} from "@/lib/site/quizHero";
import { CLE_AUDIENCE, CLE_OBJECTIF, CLE_SUJET, OBJECTIFS_PAR_SLUG } from "@/lib/generateur/prefillUrl";
import { CLE_PROFIL, CLE_SOURCE } from "@/lib/analytics/parcours";
import { LANGUES_PUBLIQUES } from "@/lib/site/langues";

/** Toutes les combinaisons de réponses possibles, jouées pour de vrai. */
function toutesLesParties(langue: "fr" | "en"): CleProfil[] {
  const questions = quizHero(langue).questions;
  let parties: Gains[][] = [[]];
  for (const q of questions) {
    const suivantes: Gains[][] = [];
    for (const debut of parties) {
      for (const o of q.options) suivantes.push([...debut, o.gains]);
    }
    parties = suivantes;
  }
  return parties.map((p) => profilGagnant(pointsDesReponses(p)));
}

test("les six profils sont tous atteignables, et aucun n'écrase les autres", () => {
  const resultats = toutesLesParties("fr");
  assert.equal(resultats.length, 320, "le nombre de parties possibles a changé");

  for (const cle of PROFILS_HERO) {
    const n = resultats.filter((r) => r === cle).length;
    const part = (n / resultats.length) * 100;
    // Les bornes sont LOIN des valeurs mesurées (10,9 % à 24,1 %) : ce
    // contrôle attrape un profil devenu inatteignable ou dominant, il
    // n'arbitre pas à la limite. Un test qui crie pour rien finit
    // désactivé.
    assert.ok(part >= 8, `le profil ${cle} ne sort que dans ${part.toFixed(1)} % des parties`);
    assert.ok(part <= 30, `le profil ${cle} sort dans ${part.toFixed(1)} % des parties`);
  }
});

test("un ex aequo est tranché par son ordre, jamais au hasard", () => {
  // Trois profils à égalité : c'est le premier de SON ordre qui gagne.
  assert.equal(profilGagnant({ cre: 4, acc: 4, ven: 4 }), "acc");
  assert.equal(profilGagnant({ ven: 2, cre: 2 }), "cre");
  // Deux appels sur les mêmes points rendent la même chose.
  const points = { for: 3, aff: 3 };
  assert.equal(profilGagnant(points), profilGagnant(points));
  // Aucun point du tout : on rend quand même un profil, jamais null.
  assert.ok(PROFILS_HERO.includes(profilGagnant({})));
});

test("le barème anglais est le MÊME que le français", () => {
  const fr = quizHero("fr").questions;
  const en = quizHero("en").questions;
  assert.equal(en.length, fr.length);
  fr.forEach((q, i) => {
    assert.equal(en[i].options.length, q.options.length, `question ${i + 1}`);
    q.options.forEach((o, k) => {
      assert.deepEqual(
        en[i].options[k].gains,
        o.gains,
        `question ${i + 1}, réponse ${k + 1} : les deux langues ne rapportent pas la même chose`,
      );
    });
  });
  // Donc, pour n'importe quelle suite de clics, le même profil.
  assert.deepEqual(toutesLesParties("en"), toutesLesParties("fr"));
});

test("la carte et le bouton du résultat portent le MÊME brief", () => {
  for (const langue of LANGUES_PUBLIQUES) {
    for (const cle of PROFILS_HERO) {
      const carte = new URL(lienDeLaCarte(cle, langue), "https://tiquiz.fr");
      const profil = new URL(lienDuProfil(cle, langue), "https://tiquiz.fr");
      for (const champ of [CLE_SUJET, CLE_AUDIENCE, CLE_OBJECTIF]) {
        assert.equal(
          carte.searchParams.get(champ),
          profil.searchParams.get(champ),
          `${langue}/${cle} : la carte et le résultat annoncent deux ${champ} différents`,
        );
      }
    }
  }
});

test("le résultat porte hero ET le profil, la carte porte modeles et rien d'autre", () => {
  for (const langue of LANGUES_PUBLIQUES) {
    for (const cle of PROFILS_HERO) {
      const profil = new URL(lienDuProfil(cle, langue), "https://tiquiz.fr");
      assert.equal(profil.searchParams.get(CLE_SOURCE), "hero");
      assert.equal(profil.searchParams.get(CLE_PROFIL), cle);

      const carte = new URL(lienDeLaCarte(cle, langue), "https://tiquiz.fr");
      assert.equal(carte.searchParams.get(CLE_SOURCE), "modeles");
      assert.equal(
        carte.searchParams.get(CLE_PROFIL),
        null,
        "une carte n'a pas de profil : le mettre rangerait une septième catégorie dans GA4",
      );
    }
  }
});

test("chaque objectif est un slug que le formulaire sait relire", () => {
  for (const langue of LANGUES_PUBLIQUES) {
    const briefs = briefsDuHero(langue);
    for (const cle of PROFILS_HERO) {
      const slug = String(briefs[cle].objectif);
      assert.ok(
        slug in OBJECTIFS_PAR_SLUG,
        `${langue}/${cle} : l'objectif "${slug}" n'est traduit par rien, le champ resterait vide`,
      );
    }
  }
});

test("les briefs sont écrits en CLAIR, jamais déjà encodés", () => {
  for (const langue of LANGUES_PUBLIQUES) {
    const briefs = briefsDuHero(langue);
    for (const cle of PROFILS_HERO) {
      for (const texte of [briefs[cle].sujet, briefs[cle].audience]) {
        assert.ok(
          !/%[0-9A-Fa-f]{2}/.test(texte),
          `${langue}/${cle} : "${texte}" est déjà encodé, la créatrice lirait %C3%AA dans son formulaire`,
        );
        assert.ok(texte.trim().length > 2, `${langue}/${cle} : un texte trop court ne préremplit rien`);
      }
    }
  }
});

test("l'anglais porte son préfixe, le français n'en porte aucun", () => {
  for (const cle of PROFILS_HERO) {
    assert.ok(lienDuProfil(cle, "fr").startsWith("/generateur-de-quiz?"));
    assert.ok(lienDeLaCarte(cle, "fr").startsWith("/generateur-de-quiz?"));
    assert.ok(
      lienDuProfil(cle, "en").startsWith("/en/generateur-de-quiz?"),
      "sans le préfixe, un lecteur anglais retombe sur le générateur français",
    );
    assert.ok(lienDeLaCarte(cle, "en").startsWith("/en/generateur-de-quiz?"));
  }
});

test("aucun tiret cadratin dans ce que le visiteur lit", () => {
  for (const langue of LANGUES_PUBLIQUES) {
    const c = quizHero(langue);
    const textes = [
      c.titre,
      c.mention,
      c.numero,
      c.compteur,
      c.compteurResultat,
      c.etiquetteResultat,
      c.etiquetteIdee,
      c.boutonGenerer,
      c.rassurance,
      c.recommencer,
      ...c.questions.flatMap((q) => [q.titre, ...q.options.map((o) => o.texte)]),
      ...PROFILS_HERO.flatMap((cle) => {
        const p = c.profils[cle];
        return [p.nom, p.corps, p.idee, p.pour, p.carte];
      }),
      ...PROFILS_HERO.flatMap((cle) => [briefsDuHero(langue)[cle].sujet, briefsDuHero(langue)[cle].audience]),
    ];
    for (const t of textes) {
      assert.ok(!/[—–]/.test(t), `tiret cadratin dans "${t}"`);
    }
  }
});

test("les deux langues nomment les six profils, sans trou", () => {
  for (const langue of LANGUES_PUBLIQUES) {
    const c = quizHero(langue);
    for (const cle of PROFILS_HERO) {
      const p = c.profils[cle];
      for (const [champ, valeur] of Object.entries(p)) {
        assert.ok(String(valeur).trim().length > 0, `${langue}/${cle} : ${champ} est vide`);
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────
// LA PAGE : ce qu'elle rend, et ce qu'elle n'écrit plus à la main.
// ─────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";

import { nombreDeModelesMetier, noteDesModeles, LANDING } from "@/lib/site/landing";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const PAGE = sansCommentaires(
  fs.readFileSync(
    path.join(process.cwd(), "app/(site)/apercu-landing-8f2c9d41/page.tsx"),
    "utf8",
  ),
);

test("le haut de page est UNE colonne, et le vrai quiz a remplacé la maquette", () => {
  // Béné, 9 septembre 2026 : "Le hero est centré, une seule colonne.
  // Pas de mise en page deux colonnes."
  assert.match(PAGE, /className="tql-large tql-hero-centre"/);
  assert.ok(
    !/tql-hero-grille/.test(PAGE),
    "le haut de page porte encore la grille à deux colonnes",
  );
  assert.match(PAGE, /<QuizHero langue=\{languePublique\}/);
  assert.ok(
    !/MaquetteQuiz/.test(PAGE),
    "la maquette dessinée est encore rendue à côté du vrai quiz",
  );
});

test("aucune adresse de générateur n'est écrite à la main dans la page", () => {
  // Sa maquette en porte douze, déjà encodées. Recopiées ici, elles
  // perdraient la SOURCE (donc toutes les générations sortiraient en
  // "direct") et le profil du quiz du hero.
  assert.ok(
    !/generateur-de-quiz\?/.test(PAGE),
    "une adresse de générateur est écrite en dur : elle ne portera ni source ni profil",
  );
  assert.match(PAGE, /lienDeLaCarte\(cle, languePublique\)/);
});

test("les six cartes lisent les six profils, jamais une liste recopiée", () => {
  assert.match(PAGE, /PROFILS_HERO\.map\(\(cle\)/);
  // Le texte de chaque carte vient du MÊME endroit que le quiz.
  for (const champ of ["pour", "idee", "carte"]) {
    assert.ok(
      PAGE.includes(`modeles[cle].${champ}`),
      `la carte n'affiche pas modeles[cle].${champ}`,
    );
  }
});

test("le compte de modèles vient du catalogue, jamais du texte", () => {
  // Sa maquette annonce 21. Mesuré : 15 modèles métier, plus les six
  // cartes ci dessus. Un nombre recopié est faux au premier ajout.
  assert.ok(nombreDeModelesMetier() > 0, "le catalogue est vide");
  for (const langue of Object.keys(LANDING)) {
    const t = LANDING[langue];
    assert.ok(
      t.modelesNote.includes("{metier}"),
      `${langue} : la note n'interpole pas le compte, elle l'écrit`,
    );
    assert.ok(
      !/\b\d+\b/.test(t.modelesNote.replace("{metier}", "")),
      `${langue} : un nombre est écrit à la main dans la note des modèles`,
    );
    assert.ok(noteDesModeles(t).includes(String(nombreDeModelesMetier())));
  }
  assert.match(PAGE, /\{noteDesModeles\(t\)\}/);
});

test("la section blog disparaît quand il n'y a aucun article", () => {
  // Béné : "la section blog [...] disparaît entièrement (return null)
  // s'il n'y en a aucun." Un titre suivi de rien se lit comme une panne.
  assert.match(PAGE, /articles\.length > 0 && \(/);
  assert.match(PAGE, /listerArticles\(languePublique\)\.slice\(0, 3\)/);
  assert.match(
    PAGE,
    /export const revalidate = 3600;/,
    "sans revalidation, les trois derniers articles se figent au déploiement",
  );
});

test("les liens de la page passent par hrefPourLangue", () => {
  // Un `/en/` écrit à la main fabriquerait un 404 sur une page qui n'a
  // pas la langue. La fonction, elle, refuse de préfixer.
  assert.ok(
    !/href="\/en\//.test(PAGE),
    "un préfixe de langue est écrit à la main",
  );
  assert.match(PAGE, /hrefPourLangue\("\/generateur-de-quiz", languePublique\)/);
  assert.match(PAGE, /hrefPourLangue\("\/templates", languePublique\)/);
});
