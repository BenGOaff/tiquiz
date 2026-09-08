// lib/blog/motsDuBlog.ts
//
// LES MOTS ET LES ADRESSES DU BLOG, PAR LANGUE.
//
// Béné, 8 septembre 2026 : "il faut à chaque fois utiliser le champ
// sémantique, les expressions, tournures de phrases, ponctuation etc..
// propre à chaque langue, c'est pas uniquement du mot à mot."
//
// -- CE QUI MANQUAIT, ET CE N'ÉTAIT PAS LE CORPS DE L'ARTICLE ---------
//
// Ses quatre articles anglais sont écrits en anglais. Le MEUBLE autour,
// lui, était écrit en dur en français dans la page : "Fil d'Ariane",
// "En bref", "Dans cet article", "min de lecture", "Partager cet
// article", "À lire ensuite", et la date rendue en `fr-FR`.
//
// Servir un texte anglais dans ce cadre là, c'est une page à moitié
// traduite, sur laquelle un lecteur anglophone voit tout de suite qu'il
// n'était pas prévu. C'est exactement le reproche du client du 7
// septembre ("some parts of the quiz UI were in French"), transposé au
// blog.
//
// -- LES ADRESSES VIENNENT D'UN SEUL ENDROIT --------------------------
//
// `cheminPourLangue` (lib/site/langues.ts) décide déjà où vit une
// langue. Réécrire `/en/blog/${slug}` à la main dans une page donnerait
// un deuxième endroit qui dit où est l'anglais, et c'est le défaut que
// ces dépôts paient en boucle : le jour où le préfixe change, un des
// deux suit et l'autre pas.
//
// -- CE MODULE EST PUR --------------------------------------------------
//
// Aucune lecture de disque, aucun `next/headers` : il est chargeable par
// le runner de tests, donc ces décisions sont testées. Une règle
// enfermée dans un composant React n'est pas testable, donc elle n'est
// pas testée (règle du 1er août).

import { cheminPourLangue, type LanguePublique } from "@/lib/site/langues";

/** L'adresse du sommaire du blog, dans une langue. */
export function cheminBlog(langue: LanguePublique): string {
  return cheminPourLangue("/blog", langue);
}

/** L'adresse d'un article, dans SA langue. */
export function cheminArticle(slug: string, langue: LanguePublique): string {
  return cheminPourLangue(`/blog/${slug}`, langue);
}

/** L'adresse d'une rubrique. */
export function cheminRubrique(id: string, langue: LanguePublique): string {
  return cheminPourLangue(`/blog/rubrique/${id}`, langue);
}

/**
 * La langue d'un balisage `inLanguage` et d'un `og:locale`.
 *
 * On ne fabrique PAS `${langue}-${langue.toUpperCase()}` : ça marche
 * pour "fr" et "en" et ça donnerait "pt-PT" pour du brésilien le jour
 * où une troisième langue arrive. Une table dit ce qu'on sert.
 */
const BALISE_LANGUE: Record<LanguePublique, { inLanguage: string; ogLocale: string }> = {
  fr: { inLanguage: "fr-FR", ogLocale: "fr_FR" },
  en: { inLanguage: "en-US", ogLocale: "en_US" },
};

export function baliseLangue(langue: LanguePublique): { inLanguage: string; ogLocale: string } {
  return BALISE_LANGUE[langue];
}

export interface MotsDuBlog {
  /** La locale passée à `Intl.DateTimeFormat`. */
  locale: string;
  blog: string;
  filDAriane: string;
  signature: string;
  minutesDeLecture: (n: number) => string;
  enBref: string;
  dansCetArticle: string;
  partagerCetArticle: string;
  aLireEnsuite: string;
  /** Le lien pose sous chaque article DANS LE FLUX RSS. */
  lireLArticle: string;
  nomDuBlog: string;
  /**
   * LE SOMMAIRE DU BLOG, MOT POUR MOT.
   *
   * Le francais est recopie a l'identique de ce que la page servait
   * avant ce chantier : ce sont ses phrases, elles sont indexees, et un
   * chantier de langue n'a pas a les reecrire au passage.
   */
  sommaire: {
    metaTitre: string;
    metaDescription: string;
    etiquette: string;
    /** Le titre se coupe en deux : le fragment surligne est le second. */
    titreDebut: string;
    titreSurb: string;
    aucunArticle: string;
    lesDerniers: string;
    /**
     * Le titre de la grille QUAND des rubriques existent, et son titre
     * quand il n'y en a pas.
     *
     * Les rubriques n'existent qu'en francais (`rubriquesDeLaLangue`) :
     * garder "Choisis un sujet" au dessus d'une grille sans une seule
     * pastille demanderait de choisir dans une liste qui n'est pas la.
     */
    choisisUnSujet: string;
    tousLesArticles: string;
    ctaTitreDebut: string;
    ctaTitreSurb: string;
    ctaCorps: string;
    ctaBouton: string;
    /**
     * Le second bouton, ou `null` quand sa destination n'existe pas
     * dans cette langue.
     *
     * Il mene a `/`, qui sert la page de vente CAPTUREE, en francais.
     * L'annoncer en anglais enverrait un lecteur anglophone sur une
     * page francaise depuis un blog anglais : on n'affiche donc rien
     * plutot que de promettre une page qui n'existe pas encore. C'est
     * la meme regle que les `hreflang` : on ne declare que ce qui est
     * ecrit.
     */
    ctaSecondaire: string | null;
    ctaRassurance: string;
  };
}

