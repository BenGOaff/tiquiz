// lib/blog/dimensionsImage.ts
//
// LA TAILLE RÉELLE D'UNE IMAGE, LUE DANS SES PREMIERS OCTETS.
//
// Béné, 30 août 2026 : "certaines images sont d'une taille
// disproportionnée c'est carrément n'importe quoi."
//
// -- LE VRAI DÉFAUT N'EST PAS LA LARGEUR DE LA COLONNE -----------------
//
// Le corps d'article faisait 1168 px (mesuré), et les images portaient
// `w-full` : une capture d'écran de 520 px de large était donc ÉTIRÉE à
// 1168, soit 2,2 fois sa définition. C'est ça, "n'importe quoi" : le
// texte de la capture devient flou et l'image écrase la page.
//
// Réduire la colonne à 720 px ne suffit pas : cette même capture serait
// encore agrandie de 40 %. **Une image ne doit jamais dépasser sa propre
// définition.** C'est la même famille de règle que `answerImageRender`
// du 4 août : l'image garde SON format, et ici SA taille.
//
// -- POURQUOI ON LIT LES OCTETS AU LIEU D'APPELER UNE LIBRAIRIE --------
//
// La page est rendue STATIQUEMENT : cette lecture a lieu au build, une
// fois, sur des fichiers du dépôt. Ajouter une dépendance pour ça, c'est
// une ligne de plus dans `npm ci`, un binaire de plus à embarquer dans
// la sortie standalone, et un chemin de plus qui casse en production
// sans casser en local (leçon `pdf-parse`, 7 août).
//
// Cinquante lignes de lecture d'en-tête, en revanche, se testent.

export interface Dimensions {
  largeur: number;
  hauteur: number;
}

/**
 * Les dimensions d'une image, ou `null` si on ne sait pas les lire.
 *
 * `null` n'est pas une erreur : c'est "je ne sais pas", et l'appelant
 * doit alors se comporter comme avant (pleine largeur de colonne).
 * Rendre `0` ou une valeur par défaut ferait disparaître l'image.
 */
export function dimensionsImage(octets: Uint8Array): Dimensions | null {
  return lireWebp(octets) ?? lirePng(octets) ?? lireJpeg(octets) ?? lireGif(octets);
}

function u8(o: Uint8Array, i: number): number {
  return i < o.length ? o[i] : 0;
}
function le16(o: Uint8Array, i: number): number {
  return u8(o, i) | (u8(o, i + 1) << 8);
}
function le24(o: Uint8Array, i: number): number {
  return u8(o, i) | (u8(o, i + 1) << 8) | (u8(o, i + 2) << 16);
}
function be16(o: Uint8Array, i: number): number {
  return (u8(o, i) << 8) | u8(o, i + 1);
}
function be32(o: Uint8Array, i: number): number {
  return ((u8(o, i) << 24) | (u8(o, i + 1) << 16) | (u8(o, i + 2) << 8) | u8(o, i + 3)) >>> 0;
}
function marque(o: Uint8Array, i: number, texte: string): boolean {
  for (let k = 0; k < texte.length; k++) if (u8(o, i + k) !== texte.charCodeAt(k)) return false;
  return true;
}

/**
 * WebP : `RIFF....WEBP` puis un bloc dont la forme dépend du codec.
 *
 * Les trois formes existent dans `public/blog/img/` : les photos
 * recompressées sont en VP8L, les GIF convertis en VP8X (animé), et
 * certaines captures en VP8 simple. En traiter une seule aurait laissé
 * les deux autres sans dimensions, donc sans garde-fou, en silence.
 */
