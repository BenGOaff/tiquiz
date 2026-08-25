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
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  memeBoite,
  normaliserEmail,
  verdictMoisOffert,
} from "../../lib/trial/moisOffert.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── LES ADRESSES QUI VONT DANS LA MÊME BOÎTE ──

test("le + et les points de Gmail vont dans la meme boite", () => {
  // C'est LE moyen le plus simple de s'auto-affilier, et comparer les
  // adresses brutes ne le voit pas.
  assert.equal(normaliserEmail("bene+tiquiz@gmail.com"), "bene@gmail.com");
  assert.equal(normaliserEmail("b.e.n.e@gmail.com"), "bene@gmail.com");
  // `googlemail.com` EST `gmail.com` : Google livre les deux dans la
  // meme boite. On les gardait distincts jusqu'au 26 aout, ce qui
  // laissait passer l'alias le plus simple qui soit, celui qui ne
  // demande meme pas de `+`.
  assert.equal(normaliserEmail("Bene@GoogleMail.com"), "bene@gmail.com");
  assert.ok(memeBoite("bene@gmail.com", "b.e.n.e@googlemail.com"));
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



// ── LE CUMUL AVEC L'ATELIER (Bene, 23 aout) ──
//
// "qui peut se cumuler par contre avec les 15 jours offerts de
// l'atelier, ne te melanger pas les pinceaux."









// ── L'ESSAI EST POSÉ SUR L'ABONNEMENT CHOISI (précision Béné, 23 août) ──
//
// "Si l'user a un test tiquiz plus activé 15j il le garde mais on lui
// ajoute 30 jours de l'abonnement qu'il choisit : s'il prend mensuel il
// a 30j gratos à mensuel. S'il prend mensuel plus : il a 30j gratos à
// mensuel plus."

test("le mois offert passe par l'essai gratuit du fournisseur", () => {
  // Stripe : `trial_period_days`. C'est ce qui fait que le client paie
  // le prix de SON palier apres 30 jours, et pas un palier prete qu'on
  // lui retirerait.
  const stripe = lire("lib/checkout/stripeCheckout.ts");
  assert.ok(
    stripe.includes("subscription_data[trial_period_days]"),
    "l'essai Stripe a disparu : le mois offert ne serait plus offert",
  );
  // PayPal : un cycle de facturation TRIAL a 0, joue une seule fois.
  const paypal = lire("lib/checkout/paypalOwner.ts");
  assert.ok(paypal.includes('tenure_type: "TRIAL"'), "l'essai PayPal a disparu");
  // PayPal REFUSE un plan dont les sequences ne se suivent pas. Le cycle
  // payant est donc en 2 des que quelque chose le precede, et en 1
  // sinon. Depuis le 25 aout, deux choses peuvent le preceder : l'essai
  // gratuit, et la premiere echeance remisee d'un code d'affilie. Les
  // deux ne se cumulent jamais (arbitre dans codeReduction.ts), donc il
  // n'y a jamais plus d'un cycle avant celui la.
  assert.ok(
    /sequence: essaiJours > 0 \|\| remiseActive \? 2 : 1/.test(paypal),
    "les sequences PayPal ne se suivent plus : le plan serait refuse",
  );
});

test("on ne touche PAS au palier de la personne", () => {
  // Ses 15 jours d'Atelier vivent dans `affiliate_trial_*` et doivent
  // continuer de tourner. Le premier jet posait un `monthly_plus`
  // prete et devait additionner des jours dans les memes colonnes :
  // c'etait une complication nee d'une mauvaise lecture.
  const src = lire("lib/trial/moisOffertCheckout.ts");
  assert.ok(
    !/affiliate_trial_(pre_plan|pending_days|expires_at)/.test(src),
    "le mois offert touche de nouveau aux colonnes d'essai de l'Atelier",
  );
  assert.ok(!/\bplan:\s/.test(src), "le mois offert reecrit de nouveau le palier");
});

test("le cadeau se consomme a l'ACHAT, pas au bon de commande", () => {
  // Un checkout abandonne ne doit pas bruler le mois de quelqu'un qui
  // n'a rien achete.
  for (const route of [
    "app/api/commande/webhook/route.ts",
    "app/api/commande/paypal/webhook/route.ts",
  ]) {
    assert.ok(
      lire(route).includes("marquerMoisOffertConsomme"),
      `${route} ne marque plus le mois offert comme consomme`,
    );
  }
  for (const route of ["app/api/commande/session/route.ts", "app/api/commande/paypal/route.ts"]) {
    assert.ok(
      !lire(route).includes("marquerMoisOffertConsomme"),
      `${route} consomme le cadeau avant l'achat`,
    );
  }
});

test("le fait est ECRIT, jamais deduit d'un sa present", () => {
  // Un `sa` peut etre la sans qu'aucun essai n'ait ete ouvert (deja eu
  // son mois, auto-affiliation refusee). Deduire marquerait des cadeaux
  // jamais faits, et priverait ces gens du leur.
  assert.ok(
    lire("lib/checkout/stripeCheckout.ts").includes(
      "subscription_data[metadata][free_month_days]",
    ),
    "Stripe ne transporte plus le fait",
  );
  const webhook = lire("app/api/commande/webhook/route.ts");
  assert.ok(
    /vente\.freeMonthDays > 0/.test(webhook),
    "le webhook devine de nouveau au lieu de lire",
  );
});
