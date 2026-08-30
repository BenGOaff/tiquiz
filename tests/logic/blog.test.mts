// tests/logic/blog.test.mts
//
// LE BLOG RAPATRIÉ DEPUIS SYSTEME.IO (Béné, 29 août 2026).
//
// "Sinon oui mon blog sur tiquiz.fr/blog. Je vais supprimer les
// anciennes versions dans la foulée. Profites-en pour mettre à jour
// l'affiliation, les liens, les prix etc..."
//
// Ce fichier tient les promesses qui coûteraient cher si elles
// cassaient en silence : un prix périmé sur une page de vente
// indirecte, un lien vers une page supprimée, une image qui n'existe
// pas, ou un slug qui ouvre un fichier du serveur.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { lireArticle, listerArticles, tousLesSlugs } from "../../lib/blog/articles.ts";
import { estHrefSur, attributsLien, minutesDeLecture, nettoyerBloc, sommaire, texteBrut } from "../../lib/blog/rendu.ts";
import { jsonLdArticle, jsonLdFaq, jsonLdFilDAriane, ORIGINE_BLOG, urlArticle } from "../../lib/blog/seo.ts";

const ARTICLES = listerArticles();
const COMPLETS = tousLesSlugs().map((s) => lireArticle(s)!);

function toutLeTexte(): string {
  return JSON.stringify(COMPLETS);
}

// ── LE CONTENU EST BIEN LÀ ──

test("les dix articles sont importes, du plus recent au plus ancien", () => {
  assert.equal(ARTICLES.length, 10);
  const dates = ARTICLES.map((a) => a.publieLe);
  assert.deepEqual([...dates].sort().reverse(), dates, "l'index doit etre trie du plus recent");
});

test("chaque article a un titre, une description et une date lisible", () => {
  for (const a of COMPLETS) {
    assert.ok(a.titre.length > 10, a.slug);
    assert.ok(a.description.length > 30, a.slug);
    assert.match(a.publieLe, /^\d{4}-\d{2}-\d{2}$/, a.slug);
    // Un gabarit non résolu (`%BLOG_POST_TITLE%`) passait sans bruit :
    // c'est arrivé sur l'article de Jocelyne, dont la page est un
    // `blog_static` sans métadonnées. On cherche le GABARIT, pas le
    // signe `%` : une description qui annonce "40 % de commission" est
    // parfaitement normale.
    assert.ok(!/%[A-Z_]+%/.test(a.titre), `${a.slug} : titre non resolu`);
    assert.ok(!/%[A-Z_]+%/.test(a.description), `${a.slug} : description non resolue`);
    assert.ok(a.blocs.length > 10, `${a.slug} : ${a.blocs.length} blocs seulement`);
  }
});

// ── CE QUI A ÉTÉ MIS À JOUR À L'IMPORT ──

test("aucun ancien prix ne survit dans le corpus", () => {
  // Un article qui annonce 9 EUR quand l'abonnement en coute 17 est une
  // promesse qu'on ne tient pas, et c'est le lecteur qui la decouvre au
  // bon de commande.
  const texte = toutLeTexte();
  assert.ok(!texte.includes("9 €/mois"), "ancien prix mensuel");
  assert.ok(!texte.includes("90 €/an"), "ancien prix annuel");
  assert.ok(!texte.includes("3,60 €"), "ancienne commission (40 % de 9 €)");
  assert.ok(!texte.includes("1,80 €"), "ancienne commission a 20 %");
  assert.ok(!texte.includes("43,20 €"), "ancienne rente annuelle par filleul");
});

test("l'arithmetique de l'article d'affiliation est refaite, pas rafistolee", () => {
  // 40 % de 17 € font 6,80 €. Remplacer le prix sans refaire le calcul
  // aurait laisse "17 €/mois = 3,60 €", donc un prix juste et un
  // resultat faux : pire que de n'avoir rien touche.
  const a = lireArticle("rente-mensuelle-affiliation-tiquiz")!;
  const texte = JSON.stringify(a);
  assert.ok(texte.includes("6,80 €"), "la commission mensuelle recalculee");
  assert.ok(texte.includes("204 €/mois"), "30 filleuls a 6,80 €");
  assert.ok(texte.includes("81,60 €"), "la rente annuelle par filleul");
  assert.ok(texte.includes("68 € de rente par filleul et par an"), "40 % de 170 €");
});

