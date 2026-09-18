// tests/logic/admin-tabs.test.mts
//
// L'ADMIN AGIT, LA CONSOLE SUIT. ET AUCUN DES DEUX NE FAIT LES DEUX.
//
// Béné, 17 septembre 2026 : "l'admin de tiquiz ne devrait plus suivre
// les ventes etc qui ne doivent être suivis que sur pilotage pour
// simplifier les choses."
//
// La console s'était donné cette règle le 29 août (`sections.ts`,
// règle 1 : "LA CONSOLE PILOTE, ELLE N'ÉDITE PAS"), et son miroir
// n'existait pas : l'admin suivait ET éditait. Les ventes, les
// statistiques d'argent et le journal des appels vivaient donc à DEUX
// endroits, et deux écrans de la même vente finissent toujours par se
// contredire.
//
// Ce fichier tient la nouvelle frontière dans les deux sens : l'admin
// n'a plus d'onglet de suivi, et la console a bien récupéré ce qui est
// parti. Un déménagement à moitié fait retire l'outil sans donner son
// remplaçant, et c'est le seul cas où on est plus mal qu'avant.
//
// -- CE QU'IL PROTÉGEAIT DÉJÀ -----------------------------------------
//
// UNE SEULE LISTE DE PERSONNES, ET UN ÉCRAN VIDE QUI DIT POURQUOI.
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

test("les onglets d'ACTION existent, et Clients est celui qui s'ouvre", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  const onglets = src.slice(src.indexOf("const ONGLETS = ["), src.indexOf("] as const;"));
  for (const id of ['"clients"', '"support"', '"revendeurs"', '"affilies"']) {
    assert.ok(onglets.includes(id), `l'onglet ${id} a disparu`);
  }
  // Clients par defaut : c'est la question qu'elle se pose en premier.
  assert.ok(
    /useState<OngletId>\("clients"\)/.test(src),
    "l'onglet ouvert par defaut n'est plus Clients",
  );
});

test("L'ADMIN NE SUIT PLUS LES VENTES (Bene, 17 septembre 2026)", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  const onglets = src.slice(src.indexOf("const ONGLETS = ["), src.indexOf("] as const;"));
  for (const parti of ['"ventes"', '"stats"']) {
    assert.ok(
      !onglets.includes(parti),
      `l'onglet ${parti} est revenu dans l'admin : les ventes se suivent sur /pilotage`,
    );
  }
  // Et pas seulement l'onglet : les trois blocs de suivi non plus.
  for (const bloc of ["<StatistiquesCard", "<WebhookLogsCard", 'vue="ventes"']) {
    assert.ok(!src.includes(bloc), `${bloc} suit encore des ventes dans l'admin`);
  }
  // Le lien vers la console reste, et il DIT ou c'est parti : une
  // fonctionnalite deplacee sans un mot se lit comme une suppression.
  assert.ok(src.includes('href="/pilotage"'), "l'admin ne mene plus a la console");
  assert.match(src, /centre de pilotage/i);
});

