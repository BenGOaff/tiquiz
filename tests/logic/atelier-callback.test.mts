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

import { ATELIER_BASE_URL, atelierConnectCallback } from "../../lib/partner/atelierUrl.ts";

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
