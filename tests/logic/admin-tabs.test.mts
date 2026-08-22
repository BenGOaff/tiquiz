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

test("chaque personne a UNE fiche, et c'est la qu'on agit", () => {
  // Bene, 22 aout : "Tu trouves ca pratique ? lisible ? facile a
  // utiliser ? Quand j'aurai 200000 clients, je fais comment ?"
  //
  // Le tiroir servait a regarder, pas a travailler. Une fiche a son
  // adresse : elle se garde en favori, elle se partage, elle survit a un
  // rafraichissement, et un ticket de support pourra la citer.
  const liste = lire("components/admin/PilotageCard.tsx");
  assert.ok(
    liste.includes("/admin/clients/${encodeURIComponent(p.email)}"),
    "la liste ne mene plus a la fiche",
  );
  assert.ok(!liste.includes("setDeplie"), "le tiroir est revenu dans la liste");

  const fiche = lire("components/admin/ClientFiche.tsx");
  for (const action of ["changerPlan", "renvoyerAcces", "supprimer", "rembourser", "enregistrerNom"]) {
    assert.ok(fiche.includes(action), `la fiche ne sait plus ${action}`);
  }
  // La fleche remonte a Mes clients, jamais a l'historique : deux ecrans
  // qui se citent l'un l'autre font une boucle (drame Gwenn, 1er aout).
  assert.ok(!fiche.includes("router.back()"), "la fiche est revenue a router.back()");
  assert.ok(fiche.includes('href="/admin"'), "la fiche ne remonte plus a Mes clients");
});

test("la fiche dit d'ou vient la personne, et avoue quand elle ne sait pas", () => {
  // "savoir d'ou il vient". Le journal ne remonte qu'au 7 aout : un
  // tiret se lirait "venue de nulle part".
  const src = lire("components/admin/ClientFiche.tsx");
  assert.ok(src.includes("D'où elle vient"), "la provenance a disparu de la fiche");
  assert.ok(
    src.includes("ne remonte qu&apos;au 7 août"),
    "la fiche ne dit plus pourquoi la provenance peut manquer",
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

test("on voit sur la ligne OU se rembourse l'argent", () => {
  // Bene, 22 aout : "il est ou le fucking bouton rembourser ??"
  //
  // Il n'y en avait pas, et il ne pouvait pas y en avoir : toutes ses
  // ventes passent par Systeme.io, qui garde l'argent. Un bouton absent
  // sans un mot se lit comme un bug.
  const src = lire("components/admin/PilotageCard.tsx");
  assert.ok(src.includes("function ouRembourser("), "la ligne ne dit plus ou rembourser");
  assert.ok(src.includes("a rembourser dans Systeme.io"), "la destination n'est plus nommee");
  // Et quand c'est remboursable ici, le bouton est sur la ligne.
  assert.ok(src.includes("function remboursables("), "la regle du remboursable a disparu");
});

test("Tiquiz et l'Atelier se distinguent dans les ventes ET dans les stats", () => {
  // "je vois mal les differences entre tiquiz et l'atelier, partout".
  for (const fichier of [
    "components/admin/PilotageCard.tsx",
    "components/admin/StatistiquesCard.tsx",
  ]) {
    assert.ok(
      lire(fichier).includes("NOM_PRODUIT"),
      `${fichier} ne distingue pas les deux produits`,
    );
  }
});

test("plus de jargon de diagnostic a l'ecran", () => {
  // "Nombres recus : ca veut dire quoi ? C'est pas clair... nombre de
  // leads ? nombre de ventes ? nombre d'euros ??" C'etait ma sonde de
  // debug, laissee dans SON ecran. Elle ne sert plus a rien depuis que
  // le tarif du plan donne le montant.
  for (const fichier of [
    "components/admin/WebhookLogsCard.tsx",
    "app/api/admin/webhook-logs/route.ts",
  ]) {
    assert.ok(!lire(fichier).includes("Nombres reçus"), `${fichier} affiche encore la sonde`);
    assert.ok(!lire(fichier).includes("champsNumeriques"), `${fichier} garde la sonde`);
  }
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
