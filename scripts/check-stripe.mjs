// scripts/check-stripe.mjs
//
// QUELLE VERSION D'API STRIPE PARLE À NOTRE SERVEUR, ET SUR QUELS
// ÉVÉNEMENTS.
//
//     npm run check:stripe
//
// -- POURQUOI CE SCRIPT EXISTE (audit du 31 août 2026) -----------------
//
// Personne ne savait répondre, et c'est de l'argent. Notre code n'envoie
// aucun en-tête `Stripe-Version` : les réponses arrivent donc dans la
// version PAR DÉFAUT DU COMPTE, et les webhooks dans la version choisie
// SUR L'ENDPOINT. Les deux se règlent dans le tableau de bord de Stripe,
// pas chez nous, et elles peuvent changer sans qu'une ligne de code
// bouge.
//
// Or Stripe a déplacé trois champs que nous lisons pour payer les
// affiliés (`invoice.subscription`, `invoice.tax`,
// `subscription.current_period_end`). Le code les lit maintenant sous
// leurs DEUX formes (`lib/checkout/formeStripe.ts`), donc plus rien ne
// dépend de la réponse. Ce script sert à SAVOIR, pas à rattraper : un
// journal se lit, il ne se déduit pas (leçon Ivan, 7 août).
//
// -- ET IL VÉRIFIE CE QUI EST ÉCOUTÉ -----------------------------------
//
// Un événement absent de l'abonnement de l'endpoint ne produit AUCUNE
// erreur : il n'arrive simplement jamais. `invoice.paid` manquant, c'est
// zéro commission récurrente ; `customer.subscription.deleted` manquant,
// c'est un plan payant qui reste ouvert après une résiliation. Le
// symptôme est l'absence de symptôme, comme d'habitude.
//
// -- IL N'IMPRIME JAMAIS DE SECRET -------------------------------------
//
// Même règle que `check-prod.mjs` et `check-build-env.mjs` : ce rapport
// finit dans un terminal, un historique, parfois un copier-coller. Il ne
// montre ni la clé, ni le secret de signature.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * LES ÉVÉNEMENTS DONT LE SERVEUR A BESOIN, et ce qu'on perd sans eux.
 *
 * La liste est écrite ici en clair plutôt qu'importée : ce script tourne
 * sur le serveur de prod avec `node`, sans build et sans dépendance,
 * exactement comme `login-link.mjs`. Le test
 * `tests/logic/audit-31-aout.test.mts` exige qu'elle reste d'accord avec
 * `OWNER_SUBSCRIPTION_EVENTS`, donc elle ne peut pas dériver en silence.
 */
const ATTENDUS = [
  ["checkout.session.completed", "aucun plan ne s'ouvre apres un paiement"],
  ["checkout.session.async_payment_succeeded", "un paiement differe n'ouvre rien"],
  ["charge.refunded", "un rembourse garde son acces, et sa commission part"],
  ["charge.dispute.created", "aucune alerte quand un impaye s'ouvre"],
  ["charge.dispute.funds_withdrawn", "un impaye garde son acces et sa commission"],
  ["customer.subscription.updated", "une montee de palier n'ouvre rien"],
  ["customer.subscription.deleted", "un plan paye reste ouvert apres resiliation"],
  ["customer.subscription.trial_will_end", "la remise promise apres le mois offert ne se pose pas"],
  ["invoice.paid", "AUCUNE commission recurrente : l'affilie n'est paye qu'une fois"],
  ["invoice.payment_failed", "un prelevement en echec n'est consigne nulle part"],
];

