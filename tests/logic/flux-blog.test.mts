// tests/logic/flux-blog.test.mts
//
// « J'AI UN SITEMAP ? UN FEED ? POUR AUTOMATISER LE FLUX DES ARTICLES »
// (Béné, 1er septembre 2026)
//
// Le sitemap existait (mesuré sur la production : 29 adresses, les 10
// articles dedans). Le flux, non : `/rss.xml`, `/feed.xml`, `/atom.xml`
// et `/blog/rss.xml` répondaient tous 404.
//
// -- ET DEPUIS LE 8 SEPTEMBRE, IL Y EN A UN PAR LANGUE ----------------
//
// Un flux porte SA langue, SES liens d'article et SON titre de canal.
// Les mélanger ne casse rien : le XML reste valide, aucun lecteur ne
// proteste, et une automatisation publie simplement des adresses qui
// répondent 404 sous un `<language>` qui ment. Ce fichier tient donc les
// trois ensemble, langue par langue.

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { listerArticles } from "@/lib/blog/articles";
import { CHEMIN_FLUX, cheminFlux, construireFlux, dateRss, echapperXml } from "@/lib/blog/flux";
import { baliseLangue, cheminArticle, cheminBlog } from "@/lib/blog/motsDuBlog";
import { epinglePour } from "@/lib/blog/partage";
import { metadonneesArticle } from "@/lib/blog/metaArticle";
import { metadonneesSommaire } from "@/lib/blog/metaSommaire";
import { LANGUES_PUBLIQUES, type LanguePublique } from "@/lib/site/langues";

/** Les langues dont le blog a vraiment des articles. */
const LANGUES: LanguePublique[] = LANGUES_PUBLIQUES.filter((l) => listerArticles(l).length > 0);

const FLUX = new Map<LanguePublique, string>(
  LANGUES.map((l) => [l, construireFlux(listerArticles(l), l)]),
);

test("les deux langues ont un blog, sinon tout ce fichier serait muet", () => {
  assert.ok(LANGUES.includes("fr"));
  assert.ok(LANGUES.includes("en"), "sans articles anglais, aucun test de langue ne prouve rien");
});

test("le flux porte un item par article publié", () => {
  for (const langue of LANGUES) {
    const flux = FLUX.get(langue)!;
    const items = flux.match(/<item>/g) ?? [];
    assert.equal(items.length, listerArticles(langue).length, langue);
    assert.ok(items.length > 0, langue);
  }
});

test("CHAQUE FLUX PORTE SA LANGUE, SON CANAL ET SES ADRESSES", () => {
  // LE TROU QUE CE TEST FERME, et il ne produit aucune erreur : un flux
  // anglais construit sans sa langue portait des liens
  // `tiquiz.fr/blog/<slug-anglais>`, c'est à dire quatre adresses qui
  // répondent 404, sous un `<language>fr-FR</language>`. Le flux reste
  // valide, donc rien ne le dit : c'est l'automatisation qui envoie du
  // monde nulle part, des semaines plus tard.
  for (const langue of LANGUES) {
    const flux = FLUX.get(langue)!;
    assert.ok(
      flux.includes(`<language>${baliseLangue(langue).inLanguage}</language>`),
      `${langue} : le flux doit déclarer SA langue`,
    );
    assert.ok(
      flux.includes(`<link>https://tiquiz.fr${cheminBlog(langue)}</link>`),
      `${langue} : le canal doit pointer sur SON sommaire`,
    );
    assert.ok(
      flux.includes(`<atom:link href="https://tiquiz.fr${cheminFlux(langue)}" rel="self"`),
      `${langue} : un flux doit donner sa PROPRE adresse`,
    );
    for (const a of listerArticles(langue)) {
      const lien = `https://tiquiz.fr${cheminArticle(a.slug, langue)}`;
      assert.ok(flux.includes(`<link>${lien}</link>`), `${langue} : ${a.slug}`);
      assert.ok(flux.includes(`<guid isPermaLink="true">${lien}</guid>`), `${langue} : ${a.slug}`);
    }
  }
});

test("un flux ne porte AUCUNE adresse de l'autre langue", () => {
  // Le contrôle qui distingue vraiment : un flux anglais qui reprendrait
  // les chemins français passerait tous les tests ci dessus.
  for (const langue of LANGUES) {
    const flux = FLUX.get(langue)!;
    for (const autre of LANGUES) {
      if (autre === langue) continue;
      for (const a of listerArticles(autre)) {
        const chemin = cheminArticle(a.slug, autre);
        if (listerArticles(langue).some((x) => cheminArticle(x.slug, langue) === chemin)) continue;
        assert.ok(
          !flux.includes(`<link>https://tiquiz.fr${chemin}</link>`),
          `le flux ${langue} porte une adresse ${autre} : ${chemin}`,
        );
      }
    }
  }
});

test("L'IMAGE DU FLUX EST L'ÉPINGLE, jamais la couverture paysage", () => {
  // C'est LA décision de ce module : `enclosure` est le champ que lisent
  // les automatisations quand elles demandent l'image d'un article, et
  // le premier usage de ce flux est de publier sur Pinterest, où une
  // image en 16/9 ne circule pas.
  const flux = FLUX.get("fr")!;
  for (const a of listerArticles("fr")) {
    const epingle = epinglePour(a.slug);
    if (!epingle) continue;
    assert.ok(
      flux.includes(`<enclosure url="${epingle}"`),
      `${a.slug} : l'enclosure doit porter l'épingle verticale`,
    );
    assert.ok(
      !flux.includes(`<enclosure url="https://tiquiz.fr${a.couverture}"`),
      `${a.slug} : la couverture n'a rien à faire dans l'enclosure`,
    );
  }
  // Et la couverture n'est pas perdue : elle vit dans la description.
  const premier = listerArticles("fr")[0];
  if (premier?.couverture) {
    assert.ok(flux.includes(`<img src="https://tiquiz.fr${premier.couverture}"`));
  }
});

