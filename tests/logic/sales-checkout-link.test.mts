// tests/logic/sales-checkout-link.test.mts
//
// LES BOUTONS PAYANTS DE LA PAGE DE VENTE MÈNENT CHEZ NOUS.
//
// Jumeau du test du même nom côté Atelier, écrit le même jour et pour la
// même raison, mais la mécanique n'est PAS la même.
//
// Béné, 21 août, dix minutes après la mise en ligne d'atelierduquiz.fr :
// "par contre j'ai l'impression qu'il ne m'ouvre pas notre bon de
// commande mais celui de systeme io ?" Elle avait raison. Là-bas c'était
// une popup Systeme.io capturée avec la page ; ici ce sont de vrais
// liens qui pointent en dur vers `tipote.fr/tiquiz-mensuel` et ses
// voisins.
//
// La même panne sous une autre forme, corrigée AVANT de brancher
// `tiquiz.fr` plutôt qu'en direct.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  SALES_CHECKOUT_TARGETS,
  SALES_LINKS_LEFT_ALONE,
  rewriteOrderLinks,
  samePage,
} from "../../lib/sales/salesPageLinks.ts";
import { renderSalesPage, stripHeadTags } from "../../lib/sales/servePage.ts";
import { publicSalesCanonical } from "../../lib/sales/salesHosts.ts";
import { findOwnerProduct } from "../../lib/checkout/catalog.ts";

const PAGE = path.join(process.cwd(), "content", "sales", "tiquiz.html");
const capturee = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, "utf8") : null;
const CIBLES = SALES_CHECKOUT_TARGETS.tiquiz;

test("LE BUG : un bouton payant ne mene plus chez Systeme.io", () => {
  const html = '<a href="https://www.tipote.fr/tiquiz-mensuel">Accès Mensuel</a>';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.ok(out.html.includes('href="/commande/mensuel"'), "le bouton pointe encore ailleurs");
  assert.ok(!out.html.includes("tipote.fr/tiquiz-mensuel"), "l'ancienne adresse survit");
  assert.equal(out.rewritten.length, 1);
});

test("les QUATRE paliers payants sont couverts", () => {
  // Un palier oublie, c'est une gamme entiere qui continue de se vendre
  // ailleurs sans que rien ne le dise.
  const attendus = ["mensuel", "mensuel-plus", "annuel", "annuel-plus"];
  assert.deepEqual([...new Set(Object.values(CIBLES))].sort(), [...attendus].sort());
  for (const produit of Object.values(CIBLES)) {
    assert.ok(findOwnerProduct(produit), `${produit} n'existe pas dans le catalogue`);
  }
});

test("L'INSCRIPTION GRATUITE reste chez Systeme.io, et c'est voulu", () => {
  // C'est un optin, pas une vente : il cree le contact et son tag, et
  // c'est le SEUL evenement qui porte une URL de tunnel (drame Ivan,
  // 7 aout). Le rediriger casserait le suivi des affilies sans rien
  // apporter, puisqu'il n'y a pas d'argent a encaisser.
  const html = '<a href="https://www.tipote.fr/tiquiz-gratuit">Accès Free</a>';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.ok(out.html.includes("tipote.fr/tiquiz-gratuit"), "l'optin gratuit a ete detourne");
  assert.deepEqual(out.rewritten, []);
  assert.deepEqual(out.unmapped, [], "l'optin gratuit ne doit pas declencher d'alerte");
});

test("un tunnel payant INCONNU des deux listes est SIGNALE", () => {
  // Une page recapturee apres un changement de gamme apporterait un
  // bouton payant qu'on enverrait toujours chez Systeme.io, en silence.
  const html = '<a href="https://www.tipote.fr/tiquiz-trimestriel">Accès Trimestriel</a>';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.deepEqual(out.unmapped, ["https://www.tipote.fr/tiquiz-trimestriel"]);
});

test("les liens qui n'ont rien a voir ne declenchent aucune alerte", () => {
  const html =
    '<a href="https://www.tipote.fr/mentions-legales">Mentions</a>' +
    '<a href="https://www.tipote.fr/affiliation">Affiliation</a>' +
    '<a href="https://affiliate.tipote.com/">Espace affilié</a>' +
    '<a href="https://quiz.tipote.com/">L\'app</a>';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.deepEqual(out.unmapped, []);
  assert.deepEqual(out.rewritten, []);
});

