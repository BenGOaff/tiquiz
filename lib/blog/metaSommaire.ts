// lib/blog/metaSommaire.ts
//
// LES METADONNEES DU SOMMAIRE DU BLOG, DANS SA LANGUE.
//
// Ecrites UNE fois pour les deux routes (`/blog` et `/en/blog`). Deux
// copies finiraient par ne plus annoncer la meme chose, et c'est la
// canonique qui divergerait en premier, sans que rien ne s'affiche de
// travers.

import type { Metadata } from "next";

import { listerArticles } from "@/lib/blog/articles";
import { baliseLangue, cheminBlog, motsDuBlog } from "@/lib/blog/motsDuBlog";
import { cheminFlux } from "@/lib/blog/flux";
import { ORIGINE_BLOG } from "@/lib/blog/seo";
import {
  alternatesDeLangue,
  LANGUES_PUBLIQUES,
  type LanguePublique,
} from "@/lib/site/langues";

/**
 * Les langues dans lesquelles le SOMMAIRE existe vraiment.
 *
 * On ne declare pas une langue dont le blog est vide : le `hreflang`
 * pointerait alors sur une page qui affiche "rien pour le moment", et
 * Google jugerait cette langue sur une page sans contenu. C'est la
 * meme regle que les pages publiques, appliquee au blog.
 */
function languesDuBlog(): LanguePublique[] {
  return LANGUES_PUBLIQUES.filter((l) => listerArticles(l).length > 0);
}

export function metadonneesSommaire(langue: LanguePublique): Metadata {
  const m = motsDuBlog(langue).sommaire;

  // L'IMAGE DE LA PAGE EST CELLE DE L'ARTICLE EN UNE.
  //
  // Béné, 1er septembre 2026 : "le format des images ne me permet pas de
  // les partager sur pinterest (liste des articles, hub ...)".
  //
  // Mesuré sur la production avant de corriger : `/blog` ne déclarait
  // AUCUNE `og:image`. Ce n'était donc pas un problème de format, c'était
  // qu'il n'y avait rien à prendre : Pinterest, LinkedIn et Facebook
  // partageaient le sommaire du blog sans le moindre visuel.
  //
  // On ne DESSINE pas une image pour ça : on prend celle que la page
  // montre déjà en haut, la couverture de l'article en une. Elle est
  // vraie, elle change avec le blog, et personne n'a à la maintenir. Et
  // elle est celle de l'article en une DE CETTE LANGUE : une couverture
  // française sous une adresse anglaise dirait au partage que la page
  // est française.
  const couverture = listerArticles(langue)[0]?.couverture ?? null;
  const image = couverture ? `${ORIGINE_BLOG}${couverture}` : null;

  const alternates = alternatesDeLangue(ORIGINE_BLOG, "/blog", langue, languesDuBlog());

  return {
    title: m.metaTitre,
    description: m.metaDescription,
    alternates: {
      canonical: alternates?.canonical ?? `${ORIGINE_BLOG}${cheminBlog(langue)}`,
      ...(alternates && Object.keys(alternates.languages).length > 1
        ? { languages: alternates.languages }
        : {}),
      // LA BALISE DE DÉCOUVERTE DU FLUX, DANS LA LANGUE DE LA PAGE.
      //
      // C'est par elle qu'un lecteur de flux, un navigateur ou une
      // automatisation trouvent l'adresse sans qu'on ait à la leur donner.
      // Un flux qui n'est annoncé nulle part n'existe que pour qui connaît
      // déjà son adresse.
      //
      // ET C'EST LE FLUX DE CETTE LANGUE, jamais le français par défaut :
      // annoncer `/blog/rss.xml` sur une page anglaise dirait à une
      // automatisation d'aller chercher des articles français, et elle
      // publierait du français sous le compte anglais sans qu'une seule
      // erreur ne s'écrive.
      types: { "application/rss+xml": `${ORIGINE_BLOG}${cheminFlux(langue)}` },
    },
    openGraph: {
      type: "website",
      title: m.metaTitre,
      description: m.metaDescription,
      url: `${ORIGINE_BLOG}${cheminBlog(langue)}`,
      siteName: "Tiquiz",
      locale: baliseLangue(langue).ogLocale,
      ...(image ? { images: [{ url: image, width: 1200, height: 675 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: m.metaTitre,
      description: m.metaDescription,
      ...(image ? { images: [image] } : {}),
    },
  };
}
