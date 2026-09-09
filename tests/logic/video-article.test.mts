// tests/logic/video-article.test.mts
//
// LA VIDEO D'UN ARTICLE (Bene, 8 septembre 2026 : "oui je veux la video
// Youtube").
//
// CE QUE CE FICHIER PROTEGE, et c'est une seule chose : un article de
// blog ne porte AUCUNE banniere de consentement (celle de Bene vit dans
// la page de vente capturee, et range son choix dans `aq_consent_v1`).
// Donc rien de tiers ne doit etre contacte avant que la personne ne le
// demande. Poser le cadre au chargement enverrait l'adresse IP de chaque
// lecteur chez Google sans lui avoir rien demande.
//
// Le defaut ne se verrait sur AUCUN ecran : la video s'afficherait
// parfaitement.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { lireArticle, tousLesSlugs } from "@/lib/blog/articles";
import { LANGUES_PUBLIQUES } from "@/lib/site/langues";
import { cheminMiniature, idYouTube, urlEmbedYouTube, urlYouTube } from "@/lib/blog/video";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const COMPOSANT = readFileSync("components/site/VideoArticle.tsx", "utf8");
const RENDU = readFileSync("components/site/ArticleBlog.tsx", "utf8");

/** Toutes les videos du blog, TOUTES LANGUES : une langue qui perdrait
 *  sa miniature ne se verrait pas si on ne regardait que le francais. */
function blocsVideo() {
  const out: { slug: string; bloc: { type: "video"; id: string; titre: string } }[] = [];
  for (const langue of LANGUES_PUBLIQUES) {
    for (const slug of tousLesSlugs(langue)) {
      for (const b of lireArticle(slug, langue)?.blocs ?? []) {
        if (b.type === "video") out.push({ slug: `${langue}/${slug}`, bloc: b });
      }
    }
  }
  return out;
}

// ── L'IDENTIFIANT SE LIT, IL NE SE DEVINE PAS ──

test("les trois formes d'adresse YouTube rendent le meme identifiant", () => {
  for (const u of [
    "https://youtu.be/9WcPdPtahUo?si=kFZS6HnfrklP2BSc",
    "https://www.youtube.com/watch?v=9WcPdPtahUo",
    "https://youtube.com/embed/9WcPdPtahUo",
    "https://www.youtube.com/shorts/9WcPdPtahUo",
  ]) {
    assert.equal(idYouTube(u), "9WcPdPtahUo", u);
  }
});

test("un hote inconnu ou un identifiant mal forme ne fabrique AUCUNE adresse", () => {
  // Cette valeur finit dans un `src`. On ne construit jamais une adresse
  // a partir de ce qu'on n'a pas compris : l'import la SIGNALE.
  for (const u of [
    "https://vimeo.com/9WcPdPtahUo",
    "https://exemple.fr/watch?v=9WcPdPtahUo",
    "https://youtu.be/trop-court",
    "https://youtu.be/9WcPdPtahUo!!",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ]) {
    assert.equal(idYouTube(u), null, String(u));
  }
  assert.equal(urlEmbedYouTube("../etc"), null);
  assert.equal(cheminMiniature("pas un id"), null);
});

// ── RIEN NE PART CHEZ GOOGLE AVANT LE CLIC ──

test("le cadre est sur youtube-nocookie, et il n'existe qu'apres le clic", () => {
  assert.match(urlEmbedYouTube("9WcPdPtahUo")!, /^https:\/\/www\.youtube-nocookie\.com\/embed\//);

  const src = sansCommentaires(COMPOSANT);
  // Le cadre est rendu dans la branche `ouverte`, jamais a cote.
  assert.match(src, /ouverte \? \(\s*<iframe/, "l'iframe vit dans la branche ouverte");
  assert.match(src, /useState\(false\)/, "elle est fermee au premier rendu");
});

test("la miniature vient de NOTRE disque, jamais de i.ytimg.com", () => {
  // Une miniature servie par YouTube serait exactement la requete tierce
  // qu'on evite, et elle partirait a CHAQUE chargement de l'article.
  assert.equal(cheminMiniature("9WcPdPtahUo"), "/blog/video/9WcPdPtahUo.webp");
  assert.ok(!/ytimg|googleusercontent/i.test(sansCommentaires(COMPOSANT)), "aucun hote de miniature tiers");
});

test("chaque video du blog a sa miniature sur le disque, et un titre", () => {
  const v = blocsVideo();
  assert.ok(v.length >= 1, "au moins une video dans le blog, sinon ce fichier ne mesure rien");
  for (const { slug, bloc } of v) {
    assert.ok(idYouTube(`https://youtu.be/${bloc.id}`), `${slug} : identifiant mal forme`);
    assert.ok(bloc.titre.trim().length > 0, `${slug} : titre vide, donc legende vide`);
    const f = `public${cheminMiniature(bloc.id)}`;
    assert.ok(existsSync(f), `${slug} : miniature absente (${f})`);
  }
});

// ── SANS JAVASCRIPT, LA VIDEO RESTE ATTEIGNABLE ──

test("la facade est un LIEN vers YouTube, jamais un bouton", () => {
  // Sans JavaScript, un bouton ne fait RIEN : la video serait morte et
  // le lecteur n'aurait aucun moyen de le savoir.
  const src = sansCommentaires(COMPOSANT);
  assert.match(src, /<a\s/, "la facade est une ancre");
  assert.ok(!/<button/.test(src), "pas de bouton : il serait mort sans JavaScript");
  assert.match(urlYouTube("9WcPdPtahUo")!, /^https:\/\/www\.youtube\.com\/watch\?v=/);
  // Un clic modifie (nouvel onglet) reste un clic sur un lien.
  assert.match(src, /metaKey/, "un clic modifie n'est pas vole");
});

test("le triangle de lecture est DESSINE, jamais un caractere", () => {
  // "▶" n'existe ni dans Open Sans ni dans Inter : Windows rend le carre
  // vide (drame du 2 septembre, les icones de la landing).
  const src = sansCommentaires(COMPOSANT);
  assert.match(src, /<svg[\s\S]*<path/, "un trace SVG");
  assert.ok(!/[▶▷►◀⏵]/.test(src), "aucun glyphe de lecture");
});

// ── LE RENDU CONNAIT LE TYPE ──

test("l'article rend le bloc video, il ne le laisse pas tomber dans la FAQ", () => {
  const src = sansCommentaires(RENDU);
  assert.match(src, /b\.type === "video"/, "le rendu branche sur le type");
  assert.match(src, /<VideoArticle/, "et il rend le composant");
  // La note qui dit ce qu'un clic declenche n'est pas decorative : c'est
  // la seule phrase qui previent avant que quoi que ce soit ne parte.
  assert.match(src, /m\.video\.note/, "la note est passee au composant");
});
