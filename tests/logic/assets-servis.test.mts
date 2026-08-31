// tests/logic/assets-servis.test.mts
//
// PANNE DU 31 AOÛT 2026 : TOUTES LES IMAGES EN 403, D'UN COUP.
//
// Béné : "toutes les images sont cassées c'est pas normal", puis
// "j'ai même plus les favicon putain", puis "a priori tous les champs
// pour ajouter des images ont disparu de tiquiz". Et Damien, une vraie
// cliente : "il a perdu tous ses visuels de quiz".
//
// TROIS SYMPTÔMES, UNE SEULE CAUSE, ET AUCUN FICHIER PERDU.
//
// Les images avaient été basculées sur le serveur des vidéos pour
// économiser Supabase. Le bloc qui sert `/assets/` a été écrit dans
// `infra/nginx/videos.*.conf`... alors que c'est CADDY qui répond sur
// `videos.quiz.tipote.com`. nginx ne voit jamais ces requêtes.
//
// `/assets/<image>.webp` tombait donc dans le bloc des VIDÉOS, qui
// exige un lien signé (`forward_auth` -> `/_validate-secure-link`).
// Aucune image n'en porte : Caddy répondait `403 forbidden`.
//
// LE 403 ÉTAIT LA SIGNATURE DU DIAGNOSTIC, et c'est ce qu'il faut
// retenir : un fichier absent aurait rendu 404. Le 403 disait que le
// refus venait de l'AUTHENTIFICATION, pas du disque. Chercher les
// fichiers perdus aurait été chercher au mauvais endroit.
//
// Et le troisième symptôme n'en était pas un : `QuizDetailClient` rend
// l'aperçu À LA PLACE du bouton d'ajout dès qu'une image existe. Les
// champs n'avaient pas disparu, ils étaient remplacés par des aperçus
// cassés.
//
// CE QUE CE TEST FIGE : le Caddyfile sert bien `/assets/`, depuis le
// dossier que la route d'envoi écrit, et SANS la signature des vidéos.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { DOSSIER_ASSETS_DEFAUT, PREFIXE_ASSETS } from "@/lib/storage/cheminAsset";

const CADDY = readFileSync("infra/caddy/Caddyfile", "utf8");

/** Le corps du bloc de site qui sert les domaines `videos.*`. */
function blocVideos(source: string): string {
  const lignes = source.split("\n");
  const debut = lignes.findIndex(
    (l) => /^videos\./.test(l.trim()) && l.trim().endsWith("{"),
  );
  assert.notEqual(debut, -1, "aucun bloc de site `videos.*` dans le Caddyfile");

  let profondeur = 0;
  const corps: string[] = [];
  for (let i = debut; i < lignes.length; i += 1) {
    const nue = lignes[i].split("#")[0];
    profondeur += (nue.match(/\{/g) ?? []).length;
    profondeur -= (nue.match(/\}/g) ?? []).length;
    if (i > debut) corps.push(lignes[i]);
    if (profondeur === 0 && i > debut) break;
  }
  return corps.join("\n");
}

const VIDEOS = blocVideos(CADDY);

test("le Caddyfile sert /assets/ sur le domaine des videos", () => {
  // C'est CE bloc qui manquait le 31 aout. Sans lui, tout tombe dans
  // le handle des videos.
  assert.match(
    VIDEOS,
    new RegExp(`handle\\s+${PREFIXE_ASSETS}/\\*\\s*\\{`),
    `Le bloc de site videos.* ne sert pas ${PREFIXE_ASSETS}/* : toutes les ` +
      "images des creatrices repondront 403 (le handle des videos exige " +
      "un lien signe).",
  );
});

test("il sert le dossier que la route d'envoi ecrit vraiment", () => {
  // Deux copies d'un chemin divergent toujours. Ici la divergence
  // coute toutes les images : le fichier est ecrit a un endroit et
  // cherche a un autre, donc 404 sur tout.
  const bloc = VIDEOS.split(`handle ${PREFIXE_ASSETS}/*`)[1] ?? "";
  assert.match(
    bloc.split("}")[0] + bloc.split("}").slice(1, 3).join("}"),
    new RegExp(`root\\s+\\*\\s+${DOSSIER_ASSETS_DEFAUT}(\\s|$)`, "m"),
    `Le bloc ${PREFIXE_ASSETS} doit servir ${DOSSIER_ASSETS_DEFAUT}, le dossier ` +
      "que app/api/upload/asset/route.ts ecrit (ASSETS_DIR).",
  );
});

test("les images ne passent PAS par la signature des videos", () => {
  const apres = VIDEOS.split(`handle ${PREFIXE_ASSETS}/*`)[1] ?? "";
  const corpsAssets = apres.slice(0, apres.indexOf("\n        handle {"));
  assert.ok(
    !corpsAssets.includes("forward_auth"),
    "Le bloc /assets ne doit contenir aucun `forward_auth` : une image " +
      "publique n'a pas de lien signe, donc le validateur refuserait tout " +
      "(403 sur chaque image, exactement la panne du 31 aout).",
  );
});

test("le bloc /assets vient AVANT le handle attrape-tout des videos", () => {
  // Les `handle` de Caddy sont exclusifs et evalues dans l'ORDRE DU
  // FICHIER. Place apres, le handle des videos prendrait tout et le
  // bloc /assets ne servirait jamais : la panne serait identique, avec
  // une configuration qui a l'air juste a la lecture.
  const iAssets = VIDEOS.indexOf(`handle ${PREFIXE_ASSETS}/*`);
  const iVideos = VIDEOS.indexOf("forward_auth 127.0.0.1:1080");
  assert.notEqual(iAssets, -1, "bloc /assets absent");
  assert.notEqual(iVideos, -1, "handle des videos absent");
  assert.ok(
    iAssets < iVideos,
    "Le bloc /assets doit etre ecrit AVANT le handle des videos.",
  );
});

test("le test attrape bien la regression qu'il decrit", () => {
  // Un test qui ne peut plus echouer ment (regle du 24 aout). On
  // rejoue la configuration D'AVANT la correction et on exige qu'elle
  // soit refusee.
  const avant = VIDEOS.replace(
    new RegExp(`handle\\s+${PREFIXE_ASSETS}/\\*`),
    "handle /rien-du-tout/*",
  );
  assert.doesNotMatch(
    avant,
    new RegExp(`handle\\s+${PREFIXE_ASSETS}/\\*\\s*\\{`),
    "la configuration d'avant la correction doit etre reconnue comme cassee",
  );
});
