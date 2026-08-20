// tests/logic/owner-account.test.mts
//
// LES COMPTES DE PAIEMENT DE BÉNÉ, ET CE QUI DOIT LES FERMER.
//
// Deux drames se croisent dans ce fichier.
//
// Le 2 août, Véronique reçoit un lien de mot de passe qui pointe vers
// `localhost` : `process.env.X ?? defaut` ne protégeait que de la
// variable ABSENTE, pas de la variable FAUSSE. Une clé de paiement mal
// collée est le même piège, en plus cher : elle n'échoue pas au
// démarrage, elle échoue devant un client, au moment de payer.
//
// Le 19 août, `SALES_PREVIEW_TOKEN` était posée sur un serveur et pas sur
// l'autre. Deux apps, deux `.env` : ce qui est branché d'un côté ne l'est
// pas de l'autre, et l'écran doit le dire au lieu d'afficher un bouton
// qui ne marchera pas.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  readOwnerPaypal,
  readOwnerProviders,
  readOwnerStripe,
  readOwnerStripeWebhookSecret,
  stripeKeyMode,
} from "../../lib/checkout/ownerAccount.ts";

// DES CLÉS FAUSSES, ASSEMBLÉES À L'EXÉCUTION.
//
// Écrites en toutes lettres, elles ressemblent tellement à de vraies clés
// que la protection anti-secret de GitHub refuse le push : elle ne peut
// pas savoir qu'elles sont inventées, et c'est exactement ce qu'on lui
// demande. On ne débloque donc PAS avec le lien "autoriser ce secret" :
// on retire la forme. Le test a besoin du GABARIT d'une clé, jamais
// d'une chaîne écrite d'un seul tenant.
const CORPS = "51AbCdEfGhIjKlMnOpQrStUv";
const cle = (prefixe: string, env: string) => `${prefixe}_${env}_${CORPS}`;

const CLE_LIVE = cle("sk", "live");
const CLE_TEST = cle("sk", "test");
const CLE_RESTREINTE = cle("rk", "live");

test("une cle valide declare son mode elle-meme", () => {
  assert.equal(stripeKeyMode(CLE_LIVE), "live");
  assert.equal(stripeKeyMode(CLE_TEST), "test");
  // Une clé restreinte suffit et expose moins : elle doit passer.
  assert.equal(stripeKeyMode(CLE_RESTREINTE), "live");
});

test("ce qui n'est PAS une cle secrete ne branche rien", () => {
  const mauvaises = [
    null,
    undefined,
    "",
    "   ",
    // La clé PUBLIABLE, celle qui est juste au dessus dans le tableau de
    // bord Stripe et qui se copie à sa place quand on va vite.
    cle("pk", "live"),
    // Une clé tronquée par un retour à la ligne au collage.
    "sk" + "_live_",
    "sk" + "_live_51Ab",
    // Le nom de la variable collé avec sa valeur.
    `STRIPE_SECRET_KEY_OWNER=${CLE_LIVE}`,
    // Un environnement qui n'existe pas.
    cle("sk", "prod"),
    // Des guillemets restés autour de la valeur.
    `"${CLE_LIVE}"`,
  ];
  for (const v of mauvaises) {
    assert.equal(stripeKeyMode(v), null, `"${v}" a été acceptée comme clé`);
    assert.equal(readOwnerStripe({ STRIPE_SECRET_KEY_OWNER: v }), null);
  }
});

test("les espaces autour de la cle ne l'empechent pas de marcher", () => {
  // Un `.env` rempli à la main garde souvent une espace de fin.
  const compte = readOwnerStripe({ STRIPE_SECRET_KEY_OWNER: `  ${CLE_LIVE}  ` });
  assert.equal(compte?.mode, "live");
  assert.equal(compte?.key, CLE_LIVE, "la clé doit être stockée sans ses espaces");
});

test("le secret de webhook se valide separement de la cle", () => {
  assert.equal(readOwnerStripeWebhookSecret({}), null);
  assert.equal(
    readOwnerStripeWebhookSecret({ STRIPE_WEBHOOK_SECRET_OWNER: "whsec_AbCdEfGhIjKl" }),
    "whsec_AbCdEfGhIjKl",
  );
  // Une clé secrète collée dans la case du webhook : ça arrive, et ça
  // ferait échouer toutes les vérifications de signature en silence.
  assert.equal(
    readOwnerStripeWebhookSecret({ STRIPE_WEBHOOK_SECRET_OWNER: CLE_LIVE }),
    null,
  );
});