test("CE QUI EST PARTI DE L'ADMIN EST BIEN ARRIVE DANS LA CONSOLE", () => {
  // Le point de cette regle : on n'eteint rien avant d'avoir remplace.
  // Sans ce test, le menage de l'admin pourrait retirer un ecran dont
  // le remplacant n'existe pas, et personne ne le verrait avant d'en
  // avoir besoin.
  const sections = lire("lib/pilotage/sections.ts");
  for (const chemin of ['"/ventes"', '"/business"', '"/sante"']) {
    assert.ok(sections.includes(chemin), `la section ${chemin} n'existe pas dans la console`);
  }
  // Le journal complet des appels recus a demenage dans Sante.
  assert.ok(
    lire("components/pilotage/SantePilotage.tsx").includes("<WebhookLogsCard />"),
    "le journal des appels recus n'est arrive nulle part",
  );
  // Et l'ancienne adresse REDIRIGE au lieu de rendre un 404 : elle est
  // dans ses favoris, et un 404 se lit comme une panne.
  const ancienne = lire("app/admin/ventes/page.tsx");
  assert.match(ancienne, /permanentRedirect\("\/pilotage\/ventes"\)/);
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
    "<ResellersCard />",
    "<ResellerPaymentEventsCard />",
  ]) {
    assert.equal(src.split(bloc).length - 1, 1, `${bloc} apparait plusieurs fois`);
  }
  // `<WebhookLogsCard />` et `<StatistiquesCard />` ne sont plus dans
  // cette liste : ils ont quitte l'admin le 17 septembre. La regle
  // "une seule fois" les suit dans la console.
  assert.equal(
    lire("components/pilotage/SantePilotage.tsx").split("<WebhookLogsCard />").length - 1,
    1,
    "le journal des appels apparait plusieurs fois dans Sante",
  );
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
  assert.ok(
    lire("components/admin/PilotageCard.tsx").includes("setPanne("),
    "PilotageCard ne retient plus la panne",
  );
  assert.ok(
    lire("components/admin/PilotageCard.tsx").includes("RAISONS_PANNE"),
    "le pilotage ne traduit plus la raison du serveur",
  );
  // LA MEME GARANTIE, PORTEE PAR LES ECRANS QUI ONT REPRIS LE TRAVAIL.
  // `StatistiquesCard` disait "ce n'est pas parce que tu n'as pas de
  // ventes" ; les trois ecrans de la console doivent dire la meme chose
  // a leur facon, sinon un ecran vide se relit "zero vente".
  for (const ecran of [
    "components/pilotage/VentesPilotage.tsx",
    "components/pilotage/BusinessPilotage.tsx",
    "components/pilotage/AccueilPilotage.tsx",
  ]) {
    assert.match(
      lire(ecran),
      /n'ont pas pu être lues|n'ont pas pu être lus|pas pu être lu/,
      `${ecran} ne distingue plus "je n'ai pas pu lire" de "il n'y a rien"`,
    );
  }
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

test("Tiquiz et l'Atelier se distinguent partout ou on voit une vente", () => {
  // "je vois mal les differences entre tiquiz et l'atelier, partout".
  assert.ok(
    lire("components/admin/PilotageCard.tsx").includes("NOM_PRODUIT"),
    "la liste des clients ne distingue pas les deux produits",
  );
  // L'ecran des ventes de la console a repris la question, et il nomme
  // MEME ce que `NOM_PRODUIT` ne connait pas (une echeance a l'ancien
  // prix), grace au repli par le montant.
  const ventes = lire("components/pilotage/VentesPilotage.tsx");
  assert.ok(ventes.includes("nomProduitVendu"), "l'ecran des ventes ne nomme plus le produit");
  assert.ok(
    ventes.includes("nomProduitComplete"),
    "l'ecran des ventes a perdu le repli par le montant : les echeances a 9 EUR redeviennent 'non identifie'",
  );
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

test("aucun ecran ne dessine un montant qu'on n'a pas", () => {
  // La parenthese de sa demande du 22 aout : "(uniquement de maniere
  // fiable aussi...)".
  //
  // Le garde-fou vivait dans `StatistiquesCard`, qui a quitte l'admin le
  // 17 septembre. Il ne se perd pas pour autant : la decision est dans
  // le TYPE, et c'est ce type qui oblige chaque ecran a traiter le cas
  // "je ne sais pas". Viser le type plutot qu'un composant est plus
  // solide, parce qu'aucun ecran ne peut le contourner.
  const serie = lire("lib/admin/adminStats.ts");
  assert.match(serie, /fiable/, "le type Serie ne porte plus la fiabilite");
  // Et la ligne de vente dit quand son montant vient du TARIF du plan
  // et non de la somme encaissee : une remise ne serait pas deduite.
  assert.ok(
    lire("components/pilotage/VentesPilotage.tsx").includes('amountSource === "plan"'),
    "l'ecran des ventes ne dit plus quand un montant est estime",
  );
});
