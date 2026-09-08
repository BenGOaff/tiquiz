// tests/logic/entonnoir-generateur.test.mts
//
// QUI ENTRE PAR LE GÉNÉRATEUR, ET COMMENT IL CONVERTIT.
//
// Béné, 8 septembre 2026 : "dans admin, fais moi apparaitre qui entre
// par le générateur dans mes contacts et dans les stat comment le
// générateur convertit : visites / inscrits gratos / abonnés et le ROI".
//
// Ce fichier tient les quatre choses qui rendent cet écran honnête, et
// chacune a déjà coûté quelque chose ailleurs dans ce dépôt :
//
//   1. le numérateur et le dénominateur parlent de la MÊME page
//      (le défaut du 7 septembre sur l'entonnoir des ventes) ;
//   2. un modèle inconnu ne reçoit AUCUN prix, et ne compte pas pour
//      zéro (un coût faux qui a l'air juste fait dépenser, 22 août) ;
//   3. un taux ne s'affiche pas sur trois personnes (4 août) ;
//   4. "je n'ai pas pu lire" n'est pas "personne n'est venu par là"
//      (23 août).

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  MIN_POUR_UN_TAUX_AVAL,
  comptesDuGenerateur,
  construireEntonnoirGenerateur,
  repartitionParSource,
  comptesDuGenerateurSiLisible,
  vuesDuGenerateur,
  type LigneGeneration,
} from "@/lib/generateur/entonnoirGenerateur";
import { TARIFS_MAJ, coutMillicents, tarifDuModele } from "@/lib/generateur/tarifsIa";
import { CHEMIN_GENERATEUR, SOURCE_GENERATEUR } from "@/lib/site/generateurQuiz";
import { MIN_VUES_POUR_UN_TAUX, type LigneTrafic } from "@/lib/trafic/entonnoir";
import { buildPeople } from "@/lib/admin/people";
import {
  CRITERES_PAR_DEFAUT,
  compterVenusDuGenerateur,
  filtrerClients,
} from "@/lib/pilotage/clients";

const MODELE = "claude-opus-5-20260101";

function gen(over: Partial<LigneGeneration> = {}): LigneGeneration {
  return {
    source: SOURCE_GENERATEUR,
    compte: null,
    plan: null,
    modele: MODELE,
    jetonsEntree: 2000,
    jetonsSortie: 4000,
    ...over,
  };
}

function vue(chemin: string, vues: number): LigneTrafic {
  return { jour: "2026-09-08", chemin, source: "direct", vues };
}

// ── 1. LE DÉNOMINATEUR ET LE NUMÉRATEUR PARLENT DE LA MÊME PAGE ──────

test("l'entonnoir ne compte QUE les quiz générés sur la page dédiée", () => {
  const e = construireEntonnoirGenerateur({
    lignesTrafic: [vue(CHEMIN_GENERATEUR, 200)],
    generations: [
      gen(),
      gen(),
      // L'iframe de la page de vente : personne n'en compte les vues,
      // donc l'ajouter ici gonflerait le taux sans dénominateur.
      gen({ source: "tiquiz-fr" }),
      gen({ source: "tiquiz-fr" }),
      gen({ source: null }),
    ],
  });
  assert.equal(e.quiz, 2);
  assert.equal(e.vues, 200);
  assert.equal(e.tauxVersQuiz, 1);
});

test("les vues se comptent sur le chemin EXACT, jamais sur un préfixe", () => {
  const n = vuesDuGenerateur([
    vue(CHEMIN_GENERATEUR, 40),
    vue(`${CHEMIN_GENERATEUR}-pro`, 999),
    vue("/tarifs", 999),
  ]);
  assert.equal(n, 40);
});

test("la répartition par source montre TOUTES les portes, sans aucun taux", () => {
  const lignes = repartitionParSource([
    gen(),
    gen({ source: "tiquiz-fr" }),
    gen({ source: "tiquiz-fr" }),
    gen({ source: null }),
  ]);
  const par = Object.fromEntries(lignes.map((l) => [l.source, l.quiz]));
  assert.equal(par["tiquiz-fr"], 2);
  assert.equal(par[SOURCE_GENERATEUR], 1);
  // Une ligne trop ancienne pour porter sa source ne DISPARAÎT pas :
  // le total afficherait sinon moins de quiz qu'il n'y en a.
  assert.equal(par.inconnue, 1);
  for (const l of lignes) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(l, "taux"),
      false,
      "aucun taux par source : on ne mesure pas les vues de l'iframe",
    );
  }
});

