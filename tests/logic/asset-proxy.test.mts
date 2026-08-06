// tests/logic/asset-proxy.test.mts
//
// Alerte Supabase du 6 août 2026 : 6,68 Go de "cached egress" sur les
// 5 Go inclus dans le plan gratuit, avec un pic de 1,7 Go en une seule
// journée.
//
// La cause était dans le code : les images vivent dans le bucket
// `public-assets`, leur adresse `supabase.co` est écrite en base, et le
// viewer les affiche avec de simples `<img>`. Chaque visiteur de chaque
// quiz les téléchargeait donc directement chez Supabase, sans que rien ne
// les mette en cache entre les deux. La facture grandissait avec le
// trafic des créatrices.
//
// Ce fichier fige les deux garanties : on réécrit CE QU'IL FAUT, et
// RIEN D'AUTRE.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assetProxyEnabled,
  proxyAssetsDeep,
  storageAssetPath,
  toProxiedAssetUrl,
} from "@/lib/assetProxy";

const BASE = "https://abcdefgh.supabase.co";
const IMG = `${BASE}/storage/v1/object/public/public-assets/quiz/user-1/photo-123.jpg`;

// ── Ce qu'on réécrit ─────────────────────────────────────────────────

test("une image de nos quiz passe par notre domaine", () => {
  assert.equal(toProxiedAssetUrl(IMG, BASE), "/img/public-assets/quiz/user-1/photo-123.jpg");
});

test("la reecriture marche quelle que soit la profondeur du chemin", () => {
  const deep = `${BASE}/storage/v1/object/public/public-assets/a/b/c/d/e.png`;
  assert.equal(toProxiedAssetUrl(deep, BASE), "/img/public-assets/a/b/c/d/e.png");
});

test("une base avec un slash final ne double pas le slash", () => {
  assert.equal(toProxiedAssetUrl(IMG, `${BASE}/`), "/img/public-assets/quiz/user-1/photo-123.jpg");
});

// ── Ce qu'on ne touche à AUCUN prix ──────────────────────────────────

test("une image externe reste intacte", () => {
  // Une creatrice colle une adresse Unsplash ou celle de son site : la
  // rediriger vers notre proxy donnerait une image cassee.
  for (const url of [
    "https://images.unsplash.com/photo-1.jpg",
    "https://cdn.sonsite.fr/logo.png",
    "data:image/png;base64,iVBORw0KGgo=",
    "/deja-relatif.png",
    "",
  ]) {
    assert.equal(toProxiedAssetUrl(url, BASE), url, url || "(vide)");
  }
});

test("un objet PRIVE n'est jamais servi", () => {
  // `/object/public/` seulement. Proxyfier un objet authentifie
  // reviendrait a le rendre public.
  const prive = `${BASE}/storage/v1/object/authenticated/private/secret.pdf`;
  assert.equal(storageAssetPath(prive, BASE), null);
  assert.equal(toProxiedAssetUrl(prive, BASE), prive);
});

test("un bucket qu'on ne sert pas est refuse", () => {
  // Liste FERMEE : un proxy qui accepte n'importe quel chemin devient un
  // relais ouvert vers tout ce que le projet heberge.
  const autre = `${BASE}/storage/v1/object/public/backups/dump.sql`;
  assert.equal(storageAssetPath(autre, BASE), null);
});

test("une remontee de dossier est refusee", () => {
  const piege = `${BASE}/storage/v1/object/public/public-assets/../../secret`;
  assert.equal(storageAssetPath(piege, BASE), null);
});

test("l'adresse d'un AUTRE projet Supabase n'est pas la notre", () => {
  const ailleurs = "https://zzzzzz.supabase.co/storage/v1/object/public/public-assets/x.png";
  assert.equal(toProxiedAssetUrl(ailleurs, BASE), ailleurs);
});

test("sans base connue, on ne reecrit rien", () => {
  // Une variable d'environnement vide ne doit pas produire `/img/...`
  // pointant nulle part.
  assert.equal(toProxiedAssetUrl(IMG, ""), IMG);
});

