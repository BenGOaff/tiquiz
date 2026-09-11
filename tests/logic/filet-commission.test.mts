// tests/logic/filet-commission.test.mts
//
// "EST-CE QUE JE PEUX ENVOYER MES AFFILIÉS DESSUS SANS RISQUE ?"
// (Béné, 11 septembre 2026)
//
// Le trou le plus cher de l'audit : quand Tipote ne répondait pas, la
// commission d'une vente encaissée chez nous était journalisée puis
// OUBLIÉE. Le webhook répondait 200, donc aucun réessai ne repassait, et
// aucun écran ne le disait. Ces tests tiennent le filet qui la garde :
//
//   - ce qu'un échec veut dire, et lequel se rejoue tel quel ;
//   - quand on rejoue, et quand on arrête ;
//   - que l'attribution ET l'annulation passent par le filet ;
//   - que le rejeu part après chaque webhook, sans cron ;
//   - que le webhook et le rejeu frappent la MÊME porte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  MAX_TENTATIVES,
  REJEU_APRES_MS,
  alerterALaMiseEnAttente,
  classerEchec,
  cleEnAttente,
  doitRejouer,
  type LigneEnAttente,
} from "../../lib/affiliate/filetCommission.ts";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const MAINTENANT = new Date("2026-09-11T12:00:00Z");

function ligne(extra: Partial<LigneEnAttente>): LigneEnAttente {
  return {
    cle: "attribuer:stripe:in_1",
    action: "attribuer",
    corps: {},
    tentatives: 1,
    rejouable: true,
    derniere_tentative: "2026-09-11T11:00:00Z",
    envoye_le: null,
    ...extra,
  };
}

test("un échec RÉSEAU se rejoue tel quel", () => {
  assert.deepEqual(classerEchec(null), { rejouable: true, motif: "reseau" });
});

test("un corps REFUSÉ (400) ne se rejoue pas : le même corps échouera pareil", () => {
  const c = classerEchec(400);
  assert.equal(c.rejouable, false);
  assert.equal(c.motif, "corps_refuse");
});

test("un secret refusé (401/403) se rejoue : ça se corrige dans un .env, pas dans le corps", () => {
  assert.equal(classerEchec(401).rejouable, true);
  assert.equal(classerEchec(403).rejouable, true);
});

test("Tipote indisponible (5xx, 409, 429, 404) se rejoue", () => {
  for (const s of [500, 502, 503, 504, 409, 429, 404]) assert.equal(classerEchec(s).rejouable, true, String(s));
});

test("une ligne déjà envoyée ne se rejoue jamais", () => {
  assert.equal(doitRejouer(ligne({ envoye_le: "2026-09-11T11:30:00Z" }), MAINTENANT), false);
});

test("une ligne non rejouable attend un humain", () => {
  assert.equal(doitRejouer(ligne({ rejouable: false }), MAINTENANT), false);
});

test("on n'insiste pas avant dix minutes, et on rejoue après", () => {
  assert.equal(doitRejouer(ligne({ derniere_tentative: "2026-09-11T11:55:00Z" }), MAINTENANT), false);
  assert.equal(doitRejouer(ligne({ derniere_tentative: "2026-09-11T11:50:00Z" }), MAINTENANT), true);
  assert.equal(REJEU_APRES_MS, 10 * 60 * 1000);
});

test("une date illisible compte comme ancienne : on rejoue plutôt que de perdre", () => {
  assert.equal(doitRejouer(ligne({ derniere_tentative: "n'importe quoi" }), MAINTENANT), true);
});

test("au delà du maximum on s'arrête, et le maximum couvre plus de trois jours de panne", () => {
  assert.equal(doitRejouer(ligne({ tentatives: MAX_TENTATIVES }), MAINTENANT), false);
  assert.equal(doitRejouer(ligne({ tentatives: MAX_TENTATIVES - 1 }), MAINTENANT), true);
  assert.ok((MAX_TENTATIVES * REJEU_APRES_MS) / (24 * 3600 * 1000) > 3);
});

test("une attribution et son annulation sont DEUX lignes", () => {
  assert.notEqual(cleEnAttente("attribuer", "stripe:in_1"), cleEnAttente("annuler", "stripe:in_1"));
});

test("l'alerte ne part qu'à la première mise en attente", () => {
  assert.equal(alerterALaMiseEnAttente(1), true);
  assert.equal(alerterALaMiseEnAttente(2), false);
  assert.equal(alerterALaMiseEnAttente(37), false);
});

// ── LA SOURCE : le filet est BRANCHÉ ─────────────────────────────────

const OWNER = sansCommentaires(readFileSync("lib/affiliate/ownerSale.ts", "utf8"));
const STORE = sansCommentaires(readFileSync("lib/affiliate/filetCommissionStore.ts", "utf8"));

