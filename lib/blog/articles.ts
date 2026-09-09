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

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";

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
/**
 * Une vidéo YouTube.
 *
 * Elle ne peut PAS être un bloc `html` : `nettoyerBloc` retire les
 * `iframe`, donc le bloc sortirait vide. Et elle n'est pas posée telle
 * quelle non plus : le cadre n'existe qu'au clic, et sa miniature vit
 * sur notre disque. Le pourquoi est dans `lib/blog/video.ts`.
 */
export interface BlocVideo {
  type: "video";
  /** L'identifiant YouTube, validé à l'import (11 caractères). */
  id: string;
  /** Le titre, lu chez YouTube à l'import. Il sert de texte au lien. */
  titre: string;
}
export type Bloc = BlocTitre | BlocHtml | BlocImage | BlocFaq | BlocCta | BlocVideo;

export interface Article {
  slug: string;
  /**
   * La langue de l'article.
   *
   * Absente sur les 10 articles francais, qui sont anterieurs : la
   * lecture retombe sur la langue sans prefixe. Les remplir tous les
   * dix pour le plaisir de la symetrie ferait bouger dix fichiers pour
   * une valeur que la fonction connait deja.
   */
  langue?: LanguePublique;
  /**
   * Le slug de l'article dont celui ci est la VERSION, dans la langue
   * sans prefixe.
   *
   * L'APPARIEMENT EST ECRIT, JAMAIS DEVINE. "create-quiz-systeme-io" et
   * "comment-creer-quiz-systeme-io" ne se ressemblent pas assez pour
   * qu'un algorithme les rapproche, et deux articles mal apparies
   * donnent un `hreflang` que Google croit : il servirait alors un
   * article a la place d'un autre, sans que rien ne le dise.
   */
  traductionDe?: string;
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

/**
 * LA LANGUE EST UN PARAMETRE OBLIGATOIRE, ET CE N'EST PAS DU CONFORT.
 *
 * Bene, 8 septembre 2026 : "on doit les recuperer sur le blog tiquiz.fr
 * avec les articles et pages en anglais."
 *
 * Un defaut a "fr" marcherait aujourd'hui et casserait au premier
 * lecteur ecrit sans y penser : il servirait du FRANCAIS sous une
 * adresse anglaise, la page s'afficherait parfaitement, et Google
 * indexerait ca. C'est exactement la forme de panne que tout ce
 * chantier existe pour empecher, et c'est la regle du 1er aout : quand
 * un cas a deux mecaniques, la mecanique est un PARAMETRE OBLIGATOIRE,
 * jamais devinee. Le compilateur refuse alors un appelant qui se tait.
 *
 * Le francais vit a la racine et l'anglais dans `en/` : la langue sans
 * prefixe ne DEPLACE aucun fichier, donc aucune adresse deja indexee ne
 * bouge.
 */
function dossierDe(langue: LanguePublique): string {
  return langue === LANGUE_SANS_PREFIXE ? DOSSIER : path.join(DOSSIER, langue);
}

/** Les articles d'une langue, du plus récent au plus ancien. */
export function listerArticles(langue: LanguePublique): ResumeArticle[] {
  try {
    const brut = fs.readFileSync(path.join(dossierDe(langue), "index.json"), "utf8");
    return JSON.parse(brut) as ResumeArticle[];
  } catch {
    // Un blog vide vaut mieux qu'une page en erreur : le reste du site
    // continue de fonctionner.
    return [];
  }
}

/** Un article, ou `null` si le slug n'existe pas dans cette langue. */
export function lireArticle(slug: string, langue: LanguePublique): Article | null {
  // On ne concatène JAMAIS un slug reçu dans un chemin sans le
  // valider : `../../.env` est un nom de fichier parfaitement valide
  // pour `path.join`.
  if (!/^[a-z0-9-]{1,80}$/.test(String(slug ?? ""))) return null;
  try {
    const brut = fs.readFileSync(path.join(dossierDe(langue), `${slug}.json`), "utf8");
    return JSON.parse(brut) as Article;
  } catch {
    return null;
  }
}

/** Tous les slugs d'une langue, pour le sitemap et la génération statique. */
export function tousLesSlugs(langue: LanguePublique): string[] {
  return listerArticles(langue).map((a) => a.slug);
}

/**
 * L'adresse d'un article dans chaque langue ou il existe.
 *
 * Les slugs DIFFERENT d'une langue a l'autre, donc `alternatesDeLangue`
 * (qui suppose un chemin nu commun) ne peut pas servir ici : il
 * annoncerait `/en/comment-creer-quiz-systeme-io`, une adresse qui
 * n'existe pas. Une paire `hreflang` vers une page absente est pire que
 * pas de paire du tout.
 */
export function adressesDeLArticle(slug: string, langue: LanguePublique): Record<string, string> {
  const fr =
    langue === LANGUE_SANS_PREFIXE
      ? slug
      : (lireArticle(slug, langue)?.traductionDe ?? null);
  if (!fr) return {};
  const adresses: Record<string, string> = {};
  // ON N'ANNONCE QUE CE QUI EXISTE VRAIMENT SUR LE DISQUE.
  //
  // Une paire `hreflang` vers une page absente est pire que pas de
  // paire du tout : Google la suit, tombe sur un 404, et c'est le
  // signal qu'on cherchait a donner qui devient un signal de site
  // casse.
  if (lireArticle(fr, LANGUE_SANS_PREFIXE)) adresses[LANGUE_SANS_PREFIXE] = `/blog/${fr}`;
  // La version anglaise est celle qui DECLARE `traductionDe: fr`. On ne
  // devine pas son slug : c'est le sommaire qui dit de qui chaque
  // article est la version, et lui seul. Il est ECRIT par la reparation
  // depuis le contenu corrige, donc il ne peut pas porter un titre que
  // le contenu ne porte plus.
  const en = listerArticles("en").find((a) => a.traductionDe === fr);
  if (en) adresses.en = `/en/blog/${en.slug}`;
  return adresses;
}
