// scripts/paypal-setup.mjs
//
// BRANCHER PAYPAL SANS ALLER CLIQUER DANS LEUR TABLEAU DE BORD.
//
//   node scripts/paypal-setup.mjs
//
// Il fait trois choses, dans cet ordre :
//   1. il vérifie que les identifiants marchent, et sur QUEL monde ;
//   2. il crée (ou retrouve) le webhook qui ouvre les accès ;
//   3. il affiche la ligne exacte à coller dans le `.env`.
//
// -- POURQUOI UN SCRIPT ET PAS UNE PAGE D'AIDE -------------------------
//
// L'identifiant de webhook se relève à la main dans l'interface PayPal,
// se recopie à la main dans un `.env`, et une faute de frappe ne se voit
// nulle part : le paiement s'ouvre, l'argent rentre, et aucun accès ne
// s'ouvre parce que la vérification de signature échoue en silence. On
// remplace trois occasions de se tromper par une commande.
//
// -- IL N'AFFICHE JAMAIS UN SECRET -------------------------------------
//
// Même règle que `check-prod` et `check-build-env` : ce rapport finit
// dans un terminal, un historique, parfois un copier-coller. Le Client
// ID est déjà public (il part dans le navigateur), le secret ne sort
// jamais.
//
// -- AUCUNE DÉPENDANCE -------------------------------------------------
//
// Comme `login-link.mjs`, et pour la même raison : un script d'urgence
// qui exige un `npm ci` frais est un script qu'on ne peut pas lancer le
// jour où on en a besoin.

import { readFileSync } from "node:fs";

/** Le chemin du webhook, écrit en dur : c'est une route de CE dépôt. */
const CHEMIN_WEBHOOK = "/api/commande/paypal/webhook";

/** Le domaine canonique, PAS lu dans l'env (drame Véronique, 2 août). */
const APP_URL = "https://quiz.tipote.com";

/** Les événements que la route sait traiter. Doivent rester alignés. */
const EVENEMENTS = [
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
];

function lireVariable(nom) {
  if (process.env[nom]?.trim()) return process.env[nom].trim();
  let brut;
  try {
    brut = readFileSync(new URL("../.env", import.meta.url), "utf8");
  } catch {
    return "";
  }
  for (const ligne of brut.split(/\r?\n/)) {
    const t = ligne.trim().replace(/^export\s+/, "");
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0 || t.slice(0, eq).trim() !== nom) continue;
    return t.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return "";
}

const clientId = lireVariable("PAYPAL_CLIENT_ID_OWNER");
const secret = lireVariable("PAYPAL_SECRET_OWNER");
const envDeclare = lireVariable("PAYPAL_ENV_OWNER").toLowerCase();
const dejaPose = lireVariable("PAYPAL_WEBHOOK_ID_OWNER");

console.log("\n  BRANCHER PAYPAL SUR LE BON DE COMMANDE\n");

if (clientId.length < 20 || secret.length < 20) {
  console.log("  PAYPAL_CLIENT_ID_OWNER ou PAYPAL_SECRET_OWNER manque dans le .env.");
  console.log("  Rien n'a été fait.\n");
  process.exit(1);
}

// LE MONDE. C'est le piège numéro un : des identifiants réels envoyés à
// l'API du bac à sable échouent à l'authentification, avec un message
// qui ne dit pas pourquoi.
const live = envDeclare === "live";
const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
console.log(`  Compte      ${clientId.slice(0, 6)}...  (Client ID, public)`);
console.log(`  Monde       ${live ? "RÉEL" : "bac à sable"}   (PAYPAL_ENV_OWNER=${envDeclare || "absente"})`);
if (!live) {
  console.log("\n  ATTENTION : sans PAYPAL_ENV_OWNER=live, des identifiants réels");
  console.log("  partent sur l'API du bac à sable et PayPal refuse tout.");
}

const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
const jeton = await fetch(`${base}/v1/oauth2/token`, {
  method: "POST",
  headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
})
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

if (!jeton?.access_token) {
  console.log("\n  PayPal a refusé ces identifiants sur ce monde.");
  console.log("  À vérifier : le Client ID et le Secret viennent-ils de la MÊME app,");
  console.log("  et cette app est-elle bien en " + (live ? "Live" : "Sandbox") + " ?\n");
  process.exit(1);
}
console.log("  Identifiants acceptés.\n");

const url = `${APP_URL}${CHEMIN_WEBHOOK}`;
console.log(`  Webhook     ${url}`);

const cree = await fetch(`${base}/v1/notifications/webhooks`, {
  method: "POST",
  headers: { Authorization: `Bearer ${jeton.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ url, event_types: EVENEMENTS.map((name) => ({ name })) }),
}).then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => ({})) }));

let id = cree.ok ? cree.json.id : null;
let deja = false;

if (!id) {
  // Adresse déjà enregistrée : on relit la liste au lieu d'échouer.
  const liste = await fetch(`${base}/v1/notifications/webhooks`, {
    headers: { Authorization: `Bearer ${jeton.access_token}` },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const existant = (liste?.webhooks ?? []).find((w) => w.url === url);
  if (existant) {
    id = existant.id;
    deja = true;
  }
}

if (!id) {
  console.log("\n  PayPal a refusé de créer le webhook :");
  console.log(`  ${cree.json?.message ?? "raison inconnue"}\n`);
  process.exit(1);
}

console.log(`  ${deja ? "Déjà enregistré" : "Créé"}, identifiant : ${id}\n`);
console.log("  Événements écoutés :");
for (const e of EVENEMENTS) console.log(`      ${e}`);

if (dejaPose === id) {
  console.log("\n  Le .env porte déjà cet identifiant. Il n'y a rien à faire.\n");
  process.exit(0);
}

console.log("\n  À AJOUTER DANS ~/tiquiz-app/.env :\n");
console.log(`      PAYPAL_WEBHOOK_ID_OWNER=${id}`);
if (!live) console.log("      PAYPAL_ENV_OWNER=live");
console.log("\n  Puis, depuis un terminal NEUF :");
console.log("      pm2 restart tiquiz-prod --update-env\n");
console.log("  (Pas de rebuild : ces deux variables sont lues à l'exécution.)\n");
