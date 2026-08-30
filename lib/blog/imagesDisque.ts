// lib/blog/imagesDisque.ts
//
// LA TAILLE D'UNE IMAGE DU BLOG, LUE SUR LE DISQUE AU BUILD.
//
// La page d'article est rendue STATIQUEMENT : cette lecture a lieu une
// fois, au `next build`, sur des fichiers du dépôt. Le visiteur n'attend
// rien, et le serveur ne relit jamais ces fichiers en production.
//
// C'est ce qui permet de poser `width` et `height` sur chaque `<img>`,
// donc de réserver la place AVANT le chargement : sans ces attributs, la
// page saute à chaque image qui arrive, et c'est ce saut que Google
// mesure sous le nom de "décalage cumulé".
//
// La décision, elle, est ailleurs et elle est pure
// (`dimensionsImage.ts`) : ce fichier ne fait que lire des octets.

import fs from "node:fs";
import path from "node:path";

import { dimensionsImage, dimensionsSvg, tailleAffichage, type Dimensions } from "./dimensionsImage";

/** Mémorisé : dix articles citent les mêmes schémas plusieurs fois. */
const cache = new Map<string, Dimensions | null>();

/** Les dimensions naturelles d'une image servie depuis `public/`. */
export function dimensionsDe(src: string): Dimensions | null {
  const chemin = String(src ?? "");
  if (cache.has(chemin)) return cache.get(chemin) ?? null;

  let dim: Dimensions | null = null;
  try {
    // Le chemin vient de nos fichiers de contenu, pas d'une requête,
    // mais un `..` y serait quand même une lecture hors de `public/`.
    if (chemin.startsWith("/") && !chemin.includes("..")) {
      const fichier = path.join(process.cwd(), "public", chemin);
      dim = chemin.toLowerCase().endsWith(".svg")
        ? dimensionsSvg(fs.readFileSync(fichier, "utf8"))
        : dimensionsImage(fs.readFileSync(fichier));
    }
  } catch {
    // Fichier absent ou illisible : on ne sait pas, et l'appelant se
    // comporte comme avant. Une page en erreur pour une image serait
    // pire que l'image sans ses dimensions.
    dim = null;
  }
  cache.set(chemin, dim);
  return dim;
}

/**
 * La largeur de la colonne de lecture, en pixels CSS.
 *
 * Elle est écrite ICI et pas dans le JSX : la CSS et le calcul de taille
 * d'image doivent parler du MÊME nombre, sinon l'un borne à 720 pendant
 * que l'autre en annonce 1168, et c'est l'annonce qui gagne dans le
 * navigateur.
 */
export const COLONNE_LECTURE = 720;

/**
 * La hauteur maximale d'un visuel dans un article.
 *
 * 760 px, c'est à peu près un écran d'ordinateur portable. Au delà, une
 * capture en portrait pousse tout le texte hors de vue et le lecteur
 * croit que l'article est fini.
 */
export const HAUTEUR_MAX_VISUEL = 760;

/** La taille à écrire dans le `<img>`, bornée par la colonne et la hauteur. */
export function tailleRendue(src: string): Dimensions | null {
  return tailleAffichage(dimensionsDe(src), {
    colonne: COLONNE_LECTURE,
    hauteurMax: HAUTEUR_MAX_VISUEL,
  });
}
