// tests/logic/admin-tabs.test.mts
//
// L'ADMIN DE TIQUIZ N'EXISTE PLUS. TOUT VIT DANS LA CONSOLE.
//
// Béné, 18 septembre 2026 : "oui tu peux enlever ça de l'admin, je veux
// tout suivre dans pilotage."
//
// C'était la cible depuis le 29 août, écrite dans `sections.ts` dans ses
// mots : "à terme on supprime les /admin de toutes les app pour tout
// gérer sur pilotage." La veille, le suivi des ventes était parti ; le
// 18, les quatre dernières choses qui n'avaient pas d'équivalent dans la
// console l'ont rejointe (inviter, les tags, les revendeurs et leurs
// factures, la modération du blog).
//
// -- CE QUE CE FICHIER PROTÈGE MAINTENANT ------------------------------
//
// **Qu'on n'ait rien éteint sans l'avoir remplacé.** C'est la règle que
// `sections.ts` s'était donnée, et c'est le seul vrai risque d'un
// ménage : retirer un outil dont le remplaçant n'existe pas, et ne s'en
// apercevoir que le jour où on en a besoin. Chaque morceau parti de
// l'admin est donc vérifié ARRIVÉ quelque part.
//
// Les autres leçons ne bougent pas, elles changent seulement d'adresse :
// une seule liste de personnes, une seule fiche où l'on agit, un écran
// vide qui dit pourquoi il est vide.
//
// -- L'ANCIEN TITRE, GARDÉ POUR LA TRACE -------------------------------
//
// "L'ADMIN AGIT, LA CONSOLE SUIT. ET AUCUN DES DEUX NE FAIT LES DEUX."
// C'était vrai entre le 17 et le 18 septembre. La ligne de partage a
// disparu avec l'un des deux côtés.
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

import { sansCommentaires } from "./aide/sansCommentaires.mts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("/admin REDIRIGE vers la console, il ne rend pas un 404", () => {
  // L'adresse est dans ses favoris et dans chaque vieil email d'alerte.
  // Un 404 se lirait comme une panne alors que tout fonctionne.
  assert.match(lire("app/admin/page.tsx"), /permanentRedirect\("\/pilotage"\)/);
  // La fiche d'une personne aussi : son adresse est citee dans tous les
  // emails de vente deja envoyes, et ceux la ne se reecrivent pas.
  const fiche = lire("app/admin/clients/[email]/page.tsx");
  assert.match(fiche, /permanentRedirect\(/);
  assert.ok(fiche.includes("/pilotage/clients/"), "l'ancienne fiche ne mene pas a la nouvelle");
  // ET ON NE TOUCHE PAS AU SEGMENT : le decoder pour le re-encoder
  // perdrait un `+` dans `bene+test@gmail.com`, et la fiche s'ouvrirait
  // sur personne (drame du 31 aout, par l'autre bout).
  assert.ok(!fiche.includes("lireEmailParam"), "la redirection decode le segment");
  assert.ok(!fiche.includes("encodeURIComponent"), "la redirection re-encode le segment");
});

test("L'ECRAN D'ADMIN LUI MEME A DISPARU", () => {
  // Pas seulement ses onglets : le composant entier. Le laisser en
  // place sans route qui le rende, c'est du code mort qui donne
  // l'illusion d'un filet.
  assert.throws(
    () => lire("components/admin/AdminDashboard.tsx"),
    "AdminDashboard est revenu : l'admin se reconstruit a cote de la console",
  );
});

test("CE QUI EST PARTI DE L'ADMIN EST BIEN ARRIVE DANS LA CONSOLE", () => {
  // LA REGLE QUI COMPTE : on n'eteint rien avant d'avoir remplace. Sans
  // ce test, un menage peut retirer un outil dont le remplacant n'existe
  // pas, et personne ne le voit avant d'en avoir besoin.
  const arrivees: Array<[string, string, string]> = [
    ["inviter un compte", "components/pilotage/ClientsPilotage.tsx", "<InviterCompte"],
    ["le controle des tags", "components/pilotage/ClientsPilotage.tsx", "<TagsCard />"],
    ["la gestion des revendeurs", "components/pilotage/RevendeursPilotage.tsx", "<ResellersCard />"],
    ["les factures revendeurs", "components/pilotage/RevendeursPilotage.tsx", "<ResellerPaymentEventsCard />"],
    ["la moderation du blog", "components/pilotage/SupportPilotage.tsx", "<CommentairesBlogCard />"],
    ["le journal des appels recus", "components/pilotage/SantePilotage.tsx", "<WebhookLogsCard />"],
  ];
  for (const [quoi, ecran, marqueur] of arrivees) {
    assert.ok(lire(ecran).includes(marqueur), `${quoi} n'est arrive nulle part (${ecran})`);
  }
  const sections = lire("lib/pilotage/sections.ts");
  for (const chemin of ['"/clients"', '"/ventes"', '"/revendeurs"', '"/support"', '"/sante"', '"/business"', '"/affilies"']) {
    assert.ok(sections.includes(chemin), `la section ${chemin} n'existe pas dans la console`);
  }
});

