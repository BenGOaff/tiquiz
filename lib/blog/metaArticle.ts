// lib/blog/metaArticle.ts
//
// LES METADONNEES D'UN ARTICLE, DANS SA LANGUE.
//
// Ecrites UNE fois pour les deux routes (`/blog/<slug>` et
// `/en/blog/<slug>`) : deux copies finiraient par ne plus annoncer la
// meme chose, et c'est la canonique qui divergerait en premier, sans
// que rien ne s'affiche de travers.

import type { Metadata } from "next";

import { adressesDeLArticle, lireArticle } from "@/lib/blog/articles";
import { baliseLangue } from "@/lib/blog/motsDuBlog";
import { cheminFlux } from "@/lib/blog/flux";
import { ORIGINE_BLOG, urlArticle } from "@/lib/blog/seo";
import type { LanguePublique } from "@/lib/site/langues";

export function metadonneesArticle(slug: string, langue: LanguePublique): Metadata {
  const a = lireArticle(slug, langue);
  if (!a) return {};
  const image = a.couverture ? `${ORIGINE_BLOG}${a.couverture}` : undefined;

  // LES `hreflang` D'UN ARTICLE NE SE CALCULENT PAS SUR SON CHEMIN.
  //
  // `alternatesDeLangue` suppose un chemin nu COMMUN aux deux langues :
  // il annoncerait `/en/blog/comment-creer-quiz-systeme-io`, une adresse
  // qui n'existe pas. Les slugs different d'une langue a l'autre, donc
  // l'appariement est ECRIT dans le contenu (`traductionDe`) et lu ici.
  //
  // Et on n'annonce QUE ce qui existe : six des dix articles francais
  // n'ont pas de version anglaise, et une paire vers une page absente
  // est pire que pas de paire du tout.
  const paires = adressesDeLArticle(slug, langue);
  const languages: Record<string, string> = {};
  for (const [l, chemin] of Object.entries(paires)) languages[l] = `${ORIGINE_BLOG}${chemin}`;
  if (paires.fr) languages["x-default"] = `${ORIGINE_BLOG}${paires.fr}`;

  return {
    title: a.titre,
    description: a.description,
    keywords: a.motsCles.length ? a.motsCles : undefined,
    authors: [{ name: "Bénédicte Lagardette" }],
    // LA CANONIQUE DÉSIGNE LA NÔTRE, sans hésiter. Deux copies du même
    // article se partagent le crédit, et c'est ce qui empêche de
    // ranker. Elle porte SA langue : un article anglais qui annoncerait
    // le français comme référence ne serait jamais indexé en anglais.
    alternates: {
      canonical: urlArticle(a.slug, langue),
      ...(Object.keys(languages).length > 1 ? { languages } : {}),
      // Le flux est annoncé sur l'article aussi : c'est la page qu'on
      // partage, donc celle où quelqu'un qui veut suivre le blog arrive.
      // Celui de SA langue : un article anglais qui annoncerait le flux
      // français ferait suivre le blog français à qui veut l'anglais.
      types: { "application/rss+xml": `${ORIGINE_BLOG}${cheminFlux(langue)}` },
    },
    openGraph: {
      type: "article",
      title: a.titre,
      description: a.description,
      url: urlArticle(a.slug, langue),
      siteName: "Tiquiz",
      locale: baliseLangue(langue).ogLocale,
      publishedTime: a.publieLe,
      authors: ["Bénédicte Lagardette"],
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: a.titre,
      description: a.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
