// tests/logic/mois-offert.test.mts
//
// UN MOIS OFFERT, UNE SEULE FOIS, ET JAMAIS À UN TRICHEUR.
//
// Béné, 23 août 2026 : "ils ne peuvent pas cumuler mois offert par
// l'affilié PLUS mois offert EN TANT qu'affilié : au total c'est un mois
// offert, point barre. Il faut aussi tracker les tricheurs qui veulent
// s'autoaffilier : même adresse email, même adresse IP etc."
//
// Deux portes mènent à un mois offert (l'inscription par un lien
// d'affiliée, et l'octroi app-à-app). Si chacune décidait de son côté,
// le "point barre" ne tiendrait pas : on prendrait un mois par chaque
// porte. C'est pour ça que la règle vit dans UNE fonction.

import assert from "node:assert/strict";
import test from "node:test";

import {
  memeBoite,
  normaliserEmail,
  verdictMoisOffert,
} from "../../lib/trial/moisOffert.ts";

// ── LES ADRESSES QUI VONT DANS LA MÊME BOÎTE ──

test("le + et les points de Gmail vont dans la meme boite", () => {
  // C'est LE moyen le plus simple de s'auto-affilier, et comparer les
  // adresses brutes ne le voit pas.
  assert.equal(normaliserEmail("bene+tiquiz@gmail.com"), "bene@gmail.com");
  assert.equal(normaliserEmail("b.e.n.e@gmail.com"), "bene@gmail.com");
  assert.equal(normaliserEmail("Bene@GoogleMail.com"), "bene@googlemail.com");
  assert.ok(memeBoite("bene+1@gmail.com", "b.e.ne@gmail.com"));
});

test("ailleurs qu'a Gmail, un point separe deux personnes", () => {
  // `jean.dupont@` et `jeandupont@` peuvent etre deux salaries de la
  // meme boite. Retirer les points partout accuserait un innocent.
  assert.equal(normaliserEmail("jean.dupont@tipote.fr"), "jean.dupont@tipote.fr");
  assert.ok(!memeBoite("jean.dupont@tipote.fr", "jeandupont@tipote.fr"));
  // Le `+` en revanche est une convention generale.
  assert.equal(normaliserEmail("jean+test@tipote.fr"), "jean@tipote.fr");
});

test("une adresse vide ne rend jamais deux personnes identiques", () => {
  assert.ok(!memeBoite("", ""));
  assert.ok(!memeBoite(null, undefined));
  assert.ok(!memeBoite("a@b.fr", ""));
});

// ── LE NON-CUMUL, LA REGLE PRINCIPALE ──

test("un seul mois offert par personne, point barre", () => {
  const r = verdictMoisOffert({
    email: "cliente@tipote.fr",
    dejaRecuLe: "2026-08-01T10:00:00Z",
    emailAffiliee: "fabienne@tipote.fr",
    affilieeActive: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.motif, "deja_recu");
});

test("le mois offert ne se pose pas sur un palier superieur", () => {
  // Ce n'est pas un refus, c'est un cadeau sans objet : poser un essai
  // sur un compte Plus lui RETIRERAIT son palier a l'expiration.
  for (const plan of ["monthly_plus", "yearly_plus", "lifetime", "beta"]) {
    const r = verdictMoisOffert({ email: "a@b.fr", planActuel: plan });
    assert.equal(r.ok, false, `${plan} devrait etre sans objet`);
    assert.equal(r.ok === false && r.motif, "deja_premium");
  }
  // Un compte gratuit ou mensuel, lui, y a droit.
  assert.equal(verdictMoisOffert({ email: "a@b.fr", planActuel: "free" }).ok, true);
  assert.equal(verdictMoisOffert({ email: "a@b.fr", planActuel: "monthly" }).ok, true);
  assert.equal(verdictMoisOffert({ email: "a@b.fr", planActuel: null }).ok, true);
});

// ── LES TRICHEURS ──

test("s'inscrire par son PROPRE lien ne donne rien", () => {
  const r = verdictMoisOffert({
    email: "fabienne@tipote.fr",
    emailAffiliee: "fabienne@tipote.fr",
    affilieeActive: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.motif, "auto_affiliation");
});

test("et l'alias Gmail ne suffit pas a passer", () => {
  // Le cas exact que Bene a nomme : "meme adresse email".
  const r = verdictMoisOffert({
    email: "fabienne+tiquiz@gmail.com",
    emailAffiliee: "fabienne@gmail.com",
    affilieeActive: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.motif, "auto_affiliation");
});

test("un lien d'affiliee inconnue ou suspendue n'offre rien", () => {
  // Un identifiant invente ne doit pas pouvoir distribuer des mois.
  const r = verdictMoisOffert({
    email: "a@b.fr",
    emailAffiliee: null,
    affilieeActive: false,
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.motif, "affiliee_inconnue");
});

test("la meme IP ACCORDE et SIGNALE, elle ne bloque pas", () => {
  // Bene a demande de TRACKER les tricheurs, pas de fermer la porte au
  // nez d'un client honnete. Bloquer sur une IP partagee mettrait dehors
  // un couple, deux collegues, une salle de formation.
  const r = verdictMoisOffert({
    email: "nouvelle@tipote.fr",
    emailAffiliee: "fabienne@tipote.fr",
    affilieeActive: true,
    ipHash: "abc123",
    ipsDejaVues: ["zzz", "abc123"],
  });
  assert.equal(r.ok, true);
  assert.equal(r.ok === true && r.aVerifier, true);
  assert.equal(r.ok === true && r.aVerifier === true && r.motif, "meme_ip");
});

test("une IP jamais vue passe sans rien signaler", () => {
  const r = verdictMoisOffert({
    email: "nouvelle@tipote.fr",
    emailAffiliee: "fabienne@tipote.fr",
    affilieeActive: true,
    ipHash: "neuve",
    ipsDejaVues: ["abc123"],
  });
  assert.equal(r.ok, true);
  assert.equal(r.ok === true && r.aVerifier, false);
});

test("le refus CERTAIN passe avant le simple soupcon", () => {
  // Auto-affiliation ET meme IP : c'est un refus, pas un signalement.
  const r = verdictMoisOffert({
    email: "fabienne@tipote.fr",
    emailAffiliee: "fabienne@tipote.fr",
    affilieeActive: true,
    ipHash: "abc",
    ipsDejaVues: ["abc"],
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.motif, "auto_affiliation");
});

test("sans lien d'affiliation, une inscription normale reste eligible", () => {
  // Le mois offert EN TANT QU'AFFILIEE passe par la meme fonction, sans
  // `emailAffiliee`. Elle ne doit pas etre refusee pour autant.
  const r = verdictMoisOffert({ email: "fabienne@tipote.fr", planActuel: "free" });
  assert.equal(r.ok, true);
});
