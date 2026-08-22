// tests/logic/admin-tabs.test.mts
//
// L'ADMIN A CINQ ONGLETS, UNE SEULE LISTE DE PERSONNES, ET UN ÉCRAN VIDE
// QUI DIT POURQUOI.
//
// Béné, 22 août, trois demandes qui se suivent :
//   1. "Je n'ai plus AUCUNE infos sur mes users ! Fais moi un système
//       d'onglets : clients actuels / mes ventes / mes affiliés."
//   2. "Tu peux me créer un onglet mes revendeurs ? Avec un onglet
//       statistiques aussi pour suivre mes ventes, visuellement."
//   3. "Et pourquoi j'ai deux fois la liste des users ? Je peux pas avoir
//       une seule liste avec toutes les infos ?"
//
// La 3 est la plus importante, et c'est celle que ce fichier protège :
// il y avait DEUX tableaux des mêmes personnes, un pour regarder et un
// pour agir. Les deux à tenir à jour, et à comparer de tête quand ils ne
// disaient pas la même chose.
//
// Et sous tout ça, le point de départ : sa page affichait des ZÉROS
// partout parce que rien ne s'était chargé. Un zéro se lit "tu n'as
// personne", pas "ça n'a pas marché".

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("les cinq onglets existent, et Clients est celui qui s'ouvre", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  for (const id of ['"clients"', '"ventes"', '"stats"', '"revendeurs"', '"affilies"']) {
    assert.ok(src.includes(id), `l'onglet ${id} a disparu`);
  }
  // Clients par defaut : c'est la question qu'elle se pose en premier.
  assert.ok(
    /useState<OngletId>\("clients"\)/.test(src),
    "l'onglet ouvert par defaut n'est plus Clients",
  );
});

test("IL N'Y A QU'UNE SEULE LISTE DE PERSONNES", () => {
  // Le doublon exact qu'elle a vu : un seconde tableau des memes gens,
  // avec ses propres colonnes et ses propres actions, dans le meme
  // onglet que le premier.
  const dash = lire("components/admin/AdminDashboard.tsx");
  assert.ok(
    !dash.includes("noUsersFound"),
    "un deuxieme tableau des utilisateurs est revenu dans AdminDashboard",
  );
  assert.ok(
    !/fetch\("\/api\/admin\/users"\)/.test(dash),
    "AdminDashboard relit la liste des comptes : c'est le doublon qui revient",
  );
  // La liste unique, c'est PilotageCard, et elle est dans l'onglet Clients.
  assert.ok(dash.includes('<PilotageCard vue="clients" />'), "l'onglet Clients n'a plus la liste");
});

test("les actions ont rejoint la liste, dans le tiroir de chaque ligne", () => {
  // Sans elles, la fusion aurait retire des capacites au lieu de ranger.
  const src = lire("components/admin/PilotageCard.tsx");
  assert.ok(src.includes("changerPlan"), "on ne peut plus changer le palier depuis la liste");
  assert.ok(src.includes("renvoyerAcces"), "on ne peut plus renvoyer ses acces depuis la liste");
  assert.ok(src.includes("supprimer"), "on ne peut plus supprimer un compte depuis la liste");
  assert.ok(src.includes("rembourser"), "on ne peut plus rembourser depuis la liste");
  // Un seul tiroir ouvert a la fois : dix tiroirs recreent l'ecran
  // empile qu'on vient de defaire.
  assert.ok(
    /setDeplie\(ouvert \? null : p\.email\)/.test(src),
    "le depliant n'ouvre plus une seule ligne a la fois",
  );
});

test("la liste dit chez QUOI la personne est cliente", () => {
  // "s'il est client tiquiz ou atelier ou les deux" : la question de
  // tous les jours, qu'il fallait resoudre de tete en croisant deux
  // colonnes.
  const src = lire("components/admin/PilotageCard.tsx");
  assert.ok(src.includes("readClientKind"), "la colonne 'Cliente chez' a disparu");
  assert.ok(
    !/const CLIENTS[\s\S]{0,400}=>/.test(src) || src.includes("readClientKind(p)"),
    "l'ecran recalcule la reponse au lieu d'appeler la fonction testee",
  );
});

test("chaque source de donnee a son onglet, et une seule fois", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  // Deux fois le meme bloc dans deux onglets = deux appels reseau et
  // deux totaux qui finiront par se contredire.
  for (const bloc of [
    "<AffiliesCard />",
    "<WebhookLogsCard />",
    "<ResellersCard />",
    "<ResellerPaymentEventsCard />",
    "<StatistiquesCard />",
  ]) {
    assert.equal(src.split(bloc).length - 1, 1, `${bloc} apparait plusieurs fois`);
  }
  assert.ok(src.includes('<PilotageCard vue="ventes" />'), "l'onglet Ventes n'a plus le pilotage");
});

test("les revendeurs ne sont plus enterres sous l'onglet Ventes", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  const iRevendeurs = src.indexOf('{onglet === "revendeurs" && (');
  const iCarte = src.indexOf("<ResellersCard />");
  assert.ok(iRevendeurs > 0, "l'onglet Revendeurs n'existe pas");
  assert.ok(iCarte > iRevendeurs, "la carte Revendeurs n'est pas dans son onglet");
});

test("un ecran qui n'a rien charge le DIT, et ca reste affiche", () => {
  // Un toast disparait en trois secondes. Il restait des zeros, qui se
  // lisent comme "tu n'as aucun client".
  for (const fichier of [
    "components/admin/PilotageCard.tsx",
    "components/admin/StatistiquesCard.tsx",
  ]) {
    const src = lire(fichier);
    assert.ok(src.includes("setPanne("), `${fichier} ne retient plus la panne`);
  }
  assert.ok(
    lire("components/admin/PilotageCard.tsx").includes("RAISONS_PANNE"),
    "le pilotage ne traduit plus la raison du serveur",
  );
  // Et surtout : le bandeau dit que les zeros ne veulent rien dire.
  assert.ok(
    lire("components/admin/StatistiquesCard.tsx").includes(
      "ce n&apos;est pas parce que tu n&apos;as pas de ventes",
    ),
    "l'onglet Statistiques laisse croire qu'un ecran vide veut dire zero vente",
  );
});

test("un refus d'admin est nomme, pas laisse en 'erreur'", () => {
  // 401 veut dire "tu n'es pas reconnue comme admin". Afficher "erreur"
  // enverrait chercher un bug dans le code au lieu de la liste des
  // admins du serveur.
  const src = lire("components/admin/StatistiquesCard.tsx");
  assert.ok(src.includes("res.status === 401"), "le refus d'admin n'est plus distingue");
  assert.ok(src.includes("administrateur"), "le refus d'admin ne nomme plus ce qu'il faut regarder");
});

test("aucun graphique ne dessine un montant qu'on n'a pas", () => {
  // La parenthese de sa demande : "(uniquement de maniere fiable
  // aussi...)". Le composant DOIT traiter le cas "je ne sais pas", et
  // c'est le type Serie qui l'y oblige.
  const src = lire("components/admin/StatistiquesCard.tsx");
  assert.ok(src.includes("if (!serie.fiable)"), "les barres ne verifient plus la fiabilite");
  assert.ok(
    src.includes("montants-absents"),
    "l'ecran n'explique plus pourquoi la courbe des euros manque",
  );
});
