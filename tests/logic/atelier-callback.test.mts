// tests/logic/atelier-callback.test.mts
//
// Béné, 3 août 2026 : "j'ai voulu rebasculer de Tipote à Tiquiz sur
// l'Atelier et ça a foiré. J'ai bien la demande d'autorisation de
// connexion mais derrière je tombe sur la page d'erreur."
//
// Le consentement marchait. C'est le RETOUR qui tombait dans le vide :
// Tiquiz renvoyait vers `formaquiz.tipote.com`, hostname mort depuis le
// rebrand du 18 juin (vérifié : 404, quand `quizing.tipote.com` répond).
//
// C'était la deuxième moitié d'un drame déjà à moitié corrigé : l'ALLER
// avait été réparé côté Atelier, le RETOUR portait toujours l'adresse
// périmée, dans l'autre repo. Ce test ferme la porte des deux côtés.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ATELIER_BASE_URL, ATELIER_NAME, atelierConnectCallback } from "../../lib/partner/atelierUrl.ts";

const DEAD_HOST = "formaquiz.tipote.com";

test("le domaine de l'Atelier n'est jamais l'ancien hostname", () => {
  assert.ok(!ATELIER_BASE_URL.includes(DEAD_HOST), `${DEAD_HOST} répond 404 depuis le 18 juin 2026`);
  assert.equal(ATELIER_BASE_URL, "https://quizing.tipote.com");
});

test("le retour du consentement pointe sur le domaine vivant", () => {
  delete process.env.FORMAQUIZ_CONNECT_CALLBACK;
  const cb = atelierConnectCallback();
  assert.ok(!cb.includes(DEAD_HOST), "le retour renvoie vers un domaine mort : " + cb);
  assert.equal(cb, "https://quizing.tipote.com/api/integrations/tiquiz/callback");
});

test("une surcharge d'environnement valide est respectée", () => {
  // Elle permet de corriger la prod sans redéploiement.
  process.env.FORMAQUIZ_CONNECT_CALLBACK = "https://exemple.test/retour";
  assert.equal(atelierConnectCallback(), "https://exemple.test/retour");
  delete process.env.FORMAQUIZ_CONNECT_CALLBACK;
});

test("une surcharge FAUSSE retombe sur le domaine canonique", () => {
  // Un `??` seul ne protège que de la variable ABSENTE, jamais de la
  // variable FAUSSE : c'est ce qui avait envoyé les liens de mot de passe
  // sur localhost (drame Véronique, 2 août).
  for (const bad of ["", "   ", "quizing.tipote.com", "http://quizing.tipote.com", "à venir"]) {
    process.env.FORMAQUIZ_CONNECT_CALLBACK = bad;
    assert.equal(
      atelierConnectCallback(),
      "https://quizing.tipote.com/api/integrations/tiquiz/callback",
      `la valeur ${JSON.stringify(bad)} aurait dû être ignorée`,
    );
  }
  delete process.env.FORMAQUIZ_CONNECT_CALLBACK;
});

test("le retour reste FIXE : il n'est jamais lu depuis la requête", () => {
  // Un redirect_uri fourni par l'appelant serait une redirection ouverte,
  // donc un moyen de détourner un code d'autorisation.
  assert.equal(atelierConnectCallback.length, 0, "la fonction ne doit prendre AUCUN paramètre");
});

// ── Le NOM du produit, celui que l'élève reconnaît ───────────────────
//
// Béné, 4 août 2026 : "la page de connexion demande de valider la
// connexion à Formaquiz ??? C'est l'Atelier du Quiz depuis des lustres !"
//
// Elle a raison, et le pire est l'endroit : l'écran de consentement est
// le SEUL où l'élève doit reconnaître à qui elle ouvre ses statistiques.
// Un nom qu'elle n'a jamais vu, à ce moment précis, ressemble à du
// hameçonnage. Le nom de code interne peut rester partout ailleurs
// (routes, variables d'environnement, colonne `partner`) : personne ne
// le voit.

test("le nom du produit est celui de la cliente", () => {
  assert.equal(ATELIER_NAME, "L'Atelier du Quiz");
  assert.ok(!/[—–]/.test(ATELIER_NAME));
});

test("l'ecran de consentement ne dit plus FormaQuiz", () => {
  const src = readFileSync(
    new URL("../../app/connect/formaquiz/ConsentClient.tsx", import.meta.url),
    "utf8",
  );
  // On retire les imports et les commentaires : seul compte ce que
  // l'élève lit à l'écran.
  const visible = src
    .replace(/^import .*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  assert.ok(
    !/formaquiz/i.test(visible),
    "l'ancien nom de code ne doit plus apparaître dans ce qui est rendu",
  );
  assert.ok(/ATELIER_NAME/.test(visible), "le nom doit venir de la constante, jamais réécrit");
});

test("le compte autorise est montre, et il est sortable", () => {
  // Jocelyne a passé six semaines reliée à un compte vide. L'email était
  // déjà là, en petit, dans le paragraphe qui rassure sur la
  // confidentialité : on ne lit pas une adresse quand on cherche à être
  // rassuré. Il lui faut aussi une porte de sortie, sinon la voir ne sert
  // à rien.
  const src = readFileSync(
    new URL("../../app/connect/formaquiz/ConsentClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /Tu connectes ce compte Tiquiz/);
  assert.match(src, /Tes quiz ne sont pas sur ce compte/);
});
