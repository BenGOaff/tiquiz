// tests/logic/vies.test.mts
//
// LE NUMÉRO DE TVA EXISTE-T-IL VRAIMENT ? (Béné, 27 août 2026)
//
// "Les numéros de TVA sont validés sur leur FORME, jamais auprès de
// VIES. Un numéro bien formé mais inexistant produit une autoliquidation
// injustifiée, donc de la TVA à ta charge. On peut corriger ça ?"
//
// L'enjeu est chiffrable : sur une vente à 290 € en autoliquidation
// injustifiée, ce sont 48 € qu'elle paie de sa poche, découverts au
// contrôle, des années plus tard, avec des pénalités.
//
// CE QUE CE TEST PROTÈGE AVANT TOUT : le troisième cas. VIES interroge
// les administrations de chaque État en direct, il est lent et il tombe
// souvent. Traiter son silence comme un refus ferait facturer 21 % de
// TVA belge à une entreprise qui a parfaitement droit à
// l'autoliquidation, parce qu'un serveur de la Commission redémarrait.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decouperNumeroTva,
  interrogerVies,
  lireIdentiteVies,
  lireReponseVies,
} from "@/lib/facture/vies";
import { resoudreTva } from "@/lib/facture/tva";

// ── LIRE LA RÉPONSE ──────────────────────────────────────────────────

test("VIES dit valide, ou invalide, et on le croit", () => {
  assert.equal(lireReponseVies({ valid: true }), "valide");
  assert.equal(lireReponseVies({ valid: false }), "invalide");
});

test("tout ce qu'on ne comprend pas vaut `injoignable`, JAMAIS `invalide`", () => {
  // C'est la règle centrale : un silence n'est pas un refus.
  assert.equal(lireReponseVies(null), "injoignable");
  assert.equal(lireReponseVies({}), "injoignable");
  assert.equal(lireReponseVies("bonjour"), "injoignable");
  assert.equal(lireReponseVies({ valid: "oui" }), "injoignable");
  assert.equal(lireReponseVies({ userError: "MS_UNAVAILABLE", valid: false }), "injoignable");
  assert.equal(lireReponseVies({ userError: "SERVICE_UNAVAILABLE" }), "injoignable");
});

test("un État en panne ne fait pas passer un numéro valide pour faux", () => {
  // `valid: false` accompagné d'une erreur de service veut dire "je n'ai
  // pas pu demander", pas "ce numéro n'existe pas".
  assert.equal(lireReponseVies({ userError: "TIMEOUT", valid: false }), "injoignable");
});

// ── L'IDENTITÉ, QUAND L'ÉTAT LA PUBLIE ───────────────────────────────

test("le nom et l'adresse remplissent le formulaire", () => {
  const v = lireIdentiteVies({ name: "ACME SPRL", address: "Rue Neuve 12\n1000 Bruxelles" });
  assert.equal(v.nom, "ACME SPRL");
  assert.equal(v.adresse, "Rue Neuve 12\n1000 Bruxelles");
});

test("les États qui ne publient rien ne remplissent rien", () => {
  // L'Allemagne et l'Espagne répondent "valide" sans identité, ou avec
  // des tirets. Le formulaire doit marcher pareil, sinon un client
  // allemand voit un écran cassé au moment de payer.
  assert.deepEqual(lireIdentiteVies({ name: "---", address: "---" }), { nom: null, adresse: null });
  assert.deepEqual(lireIdentiteVies({ name: "", address: "   " }), { nom: null, adresse: null });
  assert.deepEqual(lireIdentiteVies({}), { nom: null, adresse: null });
});

// ── LE DÉCOUPAGE DU NUMÉRO ───────────────────────────────────────────

test("le numéro se découpe en pays et en identifiant", () => {
  assert.deepEqual(decouperNumeroTva("BE0123456789"), { pays: "BE", numero: "0123456789" });
  assert.deepEqual(decouperNumeroTva("be 0123.456.789"), { pays: "BE", numero: "0123456789" });
});

test("on ne dérange pas la Commission pour une saisie vide", () => {
  assert.equal(decouperNumeroTva(""), null);
  assert.equal(decouperNumeroTva("BE"), null);
  assert.equal(decouperNumeroTva(null), null);
});

// ── L'APPEL RÉSEAU, SANS RÉSEAU ──────────────────────────────────────

const repond = (charge: unknown, ok = true): typeof fetch =>
  (async () => ({ ok, json: async () => charge })) as unknown as typeof fetch;

test("un numéro valide rend son identité", async () => {
  const r = await interrogerVies("BE0123456789", repond({ valid: true, name: "ACME", address: "Rue Neuve 12" }));
  assert.equal(r.verdict, "valide");
  assert.equal(r.identite.nom, "ACME");
});

test("un numéro refusé ne rend AUCUNE identité", async () => {
  // Celle qui accompagne un refus ne désigne personne.
  const r = await interrogerVies("BE0123456789", repond({ valid: false, name: "ACME" }));
  assert.equal(r.verdict, "invalide");
  assert.equal(r.identite.nom, null);
});

test("le réseau qui tombe ne lève jamais", async () => {
  const casse = (async () => {
    throw new Error("réseau coupé");
  }) as unknown as typeof fetch;
  const r = await interrogerVies("BE0123456789", casse);
  assert.equal(r.verdict, "injoignable");
});

// ── CE QUE LA FACTURE EN FAIT ────────────────────────────────────────

const BELGE = { pays: "BE", numeroTva: "BE0123456789" };

test("VIES valide : autoliquidation, et plus rien à vérifier à la main", () => {
  const d = resoudreTva({ ...BELGE, vies: "valide" });
  assert.equal(d.regime, "autoliquidation");
  assert.equal(d.tauxBp, 0);
  assert.ok(!d.aCompleter.includes("tva-a-valider-vies"));
});

test("VIES invalide : PAS d'autoliquidation, et la raison est écrite", () => {
  // C'est le cas qui lui coûtait de l'argent. Facturer la TVA est
  // réparable par une facture rectificative ; l'oublier ne l'est pas.
  const d = resoudreTva({ ...BELGE, vies: "invalide" });
  assert.equal(d.regime, "oss");
  assert.ok(d.tauxBp > 0);
  assert.ok(d.aCompleter.includes("tva-numero-refuse-vies"));
});

test("VIES injoignable : on garde le comportement d'avant, en le DISANT", () => {
  // Une facture qui attendrait la Commission européenne serait pire que
  // le doute. Règle du 7 août : on émet toujours, on marque ce qui reste
  // à vérifier.
  for (const v of ["injoignable", "non-verifie"] as const) {
    const d = resoudreTva({ ...BELGE, vies: v });
    assert.equal(d.regime, "autoliquidation");
    assert.ok(d.aCompleter.includes("tva-a-valider-vies"), v);
  }
});

test("le piège du client pro FRANÇAIS tient toujours", () => {
  // L'autoliquidation n'existe pas entre deux entreprises du même pays.
  // Se tromper là, c'est facturer 0 % a tous les clients pros français.
  const d = resoudreTva({ pays: "FR", numeroTva: "FR12345678901", vies: "valide" });
  assert.equal(d.regime, "france");
  assert.equal(d.tauxBp, 2000);
});
