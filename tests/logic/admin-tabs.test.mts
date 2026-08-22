// tests/logic/admin-tabs.test.mts
//
// L'ADMIN A TROIS ONGLETS, ET UN ÉCRAN VIDE DIT POURQUOI.
//
// Béné, 22 août : "Je n'ai plus AUCUNE infos sur mes users ! Fais moi un
// système d'onglets : clients actuels / mes ventes / mes affiliés."
//
// Deux choses dans cette phrase, et la première est la plus grave : sa
// page affichait des ZÉROS partout parce que rien ne s'était chargé. Un
// zéro se lit comme "tu n'as personne", pas comme "ça n'a pas marché".

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

test("les trois onglets existent, et Clients est celui qui s'ouvre", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  for (const id of ['"clients"', '"ventes"', '"affilies"']) {
    assert.ok(src.includes(id), `l'onglet ${id} a disparu`);
  }
  // Clients par defaut : c'est la question qu'elle se pose en premier.
  assert.ok(
    /useState<OngletId>\("clients"\)/.test(src),
    "l'onglet ouvert par defaut n'est plus Clients",
  );
});

test("la liste des comptes vit dans l'onglet Clients", () => {
  // C'est CE tableau qui a disparu de son ecran. Il doit etre dans
  // l'onglet qu'elle ouvre en arrivant.
  const src = lire("components/admin/AdminDashboard.tsx");
  const iClients = src.indexOf('{onglet === "clients" && (');
  const iTableau = src.indexOf("noUsersFound");
  const iVentes = src.indexOf('{onglet === "ventes" && (');
  assert.ok(iClients > 0 && iTableau > iClients, "le tableau des comptes a quitte l'onglet Clients");
  assert.ok(iVentes < iClients, "l'ordre des onglets a change sans qu'on le veuille");
});

test("chaque source de donnee a son onglet, et une seule fois", () => {
  const src = lire("components/admin/AdminDashboard.tsx");
  // Deux fois le meme bloc dans deux onglets = deux appels reseau et
  // deux totaux qui finiront par se contredire.
  for (const bloc of ["<AffiliesCard />", "<WebhookLogsCard />", "<ResellersCard />"]) {
    assert.equal(src.split(bloc).length - 1, 1, `${bloc} apparait plusieurs fois`);
  }
  assert.ok(src.includes('<PilotageCard vue="clients" />'), "l'onglet Clients n'a plus le pilotage");
  assert.ok(src.includes('<PilotageCard vue="ventes" />'), "l'onglet Ventes n'a plus le pilotage");
});

test("un ecran qui n'a rien charge le DIT, et ca reste affiche", () => {
  // Un toast disparait en trois secondes. Il restait des zeros, qui se
  // lisent comme "tu n'as aucun client".
  const dash = lire("components/admin/AdminDashboard.tsx");
  assert.ok(dash.includes("setPanne("), "la liste des comptes ne retient plus la panne");
  assert.ok(
    dash.includes("pas parce que tu n&apos;as personne"),
    "le bandeau ne dit plus que les zeros ne veulent rien dire",
  );

  const pilotage = lire("components/admin/PilotageCard.tsx");
  assert.ok(pilotage.includes("setPanne("), "le pilotage ne retient plus la panne");
  assert.ok(
    pilotage.includes("RAISONS_PANNE"),
    "le pilotage ne traduit plus la raison du serveur",
  );
});

test("un refus d'admin est nomme, pas laisse en 'erreur'", () => {
  // 401 veut dire "tu n'es pas reconnue comme admin". Afficher "erreur"
  // enverrait chercher un bug dans le code au lieu de la liste des
  // admins du serveur.
  const dash = lire("components/admin/AdminDashboard.tsx");
  assert.ok(dash.includes("res.status === 401"), "le refus d'admin n'est plus distingue");
  assert.ok(
    dash.includes("administrateur"),
    "le refus d'admin ne nomme plus ce qu'il faut regarder",
  );
});
