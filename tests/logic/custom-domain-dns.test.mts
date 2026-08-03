// tests/logic/custom-domain-dns.test.mts
//
// Béné, 3 août 2026 : "j'essaye d'ajouter un domaine à Tiquiz via
// Cloudflare et ça marche pas alors que c'est propagé."
//
// Elle avait raison. Son CNAME `monquiz.tipote.com ->
// connect.tipote.com` était en place, confirmé par DNSChecker depuis
// une dizaine de résolveurs dans le monde. Tiquiz refusait quand même,
// parce qu'il vérifiait une IP alors qu'il avait demandé un CNAME.
//
// Ce fichier fige la règle : on accepte ce qu'on a DEMANDÉ.

import { test } from "node:test";
import assert from "node:assert/strict";

import { isOurCnameTarget } from "../../lib/customDomains.ts";

test("le CNAME exact que l'écran demande est accepté", () => {
  assert.equal(isOurCnameTarget("connect.tipote.com"), true);
});

test("le point final du DNS ne fait pas échouer la comparaison", () => {
  // Un resolveur rend souvent le FQDN absolu, avec le point de la
  // racine. Une comparaison naive le refuserait : c'est le genre de
  // detail qui bloque une cliente une journee entiere.
  assert.equal(isOurCnameTarget("connect.tipote.com."), true);
});

test("la casse et les espaces ne comptent pas", () => {
  assert.equal(isOurCnameTarget("  Connect.Tipote.COM  "), true);
});

test("un sous-domaine de notre cible est accepté", () => {
  // Si un jour la cible devient regionale (eu.connect.tipote.com), les
  // domaines deja poses continuent de passer.
  assert.equal(isOurCnameTarget("eu.connect.tipote.com"), true);
});

test("un hôte qui n'est pas le nôtre est refusé", () => {
  assert.equal(isOurCnameTarget("connect.autre-service.com"), false);
  assert.equal(isOurCnameTarget("quiz.tipote.com"), false);
});

test("un domaine qui se TERMINE par notre nom sans en être un sous-domaine est refusé", () => {
  // Le piege classique du `endsWith` : "meconnect.tipote.com" et
  // "notconnect.tipote.com" ne sont PAS a nous. Sans le point dans la
  // comparaison, n'importe qui pourrait deposer un domaine chez nous.
  assert.equal(isOurCnameTarget("meconnect.tipote.com"), false);
  assert.equal(isOurCnameTarget("xconnect.tipote.com"), false);
});

test("une valeur vide ou absente ne vaut jamais preuve", () => {
  assert.equal(isOurCnameTarget(null), false);
  assert.equal(isOurCnameTarget(undefined), false);
  assert.equal(isOurCnameTarget(""), false);
  assert.equal(isOurCnameTarget("   "), false);
});

test("une cible vide ne valide rien non plus", () => {
  // Garde-fou de configuration : si la variable d'environnement de la
  // cible etait vide, on n'accepterait pas TOUT le monde.
  assert.equal(isOurCnameTarget("connect.tipote.com", ""), false);
});