test("plus aucun lien vers les pages qui vont disparaitre", () => {
  const texte = toutLeTexte();
  assert.ok(!texte.includes("tipote.fr/tiquiz"), "ancienne page de vente");
  assert.ok(!texte.includes("tipote.fr/part-tiquiz"), "ancien tunnel d'affiliation");
  // Un article qui renvoie vers un AUTRE ARTICLE le fait par un chemin
  // relatif : le blog doit rester consultable quel que soit le domaine
  // qui le sert.
  const slugs = ARTICLES.map((a) => a.slug);
  for (const a of COMPLETS) {
    for (const b of a.blocs) {
      if (b.type !== "html") continue;
      for (const s of slugs) {
        assert.ok(
          !b.html.includes(`tipote.fr/${s}`),
          `${a.slug} : lien absolu vers l'ancienne adresse de ${s}`,
        );
      }
    }
  }
});

test("le lien vers l'Atelier RESTE chez Systeme.io, et la raison reste ecrite", () => {
  // Décision du 25 août, et elle n'a pas changé : l'Atelier a son PROPRE
  // registre d'affiliés (`profiles.sio_affiliate_id` dans sa base), il
  // ne lit que `?sa=` et jamais `?ref=`. Repointer ce lien changerait
  // QUI est payé. Sans cette exception écrite noir sur blanc, le
  // prochain passage "finit le travail" et casse le tunnel.
  const texte = toutLeTexte();
  assert.ok(texte.includes("tipote.fr/atelier-du-quiz"), "le lien de l'Atelier a ete repointe");
});

test("l'affiliation ne parle plus du code Systeme.io", () => {
  // Le code public est le notre depuis le 24 aout. Envoyer l'affilie
  // chercher un "code qui commence par sa" le renvoie dans un espace
  // qui ne le paie plus.
  const a = lireArticle("rente-mensuelle-affiliation-tiquiz")!;
  const texte = JSON.stringify(a);
  assert.ok(!/commence par ?"sa"/.test(texte), "ancien identifiant Systeme.io");
  assert.ok(!/dashboard Systeme io/i.test(texte), "ancien espace affilie");
  assert.ok(texte.includes("affiliate.tipote.com"), "l'espace affilie actuel");
  assert.ok(texte.includes("?ref="), "le code public actuel");
});

test("les regles d'ecriture de Bene tiennent sur le contenu importe", () => {
  const texte = toutLeTexte();
  assert.ok(!/[—–]/.test(texte), "tiret cadratin ou demi-cadratin");
  assert.ok(!/[«»]/.test(texte), "chevrons");
  assert.ok(!/\b\w+·e\b/.test(texte), "point median");
});

// ── LES IMAGES ──

test("chaque image citee existe vraiment sur le disque", () => {
  // Une image manquante ne casse rien au build : elle laisse un cadre
  // vide dans l'article, et personne ne le voit avant un lecteur.
  for (const a of COMPLETS) {
    const chemins = [
      ...(a.couverture ? [a.couverture] : []),
      ...a.blocs.flatMap((b) => (b.type === "image" ? [b.src] : [])),
    ];
    for (const c of chemins) {
      assert.ok(c.startsWith("/blog/img/"), `${a.slug} : ${c} n'est pas servi par nous`);
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "public", c)),
        `${a.slug} : ${c} absent de public/`,
      );
    }
  }
});

test("aucune image ne pointe encore sur le CDN de Systeme.io", () => {
  // C'est tout l'objet du rapatriement : le jour ou l'abonnement
  // s'arrete, un blog qui hotlinke perd tous ses visuels d'un coup.
  assert.ok(!toutLeTexte().includes("cloudfront.net"), "image restee chez eux");
});

// ── LA LECTURE D'UN ARTICLE ──

test("un slug ne peut pas servir a lire un fichier du serveur", () => {
  // `path.join` accepte parfaitement `../../.env`.
  assert.equal(lireArticle("../../.env"), null);
  assert.equal(lireArticle("../package"), null);
  assert.equal(lireArticle(""), null);
  assert.equal(lireArticle("MAJUSCULES"), null);
});

test("un slug inconnu rend null, il ne jette pas", () => {
  assert.equal(lireArticle("article-qui-nexiste-pas"), null);
});

