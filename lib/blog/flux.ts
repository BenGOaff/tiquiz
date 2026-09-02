// lib/blog/flux.ts
//
// LE FLUX RSS DU BLOG, ET CE QU'IL PORTE.
//
// Béné, 1er septembre 2026 : "j'ai un sitemap ? Un feed ? Pour
// automatiser le flux des articles ou je sais pas quoi..."
//
// Le sitemap existait (mesuré : 29 adresses, les 10 articles dedans).
// Le flux, non : `/rss.xml`, `/feed.xml`, `/atom.xml` et
// `/blog/rss.xml` répondaient tous 404.
//
// -- CE QU'UN SITEMAP NE SAIT PAS FAIRE --------------------------------
//
// Un sitemap dit à un MOTEUR quelles pages existent. Il ne porte ni
// titre, ni texte, ni image, ni date de publication lisible : personne
// ne peut en tirer un post ou une épingle. C'est pour ça qu'il ne
// remplace pas un flux, et que les deux coexistent partout.
//
// Un flux, lui, est la prise sur laquelle se branche tout ce qui
// automatise : Zapier, Make, n8n et Pabbly savent tous surveiller une
// adresse RSS et fabriquer quelque chose à chaque nouvel article.
//
// -- LA DÉCISION QUI COMPTE : L'IMAGE DU FLUX EST L'ÉPINGLE -----------
//
// L'`enclosure` porte l'épingle 1000 x 1500, pas la couverture 1200 x
// 675. C'est le champ que lisent les automatisations quand elles
// demandent "l'image de cet article", et le premier usage de ce flux
// est de publier sur Pinterest, où une image en 16/9 ne circule pas
// (c'est tout le sujet du 30 août et du 1er septembre).
//
// La couverture n'est pas perdue pour autant : elle est DANS la
// description, donc un lecteur de flux et un aperçu email l'affichent
// normalement. Chacune à sa place, aucune des deux ne remplace l'autre.
//
// Sans épingle construite, l'article sort SANS `enclosure` plutôt
// qu'avec une couverture paysage : une automatisation qui recevrait le
// mauvais format publierait une épingle qui ne circule pas, et personne
// ne verrait jamais pourquoi.
//
// -- LA LONGUEUR EST LUE SUR LE DISQUE, PAS INVENTÉE -------------------
//
// `enclosure` exige un attribut `length` en octets. Écrire `0` est
// courant et toléré, mais certains lecteurs s'en servent pour décider
// s'ils téléchargent : on lit la vraie taille du fichier, elle est là.

import fs from "node:fs";
import path from "node:path";

import type { ResumeArticle } from "./articles";
import { epinglePour } from "./partage";
import { ORIGINE_BLOG } from "./seo";
import { rubriqueDe } from "./rubriques";

/** Le titre et la description du flux, lus par les lecteurs et les robots. */
export const TITRE_FLUX = "Le blog Tiquiz";
export const DESCRIPTION_FLUX =
  "Comment un quiz capte des leads qualifies, les tague par profil et les transforme en clients.";

/** L'adresse du flux. Écrite UNE fois : la route, la balise de decouverte et le llms.txt la lisent ici. */
export const CHEMIN_FLUX = "/blog/rss.xml";

/**
 * Échappe ce qui part dans une balise XML.
 *
 * Les titres du blog portent des apostrophes, des guillemets et des
 * esperluettes ("Systeme.io & Tiquiz") : un seul `&` non échappé rend le
 * flux ENTIER illisible, et un lecteur de flux ne dit pas quelle ligne
 * l'a cassé. On échappe l'esperluette EN PREMIER, sinon on échapperait
 * celles qu'on vient d'ajouter (même piège que `echapperMotifLike`).
 */
export function echapperXml(v: string): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * La date au format que RSS attend.
 *
 * `publieLe` est une date courte (`2026-08-22`), sans heure ni fuseau.
 * On la fixe à midi UTC : à minuit, un fuseau à l'ouest ferait afficher
 * la VEILLE dans un lecteur, et un article publié le 1er passerait pour
 * le 31 chez la moitié des lecteurs.
 */
export function dateRss(isoCourt: string): string {
  const d = new Date(`${isoCourt}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

/** La taille d'un fichier de `public/`, ou 0 si on ne peut pas la lire. */
function octets(urlAbsolue: string): number {
  try {
    const relatif = urlAbsolue.replace(ORIGINE_BLOG, "");
    const p = path.join(process.cwd(), "public", relatif);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
  } catch {
    return 0;
  }
}

/** Le flux RSS 2.0 complet, prêt à être servi. */
export function construireFlux(articles: readonly ResumeArticle[]): string {
  const maintenant =
    articles.length > 0 ? dateRss(articles[0]!.publieLe) : new Date().toUTCString();

  const items = articles
    .map((a) => {
      const lien = `${ORIGINE_BLOG}/blog/${a.slug}`;
      const epingle = epinglePour(a.slug);
      const rubrique = rubriqueDe(a.slug);
      const couverture = a.couverture ? `${ORIGINE_BLOG}${a.couverture}` : null;
      // La couverture vit DANS la description : c'est ce qu'un lecteur
      // de flux et un aperçu email affichent. L'épingle, elle, est dans
      // l'enclosure, pour ce qui publie.
      const corps = [
        couverture
          ? `<p><img src="${echapperXml(couverture)}" alt="" width="1200" height="675" /></p>`
          : "",
        `<p>${echapperXml(a.description)}</p>`,
        `<p><a href="${echapperXml(lien)}">Lire l'article</a></p>`,
      ]
        .filter(Boolean)
        .join("");

      return [
        "    <item>",
        `      <title>${echapperXml(a.titre)}</title>`,
        `      <link>${echapperXml(lien)}</link>`,
        `      <guid isPermaLink="true">${echapperXml(lien)}</guid>`,
        `      <pubDate>${dateRss(a.publieLe)}</pubDate>`,
        rubrique ? `      <category>${echapperXml(rubrique.libelle)}</category>` : "",
        `      <description><![CDATA[${corps}]]></description>`,
        epingle
          ? `      <enclosure url="${echapperXml(epingle)}" length="${octets(epingle)}" type="image/jpeg" />`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${echapperXml(TITRE_FLUX)}</title>`,
    `    <link>${ORIGINE_BLOG}/blog</link>`,
    `    <description>${echapperXml(DESCRIPTION_FLUX)}</description>`,
    "    <language>fr-FR</language>",
    `    <lastBuildDate>${maintenant}</lastBuildDate>`,
    `    <atom:link href="${ORIGINE_BLOG}${CHEMIN_FLUX}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