// ── Une seule passe, sur toute la réponse ────────────────────────────

test("toute la structure est couverte, quel que soit le nom du champ", () => {
  // Une liste blanche (`bonus_image_url`, `brand_logo_url`...) oublierait
  // la prochaine colonne d'image ajoutee, et l'oubli ne se verrait que
  // sur la facture du mois suivant.
  const payload = {
    brand_logo_url: IMG,
    un_champ_invente_demain: IMG,
    results: [{ image_url: IMG, beat_media: { cause: { url: IMG } } }],
    rien: null,
    nombre: 42,
    texte: "une phrase ordinaire",
  };
  const out = proxyAssetsDeep(payload, BASE);
  assert.equal(out.brand_logo_url, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.un_champ_invente_demain, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.results[0].image_url, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.results[0].beat_media.cause.url, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.rien, null);
  assert.equal(out.nombre, 42);
  assert.equal(out.texte, "une phrase ordinaire");
});

test("une adresse au milieu d'un texte riche n'est pas touchee", () => {
  // On ne reecrit qu'une valeur qui EST une adresse, pas une adresse
  // citee dans une phrase : couper au milieu d'un attribut HTML casserait
  // le rendu.
  const html = `<p>Voir <img src="${IMG}"> ici</p>`;
  assert.equal(proxyAssetsDeep({ intro: html }, BASE).intro, html);
});

test("aucune boucle infinie sur une structure profonde", () => {
  const profond = { a: { b: { c: { d: { e: [IMG] } } } } };
  assert.equal(profond.a.b.c.d.e[0], IMG, "l'objet d'entree n'est pas modifie");
  assert.equal(proxyAssetsDeep(profond, BASE).a.b.c.d.e[0], "/img/public-assets/quiz/user-1/photo-123.jpg");
});

// ── Le coupe-circuit ─────────────────────────────────────────────────

test("ASSET_PROXY=off rend la main aux adresses d'origine", () => {
  // Elles sont intactes en base : couper ne casse rien, et se fait par un
  // `pm2 restart`, pas par un redeploiement un samedi.
  assert.equal(assetProxyEnabled("off"), false);
  assert.equal(assetProxyEnabled("OFF"), false);
  assert.equal(assetProxyEnabled(" off "), false);
  assert.equal(toProxiedAssetUrl(IMG, BASE, false), IMG);
  assert.equal(proxyAssetsDeep({ u: IMG }, BASE, false).u, IMG);
});

test("par defaut, c'est actif", () => {
  // Une variable absente ne doit pas desactiver la mesure : c'est
  // l'inverse d'un garde-fou.
  for (const v of [undefined, null, "", "on", "1", "true"]) {
    assert.equal(assetProxyEnabled(v), true, String(v));
  }
});

// ── La route, et la réponse publique ─────────────────────────────────

test("la route sert un cache long, sinon elle ne sert a rien", () => {
  // C'est l'en-tete qui fait tout le travail : sans lui, on remplace une
  // requete chez Supabase par une requete chez nous PLUS une requete chez
  // Supabase.
  const src = readFileSync(new URL("../../app/img/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(src, /max-age=\$\{YEAR\}, immutable/);
  assert.match(src, /CDN-Cache-Control/);
  assert.match(src, /next: \{ revalidate: YEAR \}/, "le cache de Next evite d'aller rechercher");
});

test("la route refuse ce qui n'est pas un bucket servi", () => {
  const src = readFileSync(new URL("../../app/img/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(src, /PROXIED_BUCKETS\.includes\(segments\[0\]\)/);
  assert.match(src, /assetProxyEnabled/);
});

test("la reponse publique passe par la reecriture", () => {
  // C'est LE point de passage du trafic visiteur : le viewer lit tout
  // par cette route.
  const src = readFileSync(
    new URL("../../app/api/quiz/[quizId]/public/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /proxyAssetsDeep/);
  assert.match(src, /quiz: \{\s*\.\.\.asset\(renderedQuiz\)/);
  assert.match(src, /questions: asset\(renderedQuestions\)/);
  assert.match(src, /results: asset\(renderedResults\)/);
});