function lireWebp(o: Uint8Array): Dimensions | null {
  if (!marque(o, 0, "RIFF") || !marque(o, 8, "WEBP")) return null;
  const bloc = String.fromCharCode(u8(o, 12), u8(o, 13), u8(o, 14), u8(o, 15));

  if (bloc === "VP8 ") {
    // Le bitstream commence à 20 ; la signature 9d 01 2a précède les tailles.
    if (!(u8(o, 23) === 0x9d && u8(o, 24) === 0x01 && u8(o, 25) === 0x2a)) return null;
    return { largeur: le16(o, 26) & 0x3fff, hauteur: le16(o, 28) & 0x3fff };
  }
  if (bloc === "VP8L") {
    // 14 bits de largeur puis 14 bits de hauteur, moins un, en petit boutien.
    const bits = le32(o, 21);
    return { largeur: (bits & 0x3fff) + 1, hauteur: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (bloc === "VP8X") {
    // Canvas sur 24 bits, moins un.
    return { largeur: le24(o, 24) + 1, hauteur: le24(o, 27) + 1 };
  }
  return null;
}

function le32(o: Uint8Array, i: number): number {
  return (u8(o, i) | (u8(o, i + 1) << 8) | (u8(o, i + 2) << 16) | (u8(o, i + 3) << 24)) >>> 0;
}

function lirePng(o: Uint8Array): Dimensions | null {
  if (!(u8(o, 0) === 0x89 && marque(o, 1, "PNG"))) return null;
  return { largeur: be32(o, 16), hauteur: be32(o, 20) };
}

function lireGif(o: Uint8Array): Dimensions | null {
  if (!marque(o, 0, "GIF8")) return null;
  return { largeur: le16(o, 6), hauteur: le16(o, 8) };
}

/**
 * JPEG : on saute de segment en segment jusqu'au SOF.
 *
 * Les segments SOF0..SOF15 portent la taille, sauf SOF4 / SOF8 / SOF12
 * qui ne sont pas des débuts d'image (tables de Huffman, extensions).
 */
function lireJpeg(o: Uint8Array): Dimensions | null {
  if (!(u8(o, 0) === 0xff && u8(o, 1) === 0xd8)) return null;
  let i = 2;
  while (i + 9 < o.length) {
    if (u8(o, i) !== 0xff) {
      i += 1;
      continue;
    }
    const type = u8(o, i + 1);
    if (type >= 0xc0 && type <= 0xcf && type !== 0xc4 && type !== 0xc8 && type !== 0xcc) {
      return { hauteur: be16(o, i + 5), largeur: be16(o, i + 7) };
    }
    const longueur = be16(o, i + 2);
    if (longueur < 2) return null;
    i += 2 + longueur;
  }
  return null;
}

/**
 * La largeur d'affichage maximale d'une image, en pixels CSS.
 *
 * Une image n'est JAMAIS agrandie au delà de sa définition. Sur un écran
 * à densité 2, on tolère l'affichage à sa taille naturelle : c'est déjà
 * une image "à moitié floue" au pire, alors qu'un agrandissement de
 * 2,2 fois est illisible.
 *
 * Taille inconnue -> la largeur de la colonne, comme avant. On ne
 * suppose pas une valeur : mieux vaut le comportement d'hier qu'une
 * image rabougrie parce qu'on a deviné.
 */
export function largeurMax(dim: Dimensions | null, colonne: number): number {
  if (!dim || dim.largeur <= 0) return colonne;
  return Math.min(colonne, dim.largeur);
}

/**
 * Les dimensions d'un SVG, lues dans son `viewBox`.
 *
 * Vingt schémas du blog sont des SVG, et ils n'ont ni `width` ni
 * `height` : leur taille naturelle est celle du `viewBox`. Sans ça, un
 * schéma dessiné pour 400 x 850 (la variante mobile) s'étirait sur
 * toute la largeur de la colonne.
 */
export function dimensionsSvg(texte: string): Dimensions | null {
  const t = String(texte ?? "").slice(0, 2000);
  const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(t)?.[1];
  if (vb) {
    const n = vb.trim().split(/[\s,]+/).map(Number);
    if (n.length === 4 && n[2] > 0 && n[3] > 0) return { largeur: n[2], hauteur: n[3] };
  }
  const w = Number(/\bwidth\s*=\s*"([\d.]+)/i.exec(t)?.[1]);
  const h = Number(/\bheight\s*=\s*"([\d.]+)/i.exec(t)?.[1]);
  return w > 0 && h > 0 ? { largeur: w, hauteur: h } : null;
}

/**
 * La taille d'AFFICHAGE d'une image dans une colonne de lecture.
 *
 * Deux bornes, et il faut les deux :
 *
 *   - LA LARGEUR. Jamais plus large que la colonne, jamais plus large
 *     que sa propre définition. `gwenn.webp` fait 200 px : affichée en
 *     `w-full` sur 1168 px, elle était agrandie 5,8 fois.
 *
 *   - LA HAUTEUR. C'est celle qui manquait, et c'est elle qui produit le
 *     "n'importe quoi" de Béné. `publicite-quiz.webp` fait 842 x 1808 :
 *     étirée à la largeur de la colonne, elle occupait **2508 px de
 *     haut**, soit deux écrans et demi pour une capture. Une capture en
 *     portrait doit être bornée par sa HAUTEUR, pas par sa largeur.
 *
 * Le ratio est conservé au pixel près : on RÉDUIT, on ne recadre jamais
 * (règle du 4 août). Un `object-cover` couperait le haut du schéma, et
 * un schéma coupé ne veut plus rien dire.
 */
export function tailleAffichage(
  dim: Dimensions | null,
  opts: { colonne: number; hauteurMax: number },
): Dimensions | null {
  if (!dim || dim.largeur <= 0 || dim.hauteur <= 0) return null;
  const facteur = Math.min(
    1,
    opts.colonne / dim.largeur,
    opts.hauteurMax / dim.hauteur,
  );
  return {
    largeur: Math.round(dim.largeur * facteur),
    hauteur: Math.round(dim.hauteur * facteur),
  };
}