test("PLUS AUCUN ECRAN NE RENVOIE VERS /admin", () => {
  // Un lien vers un ecran eteint est pire qu'un bouton absent : il
  // donne un aller-retour, puis l'impression d'avoir mal clique.
  for (const ecran of [
    "components/pilotage/RevendeursPilotage.tsx",
    "components/pilotage/SantePilotage.tsx",
    "components/admin/ClientFiche.tsx",
    "components/admin/PilotageCard.tsx",
    "components/admin/SupportCard.tsx",
    "components/AppSidebar.tsx",
  ]) {
    // `/api/admin/...` est une ROUTE, pas un ecran : elle reste, et
    // c'est voulu. On ne vise que les liens de navigation.
    const src = sansCommentaires(lire(ecran)).replaceAll("/api/admin", "");
    assert.ok(!/["`]\/admin["`]/.test(src), `${ecran} renvoie encore vers /admin`);
    assert.ok(!src.includes("/admin/clients/"), `${ecran} mene encore a l'ancienne fiche`);
  }
  // LES EMAILS AUSSI. Ils partent dans une boite et y restent des mois :
  // un lien mort dedans se decouvre au pire moment.
  for (const email of [
    "lib/email/venteEncaisseeAlerte.ts",
    "lib/email/accesAlerte.ts",
    "lib/email/supportAlertEmail.ts",
    "lib/email/saleRefusedAlert.ts",
  ]) {
    const src = sansCommentaires(lire(email))
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("import "))
      .join("\n")
      .replaceAll("/api/admin", "");
    assert.ok(!src.includes("/admin"), `${email} envoie un lien vers /admin`);
  }
});

test("IL N'Y A QU'UNE SEULE LISTE DE PERSONNES", () => {
  // Le doublon qu'elle avait vu le 22 aout : deux tableaux des memes
  // gens, avec leurs propres colonnes et leurs propres actions.
  const liste = lire("components/admin/PilotageCard.tsx");
  assert.ok(!liste.includes("noUsersFound"), "un deuxieme tableau des utilisateurs est revenu");
  // L'ecran des clients de la console ne relit PAS la liste des comptes
  // de son cote : il passe par la porte commune.
  const clients = sansCommentaires(lire("components/pilotage/ClientsPilotage.tsx"));
  assert.ok(
    !/fetch\("\/api\/admin\/users"\)/.test(clients),
    "l'ecran des clients relit la liste des comptes : c'est le doublon qui revient",
  );
  assert.match(clients, /\/api\/admin\/pilotage/, "il ne lit plus la porte commune");
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
    liste.includes("/pilotage/clients/${encodeURIComponent(p.email)}"),
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
  assert.ok(
    fiche.includes('href="/pilotage/clients"'),
    "la fiche ne remonte plus a la liste des clients",
  );
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

test("chaque source de donnee est rendue UNE SEULE FOIS", () => {
  // Deux fois le meme bloc sur deux ecrans = deux appels reseau et deux
  // totaux qui finiront par se contredire.
  const uneFois: Array<[string, string]> = [
    ["components/pilotage/SantePilotage.tsx", "<WebhookLogsCard />"],
    ["components/pilotage/RevendeursPilotage.tsx", "<ResellersCard />"],
    ["components/pilotage/RevendeursPilotage.tsx", "<ResellerPaymentEventsCard />"],
    ["components/pilotage/SupportPilotage.tsx", "<CommentairesBlogCard />"],
    ["components/pilotage/ClientsPilotage.tsx", "<TagsCard />"],
  ];
  for (const [ecran, b] of uneFois) {
    assert.equal(lire(ecran).split(b).length - 1, 1, `${b} n'apparait pas une seule fois dans ${ecran}`);
  }
  // Et AUCUN de ces blocs n'est rendu par DEUX ecrans differents.
  const ecrans = [
    "components/pilotage/SantePilotage.tsx",
    "components/pilotage/RevendeursPilotage.tsx",
    "components/pilotage/SupportPilotage.tsx",
    "components/pilotage/ClientsPilotage.tsx",
    "components/pilotage/VentesPilotage.tsx",
  ].map((f) => lire(f));
  for (const b of ["<WebhookLogsCard />", "<ResellersCard />", "<TagsCard />"]) {
    assert.equal(
      ecrans.filter((src) => src.includes(b)).length,
      1,
      `${b} est rendu par plusieurs ecrans de la console`,
    );
  }
});

test("les revendeurs ont leur ECRAN, ils ne sont plus enterres", () => {
  // Ils vivaient tout en bas de l'onglet "Mes ventes", apres le journal
  // des appels : il fallait scroller un ecran entier pour les trouver,
  // donc ils n'existaient pas.
  assert.match(lire("lib/pilotage/sections.ts"), /chemin: "\/revendeurs"/);
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
