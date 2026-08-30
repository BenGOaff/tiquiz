#!/usr/bin/env node
// scripts/check-caddy-hosts.mjs
//
// LE FICHIER DU DÉPÔT DOIT COUVRIR TOUT CE QUI TOURNE (29 août 2026).
//
// Ce jour là, un `cp infra/caddy/Caddyfile /etc/caddy/Caddyfile` a mis
// `tiquiz.fr` ET `atelierduquiz.fr` par terre en une seconde : leurs
// blocs n'existaient que sur le serveur, ils n'avaient jamais été
// recopiés ici, et la copie les a effacés. Les deux pages de vente ont
// répondu ERR_SSL_PROTOCOL_ERROR, sans qu'aucune erreur n'apparaisse
// nulle part : sans bloc nommé, Caddy ne peut pas produire de
// certificat pour ce nom, donc il coupe la poignée de main. Rien à lire
// dans un journal d'application, puisque aucune requête n'arrive
// jusqu'à l'app.
//
// **Ce contrôle compare les HÔTES SERVIS, pas les fichiers.** Un
// commentaire, une indentation ou un ordre différent ne le font pas
// crier : seul un hôte qui DISPARAÎTRAIT le fait échouer. Un test qui
// rougit pour rien finit désactivé.
//
// Il ne remplace pas `caddy validate`, il répond à une autre question :
// validate dit "ce fichier est correct", celui-ci dit "ce fichier ne
// perd personne en route".
//
// -- ET IL A LAISSÉ PASSER LE TROISIÈME (30 août 2026) ----------------
//
// `quizing.tipote.com`, l'application de l'Atelier, était dans EXACTEMENT
// le même cas et n'a pas été rapatrié le 29 : la copie l'a effacé à son
// tour, et l'Atelier a répondu 525 à ses élèves.
//
// Ce contrôle ne pouvait pas le voir. Il compare le dépôt au fichier
// VIVANT, et le fichier vivant l'avait DÉJÀ perdu : les deux étaient
// d'accord pour l'oublier. **Un contrôle qui compare deux copies ne
// rattrape jamais une erreur commune aux deux.**
//
// D'où la deuxième moitié : `HOTES_ATTENDUS`, la liste des noms que le
// CODE désigne. Elle ne dépend d'aucun fichier de configuration, donc
// elle survit à leur effacement, et c'est le seul endroit d'où la
// vérité pouvait venir.

import fs from "node:fs";

const REPO = process.argv[2] ?? "infra/caddy/Caddyfile";
const LIVE = process.argv[3] ?? "/etc/caddy/Caddyfile";

/**
 * Les hôtes servis par un Caddyfile.
 *
 * On lit les lignes d'ADRESSE, c'est à dire celles qui ouvrent un bloc
 * au premier niveau. Sont ignorés : les commentaires, les extraits
 * `(nom) {`, le bloc global `{`, les matchers `@nom`, les directives
 * imbriquées, et le catchall `:443` (qui ne nomme personne, et c'est
 * justement le trou dans lequel tombent les hôtes oubliés).
 */
