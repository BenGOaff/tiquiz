// lib/blog/rubriques.ts
//
// LES RUBRIQUES DU BLOG.
//
// Béné, 30 août 2026, en montrant le blog de Typeform : "il doit être
// facile à naviguer". Chez eux, ce qui rend une liste de vingt articles
// navigable, ce sont les pastilles de catégorie en haut de la grille.
//
// -- POURQUOI DES PAGES, ET PAS UN FILTRE EN JAVASCRIPT ----------------
//
// Un filtre côté client demanderait un composant client sur des pages
// qui sont en `force-static`, donc un bundle React envoyé à quelqu'un
// venu lire un article. Et surtout, il ne créerait AUCUNE page : une
// rubrique filtrée en JavaScript n'a pas d'adresse, donc elle
// n'existe pour aucun moteur. `/blog/rubrique/methode` en est une, elle
// s'indexe, elle se partage et elle marche sans JavaScript.
//
// -- LE RATTACHEMENT EST ICI, PAS DANS LES FICHIERS D'ARTICLE ----------
//
// Les JSON de `content/blog/` viennent de l'import Systeme.io et seront
// réimportés le jour où elle republiera. Y écrire la rubrique la ferait
// disparaître au prochain import, en silence. Elle vit donc dans le
// code, à côté de la liste des rubriques qu'elle alimente.
//
// Un article NON classé n'est pas une erreur : il reste dans "Tous les
// articles". Refuser d'afficher un article parce qu'on ne sait pas où
// le ranger serait la pire des réponses.

import { listerArticles, type ResumeArticle } from "@/lib/blog/articles";

export interface Rubrique {
  /** Le segment d'URL : `/blog/rubrique/<id>`. */
  id: string;
  /** Ce que le visiteur lit sur la pastille. */
  libelle: string;
  /** Le chapeau de la page de rubrique. Il sert aussi de meta description. */
  chapeau: string;
}

export const RUBRIQUES: readonly Rubrique[] = [
  {
    id: "methode",
    libelle: "Méthode",
    chapeau:
      "Comment un quiz capte des leads déjà qualifiés, et ce qu'il faut écrire dedans pour qu'ils achètent ensuite.",
  },
  {
    id: "tutoriels",
    libelle: "Tutoriels",
    chapeau: "Les pas à pas, écran par écran, pour monter ton premier quiz et le brancher.",
  },
  {
    id: "cas-clients",
    libelle: "Cas clients",
    chapeau: "Des chiffres réels, de vraies créatrices, et ce qu'elles ont fait exactement.",
  },
  {
    id: "comparatifs",
    libelle: "Comparatifs",
    chapeau: "Les outils du marché mis côte à côte : prix réels, limites réelles, sans complaisance.",
  },
  {
    id: "affiliation",
    libelle: "Affiliation",
    chapeau: "Gagner un revenu récurrent en recommandant Tiquiz et l'Atelier du Quiz.",
  },
] as const;

/** Quel article appartient à quelle rubrique. */
const CLASSEMENT: Readonly<Record<string, string>> = {
  "vendre-avec-un-quiz": "methode",
  "collecter-emails-quiz-strategie": "methode",
  "strategie-quiz-marketing-tiquiz": "methode",
  "17-raisons-lancer-quiz-business": "methode",
  "comment-creer-quiz-systeme-io": "tutoriels",
  "quiz-video-popquiz": "tutoriels",
  "cas-client-jocelyne-tdah": "cas-clients",
  "avis-tiquiz": "cas-clients",
  "comparatif-outils-quiz-systeme-io": "comparatifs",
  "rente-mensuelle-affiliation-tiquiz": "affiliation",
};

/** La rubrique de cet article, ou `null` s'il n'en a pas encore. */
export function rubriqueDe(slug: string): Rubrique | null {
  const id = CLASSEMENT[slug];
  return RUBRIQUES.find((r) => r.id === id) ?? null;
}

/** La rubrique désignée par ce segment d'URL, ou `null`. */
export function trouverRubrique(id: string | null | undefined): Rubrique | null {
  const propre = String(id ?? "").trim().toLowerCase();
  return RUBRIQUES.find((r) => r.id === propre) ?? null;
}

/** Les articles d'une rubrique, du plus récent au plus ancien. */
export function articlesDeLaRubrique(id: string): ResumeArticle[] {
  return listerArticles().filter((a) => CLASSEMENT[a.slug] === id);
}

/**
 * Les rubriques qui ont au moins un article.
 *
 * Une pastille qui mène à une page vide est pire qu'une pastille
 * absente : le visiteur croit avoir cassé quelque chose.
 */
export function rubriquesNonVides(): Rubrique[] {
  return RUBRIQUES.filter((r) => articlesDeLaRubrique(r.id).length > 0);
}
