// lib/blog/partage.ts
//
// CE QU'ON PARTAGE D'UN ARTICLE : L'IMAGE, ET LE TEXTE.
//
// -- L'ÉPINGLE N'EST PAS LA COUVERTURE --------------------------------
//
// Béné, 30 août 2026 : "aucune image ne peut être repartagée sur
// Pinterest qui m'aide à faire ranker mon site, les images ne sont pas
// conformes."
//
// Les couvertures font 1200 x 675. Pinterest est un flux VERTICAL : une
// image en 16/9 y occupe trois fois moins de hauteur que ses voisines,
// donc elle se voit trois fois moins, donc elle ne circule pas. Chaque
// article a donc une ÉPINGLE 1000 x 1500, construite par
// `scripts/construire-epingles.mjs` à partir de sa propre couverture.
//
// L'épingle est déclarée ICI et pas dans le composant : la page, le
// bouton Pinterest et l'attribut `data-pin-media` des images doivent
// tous désigner LE MÊME fichier. Trois endroits qui le calculent
// séparément finissent par ne plus parler de la même image.
//
// -- LE TEXTE EST CELUI DE L'ARTICLE, PAS UN SLOGAN -------------------
//
// La description d'une épingle est ce qui la fait trouver dans la
// recherche Pinterest. Le titre plus la promesse de l'article valent
// mieux que "Découvre cet article" : ce sont les mots que quelqu'un
// tape vraiment.

import fs from "node:fs";
import path from "node:path";

import type { Article, ResumeArticle } from "./articles";
import { ORIGINE_BLOG } from "./seo";

/** Le dossier des épingles, servi depuis `public/`. */
const DOSSIER_PIN = "/blog/pin";

/**
 * L'URL ABSOLUE de l'épingle d'un article, ou `null`.
 *
 * `null` quand le fichier n'a pas été construit : le bouton Pinterest
 * disparaît alors, au lieu d'ouvrir un formulaire sans image. Un bouton
 * qui ne fait rien coûte plus cher que pas de bouton (règle du 3 août).
 *
 * Le test est fait sur le DISQUE et pas sur une liste écrite à la main :
 * une liste finirait par annoncer un fichier supprimé.
 */
export function epinglePour(slug: string): string | null {
  const relatif = `${DOSSIER_PIN}/${slug}.jpg`;
  try {
    if (!/^[a-z0-9-]{1,80}$/.test(String(slug ?? ""))) return null;
    if (!fs.existsSync(path.join(process.cwd(), "public", relatif))) return null;
  } catch {
    return null;
  }
  return `${ORIGINE_BLOG}${relatif}`;
}

/**
 * Le message proposé au partage.
 *
 * Titre + description, borné à 480 caractères : c'est la limite au delà
 * de laquelle Pinterest tronque une description, et une phrase coupée au
 * milieu d'un mot fait amateur là où on cherche justement à être repris.
 */
export function textePartage(a: Article | ResumeArticle): string {
  const titre = String(a.titre ?? "").trim();
  const desc = String(a.description ?? "").trim();
  const tout = desc ? `${titre} - ${desc}` : titre;
  if (tout.length <= 480) return tout;
  // On coupe sur un espace, jamais au milieu d'un mot.
  const coupe = tout.slice(0, 480);
  return `${coupe.slice(0, coupe.lastIndexOf(" "))}...`;
}