// ── LE RENDU ──

test("le HTML d'un article ne peut pas porter de script", () => {
  const sale = '<p>ok</p><script>alert(1)</script><iframe src="x"></iframe><p onclick="x()">non</p>';
  const propre = nettoyerBloc(sale);
  assert.ok(!propre.includes("script"), propre);
  assert.ok(!propre.includes("iframe"), propre);
  assert.ok(!propre.includes("onclick"), propre);
  assert.ok(propre.includes("<p>ok</p>"));
});

test("un lien javascript: est neutralise, son texte reste", () => {
  const propre = nettoyerBloc('<p><a href="javascript:alert(1)">clique</a></p>');
  assert.ok(!propre.includes("javascript"), propre);
  assert.ok(propre.includes("clique"), "le texte du lien ne disparait pas");
  assert.equal(estHrefSur("javascript:alert(1)"), false);
  assert.equal(estHrefSur("data:text/html,x"), false);
  assert.equal(estHrefSur("/blog/x"), true);
  assert.equal(estHrefSur("https://exemple.fr"), true);
});

test("un lien SORTANT s'ouvre ailleurs, un lien interne non", () => {
  // Regle du 24 aout : un visiteur au milieu d'un article qui clique
  // une source part, et il ne revient pas.
  assert.ok(attributsLien("https://systeme.io").includes('target="_blank"'));
  assert.ok(attributsLien("https://systeme.io").includes("noopener"));
  assert.equal(attributsLien("/blog/vendre-avec-un-quiz"), "");
  assert.equal(attributsLien("#un-titre"), "");
  const propre = nettoyerBloc('<p><a href="https://exemple.fr">source</a></p>');
  assert.ok(propre.includes('target="_blank"'), propre);
});

test("le sommaire EST les titres, il ne peut pas diverger", () => {
  for (const a of COMPLETS) {
    const toc = sommaire(a.blocs);
    const titres = a.blocs.filter((b) => b.type === "titre");
    assert.equal(toc.length, titres.length, a.slug);
    // Deux titres identiques dans un article donneraient deux ancres
    // identiques, donc un lien de sommaire qui saute au mauvais
    // endroit.
    assert.equal(new Set(toc.map((e) => e.id)).size, toc.length, `${a.slug} : ancres en double`);
    for (const e of toc) assert.match(e.id, /^[a-z0-9-]+$/, `${a.slug} : ancre ${e.id}`);
  }
});

test("le temps de lecture est plausible, jamais zero", () => {
  for (const a of COMPLETS) {
    const m = minutesDeLecture(a.blocs);
    assert.ok(m >= 1, a.slug);
    assert.ok(m <= 40, `${a.slug} : ${m} min, un article ne fait pas ca`);
  }
  assert.equal(minutesDeLecture([]), 1, "jamais zero minute");
});

test("texteBrut retire les balises sans coller les mots", () => {
  assert.equal(texteBrut("<p>un</p><p>deux</p>"), "un deux");
  assert.equal(texteBrut("a&nbsp;b"), "a b");
});

// ── LE SEO ET LE GEO ──

test("la canonique designe NOTRE adresse, jamais l'ancienne", () => {
  // Laisser la canonique sur tipote.fr reviendrait a dire a Google "la
  // vraie page est ailleurs", donc a garantir de ne jamais ranker.
  for (const a of ARTICLES) {
    assert.equal(urlArticle(a.slug), `${ORIGINE_BLOG}/blog/${a.slug}`);
    assert.ok(!urlArticle(a.slug).includes("tipote.fr"));
  }
});

test("le JSON-LD d'un article porte ce qu'un moteur attend", () => {
  const a = lireArticle("vendre-avec-un-quiz")!;
  const ld = jsonLdArticle(a) as Record<string, unknown>;
  assert.equal(ld["@type"], "BlogPosting");
  assert.equal(ld.headline, a.titre);
  assert.equal(ld.datePublished, a.publieLe);
  assert.equal(ld.inLanguage, "fr-FR");
  assert.ok((ld.author as Record<string, string>).name.length > 0);
  assert.ok(String(ld.url).startsWith(ORIGINE_BLOG));
});

