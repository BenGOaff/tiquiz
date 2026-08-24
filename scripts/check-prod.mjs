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
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));

/** Lit le `.env` du repo, sans jamais l'exporter dans le shell. */
function lireEnv(dossier = RACINE) {
  const valeurs = new Map();
  for (const nom of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const chemin = join(dossier, nom);
    if (!existsSync(chemin)) continue;
    let brut = "";
    try {
      brut = readFileSync(chemin, "utf8");
    } catch {
      continue; // un .env illisible (droits) ne doit pas faire tomber le controle
    }
    for (const ligne of brut.split(/\r?\n/)) {
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
  // CLIENT_ID en fait partie : dans NOTRE integration PayPal, il ne
  // quitte jamais le serveur (le bon de commande poste sur
  // /api/commande/paypal, il n'y a pas de SDK dans la page). Le
  // rapport n'a donc aucune raison de l'imprimer. WEBHOOK_ID reste
  // visible : c'est un identifiant qu'on recopie depuis PayPal, et
  // le voir est exactement ce qui rend un diagnostic evident.
  return /(_KEY|_SECRET|_TOKEN|PASSWORD|CLIENT_ID|SERVICE_ROLE)/i.test(cle);
}

const lignes = [];
let bloquants = 0;
let avertissements = 0;

function verifier(cle, { requis, quoi, minimum = 1, aussi = [] }) {
  // `aussi` : les autres noms sous lesquels la MÊME valeur est acceptée par
  // le code. Sans ça, ce contrôle réclamait une variable que l'app ne lit
  // plus en premier, et disait "absente" alors qu'elle était bien posée
  // sous son nom courant. Un contrôle qui ne regarde pas au même endroit
  // que le code envoie chercher au mauvais endroit.
  const v = [cle, ...aussi].map(lire).find((x) => x.length >= minimum) ?? lire(cle);
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
// `rk_live_...` est une cle RESTREINTE, et `lib/checkout/ownerAccount.ts`
// l'accepte explicitement (`/^(sk|rk)_(live|test)_/`). Ne tester que
// `sk_live` laissait passer un compte en conditions REELLES sans que ce
// controle s'en apercoive : l'avertissement sur le secret du webhook ne
// partait jamais. C'est exactement le defaut du 22 aout, un controle qui
// ne regarde pas au meme endroit que le code.
const stripeLive = /^rk_live_|^sk_live_/.test(lire("STRIPE_SECRET_KEY_OWNER"));
verifier("STRIPE_SECRET_KEY_OWNER", {
  requis: false,
  quoi: "Sans elle, le bon de commande ne s'ouvre pas du tout.",
});
const publiable = verifier("STRIPE_PUBLISHABLE_KEY_OWNER", {
  requis: false,
  aussi: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OWNER"],
  quoi:
    "La clé publique (pk_test_... ou pk_live_...), sans préfixe NEXT_PUBLIC_ :\n" +
    "       elle est lue à l'EXÉCUTION, donc un pm2 restart suffit, sans rebuild.\n" +
    "       Sans elle, le formulaire de paiement ne s'affiche pas du tout.",
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

if (lire("STRIPE_SECRET_KEY_OWNER") && !publiable) {
  console.log(
    "\n  ATTENTION : la clé Stripe SECRÈTE est posée et la clé PUBLIABLE manque.\n" +
      "  Le bon de commande s'ouvre, mais le formulaire de paiement reste vide :\n" +
      "  personne ne peut payer. Poser STRIPE_PUBLISHABLE_KEY_OWNER, du même type\n" +
      "  (test ou réel) que la clé secrète, puis pm2 restart.",
  );
  bloquants += 1;
}

if (stripeLive && !secretWebhook) {
  console.log(
    "\n  ATTENTION : la clé Stripe est en RÉEL et le secret du webhook manque.\n" +
      "  Le paiement se refuse tout seul, et c'est voulu : sinon un abonnement\n" +
      "  serait prélevé chaque mois en face d'aucun accès.",
  );
  bloquants += 1;
}

console.log("\n  PayPal, sur le meme bon de commande");
// Les deux verifications sont evaluees AVANT d'etre combinees : un `&&`
// direct court-circuite le second appel, donc la ligne "PAYPAL_SECRET_OWNER"
// disparaissait du rapport des que le Client ID manquait. Un controle qui
// cache une ligne envoie chercher au mauvais endroit.
const paypalId = verifier("PAYPAL_CLIENT_ID_OWNER", {
  requis: false,
  minimum: 20,
  quoi: "Sans elle, pas de bouton PayPal du tout.",
});
const paypalSecret = verifier("PAYPAL_SECRET_OWNER", {
  requis: false,
  minimum: 20,
  quoi: "Le secret de la meme app PayPal que le Client ID.",
});
const paypalPose = paypalId && paypalSecret;
const paypalLive = lire("PAYPAL_ENV_OWNER").toLowerCase() === "live";
verifier("PAYPAL_ENV_OWNER", {
  requis: false,
  quoi:
    "ABSENTE = bac a sable. Des identifiants REELS envoyes a l'API du bac a sable\n" +
    "       sont refuses, et le message ne dit pas pourquoi. Poser PAYPAL_ENV_OWNER=live.",
});
const webhookPaypal = verifier("PAYPAL_WEBHOOK_ID_OWNER", {
  requis: false,
  minimum: 8,
  quoi: "npm run paypal:setup la cree et affiche la ligne a coller.",
});
console.log(lignes.splice(0).join("\n"));

if (paypalPose && paypalLive && !webhookPaypal) {
  console.log(
    "\n  ATTENTION : PayPal est en REEL et l'identifiant de webhook manque.\n" +
      "  Le paiement PayPal se refuse tout seul, et c'est voulu : sinon un\n" +
      "  abonnement serait preleve en face d'aucun acces.\n" +
      "  -> npm run paypal:setup",
  );
  bloquants += 1;
}

if (paypalPose && !paypalLive && stripeLive) {
  console.log(
    "\n  ATTENTION : Stripe est en REEL et PayPal en bac a sable.\n" +
      "  L'ecran annonce un seul mode : un des deux boutons ment.",
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

// ── LES SECRETS QUI DOIVENT ÊTRE LES MÊMES AILLEURS ──
//
// C'est le seul contrôle qu'aucune des deux apps ne pouvait faire toute
// seule, et c'est celui qui compte : deux valeurs POSÉES des deux côtés
// mais DIFFÉRENTES se lisent "ok" partout, et la liaison échoue en
// silence. Un 401 sur une porte partenaire ne dit jamais "vos deux
// secrets ne sont pas les mêmes".
const PARTAGES = [
  { cle: "PARTNER_SHARED_SECRET", avec: ["tipote-app", "formaquiz"] },
  { cle: "AFFILIATE_INTERNAL_SECRET", avec: ["tipote-app"] },
];

function trouverVoisin(nom) {
  const parent = dirname(RACINE);
  // Les noms de dossiers changent d'une machine a l'autre (le serveur a
  // `tiquiz-app`, une machine de dev peut avoir `tiquiz`). On essaie les
  // deux, et on le DIT quand on ne trouve rien : "pas compare" n'est pas
  // "identique".
  const candidats = [nom, nom.replace(/-app$/, ""), `${nom}-app`];
  for (const c of candidats) {
    const chemin = join(parent, c);
    if (c !== basename(RACINE) && existsSync(join(chemin, "package.json"))) return chemin;
  }
  return null;
}

console.log("\n  Les secrets partagés avec les autres apps");
let comparaisons = 0;
for (const { cle, avec } of PARTAGES) {
  const ici = lire(cle);
  for (const nom of avec) {
    const dossier = trouverVoisin(nom);
    if (!dossier) {
      console.log(`  -    ${cle.padEnd(30)} ${nom.padEnd(12)} dossier introuvable, RIEN COMPARÉ`);
      continue;
    }
    comparaisons += 1;
    const laBas = (lireEnv(dossier).get(cle) ?? "").trim();
    let verdict;
    if (!ici && !laBas) verdict = "absente des deux côtés";
    else if (!ici) verdict = "ABSENTE ICI, posée là-bas";
    else if (!laBas) verdict = "posée ici, ABSENTE là-bas";
    else if (ici === laBas) verdict = "identique";
    else verdict = "DIFFÉRENTE des deux côtés";
    const grave = verdict.includes("ABSENTE") || verdict.startsWith("DIFFÉRENTE");
    if (grave) bloquants += 1;
    // "absente des deux cotes" n'est pas un desaccord, mais ce n'est pas
    // un "ok" non plus : la ligne du dessus l'a deja signalee, celle ci
    // ne doit pas venir rassurer par dessus.
    const marque = grave ? "ALERTE" : verdict.startsWith("absente") ? "-   " : "ok  ";
    console.log(`  ${marque} ${cle.padEnd(30)} ${nom.padEnd(12)} ${verdict}`);
  }
}
if (comparaisons === 0) {
  console.log(
    "\n  Aucune autre app trouvée à côté de ce dossier : cette section n'a rien\n" +
      "  vérifié. Sur le serveur, les trois dépôts sont voisins dans /home/tipote.",
  );
}

// ── LES MIGRATIONS QUE L'ON SAIT NÉCESSAIRES ──
//
// On ne se connecte pas à la base : on liste les fichiers, et on nomme
// celles que le chantier en cours attend. `check:migrations-pending`,
// lui, interroge la prod et dit ce qui manque vraiment.
console.log("\n  Les 5 dernières migrations écrites (simple rappel, PAS une alerte)");
const dossier = join(RACINE, "supabase", "migrations");
const recentes = existsSync(dossier)
  ? readdirSync(dossier)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .slice(-5)
  : [];
for (const f of recentes) console.log(`      ${f}`);
console.log(
  "\n      Ce controle NE SE CONNECTE PAS a la base : il liste des fichiers, il\n" +
    "      ne sait pas ce qui est applique. Seul `npm run check:migrations-pending`\n" +
    "      interroge la prod et repond. Tant qu'il dit 0 manquant, ces lignes ne\n" +
    "      demandent rien.",
);

console.log(
  `\n  ${bloquants} chose${bloquants > 1 ? "s" : ""} bloquante${bloquants > 1 ? "s" : ""}, ` +
    `${avertissements} optionnelle${avertissements > 1 ? "s" : ""} non posée${avertissements > 1 ? "s" : ""}.\n`,
);

// On sort en 0 même avec des manques : ce script informe, il ne casse
// pas un déploiement. Le garde-fou qui refuse, lui, c'est `prebuild`.
process.exit(0);