export function hotesServis(source) {
  const hotes = new Set();
  let profondeur = 0;

  for (const brute of String(source ?? "").split("\n")) {
    const ligne = brute.split("#")[0].trim();
    if (!ligne) continue;

    if (profondeur === 0 && ligne.endsWith("{")) {
      const adresse = ligne.slice(0, -1).trim();
      // `{` seul = options globales ; `(nom)` = un extrait réutilisable.
      if (adresse && !adresse.startsWith("(")) {
        for (const morceau of adresse.split(",")) {
          const hote = morceau.trim().replace(/^https?:\/\//, "").replace(/:\d+$/, "");
          // `:443` nu, `*` et les jokers ne nomment aucun site précis.
          if (hote && !hote.startsWith(":") && !hote.includes("*")) hotes.add(hote.toLowerCase());
        }
      }
    }

    // La profondeur se compte APRÈS, pour que la ligne d'ouverture soit
    // lue au niveau zéro.
    for (const c of ligne) {
      if (c === "{") profondeur += 1;
      else if (c === "}") profondeur = Math.max(0, profondeur - 1);
    }
  }
  return hotes;
}

/**
 * Les hôtes que le CODE désigne, avec l'endroit qui les nomme.
 *
 * Ce ne sont pas des noms recopiés à la main : chacun est une constante
 * d'un module, et `tests/logic/caddy-hosts.test.mts` vérifie que la
 * constante vaut toujours ça. Le jour où quelqu'un change
 * `ATELIER_BASE_URL`, le test rouge renvoie ici au lieu de laisser la
 * liste se périmer en silence.
 *
 * Une adresse écrite dans le code et sans bloc Caddy, c'est une panne
 * qui attend un déploiement : l'app tourne, PM2 est vert, et le
 * navigateur affiche une erreur TLS que rien n'explique.
 */
export const HOTES_ATTENDUS = [
  { hote: "quiz.tipote.com", ou: "lib/authLinks.ts (domaine canonique de Tiquiz)" },
  { hote: "tiquiz.fr", ou: "lib/publicHost.ts, HOTE_VENTE" },
  { hote: "atelierduquiz.fr", ou: "lib/affiliateUrls.ts, ATELIER_SALES_URL" },
  { hote: "quizing.tipote.com", ou: "lib/partner/atelierUrl.ts, ATELIER_BASE_URL" },
  { hote: "affiliate.tipote.com", ou: "lib/affiliateUrls.ts, AFFILIATE_DASHBOARD_URL" },
  { hote: "app.tipote.com", ou: "l'app Tipote" },
];

/** Ceux que le dépôt ne sert pas alors que le code les désigne. */
export function hotesAbsents(repo) {
  const servis = hotesServis(repo);
  return HOTES_ATTENDUS.filter((h) => !servis.has(h.hote));
}

/** Ce que le dépôt oublie par rapport à ce qui tourne. */
export function hotesPerdus(repo, live) {
  return [...hotesServis(live)].filter((h) => !hotesServis(repo).has(h)).sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!fs.existsSync(LIVE)) {
    console.log(`Pas de configuration en service a ${LIVE} : rien a comparer.`);
    process.exit(0);
  }
  const repo = fs.readFileSync(REPO, "utf8");
  const live = fs.readFileSync(LIVE, "utf8");

  // D'ABORD les hôtes que le code désigne : ce contrôle ne dépend
  // d'aucun fichier de configuration, donc il tient même quand les deux
  // ont perdu le même nom. C'est la moitié qui manquait.
  const absents = hotesAbsents(repo);
  if (absents.length > 0) {
    console.error("");
    console.error("  DEPLOIEMENT REFUSE : le code designe des hotes sans bloc Caddy");
    console.error("");
    for (const a of absents) console.error(`    - ${a.hote}   (${a.ou})`);
    console.error("");
    console.error("  Sans bloc nomme, Caddy ne peut produire aucun certificat pour");
    console.error("  ce nom : le navigateur affiche une erreur TLS, PM2 reste vert");
    console.error("  et aucun journal d'application ne dit quoi que ce soit.");
    console.error("");
    process.exit(1);
  }

  const perdus = hotesPerdus(repo, live);

  if (perdus.length === 0) {
    const n = hotesServis(repo).size;
    console.log(
      `OK : les ${n} hotes du depot couvrent tout ce qui tourne, ` +
        `et les ${HOTES_ATTENDUS.length} adresses nommees par le code.`,
    );
    process.exit(0);
  }

  console.error("");
  console.error("  DEPLOIEMENT REFUSE : le fichier du depot PERDRAIT ces hotes");
  console.error("");
  for (const h of perdus) console.error(`    - ${h}`);
  console.error("");
  console.error("  Ils sont servis aujourd'hui et n'ont pas de bloc dans");
  console.error(`  ${REPO}. Les copier par dessus les ferait disparaitre, et`);
  console.error("  le symptome serait une erreur TLS sans rien dans les journaux.");
  console.error("");
  console.error("  A faire : recopier leur bloc depuis la configuration en");
  console.error("  service vers le depot, puis relancer.");
  console.error("");
  process.exit(1);
}
