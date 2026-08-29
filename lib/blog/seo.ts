// lib/blog/seo.ts
//
// CE QU'ON DIT AUX MOTEURS, ET AUX MODÈLES QUI RÉPONDENT À LEUR PLACE.
//
// Béné, 29 août 2026 : "optimiser le seo, les images, le référencement
// etc... pour être 100% ok côté SEO et GEO. Pour le moment la page de
// vente tiquiz.fr ne ranke pas du tout sur google quand je tape
// simplement tiquiz."
//
// -- LA CANONIQUE EST UNE DÉCISION, PAS UNE FORMALITÉ ------------------
//
// Les articles existaient sur `tipote.fr`. Tant que les deux versions
// sont en ligne, Google voit du contenu dupliqué et partage le crédit
// entre les deux adresses : c'est précisément ce qui empêche de
// ranker. Béné supprime les anciennes, donc la canonique désigne
// franchement la nôtre. Laisser la canonique sur `tipote.fr` serait
// dire "la vraie page est ailleurs" (même erreur qu'on a corrigée sur
// la page de vente le 20 août).
//
// -- LE GEO, C'EST DU SEO QUI RÉPOND À UNE QUESTION --------------------
//
// Un modèle qui répond "quel outil de quiz pour Systeme.io ?" cite ce
// qu'il peut CITER : une page dont il sait la date, l'auteur, le sujet,
// et dont les réponses sont déjà découpées en questions. D'où le
// JSON-LD `Article` + `FAQPage`, et les articles listés dans
// `llms.txt`. Ce n'est pas une couche de balises en plus : c'est la
// même information, écrite pour être lue par une machine.

import type { Article, ResumeArticle } from "./articles";
import { texteBrut } from "./rendu";

/** Le domaine public du blog. Le blog vit avec la page de vente. */
export const ORIGINE_BLOG = "https://tiquiz.fr";

/** L'organisation citée par chaque article. */
const EDITEUR = {
  "@type": "Organization",
  name: "Tiquiz",
  url: ORIGINE_BLOG,
  logo: {
    "@type": "ImageObject",
    url: `${ORIGINE_BLOG}/blog/img/tipote-logo1.webp`,
  },
} as const;

/** L'auteure. Les articles sont signés, c'est ce qui les rend citables. */
const AUTEURE = {
  "@type": "Person",
  name: "Bénédicte Lagardette",
  url: "https://blagardette.com",
} as const;

export function urlArticle(slug: string): string {
  return `${ORIGINE_BLOG}/blog/${slug}`;
}

function urlAbsolue(chemin: string | null): string | null {
  if (!chemin) return null;
  return chemin.startsWith("http") ? chemin : `${ORIGINE_BLOG}${chemin}`;
}

/**
 * Le JSON-LD d'un article.
 *
 * `dateModified` vaut `datePublished` : on n'invente pas une date de
 * mise à jour pour paraître frais. Une date de modification fausse est
 * repérée, et elle coûte plus qu'elle ne rapporte.
 */
export function jsonLdArticle(a: Article): object {
  const image = urlAbsolue(a.couverture);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.titre,
    description: a.description,
    datePublished: a.publieLe,
    dateModified: a.publieLe,
    inLanguage: "fr-FR",
    author: AUTEURE,
    publisher: EDITEUR,
    mainEntityOfPage: { "@type": "WebPage", "@id": urlArticle(a.slug) },
    url: urlArticle(a.slug),
    ...(image ? { image: [image] } : {}),
    ...(a.motsCles.length ? { keywords: a.motsCles.join(", ") } : {}),
  };
}

/**
 * Le JSON-LD des questions d'un article.
 *
 * Rendu SEULEMENT quand l'article porte vraiment une FAQ : déclarer une
 * `FAQPage` vide est le genre de balisage qui fait retirer les autres.
 */
export function jsonLdFaq(a: Article): object | null {
  const questions = a.blocs.flatMap((b) => (b.type === "faq" ? b.questions : []));
  if (questions.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: texteBrut(q.reponse) },
    })),
  };
}

/** Le JSON-LD de l'index : une liste ordonnée, la plus récente en tête. */
export function jsonLdListe(articles: readonly ResumeArticle[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Le blog Tiquiz",
    url: `${ORIGINE_BLOG}/blog`,
    inLanguage: "fr-FR",
    publisher: EDITEUR,
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.titre,
      description: a.description,
      datePublished: a.publieLe,
      url: urlArticle(a.slug),
    })),
  };
}

/**
 * Le fil d'Ariane, en données structurées.
 *
 * C'est lui qui fait apparaître "tiquiz.fr › blog › <article>" sous le
 * résultat, à la place de l'URL nue. Ça se lit mieux, donc ça se clique
 * plus.
 */
export function jsonLdFilDAriane(a: ResumeArticle): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${ORIGINE_BLOG}/blog` },
      { "@type": "ListItem", position: 2, name: a.titre, item: urlArticle(a.slug) },
    ],
  };
}
