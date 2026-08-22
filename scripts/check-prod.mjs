// scripts/check-prod.mjs
//
// UN SEUL CONTRÔLE QUI DIT CE QUI MANQUE POUR TESTER.
//
// Béné, 22 août : "code ce qu'il faut pour que tout le système soit
// fonctionnel. Prêt à être testé."
//
// Le code est prêt. Ce qui reste, ce sont des clés à poser et une
// migration à passer, et ça se vérifie en une commande plutôt qu'en
// ouvrant six écrans pour découvrir lequel se plaint.
//
//   npm run check:prod
//
// -- IL N'IMPRIME JAMAIS UNE VALEUR SECRÈTE ----------------------------
//
// Même règle que `check-build-env.mjs` : ce rapport finit dans un
// terminal, un historique, parfois un copier-coller. Il dit "posée" ou
// "absente", jamais le contenu. Les seules valeurs affichées sont les
// adresses, parce que ce sont elles qui rendent un diagnostic évident.
//
// -- ET IL NE SE CONNECTE À RIEN ---------------------------------------
//
// Il lit le `.env` et le système de fichiers, rien d'autre. Un contrôle
// qui appelle Stripe pour vérifier une clé demanderait la clé de
// production pour dire si elle existe : il pourrait échouer pour une
// panne réseau et faire croire à une clé manquante.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));

/** Lit le `.env` du repo, sans jamais l'exporter dans le shell. */
function lireEnv() {
  const valeurs = new Map();
  for (const nom of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const chemin = join(RACINE, nom);
    if (!existsSync(chemin)) continue;
    for (const ligne of readFileSync(chemin, "utf8").split(/\r?\n/)) {
      const t = ligne.trim();
      if (!t || t.startsWith("#")) continue;
      const sans = t.startsWith("export ") ? t.slice(7).trim() : t;
      const eq = sans.indexOf("=");
      if (eq <= 0) continue;
      const cle = sans.slice(0, eq).trim();
      let v = sans.slice(eq + 1).trim();
      if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
      if (!valeurs.has(cle)) valeurs.set(cle, v);
    }
  }
  return valeurs;
}

const env = lireEnv();
const lire = (cle) => (env.get(cle) ?? process.env[cle] ?? "").trim();

/** Une clé qu'on ne montre jamais. */
function estSecret(cle) {
  return /(_KEY|_SECRET|_TOKEN|PASSWORD|SERVICE_ROLE)/i.test(cle);
}

const lignes = [];
let bloquants = 0;
let avertissements = 0;

function verifier(cle, { requis, quoi, minimum = 1 }) {
  const v = lire(cle);
  const ok = v.length >= minimum;
  if (!ok) {
    if (requis) bloquants += 1;
    else avertissements += 1;
  }
  const valeur = ok ? (estSecret(cle) ? "posée" : v) : requis ? "ABSENTE" : "absente";
  lignes.push(`  ${ok ? "ok  " : requis ? "MANQUE" : "-   "} ${cle.padEnd(34)} ${valeur}`);
  if (!ok) lignes.push(`       ${quoi}`);
  return ok;
}

console.log("\n  CE QUI EST POSÉ SUR CE SERVEUR\n");

console.log("  Base et application");
verifier("NEXT_PUBLIC_SUPABASE_URL", {
  requis: true,
  quoi: "L'app ne peut pas démarrer sans elle.",
});
verifier("SUPABASE_SERVICE_ROLE_KEY", {
  requis: true,
  quoi: "Sans elle, aucune écriture serveur : ni accès ouvert, ni ticket.",
});
verifier("NEXT_PUBLIC_APP_URL", {
  requis: true,
  quoi: "Le domaine de l'app. Doit être https://quiz.tipote.com en production.",
});
console.log(lignes.splice(0).join("\n"));

console.log("\n  Emails");
verifier("RESEND_API_KEY", {
  requis: true,
  quoi: "Sans elle : aucun lien de connexion, aucune réponse de support, aucune alerte.",
});
console.log(lignes.splice(0).join("\n"));

console.log("\n  Paiement pris chez nous");
const stripeLive = lire("STRIPE_SECRET_KEY_OWNER").startsWith("sk_live");
verifier("STRIPE_SECRET_KEY_OWNER", {
  requis: false,
  quoi: "Sans elle, le bon de commande ne s'ouvre pas du tout.",
});
verifier("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OWNER", {
  requis: false,
  quoi: "La clé publique. Sans elle, le formulaire Stripe reste vide.",
});
const secretWebhook = verifier("STRIPE_WEBHOOK_SECRET_OWNER", {
  requis: false,
  quoi: "Sans elle, une vente n'ouvre AUCUN accès. Obligatoire dès que la clé Stripe est en réel.",
});
verifier("SALES_PREVIEW_TOKEN", {
  requis: false,
  minimum: 16,
  quoi: "16 caractères minimum. Sans elle, /commande répond 404 sur quiz.tipote.com.",
});
console.log(lignes.splice(0).join("\n"));

if (stripeLive && !secretWebhook) {
  console.log(
    "\n  ATTENTION : la clé Stripe est en RÉEL et le secret du webhook manque.\n" +
      "  Le paiement se refuse tout seul, et c'est voulu : sinon un abonnement\n" +
      "  serait prélevé chaque mois en face d'aucun accès.",
  );
  bloquants += 1;
}

console.log("\n  Ventes Systeme.io");
verifier("SYSTEME_IO_WEBHOOK_SECRET", {
  requis: false,
  quoi: "Sans elle, les ventes Systeme.io n'ouvrent plus d'accès.",
});
verifier("SYSTEME_IO_FREE_WEBHOOK_SECRET", {
  requis: false,
  quoi: "Sans elle, les inscriptions gratuites ne créent plus de compte.",
});
console.log(lignes.splice(0).join("\n"));

console.log("\n  Liaison avec l'Atelier");
verifier("PARTNER_SHARED_SECRET", {
  requis: false,
  quoi: "Sans elle, l'Atelier n'apparaît pas dans le tableau de bord (il le DIT).",
});
verifier("AFFILIATE_INTERNAL_SECRET", {
  requis: false,
  quoi: "Sans elle, aucune commission d'affiliation n'est enregistrée.",
});
console.log(lignes.splice(0).join("\n"));

// ── LES MIGRATIONS QUE L'ON SAIT NÉCESSAIRES ──
//
// On ne se connecte pas à la base : on liste les fichiers, et on nomme
// celles que le chantier en cours attend. `check:migrations-pending`,
// lui, interroge la prod et dit ce qui manque vraiment.
console.log("\n  Migrations récentes à ne pas oublier");
const dossier = join(RACINE, "supabase", "migrations");
const recentes = existsSync(dossier)
  ? readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .slice(-5)
  : [];
for (const f of recentes) console.log(`      ${f}`);
console.log("      -> npm run check:migrations-pending  dit lesquelles manquent VRAIMENT.");

console.log(
  `\n  ${bloquants} chose${bloquants > 1 ? "s" : ""} bloquante${bloquants > 1 ? "s" : ""}, ` +
    `${avertissements} optionnelle${avertissements > 1 ? "s" : ""} non posée${avertissements > 1 ? "s" : ""}.\n`,
);

// On sort en 0 même avec des manques : ce script informe, il ne casse
// pas un déploiement. Le garde-fou qui refuse, lui, c'est `prebuild`.
process.exit(0);
