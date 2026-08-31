// tests/logic/bareme-affiliation-miroir.test.mts
//
// LE MIROIR DU BARÈME : CE DÉPÔT AFFICHE, TIPOTE PAIE.
//
// Béné, 30 août 2026 : "mêmes données côté atelier et affiliate. En fait
// affiliate fait foi, et atelier reprend les chiffres d'affiliate. On ne
// doit pas mettre des données différentes, tout doit être fiable et
// cohérent."
//
// -- LA MOITIÉ QUI MANQUAIT -------------------------------------------
//
// Tipote fige déjà ces valeurs (`tests/logic/bareme-affiliation-source.
// test.mts`), et son message d'échec nomme les fichiers à corriger ICI.
// Mais rien, de ce côté, ne les figeait : le simulateur public pouvait
// donc dériver du payeur **sans qu'aucun test ne rougisse nulle part**.
//
// C'est le motif que ce dépôt paie depuis juin : un garde-fou qui ne
// protège qu'un des deux jumeaux ne protège personne (les deux versions
// de `pdf-parse`, 7 août ; le filet genre-neutre, 24 août).
//
// Aucun des deux tests ne peut lire l'autre dépôt : ils ne PROUVENT donc
// pas l'égalité, ils garantissent qu'un changement de barème ne passe
// pas inaperçu **des deux côtés à la fois**. Vérifié à la main le
// 30 août : les deux modules donnent les mêmes valeurs de 0 à 130
// filleuls.
//
// CE QUI EST EN JEU : un simulateur qui promet 70 % là où l'espace
// affilié en verse 40 est une réclamation garantie, et c'est le lecteur
// qui a raison.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMMISSION_MAX_PCT,
  COMMISSION_PAS_PCT,
  PALIER_FILLEULS,
  REMISE_ABO_MAX_PCT,
  remiseAbonnementPct,
  tauxCommissionPct,
} from "../../lib/site/recompenseAffiliation.ts";
import { TAUX } from "../../lib/site/programmeAffiliation.ts";

const A_PORTER =
  "\n>>> Ce chiffre est celui qui PAIE, et il vit dans le depot tipote-app :" +
  "\n    lib/affiliate/recompense.ts   (les marches)" +
  "\n    lib/affiliate/commission.ts   (COMMISSION_RATES)" +
  "\n    et son test tests/logic/bareme-affiliation-source.test.mts." +
  "\n    S'il a change volontairement, il DOIT etre porte des DEUX cotes.";

test("les taux annonces sont ceux que Tipote verse", () => {
  assert.equal(TAUX.tiquiz, 0.4, "taux Tiquiz" + A_PORTER);
  assert.equal(TAUX.atelier, 0.7, "taux Atelier" + A_PORTER);
});

test("les marches du simulateur sont celles du payeur", () => {
  assert.equal(PALIER_FILLEULS, 10, "taille d'une marche" + A_PORTER);
  assert.equal(COMMISSION_PAS_PCT, 5, "ce qu'ajoute une marche" + A_PORTER);
  assert.equal(COMMISSION_MAX_PCT, 70, "plafond" + A_PORTER);
  assert.equal(REMISE_ABO_MAX_PCT, 100, "remise maximale" + A_PORTER);
});

test("LES DEUX ECHELLES NE SE DECOUPENT PAS PAREIL, et le simulateur le reproduit", () => {
  // Le taux s'ouvre au PREMIER filleul, la remise attend le DIXIEME.
  // Ce sont les deux formulations de Bene, et les aligner de force
  // reviendrait a changer un chiffre qu'elle a donne.
  //
  // Sa page Systeme.io annoncait l'INVERSE des deux cotes (45 % a partir
  // de 10 filleuls, 1 % de remise des le premier) : un simulateur qui
  // suivrait la page promettrait une remise a quelqu'un qui touchera
  // zero.
  assert.equal(tauxCommissionPct(0), 40, "sans filleul, le taux de base" + A_PORTER);
  assert.equal(tauxCommissionPct(1), 45, "la marche de TAUX s'ouvre au 1er filleul" + A_PORTER);
  assert.equal(remiseAbonnementPct(9), 0, "la REMISE attend le 10e filleul" + A_PORTER);
  assert.equal(remiseAbonnementPct(10), 10);
  assert.equal(tauxCommissionPct(51), 70, "le plafond est atteint a 51 filleuls" + A_PORTER);
  assert.equal(remiseAbonnementPct(100), 100, "a 100 filleuls l'abonnement est offert" + A_PORTER);
});

test("la table complete, marche par marche", () => {
  // Une table entiere plutot que quelques points : c'est elle qui
  // attrape un `Math.ceil` devenu `Math.floor`, et c'est exactement
  // l'ecart entre les deux echelles.
  const attendu: Array<[number, number, number]> = [
    // filleuls, taux %, remise %
    [0, 40, 0],
    [1, 45, 0],
    [10, 45, 10],
    [11, 50, 10],
    [20, 50, 20],
    [21, 55, 20],
    [50, 65, 50],
    [51, 70, 50],
    [99, 70, 90],
    [100, 70, 100],
    [500, 70, 100],
  ];
  for (const [n, taux, remise] of attendu) {
    assert.equal(tauxCommissionPct(n), taux, `taux a ${n} filleuls` + A_PORTER);
    assert.equal(remiseAbonnementPct(n), remise, `remise a ${n} filleuls` + A_PORTER);
  }
});

test("une saisie absurde ne fabrique jamais une recompense", () => {
  // Ces valeurs viennent d'un compteur, donc d'une requete, donc un jour
  // de quelque chose d'inattendu. Une remise negative ou infinie serait
  // affichee telle quelle sur une page publique.
  for (const n of [-5, NaN, Infinity, null, undefined, "beaucoup", {}]) {
    assert.equal(tauxCommissionPct(n as never), 40, `taux pour ${String(n)}`);
    assert.equal(remiseAbonnementPct(n as never), 0, `remise pour ${String(n)}`);
  }
});
