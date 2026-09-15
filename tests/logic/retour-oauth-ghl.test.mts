// tests/logic/retour-oauth-ghl.test.mts
//
// UNE INSTALLATION LANCEE CHEZ GOHIGHLEVEL ARRIVE SANS NOTRE `state`, ET
// ELLE DEMANDE UN CLIC AVANT D'ECRIRE (14 septembre 2026).
//
// Bene, en testant le bouton : "error.noAppVersionIdFound", puis "je suis
// bien redirigee vers ghl mais ca ne marche pas". La page de choix du
// sous-compte exige une version PUBLIEE de l'app ; en attendant, le seul
// chemin est le lien de test de GoHighLevel (Manage > Versions > Test
// Link), et c'est AUSSI le chemin qu'emprunte un client qui installe
// depuis leur Marketplace. Ces retours n'ont jamais vu notre `state` :
// le callback d'avant les refusait tous ("La connexion a expire en
// route"), donc le parcours "un clic" de Quizify etait impossible.
//
// CE QUE CE FICHIER TIENT, et les moities comptent ENSEMBLE :
//  1. la decision est PURE : `state` present et juste -> notre bouton ;
//     `state` present et faux -> refus, JAMAIS rattrape par le chemin 2 ;
//     pas de `state` -> une installation venue du fournisseur ;
//  2. sur ce chemin 2, le GET n'ecrit RIEN : il range le code dans un
//     cookie httpOnly court et renvoie `ghl=confirmer` ; c'est un POST,
//     venu de notre page, qui echange. Sans ce clic, n'importe qui
//     pourrait faire atterrir chez quelqu'un d'autre un code tire de SON
//     sous-compte, et les leads partiraient chez lui ;
//  3. sans session, le code n'est pas perdu : la redirection vers /login
//     porte l'adresse COMPLETE ;
//  4. l'onglet Connexions montre le bouton "Relier", et les mots
//     existent dans les 7 langues ;
//  5. le menu de l'avatar ne dit plus "Cle Systeme.io" : il mene a
//     l'onglet Connexions, ou vivent aussi les autres outils.
//
// Verifie en rejouant des versions fautives (le GET qui echange sans
// `state`, un `state` faux rattrape comme "depuis le fournisseur", le
// POST qui accepte un cookie vide) : elles rougissent.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { classerRetourOauth, COOKIE_CODE_GHL, DUREE_CODE_SECONDES, estUnCodeOauth } from "@/lib/integrations/retourOauth";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const racine = process.cwd();
const lire = (p: string) => readFileSync(path.join(racine, p), "utf8");
const CALLBACK = "app/api/connexions/crm-oauth/callback/route.ts";
const LANGUES = ["fr", "en", "es", "it", "ar", "pt", "pt-BR"];

test("notre bouton : le state present et juste echange tout de suite", () => {
  assert.equal(classerRetourOauth({ code: "abc12345", state: "s1", attendu: "s1" }), "notre-bouton");
});

test("un state present et FAUX est refuse, jamais rattrape par le chemin 2", () => {
  assert.equal(classerRetourOauth({ code: "abc12345", state: "s1", attendu: "s2" }), "invalide");
  assert.equal(classerRetourOauth({ code: "abc12345", state: "s1", attendu: "" }), "invalide");
});

test("sans state, c'est une installation lancee chez le fournisseur : elle attend un clic", () => {
  assert.equal(classerRetourOauth({ code: "abc12345", state: "", attendu: "" }), "depuis-le-fournisseur");
  assert.equal(classerRetourOauth({ code: "abc12345", state: "", attendu: "cookie-oublie" }), "depuis-le-fournisseur");
});

test("un code absent ou mal forme est invalide, quel que soit le state", () => {
  assert.equal(classerRetourOauth({ code: "", state: "", attendu: "" }), "invalide");
  assert.equal(classerRetourOauth({ code: "", state: "s1", attendu: "s1" }), "invalide");
  assert.equal(estUnCodeOauth("<script>"), false);
  assert.equal(estUnCodeOauth("a".repeat(600)), false);
  assert.equal(estUnCodeOauth("0123456789abcdef"), true);
});

test("le cookie du code est court : un code OAuth ne vit que quelques minutes", () => {
  assert.ok(DUREE_CODE_SECONDES <= 600, "un code garde plus de dix minutes serait un code perime qu'on croit bon");
  assert.ok(DUREE_CODE_SECONDES >= 120, "le temps de lire l'ecran et de cliquer");
  assert.equal(COOKIE_CODE_GHL, "tq_ghl_code");
});