test("PayPal : un identifiant sans son secret ne vaut rien", () => {
  const long = "A".repeat(40);
  assert.equal(readOwnerPaypal({ PAYPAL_CLIENT_ID_OWNER: long }), null);
  assert.equal(readOwnerPaypal({ PAYPAL_SECRET_OWNER: long }), null);
  assert.equal(
    readOwnerPaypal({ PAYPAL_CLIENT_ID_OWNER: "court", PAYPAL_SECRET_OWNER: long }),
    null,
  );
});

test("PayPal : sans mention explicite, on reste en bac a sable", () => {
  const long = "A".repeat(40);
  const base = { PAYPAL_CLIENT_ID_OWNER: long, PAYPAL_SECRET_OWNER: long };
  // Le seul défaut acceptable : il ne peut coûter que des paiements qui
  // n'aboutissent pas, jamais de l'argent qui part au mauvais endroit.
  assert.equal(readOwnerPaypal(base)?.mode, "test");
  assert.equal(readOwnerPaypal({ ...base, PAYPAL_ENV_OWNER: "n'importe quoi" })?.mode, "test");
  assert.equal(readOwnerPaypal({ ...base, PAYPAL_ENV_OWNER: "LIVE" })?.mode, "live");
});

test("rien de branche : aucun moyen de paiement propose", () => {
  // Un bouton qui échoue est pire que pas de bouton : il fait croire à
  // l'acheteur que le problème vient de lui.
  const p = readOwnerProviders({});
  assert.deepEqual(
    { stripe: p.stripe, paypal: p.paypal, mode: p.mode, mixedModes: p.mixedModes },
    { stripe: false, paypal: false, mode: null, mixedModes: false },
  );
});

test("un seul moyen branche : lui seul est propose", () => {
  const p = readOwnerProviders({ STRIPE_SECRET_KEY_OWNER: CLE_TEST });
  assert.equal(p.stripe, true);
  assert.equal(p.paypal, false);
  assert.equal(p.mode, "test");
});

test("deux modes qui ne s'accordent pas : on annonce le plus dangereux", () => {
  const long = "A".repeat(40);
  const p = readOwnerProviders({
    STRIPE_SECRET_KEY_OWNER: CLE_TEST,
    PAYPAL_CLIENT_ID_OWNER: long,
    PAYPAL_SECRET_OWNER: long,
    PAYPAL_ENV_OWNER: "live",
  });
  assert.equal(p.mixedModes, true, "le desaccord doit etre signale a l'appelant");
  // Annoncer "test" devant un bouton PayPal qui prélève vraiment serait
  // le mensonge le plus coûteux des deux.
  assert.equal(p.mode, "live");
});

test("le nom des variables ne vit qu'a UN endroit", async () => {
  // Même règle que l'URL de l'Atelier (3 août) et que la porte du
  // chantier affilié : une valeur lue à deux endroits ne se corrige
  // jamais qu'à moitié.
  const fs = await import("node:fs");
  const path = await import("node:path");
  const racine = process.cwd();
  const noms = [
    "STRIPE_SECRET_KEY_OWNER",
    "STRIPE_WEBHOOK_SECRET_OWNER",
    "PAYPAL_CLIENT_ID_OWNER",
    "PAYPAL_SECRET_OWNER",
    "PAYPAL_ENV_OWNER",
  ];
  const fautifs: string[] = [];

  const parcourir = (dossier: string) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (entree.name === "node_modules" || entree.name.startsWith(".")) continue;
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        parcourir(chemin);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entree.name)) continue;
      if (chemin.endsWith(path.join("lib", "checkout", "ownerAccount.ts"))) continue;
      const src = fs.readFileSync(chemin, "utf8");
      for (const n of noms) {
        if (src.includes(`process.env.${n}`)) {
          fautifs.push(`${path.relative(racine, chemin)} : ${n}`);
        }
      }
    }
  };

  for (const d of ["app", "components", "lib"]) {
    const chemin = path.join(racine, d);
    if (fs.existsSync(chemin)) parcourir(chemin);
  }

  assert.deepEqual(
    fautifs,
    [],
    `des variables de paiement sont lues ailleurs que dans ownerAccount.ts :\n${fautifs.join("\n")}`,
  );
});