/**
 * LES MOTS, ÉCRITS DANS CHAQUE LANGUE, PAS TRADUITS MOT À MOT.
 *
 * "5 min de lecture" se dit "5 min read" en anglais, pas "5 min of
 * reading" ; "À lire ensuite" se dit "Read next", pas "To read after".
 * C'est sa consigne, et c'est ce qui sépare un site traduit d'un site
 * passé à la machine.
 */
const MOTS: Record<LanguePublique, MotsDuBlog> = {
  fr: {
    locale: "fr-FR",
    blog: "Blog",
    filDAriane: "Fil d'Ariane",
    signature: "Par Béné, fondatrice de Tiquiz",
    minutesDeLecture: (n) => `${n} min de lecture`,
    enBref: "En bref",
    dansCetArticle: "Dans cet article",
    partagerCetArticle: "Partager cet article",
    aLireEnsuite: "À lire ensuite",
    lireLArticle: "Lire l'article",
    nomDuBlog: "Le blog Tiquiz",
    sommaire: {
      metaTitre: "Le blog Tiquiz : quiz, leads et Systeme.io",
      metaDescription:
        "Comment un quiz capte des leads qualifiés, les tague par profil et les transforme en clients. Méthodes, cas concrets et outils, sans jargon.",
      etiquette: "Le blog",
      titreDebut: "Des quiz qui ",
      titreSurb: "rapportent",
      aucunArticle: "Aucun article pour le moment.",
      lesDerniers: "Les derniers",
      choisisUnSujet: "Choisis un sujet",
      tousLesArticles: "Tous les articles",
      ctaTitreDebut: "Ton premier quiz tourne ",
      ctaTitreSurb: "ce soir",
      ctaCorps:
        "Tiquiz écrit le quiz, pose les tags par profil et te rend des leads déjà triés dans Systeme.io. Sans Zapier, sans Make.",
      ctaBouton: "Créer mon quiz gratuitement",
      ctaSecondaire: "Voir ce que fait Tiquiz",
      ctaRassurance: "Plan gratuit, sans carte bancaire et sans limite de durée.",
    },
  },
  en: {
    locale: "en-US",
    blog: "Blog",
    filDAriane: "Breadcrumb",
    signature: "By Béné, founder of Tiquiz",
    minutesDeLecture: (n) => `${n} min read`,
    enBref: "In short",
    dansCetArticle: "In this article",
    partagerCetArticle: "Share this article",
    aLireEnsuite: "Read next",
    lireLArticle: "Read the article",
    nomDuBlog: "The Tiquiz blog",
    sommaire: {
      metaTitre: "The Tiquiz blog: quizzes, leads and Systeme.io",
      metaDescription:
        "How a quiz captures qualified leads, tags them by profile and turns them into customers. Methods, real cases and tools, no jargon.",
      etiquette: "Blog",
      titreDebut: "Quizzes that ",
      titreSurb: "pay off",
      aucunArticle: "Nothing published here yet.",
      lesDerniers: "Latest",
      choisisUnSujet: "Pick a topic",
      tousLesArticles: "All the articles",
      ctaTitreDebut: "Your first quiz can be live ",
      ctaTitreSurb: "tonight",
      ctaCorps:
        "Tiquiz writes the quiz, tags every profile and hands you leads already sorted in Systeme.io. No Zapier, no Make.",
      ctaBouton: "Create my quiz for free",
      ctaSecondaire: null,
      ctaRassurance: "Free plan, no credit card, no time limit.",
    },
  },
};

export function motsDuBlog(langue: LanguePublique): MotsDuBlog {
  return MOTS[langue];
}
