#!/usr/bin/env node
/**
 * Le serveur sert-il VRAIMENT le dernier code de `main` ?
 *
 * Pourquoi ce controle existe (2 septembre 2026) : le `git pull` du
 * serveur echouait (URL de remote cassee), et comme les commandes de
 * deploiement etaient sur des lignes separees, `npm ci`, `npm run build`
 * et `pm2 restart` tournaient quand meme. Tout avait l'air de marcher,
 * et le serveur reconstruisait l'ANCIEN code, en silence, pendant que
 * Bene cherchait sa correction manquante dans le code.
 *
 * Un deploiement fantome ne se signale jamais tout seul : il faut aller
 * comparer ce que le serveur a en main avec ce que GitHub a.
 */
import { execFileSync } from "node:child_process";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

let distant;
try {
  git("fetch", "-q", "origin", "main");
  distant = git("log", "origin/main", "-1", "--format=%h %ad %s", "--date=short");
} catch (e) {
  // "je n'ai pas pu regarder" et "il n'y a rien" sont deux reponses
  // differentes : on ne dit surtout pas que le serveur est a jour.
  console.error("\n  Impossible de joindre GitHub, donc impossible de conclure.\n");
  console.error(`  ${String(e?.message || e).split("\n")[0]}\n`);
  console.error("  Si le message parle de 'Username for https://github.com' :");
  console.error("  le depot est PUBLIC, donc aucun droit ne manque. GitHub a");
  console.error("  repondu 401 sur un tirage anonyme, et c'est en general");
  console.error("  temporaire (limite de debit sur l'IP). On reessaie plus tard,");
  console.error("  et on garde GIT_TERMINAL_PROMPT=0 pour ne jamais rester");
  console.error("  coince sur un prompt muet. Si ca dure, une cle SSH de");
  console.error("  deploiement supprime la dependance au tirage anonyme.\n");
  process.exit(2);
}

const local = git("log", "-1", "--format=%h %ad %s", "--date=short");
const memeCommit = git("rev-parse", "HEAD") === git("rev-parse", "origin/main");

console.log("");
console.log(`  serveur : ${local}`);
console.log(`  github  : ${distant}`);
console.log("");

if (memeCommit) {
  console.log("  Le serveur a bien le dernier code de main.");
  console.log("  (il reste a l'avoir CONSTRUIT : npm run build && pm2 restart)\n");
  process.exit(0);
}

console.log("  LE SERVEUR N'A PAS LE DERNIER CODE.");
console.log("  Le pull n'a pas eu lieu, ou il a echoue sans arreter la suite.\n");
process.exit(1);