test("la longueur de l'enclosure est LUE, pas inventée", () => {
  // `length="0"` est toléré partout, donc personne ne le remarquerait :
  // c'est exactement le genre de valeur qu'on écrit sans y penser.
  for (const langue of LANGUES) {
    assert.ok(!/length="0"/.test(FLUX.get(langue)!), langue);
  }
});

test("tout ce qui vient d'un titre est ÉCHAPPÉ", () => {
  // Un seul `&` non échappé rend le flux ENTIER illisible, et aucun
  // lecteur ne dit quelle ligne l'a cassé.
  assert.equal(echapperXml("Systeme.io & Tiquiz"), "Systeme.io &amp; Tiquiz");
  assert.equal(echapperXml('<a href="x">'), "&lt;a href=&quot;x&quot;&gt;");
  // L'esperluette passe EN PREMIER : sinon on échapperait celles qu'on
  // vient d'ajouter.
  assert.equal(echapperXml("a & <b>"), "a &amp; &lt;b&gt;");
});

test("la date est à MIDI, jamais à minuit", () => {
  // À minuit UTC, un fuseau à l'ouest fait afficher la VEILLE dans un
  // lecteur : un article du 1er passerait pour le 31.
  const d = dateRss("2026-08-22");
  assert.ok(d.includes("22 Aug 2026"), d);
  assert.ok(d.includes("12:00:00"), d);
  // Une date illisible ne fait pas tomber le flux.
  assert.ok(dateRss("n'importe quoi").length > 10);
});

test("le flux est bien formé", () => {
  for (const langue of LANGUES) {
    const flux = FLUX.get(langue)!;
    assert.ok(flux.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), langue);
    assert.match(flux, /<rss version="2\.0"/);
    // Autant de fermetures que d'ouvertures : un item tronqué casserait
    // tous les lecteurs d'un coup.
    assert.equal((flux.match(/<item>/g) ?? []).length, (flux.match(/<\/item>/g) ?? []).length);
  }
});

test("chaque langue a sa ROUTE, et aucune ne touche à une base", () => {
  // Une balise de découverte qui pointe sur une adresse non servie est
  // une balise qui envoie un lecteur de flux sur un 404.
  for (const langue of LANGUES) {
    const dossier = `app${cheminFlux(langue)}`;
    const fichier = `${dossier}/route.ts`;
    assert.ok(existsSync(fichier), `${langue} : ${fichier} doit exister`);
    const route = readFileSync(fichier, "utf8");
    assert.match(route, /application\/rss\+xml/);
    // AUCUNE base : le blog s'affiche sans Supabase, le flux aussi.
    //
    // On regarde les IMPORTS, pas le fichier entier : `supabaseAdmin` est
    // NOMMÉ dans le commentaire qui explique pourquoi on ne l'importe pas,
    // et un contrôle qui rougit là dessus attrape la doc au lieu du code.
    const imports = (route.match(/^import .*$/gm) ?? []).join("\n");
    assert.ok(!/supabaseAdmin/.test(imports), `${langue} : le flux ne dépend d'aucune base`);
  }
});

test("le flux est ANNONCÉ, et c'est celui de la langue de la page", () => {
  // ON DEMANDE LES METADONNEES, ON NE CHERCHE PLUS LA CHAINE DANS LA
  // PAGE. Le sommaire et l'article ont deux routes chacun depuis
  // l'anglais (8 septembre) et leurs metadonnees vivent dans un module
  // partage : un test qui lisait `app/blog/page.tsx` serait sorti ROUGE
  // sur une correction juste, et il aurait laisse passer une route
  // anglaise qui n'annonce rien.
  //
  // ET C'EST LE FLUX DE SA LANGUE : annoncer le flux francais sur une
  // page anglaise dirait a une automatisation d'aller chercher des
  // articles francais, ce qui est exactement le bug que ce chantier a
  // introduit puis ferme le meme jour.
  for (const langue of LANGUES) {
    const attendu = `https://tiquiz.fr${cheminFlux(langue)}`;
    const sommaire = metadonneesSommaire(langue);
    assert.equal(sommaire.alternates?.types?.["application/rss+xml"], attendu, langue);
    const [premier] = listerArticles(langue);
    assert.ok(premier, `aucun article en ${langue} : ce test serait muet`);
    const article = metadonneesArticle(premier.slug, langue);
    assert.equal(article.alternates?.types?.["application/rss+xml"], attendu, premier.slug);
  }
  // La page de rubrique n'existe qu'en francais, et elle porte encore sa
  // propre entete : on la lit telle quelle.
  assert.match(
    readFileSync("app/blog/rubrique/[rubrique]/page.tsx", "utf8"),
    /"application\/rss\+xml"/,
    "la page de rubrique doit annoncer le flux",
  );
  // Et dans llms.txt, parce que sa liste d'articles se périme au
  // déploiement alors que le flux dit toujours l'état du jour.
  assert.match(readFileSync("app/llms.txt/route.ts", "utf8"), /cheminFlux\(/);
});

test("la route porte l'extension .xml", () => {
  // Un flux se colle dans un outil qui attend un fichier, et beaucoup
  // refusent une adresse sans extension.
  assert.equal(CHEMIN_FLUX, "/blog/rss.xml");
  assert.equal(cheminFlux("fr"), "/blog/rss.xml", "le français ne porte aucun préfixe");
  assert.equal(cheminFlux("en"), "/en/blog/rss.xml");
});
