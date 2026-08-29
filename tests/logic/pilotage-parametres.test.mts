// tests/logic/pilotage-parametres.test.mts
//
// CE QUI FAIT TOURNER LES APP ET CIRCULER L'ARGENT.
//
// Deux choses à ne jamais casser ici. La première est évidente et
// pourtant elle a failli l'être trois fois dans ces dépôts : AUCUNE
// VALEUR SECRÈTE NE SORT. La seconde l'est moins : les combinaisons qui
// ont l'air complètes et qui ne peuvent pas marcher. Une variable
// absente se voit ; une clé Stripe secrète sans clé publiable ne se voit
// qu'à la première vente perdue.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NOM_GROUPE,
  REGLAGES,
  contradictions,
  estSecret,
  lireReglages,
  modePaypal,
  modeStripe,
} from "@/lib/pilotage/parametres";

test("AUCUNE VALEUR SECRETE NE SORT, jamais", () => {
  const env = {
    SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOi.SECRET.aaa",
    STRIPE_SECRET_KEY_OWNER: "sk_live_NEDOITPASSORTIR",
    PAYPAL_CLIENT_ID_OWNER: "AZERTY-NEDOITPASSORTIR",
    RESEND_API_KEY: "re_NEDOITPASSORTIR",
    SEPA_DEBTOR_IBAN: "FR7630006000011234567890189",
    NEXT_PUBLIC_APP_URL: "https://quiz.tipote.com",
  };
  const lus = lireReglages(env);
  const serialise = JSON.stringify(lus);
  for (const interdit of [
    "NEDOITPASSORTIR",
    "FR7630006000011234567890189",
    "eyJhbGciOi.SECRET.aaa",
  ]) {
    assert.ok(!serialise.includes(interdit), `${interdit} a fuite dans la reponse`);
  }
  // Et pourtant on sait qu'elles sont posees : c'est tout ce qu'on veut.
  assert.ok(lus.find((r) => r.nom === "STRIPE_SECRET_KEY_OWNER")?.pose);
  assert.equal(lus.find((r) => r.nom === "STRIPE_SECRET_KEY_OWNER")?.valeur, null);
});

test("une adresse, elle, reste lisible : c'est elle qui rend le diagnostic evident", () => {
  const lus = lireReglages({ NEXT_PUBLIC_APP_URL: "https://quiz.tipote.com" });
  assert.equal(
    lus.find((r) => r.nom === "NEXT_PUBLIC_APP_URL")?.valeur,
    "https://quiz.tipote.com",
  );
});