/** Lit le `.env` du repo, sans jamais l'exporter dans le shell. */
function lireEnv() {
  const valeurs = new Map();
  for (const nom of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const chemin = join(RACINE, nom);
    if (!existsSync(chemin)) continue;
    let brut = "";
    try {
      brut = readFileSync(chemin, "utf8");
    } catch {
      continue;
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

async function stripe(cle, chemin) {
  const res = await fetch(`https://api.stripe.com${chemin}`, {
    headers: { Authorization: `Bearer ${cle}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, detail: msg };
  }
  return { ok: true, json };
}

async function main() {
  const env = lireEnv();
  // `process.env` passe devant, comme partout : c'est ce que le serveur
  // lit vraiment.
  const cle = (process.env.STRIPE_SECRET_KEY_OWNER || env.get("STRIPE_SECRET_KEY_OWNER") || "").trim();

  console.log("== Stripe : version d'API et evenements ecoutes ==\n");

  if (!cle) {
    console.log("STRIPE_SECRET_KEY_OWNER absente : rien a verifier.");
    console.log("Sur le serveur, lance la commande depuis le dossier de l'app.");
    process.exit(1);
  }
  console.log(`Cle lue : ${cle.startsWith("sk_live") ? "REEL (sk_live)" : cle.startsWith("sk_test") ? "TEST (sk_test)" : "forme inattendue"}\n`);

  // ── LE COMPTE ──
  const compte = await stripe(cle, "/v1/account");
  if (!compte.ok) {
    console.log(`Compte illisible : ${compte.detail}`);
    console.log("Si c'est une permission manquante, la cle restreinte doit pouvoir LIRE le compte.");
  } else {
    console.log(`Compte : ${compte.json.id ?? "?"}`);
  }

  // ── LA VERSION PAR DEFAUT DU COMPTE ──
  //
  // Stripe ne l'expose par aucun point d'entree. En revanche CHAQUE
  // objet `Event` porte l'`api_version` avec laquelle il a ete rendu :
  // on la LIT au lieu de la deduire.
  const evenements = await stripe(cle, "/v1/events?limit=3");
  if (evenements.ok && Array.isArray(evenements.json.data) && evenements.json.data.length) {
    const vues = [...new Set(evenements.json.data.map((e) => e.api_version ?? "?"))];
    console.log(`Version des evenements recents (nos APPELS suivent la meme) : ${vues.join(", ")}`);
  } else {
    // On ne conclut RIEN d'une lecture vide : "je n'ai pas trouve" et
    // "il n'y a rien" sont deux reponses differentes (leçon du 22 août).
    console.log("Version par defaut : aucun evenement recent a lire, ou cle sans le droit Evenements.");
    console.log("  Elle est affichee dans Stripe > Developpeurs > Vue d'ensemble.");
  }

  // ── ET LA FORME REELLE D'UNE FACTURE ──
  //
  // C'est ce qui decide si une commission recurrente part ou pas. On
  // REGARDE une vraie facture plutot que de raisonner sur ce qu'elle
  // devrait contenir : c'est exactement l'erreur du drame Ivan.
  const factures = await stripe(cle, "/v1/invoices?limit=1&status=paid");
  const f = factures.ok && Array.isArray(factures.json.data) ? factures.json.data[0] : null;
  if (f) {
    const aAbonnementRacine = Boolean(f.subscription);
    const aAbonnementParent = Boolean(f.parent?.subscription_details?.subscription);
    const aTaxeRacine = typeof f.tax === "number";
    const aTaxeListe = Array.isArray(f.total_taxes) || Array.isArray(f.total_tax_amounts);
    console.log(
      `Forme d'une facture payee : abonnement ${aAbonnementRacine ? "a la racine" : aAbonnementParent ? "sous parent (version recente)" : "ABSENT des deux formes"}` +
        `, taxe ${aTaxeRacine ? "a la racine" : aTaxeListe ? "en liste (version recente)" : "absente"}`,
    );
    if (!aAbonnementRacine && !aAbonnementParent) {
      console.log("  (facture d'achat unique : normal qu'il n'y ait pas d'abonnement)");
    }
    console.log("  Les deux formes sont lues par lib/checkout/formeStripe.ts : rien a faire.");
  }

  // ── LES ENDPOINTS DE WEBHOOK ──
  console.log("\n-- Endpoints de webhook --");
  const points = await stripe(cle, "/v1/webhook_endpoints?limit=20");
  if (!points.ok) {
    console.log(`Illisibles : ${points.detail}`);
    console.log("La cle restreinte doit pouvoir LIRE les endpoints de webhook.");
    process.exit(1);
  }

  const liste = Array.isArray(points.json.data) ? points.json.data : [];
  if (liste.length === 0) {
    console.log("AUCUN endpoint : Stripe n'envoie rien, donc aucun plan ne s'ouvre.");
    process.exit(1);
  }

  let probleme = false;
  for (const p of liste) {
    const actif = String(p.status ?? "") === "enabled";
    console.log(`\n  ${p.url ?? "?"}`);
    console.log(`    etat    : ${actif ? "actif" : "DESACTIVE"}`);
    // C'EST LA LIGNE QUI COMPTE : la version des webhooks REÇUS.
    console.log(`    version : ${p.api_version ?? "(celle du compte)"}`);
    if (!actif) probleme = true;

    const estLeNotre = String(p.url ?? "").includes("/api/commande/webhook");
    if (!estLeNotre) {
      console.log("    (pas le webhook du bon de commande : evenements non verifies)");
      continue;
    }

    const ecoutes = new Set(Array.isArray(p.enabled_events) ? p.enabled_events : []);
    const tout = ecoutes.has("*");
    const manquants = tout ? [] : ATTENDUS.filter(([e]) => !ecoutes.has(e));
    if (manquants.length === 0) {
      console.log(`    evenements : les ${ATTENDUS.length} necessaires sont ecoutes${tout ? " (via *)" : ""}`);
    } else {
      probleme = true;
      console.log(`    evenements MANQUANTS (${manquants.length}) :`);
      for (const [e, cout] of manquants) console.log(`      - ${e}  ->  ${cout}`);
    }
  }

  console.log("");
  if (probleme) {
    console.log("A CORRIGER dans Stripe > Developpeurs > Webhooks.");
    process.exit(1);
  }
  console.log("Tout est en place.");
}

main().catch((e) => {
  console.error(`Echec : ${e?.message ?? e}`);
  process.exit(1);
});