test("le GET du callback n'echange JAMAIS un code venu sans state : il range et demande confirmation", () => {
  const src = sansCommentaires(lire(CALLBACK));
  const get = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function POST"));
  assert.ok(get.includes('genre === "depuis-le-fournisseur"'), "le GET doit distinguer le chemin 2");
  const brancheFournisseur = get.slice(get.indexOf('genre === "depuis-le-fournisseur"'), get.indexOf("relierAvecCode("));
  assert.ok(!brancheFournisseur.includes("echangerCodeGhl"), "la branche fournisseur ne doit pas echanger le code");
  assert.ok(brancheFournisseur.includes('retour(req, "confirmer")'), "elle renvoie ghl=confirmer");
  assert.ok(brancheFournisseur.includes("COOKIE_CODE_GHL"), "elle range le code dans le cookie dedie");
  assert.ok(brancheFournisseur.includes("httpOnly: true"), "le code ne se lit pas depuis le navigateur");
  assert.ok(get.includes("classerRetourOauth("), "le GET delegue la decision au module pur");
});

test("le POST echange le code du cookie, refuse un cookie vide, et efface le cookie dans tous les cas", () => {
  const src = sansCommentaires(lire(CALLBACK));
  const post = src.slice(src.indexOf("export async function POST"));
  assert.ok(post.includes("COOKIE_CODE_GHL"), "le POST lit le cookie du code");
  assert.ok(post.includes("relierAvecCode("), "le POST echange par la MEME fonction que le GET");
  assert.ok(post.includes('classerRetourOauth({ code, state: "", attendu: "" }) !== "depuis-le-fournisseur"'), "un cookie vide ou mal forme est refuse");
  assert.ok(post.includes('mot: "expire"'), "et il le DIT, au lieu d'echouer en silence");
  assert.equal((post.match(/maxAge: 0/g) ?? []).length >= 1, true, "le cookie est efface");
  assert.ok(!post.includes("searchParams.get(\"code\")"), "le POST ne lit JAMAIS le code dans l'adresse : ce serait le GET par une autre porte");
});

test("sans session, la redirection vers /login garde l'adresse COMPLETE, code compris", () => {
  const src = sansCommentaires(lire(CALLBACK));
  assert.ok(src.includes("req.nextUrl.search"), "la query (donc le code) doit voyager dans le redirect");
  assert.ok(src.includes("encodeURIComponent(cible)"), "et elle est encodee, sinon le & de la query coupe le redirect");
});

test("l'onglet Connexions montre le bouton Relier, et il POSTe (jamais un GET)", () => {
  const src = sansCommentaires(lire("components/connexions/ConnexionsTab.tsx"));
  assert.ok(src.includes('ghl === "confirmer"'), "le mot confirmer est reconnu");
  assert.ok(src.includes('fetch("/api/connexions/crm-oauth/callback", { method: "POST" })'), "le clic est un POST sur le callback");
  assert.ok(src.includes('t("ghl.confirmer.bouton")'), "le bouton est traduit");
  assert.ok(src.includes('t("ghl.confirmer.annuler")'), "et on peut refuser");
});

test("les mots existent dans les 7 langues, sans tiret cadratin ni chevron", () => {
  for (const l of LANGUES) {
    const j = JSON.parse(lire(`messages/${l}.json`));
    const ghl = j.connexions?.ghl;
    assert.ok(ghl, `${l} : namespace connexions.ghl`);
    for (const k of ["texte", "bouton", "annuler"]) {
      const v = ghl.confirmer?.[k];
      assert.ok(typeof v === "string" && v.trim().length > 0, `${l} : confirmer.${k}`);
      assert.ok(!/[—–«»]/.test(v), `${l} : confirmer.${k} porte un tiret cadratin ou un chevron`);
    }
    assert.ok(typeof ghl.retour?.expire === "string" && ghl.retour.expire.length > 0, `${l} : retour.expire`);
    assert.ok(!/[—–«»]/.test(ghl.retour.expire), `${l} : retour.expire`);
  }
});

test("le menu de l'avatar mene a l'onglet Connexions, plus a une cle Systeme.io", () => {
  const src = sansCommentaires(lire("components/UserAvatarMenu.tsx"));
  assert.ok(src.includes('{ key: "connections", icon: Plug, tab: "connections" }'), "l'entree du menu est Connexions");
  assert.ok(!src.includes('tab: "systemeio"'), "plus d'entree qui mene a l'ancien onglet");
  for (const l of LANGUES) {
    const j = JSON.parse(lire(`messages/${l}.json`));
    const menu = j.header?.menu;
    assert.ok(typeof menu?.connections === "string" && menu.connections.length > 0, `${l} : header.menu.connections`);
    assert.equal(menu.systemeio, undefined, `${l} : l'ancienne cle header.menu.systemeio doit disparaitre`);
    assert.equal(menu.connections, j.settings?.tabConnections, `${l} : le menu dit le meme mot que l'onglet`);
  }
});