test("un IBAN est un secret, meme s'il ne s'appelle pas KEY", () => {
  assert.ok(estSecret("SEPA_DEBTOR_IBAN"));
  assert.ok(estSecret("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(estSecret("PAYPAL_CLIENT_ID_OWNER"));
  // Celui la reste visible : on le recopie depuis PayPal, et le voir est
  // exactement ce qui rend un diagnostic evident.
  assert.ok(!estSecret("PAYPAL_WEBHOOK_ID_OWNER"));
  assert.ok(!estSecret("NEXT_PUBLIC_APP_URL"));
});

test("le second nom accepte par le code compte comme posee", () => {
  // Un controle qui ne regarde pas au meme endroit que le code envoie
  // chercher au mauvais endroit (drame du 22 aout).
  const lus = lireReglages({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OWNER: "pk_live_xxx" });
  assert.ok(lus.find((r) => r.nom === "STRIPE_PUBLISHABLE_KEY_OWNER")?.pose);
});

test("chaque reglage dit CE QUI NE MARCHE PAS sans lui", () => {
  // "requise" n'a jamais aide personne a decider quoi faire.
  for (const r of REGLAGES) {
    assert.ok(r.sansElle.length > 20, r.nom);
    assert.ok(NOM_GROUPE[r.groupe], `${r.nom} est dans un groupe qui n'existe pas`);
  }
});

test("aucun reglage en double", () => {
  assert.equal(new Set(REGLAGES.map((r) => r.nom)).size, REGLAGES.length);
});

test("L'INVENTAIRE NE DIVERGE PAS DE check:prod", () => {
  // Les deux listes ne peuvent pas fusionner (le script lit les fichiers
  // .env et compare les depots voisins, ce qu'un serveur ne peut pas
  // faire). Mais une cle ajoutee la-bas et oubliee ici disparaitrait de
  // l'ecran sans que personne le remarque : c'est la mecanique des deux
  // listes qui divergent, quatre fois payee dans ce depot.
  const src = readFileSync(resolve(process.cwd(), "scripts/check-prod.mjs"), "utf8");
  const connus = new Set(REGLAGES.map((r) => r.nom));
  const manquants: string[] = [];
  for (const m of src.matchAll(/verifier\(\s*"([A-Z0-9_]+)"/g)) {
    if (!connus.has(m[1])) manquants.push(m[1]);
  }
  assert.deepEqual(manquants, [], `absentes de REGLAGES : ${manquants.join(", ")}`);
});

// ── LES MODES ────────────────────────────────────────────────────────

test("une cle RESTREINTE en reel est bien lue comme reelle", () => {
  // Ne tester que sk_live laissait passer un compte en conditions
  // reelles sans que le controle s'en apercoive.
  assert.equal(modeStripe("rk_live_abc"), "reel");
  assert.equal(modeStripe("sk_live_abc"), "reel");
  assert.equal(modeStripe("pk_live_abc"), "reel");
  assert.equal(modeStripe("sk_test_abc"), "test");
  assert.equal(modeStripe(""), "absent");
  assert.equal(modeStripe("n'importe quoi"), "illisible");
});

test("PAYPAL_ENV_OWNER ABSENTE vaut BAC A SABLE", () => {
  // Des identifiants reels envoyes a l'API du bac a sable sont refuses,
  // et le message ne dit pas pourquoi.
  assert.equal(modePaypal(undefined), "test");
  assert.equal(modePaypal(""), "test");
  assert.equal(modePaypal("live"), "reel");
  assert.equal(modePaypal("LIVE"), "reel");
  assert.equal(modePaypal("sandbox"), "test");
});

// ── LES CONTRADICTIONS ───────────────────────────────────────────────

test("une cle Stripe secrete sans cle publiable : PERSONNE NE PEUT PAYER", () => {
  const c = contradictions({ STRIPE_SECRET_KEY_OWNER: "sk_test_x" });
  assert.ok(c.some((x) => x.cle === "stripe-publiable" && x.grave));
});

test("Stripe en REEL sans secret de webhook : l'argent rentre, aucun acces", () => {
  const c = contradictions({
    STRIPE_SECRET_KEY_OWNER: "rk_live_x",
    STRIPE_PUBLISHABLE_KEY_OWNER: "pk_live_x",
  });
  assert.ok(c.some((x) => x.cle === "stripe-webhook" && x.grave));
});

test("Stripe en TEST sans secret de webhook n'alerte pas", () => {
  // En test, personne ne paie vraiment : crier la ferait rougir l'ecran
  // en permanence pendant une mise au point.
  const c = contradictions({
    STRIPE_SECRET_KEY_OWNER: "sk_test_x",
    STRIPE_PUBLISHABLE_KEY_OWNER: "pk_test_x",
  });
  assert.ok(!c.some((x) => x.cle === "stripe-webhook"));
});

test("PayPal en reel sans identifiant de webhook", () => {
  const c = contradictions({
    PAYPAL_CLIENT_ID_OWNER: "id",
    PAYPAL_SECRET_OWNER: "secret",
    PAYPAL_ENV_OWNER: "live",
  });
  assert.ok(c.some((x) => x.cle === "paypal-webhook" && x.grave));
});

test("un mode reel et un mode bac a sable en meme temps : un bouton ment", () => {
  const c = contradictions({
    STRIPE_SECRET_KEY_OWNER: "sk_live_x",
    STRIPE_PUBLISHABLE_KEY_OWNER: "pk_live_x",
    STRIPE_WEBHOOK_SECRET_OWNER: "whsec_x",
    PAYPAL_CLIENT_ID_OWNER: "id",
    PAYPAL_SECRET_OWNER: "secret",
  });
  assert.ok(c.some((x) => x.cle === "modes-melanges"));
});

test("PayPal PAS configure ne produit aucune contradiction PayPal", () => {
  // Reprocher une incoherence a un moyen de paiement qu'on n'a pas
  // branche ferait rougir l'ecran pour rien, et un ecran qui rougit
  // pour rien finit par ne plus etre lu.
  const c = contradictions({
    STRIPE_SECRET_KEY_OWNER: "sk_live_x",
    STRIPE_PUBLISHABLE_KEY_OWNER: "pk_live_x",
    STRIPE_WEBHOOK_SECRET_OWNER: "whsec_x",
  });
  assert.deepEqual(c, []);
});

test("un serveur bien configure ne dit RIEN", () => {
  const c = contradictions({
    STRIPE_SECRET_KEY_OWNER: "rk_live_x",
    STRIPE_PUBLISHABLE_KEY_OWNER: "pk_live_x",
    STRIPE_WEBHOOK_SECRET_OWNER: "whsec_x",
    PAYPAL_CLIENT_ID_OWNER: "id",
    PAYPAL_SECRET_OWNER: "secret",
    PAYPAL_ENV_OWNER: "live",
    PAYPAL_WEBHOOK_ID_OWNER: "WH-123",
  });
  assert.deepEqual(c, []);
});

test("aucune contradiction ne cite une valeur", () => {
  const c = contradictions({ STRIPE_SECRET_KEY_OWNER: "sk_live_NEDOITPASSORTIR" });
  assert.ok(!JSON.stringify(c).includes("NEDOITPASSORTIR"));
});
