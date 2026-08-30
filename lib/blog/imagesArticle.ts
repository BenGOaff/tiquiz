// lib/blog/imagesArticle.ts
//
// LES VARIANTES DESKTOP / MOBILE D'UN MÊME SCHÉMA, APPARIÉES.
//
// Béné, 30 août 2026 : "certaines images sont d'une taille
// disproportionnée c'est carrément n'importe quoi."
//
// -- CE QU'ON MONTRAIT VRAIMENT ---------------------------------------
//
// Ses schémas existent en DEUX versions, dessinées exprès : une large
// pour un écran, une haute pour un téléphone. Sur Systeme.io, leur
// éditeur en masquait une selon la taille de l'écran. À l'import, les
// deux sont devenues deux blocs image ordinaires, et la page les
// affichait **toutes les deux, l'une sous l'autre**.
//
// Le lecteur voyait donc le même schéma deux fois, et la deuxième fois
// c'était la version TÉLÉPHONE étirée sur toute la largeur :
//
//   schema-connexion-systemeio-mobile.webp   760 x 1400
//     -> affichée 1168 de large, donc 2151 px de HAUT
//   svg-tunnel-jocelyne-mobile-preview.webp  500 x 975
//     -> affichée 1168 de large, donc 2277 px de HAUT
//
// Deux écrans et demi de haut pour un schéma qui vient déjà d'être
// montré. C'est exactement "n'importe quoi", et aucun réglage de
// largeur ne l'aurait corrigé : il fallait comprendre que ces deux
// blocs n'en font qu'un.
//
// -- LA RÈGLE ---------------------------------------------------------
//
// Deux blocs image qui SE SUIVENT et dont les noms ne diffèrent que par
// le suffixe de variante sont un SEUL visuel. On rend un `<picture>` :
// la version haute sous 640 px, la version large au dessus. Le lecteur
// voit le schéma pensé pour son écran, une fois.
//
// L'appariement est PUR et testé : c'est une décision sur des noms de
// fichiers, et une décision de ce genre enfermée dans du JSX finit
// toujours par diverger de ce que fait l'autre écran.

import type { Bloc, BlocImage } from "./articles";

/** Les suffixes que porte une variante téléphone, dans le corpus importé. */
const SUFFIXES_MOBILE = ["-mobile-preview", "-mobile"];
/** Les suffixes que porte la variante grand écran. */
const SUFFIXES_LARGE = ["-large", "-desktop", ""];

/** `/blog/img/x-mobile.webp` -> `{ base: "/blog/img/x", ext: ".webp" }`, ou null. */
function separer(src: string, suffixes: readonly string[]): { base: string; ext: string } | null {
  const m = /^(.*?)(\.[a-z0-9]+)$/i.exec(String(src ?? ""));
  if (!m) return null;
  for (const s of suffixes) {
    if (s === "") return { base: m[1], ext: m[2] };
    if (m[1].endsWith(s)) return { base: m[1].slice(0, -s.length), ext: m[2] };
  }
  return null;
}

/**
 * Les blocs, avec les variantes appariées.
 *
 * On n'apparie QUE des blocs consécutifs. Deux schémas différents dont
 * l'un s'appellerait par hasard `x-mobile` en fin d'article ne doivent
 * pas être fusionnés avec un `x` du début : ils ne parlent pas de la
 * même chose, et la fusion en ferait disparaître un.
 *
 * L'extension peut différer entre les deux versions (`svg-tunnel-
 * jocelyne.svg` et `svg-tunnel-jocelyne-mobile-preview.webp`) : c'est le
 * cas réel du corpus, et exiger la même extension aurait laissé ce
 * doublon là en place.
 */
export function apparierVariantes(blocs: readonly Bloc[]): Bloc[] {
  const out: Bloc[] = [];
  for (let i = 0; i < blocs.length; i++) {
    const a = blocs[i];
    const b = blocs[i + 1];
    if (a?.type === "image" && b?.type === "image") {
      const grand = separer(a.src, SUFFIXES_LARGE);
      const petit = separer(b.src, SUFFIXES_MOBILE);
      if (grand && petit && grand.base === petit.base) {
        out.push({ ...a, mobile: b.src, alt: a.alt || b.alt } as BlocImage);
        i += 1;
        continue;
      }
    }
    out.push(a);
  }
  return out;
}

/**
 * Retire les images répétées À LA SUITE.
 *
 * `svg-gwenn-3-axes.svg` apparaît deux fois d'affilée dans l'étude de
 * cas de Jocelyne : l'import a dupliqué le bloc. Deux fois le même
 * schéma, c'est le lecteur qui se demande ce qu'il a raté entre les
 * deux. On ne déduplique QUE des voisins immédiats : une capture
 * rappelée trois sections plus loin est un rappel volontaire.
 */
export function retirerDoublonsVoisins(blocs: readonly Bloc[]): Bloc[] {
  const out: Bloc[] = [];
  for (const b of blocs) {
    const p = out[out.length - 1];
    if (b.type === "image" && p?.type === "image" && p.src === b.src) continue;
    out.push(b);
  }
  return out;
}

/** Les deux passes, dans l'ordre : on déduplique AVANT d'apparier. */
export function normaliserImages(blocs: readonly Bloc[]): Bloc[] {
  return apparierVariantes(retirerDoublonsVoisins(blocs));
}
