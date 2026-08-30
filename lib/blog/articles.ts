// lib/blog/articles.ts
//
// LE BLOG DE TIQUIZ, RAPATRIÉ DEPUIS SYSTEME.IO (Béné, 29 août 2026).
//
// "Sinon oui mon blog sur tiquiz.fr/blog. Je vais supprimer les
// anciennes versions dans la foulée."
//
// -- CE QUI A ÉTÉ IMPORTÉ, ET COMMENT ----------------------------------
//
// Pas une capture du HTML rendu : le MODÈLE de chaque page
// (`window.__PRELOADED_STATE__`) porte le contenu bloc par bloc, avec
// son type. On récupère donc des titres, des paragraphes, des listes et
// des images, pas une soupe de `<div>` avec les couleurs de leur
// gabarit. C'est ce qui permet à ces articles de ressembler au reste du
// site plutôt qu'à un corps étranger.
//
// -- LES ARTICLES SONT DES FICHIERS, PAS DES LIGNES EN BASE ------------
//
// Dix articles qui changent trois fois par an n'ont rien à faire dans
// une base : un fichier se relit dans une revue de code, se déploie
// avec le reste, et ne peut pas disparaître parce qu'une migration n'a
// pas été passée. C'est exactement la panne qu'on paie depuis juin
// quand une table manque.
//
// -- LE CONTENU A ÉTÉ MIS À JOUR À L'IMPORT ----------------------------
//
// Les prix (9/90 -> 17/170 avec l'arithmétique refaite, pas les nombres
// remplacés un par un), les liens (`tipote.fr/tiquiz` -> `tiquiz.fr`,
// l'espace affilié chez nous), et le système d'affiliation (le code
// public `?ref=` a remplacé le `sa` de Systeme.io). Un article qui
// annonce un ancien prix est une promesse qu'on ne tient pas.

import fs from "node:fs";
import path from "node:path";

export interface BlocTitre {
  type: "titre";
  niveau: 2 | 3;
  texte: string;
  id: string;
}
export interface BlocHtml {
  type: "html";
  html: string;
}
export interface BlocImage {
  type: "image";
  src: string;
  alt: string;
  /**
   * La variante dessinée pour un téléphone, quand elle existe.
   *
   * Elle n'est PAS dans les fichiers de contenu : elle y vit comme un
   * second bloc image, et `normaliserImages` (lib/blog/imagesArticle.ts)
   * apparie les deux au rendu. Le champ est ici pour que le jour où un
   * article la porte directement, rien ne change côté page.
   */
  mobile?: string;
}
export interface BlocFaq {
  type: "faq";
  questions: { question: string; reponse: string }[];
}
export interface BlocCta {
  type: "cta";
  texte: string;
  url: string;
}
export type Bloc = BlocTitre | BlocHtml | BlocImage | BlocFaq | BlocCta;

export interface Article {
  slug: string;
  titre: string;
  description: string;
  motsCles: string[];
  /** Date ISO courte, `2026-08-22`. */
  publieLe: string;
  couverture: string | null;
  blocs: Bloc[];
}

export type ResumeArticle = Omit<Article, "blocs" | "motsCles">;

const DOSSIER = path.join(process.cwd(), "content", "blog");

/** Les articles, du plus récent au plus ancien. */
export function listerArticles(): ResumeArticle[] {
  try {
    const brut = fs.readFileSync(path.join(DOSSIER, "index.json"), "utf8");
    return JSON.parse(brut) as ResumeArticle[];
  } catch {
    // Un blog vide vaut mieux qu'une page en erreur : le reste du site
    // continue de fonctionner.
    return [];
  }
}

/** Un article, ou `null` si le slug n'existe pas. */
export function lireArticle(slug: string): Article | null {
  // On ne concatène JAMAIS un slug reçu dans un chemin sans le
  // valider : `../../.env` est un nom de fichier parfaitement valide
  // pour `path.join`.
  if (!/^[a-z0-9-]{1,80}$/.test(String(slug ?? ""))) return null;
  try {
    const brut = fs.readFileSync(path.join(DOSSIER, `${slug}.json`), "utf8");
    return JSON.parse(brut) as Article;
  } catch {
    return null;
  }
}

/** Tous les slugs, pour le sitemap et la génération statique. */
export function tousLesSlugs(): string[] {
  return listerArticles().map((a) => a.slug);
}