function corps(nomFonction: string): string {
  const debut = OWNER.indexOf(`export async function ${nomFonction}(`);
  assert.ok(debut >= 0, nomFonction);
  const suite = OWNER.indexOf("\nexport ", debut + 1);
  return OWNER.slice(debut, suite === -1 ? undefined : suite);
}

test("l'ATTRIBUTION met en attente sur un échec, et libère sur un succès", () => {
  const c = corps("commissionnerVente");
  assert.match(c, /if \(!reponse\.ok\)[\s\S]*?mettreEnAttente\(\{ action: "attribuer"/);
  assert.match(c, /marquerEnvoyee\("attribuer"/);
});

test("l'ANNULATION passe par le MÊME filet : sinon la commission mûrit et part au lot", () => {
  const c = corps("annulerCommissionVente");
  assert.match(c, /if \(!reponse\.ok\)[\s\S]*?mettreEnAttente\(\{ action: "annuler"/);
  assert.match(c, /marquerEnvoyee\("annuler"/);
});

test("le webhook et le rejeu frappent la MÊME porte", () => {
  // Une deuxième construction d'adresse ou de secret finirait par
  // diverger, et un rejeu qui frappe une autre porte ne rattrape rien.
  assert.ok(!/\bfetch\(/.test(OWNER), "ownerSale ne fait plus son propre fetch");
  assert.match(OWNER, /from "\.\/posterTipote"/);
  assert.match(STORE, /from "\.\/posterTipote"/);
  assert.match(STORE, /posterVersTipote\(ligne\.action, ligne\.corps\)/);
});

test("le rejeu DÉCIDE avec le module pur", () => {
  assert.match(STORE, /doitRejouer\(l, maintenant\)/);
  assert.match(STORE, /classerEchec\(/);
});

test("le rejeu part APRÈS chaque webhook de paiement, sans attendre un cron", () => {
  for (const f of ["app/api/commande/webhook/route.ts", "app/api/commande/paypal/webhook/route.ts"]) {
    const src = sansCommentaires(readFileSync(f, "utf8"));
    assert.match(src, /after\(async \(\) => \{[\s\S]*?rejouerCommissionsEnAttente\(/, f);
    assert.match(src, /import \{ after, NextRequest, NextResponse \} from "next\/server"/, f);
  }
});

test("le cron de rejeu existe, il exige le secret, et il compare en temps constant", () => {
  const src = sansCommentaires(readFileSync("app/api/cron/rejouer-commissions/route.ts", "utf8"));
  assert.match(src, /x-cron-secret/);
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /rejouerCommissionsEnAttente\(/);
  assert.match(src, /lisible/, "il distingue « je n'ai pas pu lire » de « il n'y avait rien »");
});

test("la migration porte la table, l'action bornée et la date d'envoi", () => {
  const p = "supabase/migrations/20260911_commissions_en_attente.sql";
  assert.ok(existsSync(p));
  const sql = readFileSync(p, "utf8");
  assert.match(sql, /create table if not exists public\.commissions_en_attente/);
  assert.match(sql, /check \(action in \('attribuer', 'annuler'\)\)/);
  assert.match(sql, /envoye_le timestamptz/);
  assert.match(sql, /notify pgrst, 'reload schema'/);
});

test("le filet ne fait JAMAIS échouer le webhook qu'il protège", () => {
  // Chaque fonction du store est enveloppée : une table absente (la
  // migration pas encore passée) coûte le filet, jamais l'accès.
  for (const fn of ["mettreEnAttente", "marquerEnvoyee", "rejouerCommissionsEnAttente"]) {
    const debut = STORE.indexOf(`export async function ${fn}(`);
    assert.ok(debut >= 0, fn);
    const suite = STORE.indexOf("\nexport ", debut + 1);
    const c = STORE.slice(debut, suite === -1 ? undefined : suite);
    assert.match(c, /try \{/, fn);
    assert.match(c, /catch/, fn);
  }
});

test("les deux sorties muettes de l'audit disent maintenant ce qu'elles perdent", () => {
  const stripe = sansCommentaires(readFileSync("app/api/commande/webhook/route.ts", "utf8"));
  const debut = stripe.indexOf("async function commissionnerEcheance(");
  const c = stripe.slice(debut);
  assert.match(c, /if \(!email\) \{[\s\S]*?console\.error\([\s\S]*?commission NON creee[\s\S]*?return;/);
  const paypal = sansCommentaires(readFileSync("app/api/commande/paypal/webhook/route.ts", "utf8"));
  assert.match(paypal, /const produit = findOwnerProduct\(abo\.productId\);[\s\S]*?\} else \{[\s\S]*?console\.error\([\s\S]*?produit inconnu/);
});