test("la barre finale et la query ne font pas rater un bouton", () => {
  // Une comparaison brute laisserait partir ces deux formes chez
  // Systeme.io, et personne ne s'en apercevrait avant une vente perdue.
  assert.ok(samePage("https://www.tipote.fr/tiquiz-annuel", "https://www.tipote.fr/tiquiz-annuel/"));
  assert.ok(
    samePage("https://www.tipote.fr/tiquiz-annuel", "http://www.tipote.fr/tiquiz-annuel?ref=X"),
  );
  assert.ok(!samePage("https://www.tipote.fr/tiquiz-annuel", "https://www.tipote.fr/tiquiz"));
  assert.ok(!samePage("pas une url", "https://www.tipote.fr/tiquiz"));
});

test("l'adresse d'affilie survit a la reecriture", () => {
  // Notre bon de commande sait lire `ref`. La perdre en route
  // priverait l'affilie de sa commission, en silence.
  const html = '<a href="https://www.tipote.fr/tiquiz-annuel-plus?ref=GWENN23">Annuel PLUS</a>';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.ok(out.html.includes('href="/commande/annuel-plus?ref=GWENN23"'), out.html);
});

test("la configuration JSON de la page est reecrite AUSSI", () => {
  // N'en corriger qu'un des deux, c'est la moitie d'une decision. Et une
  // moitie de decision finit toujours par contredire l'autre (partage du
  // resultat, 7 aout).
  const html = '"link":"https://www.tipote.fr/tiquiz-mensuel-plus"';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.ok(out.html.includes('"link":"/commande/mensuel-plus"'), out.html);
});

test("LES DEUX noms de la cle JSON sont traites", () => {
  // La page de l'Atelier ecrit "link", celle de Tiquiz ecrit "linkUrl".
  // Le premier jet ne connaissait que "link" et laissait les quatre
  // boutons payants de Tiquiz configures vers Systeme.io.
  const html = '"linkUrl":"https://www.tipote.fr/tiquiz-annuel"';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.ok(out.html.includes('"linkUrl":"/commande/annuel"'), out.html);
  assert.ok(!out.html.includes("tipote.fr/tiquiz-annuel"), "l'ancienne adresse survit dans le JSON");
});

test("les barres obliques echappees du JSON ne font pas rater un bouton", () => {
  const html = '"linkUrl":"https:\\/\\/www.tipote.fr\\/tiquiz-mensuel"';
  const out = rewriteOrderLinks(html, CIBLES);
  assert.ok(out.html.includes('"linkUrl":"/commande/mensuel"'), out.html);
});

test("les cibles de commande sont un parametre OBLIGATOIRE de renderSalesPage", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "lib/sales/servePage.ts"), "utf8");
  assert.ok(/checkoutTargets:/.test(src), "checkoutTargets n'est plus obligatoire");
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"),
    "utf8",
  );
  assert.ok(route.includes("checkoutTargets:"), "la route ne branche plus le bon de commande");
});

test("le noindex de Systeme.io est retire de la capture", () => {
  const html = '<meta charset="utf-8"><meta data-react-helmet="true" name="robots" content="noindex"/>';
  assert.ok(!stripHeadTags(html).includes("noindex"), "le noindex de la capture survit");
});

test("en apercu on ferme, sur le domaine public on ouvre", () => {
  const html = '<meta charset="utf-8"><body>ok</body>';
  const meta = {
    slug: "tiquiz",
    canonical: "https://www.tipote.fr/tiquiz",
    title: "T",
    description: "D",
    locale: "fr_FR",
  };
  const apercu = renderSalesPage(html, meta, { indexable: false, analytics: false, checkoutTargets: null });
  assert.ok(apercu.includes('name="robots" content="noindex, nofollow"'));
  const enLigne = renderSalesPage(html, meta, { indexable: true, analytics: false, checkoutTargets: null });
  assert.ok(!enLigne.includes("noindex"), "la page publique reste bloquee au referencement");
});

test("la canonique publique designe le domaine, pas Systeme.io", () => {
  assert.equal(publicSalesCanonical("tiquiz"), "https://tiquiz.fr/");
  assert.equal(publicSalesCanonical("page-inconnue"), null);
});

test("aucune adresse ne figure dans les DEUX listes", () => {
  // Une adresse a la fois redirigee et "laissee expres" serait une
  // contradiction silencieuse : l'une des deux intentions perdrait, sans
  // qu'on sache laquelle.
  for (const garde of SALES_LINKS_LEFT_ALONE) {
    for (const cible of Object.keys(CIBLES)) {
      assert.ok(!samePage(garde, cible), `${garde} figure dans les deux listes`);
    }
  }
});

// ── Sur la VRAIE page, celle que les visiteurs verront ──

