// tests/logic/limite-ip.test.mts
//
// LE COMPTEUR QUI SE DÉSARMAIT TOUT SEUL.
//
// L'audit du 24 août l'avait trouvé côté Tipote : `compteur.clear()`
// dès que la table dépassait sa taille, donc le compteur de TOUT LE
// MONDE remis à zéro. Un garde-fou qu'on peut désarmer en le
// remplissant n'en est pas un.
//
// Il a été corrigé là-bas et PAS ici : le 30 août, la route du support
// de ce dépôt portait encore le `clear()`. Un garde-fou qui ne protège
// qu'un des deux jumeaux ne protège personne.

import { test } from "node:test";
import assert from "node:assert/strict";

import { creerLimiteur, ipDeLaRequete } from "../../lib/rateLimit/parIp.ts";

const HEURE = 3_600_000;

test("la limite coupe au dela du maximum", () => {
  const l = creerLimiteur({ max: 3, fenetreMs: HEURE });
  const t = 1_000_000;
  assert.equal(l.trop("1.2.3.4", t), false);
  assert.equal(l.trop("1.2.3.4", t), false);
  assert.equal(l.trop("1.2.3.4", t), false);
  assert.equal(l.trop("1.2.3.4", t), true, "le 4e appel devait etre refuse");
});

test("la fenetre se rouvre quand elle a expire", () => {
  const l = creerLimiteur({ max: 1, fenetreMs: HEURE });
  const t = 1_000_000;
  assert.equal(l.trop("1.2.3.4", t), false);
  assert.equal(l.trop("1.2.3.4", t), true);
  assert.equal(l.trop("1.2.3.4", t + HEURE + 1), false, "une heure plus tard, la porte rouvre");
});

test("une adresse ne consomme pas le quota d'une autre", () => {
  const l = creerLimiteur({ max: 1, fenetreMs: HEURE });
  const t = 1_000_000;
  assert.equal(l.trop("1.1.1.1", t), false);
  assert.equal(l.trop("2.2.2.2", t), false, "deux visiteurs partagent le meme seau");
});

test("REMPLIR LA TABLE NE DESARME PAS LA LIMITE", () => {
  // C'est le bug qu'on ferme. Avant, il suffisait d'envoyer 5000
  // requetes depuis des adresses differentes pour effacer le compteur
  // de tout le monde, y compris celui qui martelait la route.
  const l = creerLimiteur({ max: 2, fenetreMs: HEURE, tailleMax: 10 });
  const t = 1_000_000;
  l.trop("mechant", t);
  l.trop("mechant", t);
  assert.equal(l.trop("mechant", t), true, "il devait deja etre bloque");

  // On inonde depuis 200 adresses differentes, toutes dans la fenetre.
  for (let i = 0; i < 200; i++) l.trop(`ip-${i}`, t);

  assert.equal(
    l.trop("mechant", t),
    true,
    "le compteur du mechant a ete efface en remplissant la table",
  );
  assert.ok(l.taille() <= 11, "le menage ne borne plus la table : " + l.taille());
});

test("le menage retire d'abord ce qui a EXPIRE", () => {
  const l = creerLimiteur({ max: 5, fenetreMs: HEURE, tailleMax: 3 });
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) l.trop(`vieux-${i}`, t);
  // Bien plus tard : les anciennes fenetres sont mortes.
  const plusTard = t + HEURE * 2;
  l.trop("recent", plusTard);
  assert.ok(l.taille() <= 4, "les fenetres expirees n'ont pas ete purgees : " + l.taille());
});

test("une adresse illisible tombe dans un seau, jamais dans le vide", () => {
  const l = creerLimiteur({ max: 1, fenetreMs: HEURE });
  const t = 1_000_000;
  assert.equal(l.trop("", t), false);
  assert.equal(l.trop("   ", t), true, "une adresse vide doit compter comme une seule et meme");
});

test("l'adresse reelle est lue derriere Cloudflare puis Caddy", () => {
  const cf = new Headers({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
  assert.equal(ipDeLaRequete(cf), "9.9.9.9");
  // Sans Cloudflare : la PREMIERE valeur est le client, les suivantes
  // sont les relais.
  const xff = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
  assert.equal(ipDeLaRequete(xff), "1.1.1.1");
  assert.equal(ipDeLaRequete(new Headers()), "inconnue");
});
