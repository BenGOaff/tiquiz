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
import { cheminArticle } from "./motsDuBlog";
import { prefixeDeLangue, type LanguePublique } from "@/lib/site/langues";

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
 *
 * LA LANGUE EST UN PARAMÈTRE OBLIGATOIRE, ET CE N'EST PAS DÉCORATIF.
 * Chaque langue a son dossier (`/blog/pin/` et `/blog/pin/en/`), comme
 * les couvertures (`/blog/img/` et `/blog/img/en/`). Les quatre slugs
 * anglais d'aujourd'hui diffèrent tous des slugs français, donc un
 * dossier commun marcherait... jusqu'au jour où un article anglais
 * porterait le même slug qu'un français : sa construction ÉCRASERAIT
 * l'épingle de l'autre, et le flux français publierait la couverture
 * anglaise sans qu'une seule erreur ne s'écrive.
 */
export function epinglePour(slug: string, langue: LanguePublique): string | null {
  const relatif = `${DOSSIER_PIN}${prefixeDeLangue(langue)}/${slug}.jpg`;
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

/**
 * LES ATTRIBUTS QUE PINTEREST LIT SUR UNE VIGNETTE.
 *
 * Béné, 1er septembre 2026 : "le format des images ne me permet pas de
 * les partager sur pinterest (liste des articles, hub ...) et je manque
 * de la visibilité à cause de ça."
 *
 * Elle a raison, et le défaut était plus bête que le format : depuis la
 * LISTE des articles, il n'y avait rien du tout à épingler. L'épingle
 * verticale n'existait que sur la page de l'article, et la vignette
 * d'une carte est une couverture 1200 x 675, c'est à dire exactement le
 * format qui ne circule pas dans un flux vertical.
 *
 * `data-pin-url` est le morceau qu'on ne peut PAS oublier ici, et c'est
 * lui qui distingue cette fonction de l'article. Épinglée depuis la
 * liste, une carte pointerait sinon vers `/blog` : le visiteur qui
 * clique atterrit sur un sommaire au lieu de l'article promis par
 * l'image, et l'épingle ne ramène personne.
 *
 * Rendre `{}` plutôt que des attributs vides est voulu : sans épingle
 * construite, on laisse Pinterest faire ce qu'il sait faire avec la
 * page, au lieu de lui désigner un fichier qui n'existe pas.
 */
export function attributsEpingle(
  a: Article | ResumeArticle,
  langue: LanguePublique,
): Record<string, string> {
  // `data-pin-url` PORTE LA LANGUE DE L'ARTICLE.
  //
  // C'est le morceau qu'on ne peut pas oublier (regle du 1er septembre)
  // : une epingle prise sur la carte d'un article anglais et qui
  // pointerait vers `/blog/<slug-anglais>` ramenerait le lecteur sur un
  // 404, et l'epingle ne ramenerait personne.
  return attributsEpinglePour(
    a.slug,
    `${ORIGINE_BLOG}${cheminArticle(a.slug, langue)}`,
    textePartage(a),
    langue,
  );
}

/**
 * La même chose pour une page qui n'est PAS un article.
 *
 * Le hub intégrations a son épingle (`hub-integrations`), construite par
 * le même générateur : une page dont tout l'intérêt est d'être trouvée
 * mérite la même image verticale qu'un article. Les deux passent par
 * ici, sinon la deuxième finirait par désigner un autre fichier que la
 * première, et c'est le défaut que ce fichier existe pour éviter.
 */
export function attributsEpinglePour(
  slug: string,
  urlDeLaPage: string,
  description: string,
  langue: LanguePublique,
): Record<string, string> {
  const epingle = epinglePour(slug, langue);
  if (!epingle) return {};
  return {
    "data-pin-media": epingle,
    "data-pin-url": urlDeLaPage,
    "data-pin-description": description,
  };
}