test("la page capturee : plus aucun bouton payant ne part chez Systeme.io", () => {
  if (!capturee) {
    console.warn("[sales-checkout-link] content/sales/tiquiz.html absent, test ignore");
    return;
  }
  const out = rewriteOrderLinks(capturee, CIBLES);
  assert.equal(out.rewritten.length, 4, "les quatre paliers n'ont pas tous ete trouves sur la page");
  assert.deepEqual(out.unmapped, [], `tunnel(s) payant(s) non traite(s) : ${out.unmapped.join(", ")}`);

  // On verifie l'adresse ENTRE GUILLEMETS, partout : dans un `href`
  // comme dans la configuration. Chercher la sous-chaine nue serait
  // trompeur ("tiquiz-mensuel" est contenu dans "tiquiz-mensuel-plus"),
  // et ne verifier que le `href` laisserait passer exactement ce qui a
  // ete rate au premier jet.
  for (const url of Object.keys(CIBLES)) {
    assert.ok(
      !out.html.includes(`"${url}"`),
      `${url} est encore designe quelque part dans la page`,
    );
    const echappee = url.replace(/\//g, "\\/");
    assert.ok(!out.html.includes(`"${echappee}"`), `${url} survit sous forme echappee`);
  }
});

test("la page capturee : l'inscription gratuite est intacte", () => {
  if (!capturee) return;
  const out = rewriteOrderLinks(capturee, CIBLES);
  assert.ok(
    out.html.includes('href="https://www.tipote.fr/tiquiz-gratuit"'),
    "l'optin gratuit a ete detourne : le suivi des affilies est casse",
  );
});

// ---------------------------------------------------------------------
// L'ICÔNE DE L'ONGLET, ET LE LOGO DES DONNÉES STRUCTURÉES
//
// Béné, 30 août 2026 : "tu n'as pas mis le favicon de tiquiz mais celui
// de tipote pour la page de vente tiquiz.fr c'est dommage."
//
// La page est une CAPTURE d'un tunnel Systeme.io : elle porte l'icône du
// compte qui l'a publiée, donc le "t" bleu de Tipote. Deux produits qui
// portent la même icône ne se distinguent plus dans un onglet ni dans
// des favoris, et c'est la première chose qu'un visiteur voit.
//
// Le même défaut vivait dans le logo des données structurées ajouté la
// veille : une image de Tipote annoncée comme le logo officiel de
// Tiquiz. Une adresse écrite en dur à deux endroits ne se corrige jamais
// qu'à moitié (leçon de l'URL de l'Atelier, 3 août), d'où les deux
// contrôles côte à côte.
// ---------------------------------------------------------------------

test("l'icone de la capture est retiree, la notre est posee", async () => {
  const { buildHeadTags } = await import("../../lib/sales/servePage.ts");

  const capture =
    '<link rel="icon" type="image/png" href="/v/tiquiz/045f2fea8dfa.webp">' +
    '<link rel="apple-touch-icon" href="/v/tiquiz/045f2fea8dfa.webp">' +
    '<link rel="shortcut icon" href="/v/tiquiz/045f2fea8dfa.webp">';
  const nettoye = stripHeadTags(capture);
  assert.ok(!nettoye.includes("045f2fea8dfa"), "l'icone de la capture survit : " + nettoye);

  const tags = buildHeadTags({
    slug: "tiquiz",
    canonical: "https://tiquiz.fr/",
    title: "T",
    description: "D",
    locale: "fr_FR",
    favicon: "/favicon.ico",
  });
  assert.ok(tags.includes('<link rel="icon" href="/favicon.ico">'), tags);
  assert.ok(tags.includes('<link rel="apple-touch-icon" href="/favicon.ico">'), tags);
});

test("sans icone declaree on n'en invente aucune", async () => {
  const { buildHeadTags } = await import("../../lib/sales/servePage.ts");
  const tags = buildHeadTags({
    slug: "x",
    canonical: "https://tiquiz.fr/",
    title: "T",
    description: "D",
    locale: "fr_FR",
  });
  assert.ok(!tags.includes('rel="icon"'), tags);
});

test("la page de vente Tiquiz porte l'icone ET le logo de Tiquiz", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"),
    "utf8",
  );
  assert.ok(/favicon:\s*"\/favicon\.ico"/.test(route), "la page de vente n'a plus d'icone a elle");
  assert.ok(
    !/logo:\s*"[^"]*tipote-logo/.test(route),
    "le logo des donnees structurees est encore celui de Tipote",
  );
  assert.ok(/logo:\s*"[^"]*tiquiz-logo/.test(route), "le logo de Tiquiz n'est plus declare");
});

test("la page capturee ne sert plus l'icone de Tipote", () => {
  if (!capturee) return;
  assert.ok(
    /<link[^>]*rel=["'][^"']*icon/i.test(capturee),
    "la capture n'a plus d'icone : ce test ne peut plus echouer, il ment",
  );
  assert.ok(
    !/<link[^>]*rel=["'][^"']*icon/i.test(stripHeadTags(capturee)),
    "l'icone de Tipote survit dans la page servie",
  );
});
