// tests/logic/lien-affilie-partout.test.mts
//
// TOUS LES LIENS QUI SORTENT, PAS SEULEMENT CEUX QU'ON VIENT DE TOUCHER.
//
// Béné, 26 août 2026 : "tiens un truc que je suis presque sûre que t'as
// oublié : le lien affilié intégré dans les textes de bas de page d'un
// quiz ou encore sur le qr code d'un certificat... tu dois faire un
// audit complet pour vérifier tous ces détails, là où on met des liens
// pour upgrader ou downgrader un abo, là où des liens affiliés sont
// insérés etc. Il faut penser à TOUT et ne RIEN laisser au hasard."
//
// Elle avait raison sur les deux, et l'audit en a sorti un troisième
// qu'elle n'avait pas nommé.
//
// 1. LE PIED DE PAGE DES QUIZ, le lien le PLUS VU du système : il est en
//    bas de chaque quiz publié en gratuit. La même fonction était
//    recopiée à TROIS endroits dans deux dépôts, et le 26 au matin un
//    seul des trois avait été corrigé.
// 2. LE BOUTON DE CHANGEMENT DE PALIER, qui envoyait un abonné sur un
//    bon de commande : il ouvrait un DEUXIÈME abonnement pendant que le
//    premier continuait de le prélever.
// 3. Le QR du certificat, corrigé le matin même côté Atelier.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TIQUIZ_DECOUVERTE_URL,
  tiquizDiscoveryUrl,
} from "../../lib/affiliate/lienDecouverte.ts";
import { actionDuBouton } from "../../lib/checkout/planChange.ts";

// -- LE PIED DE PAGE ---------------------------------------------------

test("le pied de page mène sur NOTRE domaine", () => {
  assert.equal(TIQUIZ_DECOUVERTE_URL, "https://tiquiz.fr/");
  assert.doesNotMatch(TIQUIZ_DECOUVERTE_URL, /tipote\.fr|systeme\.io/);
});

test("l'identifiant du créateur voyage avec", () => {
  const lien = tiquizDiscoveryUrl("sa0007878317200141bbe3de2b6644176621db2c6580");
  assert.match(lien, /^https:\/\/tiquiz\.fr\/\?sa=sa0007878/);
});

test("sans identifiant, on rend quand même l'adresse", () => {
  // Ce pied de page est une porte d'entrée avant d'être une commission :
  // un lien absent ne rapporterait rien à personne.
  for (const rien of [null, undefined, "", "   "]) {
    assert.equal(tiquizDiscoveryUrl(rien), TIQUIZ_DECOUVERTE_URL, JSON.stringify(rien));
  }
});

test("l'identifiant est échappé", () => {
  // Il vient d'un champ de réglages rempli à la main.
  assert.match(tiquizDiscoveryUrl("a b&c=d"), /\?sa=a%20b%26c%3Dd$/);
});

// -- LE CHANGEMENT DE PALIER -------------------------------------------

test("on ne propose RIEN tant qu'on ignore l'abonnement", () => {
  // C'est le vrai trou trouvé par l'audit : l'appel au serveur avait un
  // `.catch(() => {})`, donc une panne réseau d'une seconde rendait une
  // abonnée Stripe indiscernable d'une utilisatrice en gratuit, et lui
  // affichait un bon de commande. "Je n'ai rien trouvé" et "je n'ai pas
  // pu regarder" sont deux réponses différentes (règle du 23 août).
  const a = actionDuBouton({ actuelId: null, cibleId: "mensuel", abonnement: "inconnu" });
  assert.deepEqual(a, { action: "refuse", raison: "etat-inconnu" });
});

test("en gratuit, on envoie sur NOTRE bon de commande", () => {
  // Et plus sur un tunnel Systeme.io : sans ça le `?ref=` de l'affiliée
  // qui l'a amenée n'atteint jamais notre commissionnement.
  const a = actionDuBouton({ actuelId: null, cibleId: "mensuel", abonnement: "aucun" });
  assert.deepEqual(a, { action: "commander", produit: "mensuel" });
});

test("elle paie chez NOUS : on MONTE, on ne commande jamais", () => {
  const a = actionDuBouton({
    actuelId: "mensuel",
    cibleId: "mensuel-plus",
    abonnement: "chez-nous",
  });
  assert.deepEqual(a, { action: "changer", produit: "mensuel-plus" });
});

test("passer du mois à l'année est une MONTÉE", () => {
  // L'annuel coûte plus cher d'un coup et moins cher au mois : un
  // classement par prix le rangerait dans les descentes.
  const a = actionDuBouton({ actuelId: "mensuel", cibleId: "annuel", abonnement: "chez-nous" });
  assert.equal(a.action, "changer");
});

test("une descente chez nous CHANGE le palier, elle ne renvoie plus au bon de commande", () => {
  // Elle refusait, avec sa raison, jusqu'au 29 aout. Bene : "je veux que
  // le downgrade soit pris en compte sans desabonnement cote user."
  // Le changement est accepte ici, et c'est la route qui le programme
  // pour la fin de la periode payee (jamais tout de suite : elle a paye
  // son mois, on ne lui retire rien avant l'echeance).
  const a = actionDuBouton({
    actuelId: "annuel-plus",
    cibleId: "mensuel",
    abonnement: "chez-nous",
  });
  assert.deepEqual(a, { action: "changer", produit: "mensuel" });
});

test("une abonnée Systeme.io garde LEUR bon de commande", () => {
  // Et ce n'est pas un oubli : c'est leur webhook qui annule l'ancien
  // abonnement quand le nouveau est pris chez eux. Lui donner NOTRE bon
  // de commande ouvrirait un abonnement Stripe pendant que leur
  // prélèvement continue. Ce serait créer le bug, pas le fermer.
  const a = actionDuBouton({
    actuelId: "mensuel",
    cibleId: "mensuel-plus",
    abonnement: "systeme-io",
  });
  assert.deepEqual(a, { action: "commander-systeme-io", produit: "mensuel-plus" });
});

test("son palier actuel se reconnaît, des deux côtés", () => {
  for (const etat of ["chez-nous", "systeme-io"] as const) {
    const a = actionDuBouton({ actuelId: "mensuel", cibleId: "mensuel", abonnement: etat });
    assert.deepEqual(a, { action: "actuel" }, etat);
  }
});

test("un accès à vie n'est jamais remplacé par un abonnement", () => {
  const a = actionDuBouton({
    actuelId: null,
    cibleId: "annuel-plus",
    abonnement: "aucun",
    aVie: true,
  });
  assert.deepEqual(a, { action: "inclus" });
});

test("un palier inconnu ne produit aucun bouton", () => {
  const a = actionDuBouton({
    actuelId: "mensuel",
    cibleId: "n_importe_quoi",
    abonnement: "chez-nous",
  });
  assert.equal(a.action, "refuse");
});