test("une FAQPage n'est declaree que si l'article a vraiment des questions", () => {
  // Declarer une FAQPage vide est le genre de balisage qui fait retirer
  // les autres.
  let avec = 0;
  for (const a of COMPLETS) {
    const faq = jsonLdFaq(a) as { mainEntity?: unknown[] } | null;
    const questions = a.blocs.flatMap((b) => (b.type === "faq" ? b.questions : []));
    if (questions.length === 0) {
      assert.equal(faq, null, a.slug);
    } else {
      avec += 1;
      assert.equal(faq?.mainEntity?.length, questions.length, a.slug);
    }
  }
  assert.ok(avec > 0, "aucun article n'a de FAQ : l'import a perdu quelque chose");
});

test("le fil d'Ariane remonte au blog", () => {
  const ld = jsonLdFilDAriane(ARTICLES[0]) as { itemListElement: { item: string }[] };
  assert.equal(ld.itemListElement.length, 2);
  assert.equal(ld.itemListElement[0].item, `${ORIGINE_BLOG}/blog`);
});

// ── LA PORTE ──

test("le blog est PUBLIC dans le middleware", () => {
  // Sans cette ligne, chaque article renvoie vers /login : un blog
  // derriere une connexion ne ramene personne et ne ranke sur rien.
  const src = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(src.includes('pathname === "/blog"'), "l'index n'est pas ouvert");
  assert.ok(src.includes('pathname.startsWith("/blog/")'), "les articles ne sont pas ouverts");
});

test("les articles sont dans le sitemap du domaine de vente", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "app/sitemap.ts"), "utf8");
  assert.ok(src.includes("listerArticles"), "le sitemap de vente ignore le blog");
});

// ── LA MARQUE, SUR LA PAGE DE VENTE ──
//
// Béné, 29 août : "la page de vente tiquiz.fr ne ranke pas du tout sur
// google quand je tape simplement tiquiz." Sur une requête de marque,
// un moteur cherche à relier un NOM à un SITE.

test("la page de vente publique se declare comme le site de Tiquiz", async () => {
  const { buildHeadTags } = await import("../../lib/sales/servePage.ts");
  const tags = buildHeadTags({
    slug: "tiquiz",
    canonical: "https://tiquiz.fr/",
    title: "Tiquiz",
    description: "Un outil de quiz.",
    locale: "fr_FR",
    marque: {
      nom: "Tiquiz",
      logo: "https://tiquiz.fr/blog/img/logo.webp",
      sameAs: ["https://quiz.tipote.com/"],
      produit: { offres: [{ nom: "Tiquiz mensuel", prix: "17.00", url: "https://tiquiz.fr/commande/mensuel" }] },
    },
  });
  assert.ok(tags.includes("application/ld+json"), "aucune donnee structuree");
  const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(tags)![1];
  // Le JSON est inséré dans un `<script>` : une balise fermante à
  // l'intérieur d'une chaîne fermerait le script et casserait la page.
  assert.ok(!json.includes("<"), "un < non echappe casserait le script");
  const donnees = JSON.parse(json.replace(/\\u003c/g, "<")) as { "@graph": Record<string, unknown>[] };
  const types = donnees["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Organization"), types.join(","));
  assert.ok(types.includes("WebSite"), types.join(","));
  const orga = donnees["@graph"].find((n) => n["@type"] === "Organization")!;
  assert.equal(orga.name, "Tiquiz");
  assert.equal(orga.url, "https://tiquiz.fr/");
});

test("un APERCU ne se declare PAS comme le site officiel", () => {
  // Deux pages qui pretendent etre le site de Tiquiz se feraient
  // concurrence sur exactement la meme requete.
  const src = fs.readFileSync(path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"), "utf8");
  assert.ok(
    /const marque = publique \? MARQUES\[slug\] : undefined;/.test(src),
    "la marque doit etre gatee sur le domaine public",
  );
});

test("les prix annonces aux moteurs viennent du catalogue", async () => {
  // Un tarif recopie a la main et un tarif au bon de commande finissent
  // par diverger, et c'est Google qui affiche l'ancien.
  const src = fs.readFileSync(path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"), "utf8");
  assert.ok(src.includes("OWNER_CATALOG"), "les offres doivent venir du catalogue");
  assert.ok(!/prix: "\d/.test(src), "un prix ecrit en dur");
});
