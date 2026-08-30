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
  const perdus = hotesPerdus(repo, live);

  if (perdus.length === 0) {
    const n = hotesServis(repo).size;
    console.log(`OK : les ${n} hotes du depot couvrent tout ce qui tourne.`);
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
