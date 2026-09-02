// tests/logic/flux-blog.test.mts
//
// « J'AI UN SITEMAP ? UN FEED ? POUR AUTOMATISER LE FLUX DES ARTICLES »
// (Béné, 1er septembre 2026)
//
// Le sitemap existait (mesuré sur la production : 29 adresses, les 10
// articles dedans). Le flux, non : `/rss.xml`, `/feed.xml`, `/atom.xml`
// et `/blog/rss.xml` répondaient tous 404.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { listerArticles } from "@/lib/blog/articles";
import { CHEMIN_FLUX, construireFlux, dateRss, echapperXml } from "@/lib/blog/flux";
import { epinglePour } from "@/lib/blog/partage";

const FLUX = construireFlux(listerArticles());

test("le flux porte un item par article publié", () => {
  const items = FLUX.match(/<item>/g) ?? [];
  assert.equal(items.length, listerArticles().length);
  assert.ok(items.length > 0, "un blog vide rendrait ce test muet");
});

test("L'IMAGE DU FLUX EST L'ÉPINGLE, jamais la couverture paysage", () => {
  // C'est LA décision de ce module : `enclosure` est le champ que lisent
  // les automatisations quand elles demandent l'image d'un article, et
  // le premier usage de ce flux est de publier sur Pinterest, où une
  // image en 16/9 ne circule pas.
  for (const a of listerArticles()) {
    const epingle = epinglePour(a.slug);
    if (!epingle) continue;
    assert.ok(
      FLUX.includes(`<enclosure url="${epingle}"`),
      `${a.slug} : l'enclosure doit porter l'épingle verticale`,
    );
    assert.ok(
      !FLUX.includes(`<enclosure url="https://tiquiz.fr${a.couverture}"`),
      `${a.slug} : la couverture n'a rien à faire dans l'enclosure`,
    );
  }
  // Et la couverture n'est pas perdue : elle vit dans la description.
  const premier = listerArticles()[0];
  if (premier?.couverture) {
    assert.ok(FLUX.includes(`<img src="https://tiquiz.fr${premier.couverture}"`));
  }
});

test("la longueur de l'enclosure est LUE, pas inventée", () => {
  // `length="0"` est toléré partout, donc personne ne le remarquerait :
  // c'est exactement le genre de valeur qu'on écrit sans y penser.
  assert.ok(!/length="0"/.test(FLUX), "une taille à zéro veut dire qu'on n'a pas lu le fichier");
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

test("le flux est bien formé, et il se déclare lui même", () => {
  assert.ok(FLUX.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.match(FLUX, /<rss version="2\.0"/);
  assert.ok(
    FLUX.includes(`<atom:link href="https://tiquiz.fr${CHEMIN_FLUX}" rel="self"`),
    "un flux doit donner sa propre adresse",
  );
  // Autant de fermetures que d'ouvertures : un item tronqué casserait
  // tous les lecteurs d'un coup.
  assert.equal((FLUX.match(/<item>/g) ?? []).length, (FLUX.match(/<\/item>/g) ?? []).length);
});

test("le flux est ANNONCÉ, sinon il n'existe que pour qui connaît l'adresse", () => {
  for (const p of [
    "app/blog/page.tsx",
    "app/blog/rubrique/[rubrique]/page.tsx",
    "app/blog/[slug]/page.tsx",
  ]) {
    const src = readFileSync(p, "utf8");
    assert.match(src, /"application\/rss\+xml"/, `${p} doit annoncer le flux`);
  }
  // Et dans llms.txt, parce que sa liste d'articles se périme au
  // déploiement alors que le flux dit toujours l'état du jour.
  assert.match(readFileSync("app/llms.txt/route.ts", "utf8"), /CHEMIN_FLUX/);
});

test("la route porte l'extension .xml", () => {
  // Un flux se colle dans un outil qui attend un fichier, et beaucoup
  // refusent une adresse sans extension.
  assert.equal(CHEMIN_FLUX, "/blog/rss.xml");
  const route = readFileSync("app/blog/rss.xml/route.ts", "utf8");
  assert.match(route, /application\/rss\+xml/);
  // AUCUNE base : le blog s'affiche sans Supabase, le flux aussi.
  //
  // On regarde les IMPORTS, pas le fichier entier : `supabaseAdmin` est
  // NOMMÉ dans le commentaire qui explique pourquoi on ne l'importe pas,
  // et un contrôle qui rougit là dessus attrape la doc au lieu du code.
  const imports = (route.match(/^import .*$/gm) ?? []).join("\n");
  assert.ok(!/supabaseAdmin/.test(imports), "le flux ne doit dépendre d'aucune base");
});