// ── 2. LE COÛT : UN MODÈLE INCONNU N'EST PAS GRATUIT ─────────────────

test("un modèle absent de la table rend null, jamais un prix approché", () => {
  assert.equal(tarifDuModele("claude-tres-vieux-3"), null);
  assert.equal(coutMillicents("claude-tres-vieux-3", 1000, 1000), null);
  assert.equal(coutMillicents(null, 1000, 1000), null);
});

test("le préfixe le PLUS LONG gagne", () => {
  // `claude-opus-5` et `claude-opus-4-8` partagent leur début : sans le
  // tri par longueur, un renommage ferait payer le mauvais tarif.
  assert.deepEqual(tarifDuModele("claude-opus-4-8-20260220"), { entree: 5, sortie: 25 });
  assert.deepEqual(tarifDuModele("claude-haiku-4-5-20251001"), { entree: 1, sortie: 5 });
});

test("une génération sans jetons est COMPTÉE comme inconnue, pas comme gratuite", () => {
  const e = construireEntonnoirGenerateur({
    lignesTrafic: [vue(CHEMIN_GENERATEUR, 200)],
    generations: [
      gen(),
      // Une ligne d'avant le 8 septembre : aucun jeton n'était écrit.
      gen({ modele: null, jetonsEntree: null, jetonsSortie: null }),
    ],
  });
  assert.equal(e.coutInconnu, 1);
  // 2000 jetons d'entrée à 5 $/M + 4000 de sortie à 25 $/M = 0,11 $.
  assert.equal(e.coutMillicents, 11_000);
});

test("la table des tarifs porte sa date de relevé", () => {
  assert.match(TARIFS_MAJ, /^\d{4}-\d{2}-\d{2}$/);
});

test("le coût par inscrit vaut null quand personne ne s'est inscrit", () => {
  const e = construireEntonnoirGenerateur({
    lignesTrafic: [vue(CHEMIN_GENERATEUR, 200)],
    generations: [gen(), gen()],
  });
  assert.equal(e.inscrits, 0);
  assert.equal(e.coutParInscritMillicents, null);
  assert.equal(e.coutParAbonneMillicents, null);
});

// ── 3. UN TAUX SUR TROIS PERSONNES N'EST PAS UN TAUX ─────────────────

test("sous le seuil, le taux est null et les COMPTES restent exacts", () => {
  const e = construireEntonnoirGenerateur({
    lignesTrafic: [vue(CHEMIN_GENERATEUR, MIN_VUES_POUR_UN_TAUX - 1)],
    generations: [gen({ compte: "u1" })],
  });
  assert.equal(e.tauxVersQuiz, null, "pas assez de vues pour un taux");
  assert.equal(e.tauxVersInscription, null, "un seul quiz ne fait pas un taux");
  assert.equal(e.vues, MIN_VUES_POUR_UN_TAUX - 1);
  assert.equal(e.quiz, 1);
  assert.equal(e.inscrits, 1);
});

test("le seuil aval est plus bas que celui des vues, et reste au dessus de 1", () => {
  assert.ok(MIN_POUR_UN_TAUX_AVAL < MIN_VUES_POUR_UN_TAUX);
  assert.ok(MIN_POUR_UN_TAUX_AVAL > 1);
});

test("les abonnés se comptent avec isPaidPlan, pas avec une liste recopiée", () => {
  const generations = [
    ...Array.from({ length: MIN_POUR_UN_TAUX_AVAL }, (_, i) =>
      gen({ compte: `u${i}`, plan: "free" }),
    ),
    gen({ compte: "paye-1", plan: "monthly_plus" }),
    gen({ compte: "paye-2", plan: "yearly" }),
    gen({ compte: "paye-3", plan: "lifetime" }),
  ];
  const e = construireEntonnoirGenerateur({
    lignesTrafic: [vue(CHEMIN_GENERATEUR, 500)],
    generations,
  });
  assert.equal(e.inscrits, MIN_POUR_UN_TAUX_AVAL + 3);
  assert.equal(e.abonnes, 3);
  assert.ok(e.tauxVersAbonnement !== null);
});

// ── 4. LA PASTILLE : TOUTES LES SOURCES, ET LE MUET SE DIT ───────────

test("la pastille compte TOUTES les portes, contrairement à l'entonnoir", () => {
  const comptes = comptesDuGenerateur([
    gen({ compte: "u1" }),
    gen({ source: "tiquiz-fr", compte: "u2" }),
    gen({ compte: null }),
    // Deux quiz du même compte : c'est une personne, pas deux.
    gen({ compte: "u1" }),
  ]);
  assert.deepEqual([...comptes].sort(), ["u1", "u2"]);
});

