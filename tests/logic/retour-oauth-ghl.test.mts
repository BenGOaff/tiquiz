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

// ---------------------------------------------------------------------------
// LE RETOUR ATTERRIT SUR NOTRE DOMAINE, JAMAIS SUR localhost (14 septembre,
// le soir). Bene, apres avoir choisi son sous-compte : "apres je vais sur
// https://localhost:3001/settings?tab=connections&ghl=ok&n=1. C'est quoi ce
// merdier encore ??". L'echange avait REUSSI (ghl=ok, n=1) ; seule la
// redirection finale etait batie sur `req.nextUrl.origin`, qui derriere le
// proxy vaut `localhost:3001`. C'est le `??` du 2 aout dans une autre robe :
// une origine presente et fausse traverse tout. `resolveAppUrl` refuse toute
// adresse locale, et c'est deja lui qui fabrique l'adresse de retour envoyee
// a GoHighLevel : les deux doivent parler du meme site.
// ---------------------------------------------------------------------------

const OAUTH = "app/api/connexions/crm-oauth/oauth/route.ts";

test("aucune redirection des deux routes OAuth n'est batie sur l'origine brute de la requete", () => {
  for (const f of [CALLBACK, OAUTH]) {
    const src = sansCommentaires(lire(f));
    assert.ok(src.includes("resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin)"), `${f} : passe par resolveAppUrl`);
    // Toute autre lecture de l'origine est une redirection qui peut sortir en localhost.
    const brutes = src.split("req.nextUrl.origin").length - 1;
    const viaResolve = src.split("resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin)").length - 1;
    assert.equal(brutes, viaResolve, `${f} : ${brutes - viaResolve} lecture(s) de req.nextUrl.origin hors de resolveAppUrl`);
    assert.ok(!/new URL\([^)]*req\.nextUrl\.origin\)/.test(src), `${f} : une URL de redirection lit l'origine brute`);
  }
});

test("sur la carte GoHighLevel, un clic EST le depart OAuth tant que rien n'est connecte, et ouvre la fenetre de gestion ensuite", () => {
  const src = sansCommentaires(lire("components/connexions/ConnexionsTab.tsx"));
  assert.ok(src.includes('const LIEN_OAUTH_GHL = "/api/connexions/crm-oauth/oauth"'), "le chemin OAuth est nomme");
  // La CARTE ENTIERE est le lien : pas un bouton dedans, pas de panneau dessous.
  assert.ok(/const directOauth = f\.id === "gohighlevel" && oauthGhl && c\.n === 0 && !aConfirmer;/.test(src), "la carte sans connexion et avec OAuth configure prend le chemin direct, sauf confirmation en attente");
  assert.ok(/directOauth \? \(\s*<a href=\{LIEN_OAUTH_GHL\} className=\{CARTE\}>/.test(src), "la carte est un lien vers le depart OAuth");
  assert.ok(/<button type="button" disabled=\{!f\.disponible\} onClick=\{\(\) => setOuvert\(f\.id\)\} className=\{CARTE\}>/.test(src), "sinon la carte ouvre la fenetre");
  // Tout se gere dans une FENETRE (Bene, 15 septembre : "un clic sur la carte
  // ouvre une popup qui permet de tout gerer, c'est pas ergonomique de scroller").
  assert.ok(src.includes("<Dialog open={fOuvert !== null}"), "la gestion vit dans une fenetre");
  for (const m of ["<SioApiKeysManager sansCadre />", "<GoHighLevelManager oauthDisponible={oauthGhl}"]) {
    const i = src.indexOf(m);
    assert.ok(i > src.indexOf("<DialogContent") && i < src.indexOf("</DialogContent>"), `${m} est rendu DANS la fenetre, pas sous la grille`);
  }
  // Le libelle ne dit "Connecter" que sans connexion : "je vois toujours le
  // bouton connecter alors que je SUIS connectee".
  assert.ok(/\{c\.n > 0 \? t\("boutonGerer"\) : t\("boutonConnecter"\)\}/.test(src), "Gerer des qu'une connexion existe");
  // Le manager garde le meme chemin : deux departs differents finiraient par diverger.
  const manager = sansCommentaires(lire("components/connexions/GoHighLevelManager.tsx"));
  assert.ok(manager.includes('href="/api/connexions/crm-oauth/oauth"'), "la fenetre part vers le meme chemin");
  assert.ok(manager.includes('t("ajouterSousCompte")'), "dans la fenetre, le geste s'appelle ajouter un sous-compte, jamais Connecter");
  assert.ok(!manager.includes('t("oauthBouton")') && !manager.includes('t("oauthAide")'), "plus de gros bouton Connecter ni de phrase d'explication dans la fenetre");
});

test("plus aucun jeton prive a l'ecran : connexion native, c'est tout (Bene, 15 septembre 2026)", () => {
  const manager = sansCommentaires(lire("components/connexions/GoHighLevelManager.tsx"));
  assert.ok(!/type="password"/.test(manager), "aucun champ de jeton");
  assert.ok(!/\btoken\b/.test(manager), "le manager n'envoie plus de jeton");
  assert.ok(!/ouJeton|nouveauJeton|jetonLabel|modeAgence/.test(manager), "aucune cle de langue du jeton");
  assert.ok(!/<Card/.test(manager), "le manager n'a plus de cadre : la fenetre porte deja le nom de l'outil");
  // Les sept langues : les cles du jeton sont PARTIES, et aucune phrase de
  // l'onglet ne parle encore de jeton ou de token.
  for (const langue of ["fr", "en", "es", "it", "ar", "pt", "pt-BR"]) {
    const cx = (JSON.parse(lire(`messages/${langue}.json`)) as { connexions: Record<string, unknown> }).connexions;
    const ghl = cx.ghl as Record<string, unknown>;
    for (const k of ["ouJeton", "nouveauJeton", "jetonLabel", "jetonAide", "oauthAide", "oauthBouton", "modeJeton", "modeOauth"]) {
      assert.ok(!(k in ghl), `${langue} : la cle ${k} est partie`);
    }
    assert.equal(typeof ghl.ajouterSousCompte, "string", `${langue} : ajouterSousCompte existe`);
    const phrases: string[] = [];
    const marcher = (o: unknown) => {
      if (typeof o === "string") phrases.push(o);
      else if (o && typeof o === "object") for (const v of Object.values(o as Record<string, unknown>)) marcher(v);
    };
    marcher(cx);
    for (const ph of phrases) assert.ok(!/jeton|token/i.test(ph), `${langue} : une phrase parle encore de jeton : ${ph}`);
  }
});