test("buildPeople sans ensemble = personne n'est marqué, et ce n'est pas un mensonge", () => {
  // Absent veut dire "je n'ai pas pu lire". L'écran le DIT ailleurs ;
  // ce qui compte ici, c'est qu'on ne marque personne à tort.
  const { people } = buildPeople({
    profiles: [{ user_id: "u1", email: "a@b.fr", plan: "free" }],
    sales: [],
    churn: [],
  });
  assert.equal(people[0].venuDuGenerateur, false);
});

test("buildPeople marque la personne dont l'identifiant est dans l'ensemble", () => {
  const { people } = buildPeople({
    profiles: [
      { user_id: "u1", email: "a@b.fr", plan: "free" },
      { user_id: "u2", email: "c@d.fr", plan: "free" },
    ],
    sales: [],
    churn: [],
    venusDuGenerateur: new Set(["u1"]),
  });
  const par = Object.fromEntries(people.map((p) => [p.email, p.venuDuGenerateur]));
  assert.equal(par["a@b.fr"], true);
  assert.equal(par["c@d.fr"], false);
});

test("le filtre de la liste montre ceux qui sont entrés par le générateur", () => {
  const { people } = buildPeople({
    profiles: [
      { user_id: "u1", email: "a@b.fr", plan: "free" },
      { user_id: "u2", email: "c@d.fr", plan: "monthly" },
    ],
    sales: [],
    churn: [],
    venusDuGenerateur: new Set(["u1"]),
  });
  assert.equal(compterVenusDuGenerateur(people), 1);
  const vues = filtrerClients(people, { ...CRITERES_PAR_DEFAUT, entree: "generateur" });
  assert.deepEqual(vues.map((p) => p.email), ["a@b.fr"]);
  // Le défaut ne filtre rien : l'annuaire reste l'annuaire.
  assert.equal(CRITERES_PAR_DEFAUT.entree, "tous");
  assert.equal(filtrerClients(people, CRITERES_PAR_DEFAUT).length, 2);
});

/** Un fichier sans ses commentaires : sinon un contrôle d'ordre ou de
 *  présence tombe sur sa propre explication (leçon du 2 septembre). */
function sansCommentaires(chemin: string): string {
  return readFileSync(chemin, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

test("une lecture ratée ne fabrique PAS un ensemble vide", () => {
  // C'est la moitié qui rend la pastille honnête. Un ensemble vide se
  // lirait "personne n'entre par le générateur", et enverrait chercher
  // un trafic manquant au lieu d'une panne de lecture (23 août).
  assert.equal(comptesDuGenerateurSiLisible({ lisible: false }), undefined);

  const avec = comptesDuGenerateurSiLisible({
    lisible: true,
    generations: [gen({ compte: "u1" }), gen({ compte: null })],
  });
  assert.deepEqual([...(avec ?? [])], ["u1"]);

  // Et personne n'est marqué quand rien n'a pu être lu : `buildPeople`
  // reçoit alors `undefined`, pas un ensemble.
  const { people } = buildPeople({
    profiles: [{ user_id: "u1", email: "a@b.fr", plan: "free" }],
    sales: [],
    churn: [],
    venusDuGenerateur: comptesDuGenerateurSiLisible({ lisible: false }),
  });
  assert.equal(people[0].venuDuGenerateur, false);
});

test("le muet voyage jusqu'à l'écran : la route DIT si elle a pu lire", () => {
  const route = sansCommentaires("app/api/admin/pilotage/route.ts");
  const ecran = sansCommentaires("components/pilotage/ClientsPilotage.tsx");

  // Sans ce fait dans la réponse, l'écran ne peut pas distinguer
  // "personne n'entre par le générateur" de "je n'ai pas pu regarder",
  // et il afficherait le premier en pensant dire la vérité.
  assert.ok(
    /generateurLisible/.test(route),
    "la route doit dire si les sessions ont pu être lues",
  );
  assert.ok(
    /generateurLisible/.test(ecran),
    "l'écran doit lire ce fait, sinon il annonce zéro sur une panne",
  );

  // La route DÉLÈGUE la décision : elle ne recompose pas d'ensemble à
  // la main. On vise le fait, pas la formulation.
  assert.ok(
    /venusDuGenerateur:\s*comptesDuGenerateurSiLisible\(/.test(route),
    "la route passe par la fonction pure, testable",
  );
  assert.ok(
    !/comptesDuGenerateur\(/.test(route),
    "aucun ensemble fabriqué dans la route : c'est là que le vide naissait",
  );
});
