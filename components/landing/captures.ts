// components/landing/captures.ts
//
// LA TAILLE RÉELLE D'UNE CAPTURE, LUE DANS LE FICHIER.
//
// `next/image` exige `width` et `height` pour réserver la place avant
// que l'image arrive : sans eux, la page saute quand chaque capture se
// charge, et c'est exactement la mesure que Google pénalise.
//
// ON NE LES ÉCRIT PAS À LA MAIN. Un chiffre recopié devient faux le
// jour où Béné remplace une capture par une autre du même nom, et un
// `width` qui ment sur la taille réelle a déjà coûté un logo étiré sur
// 167 px au lieu de 56 (drame du pied de page, 2 septembre).
//
// La lecture se fait au SERVEUR, une fois par processus, sur un fichier
// du dépôt : c'est la même mécanique que `lib/blog/dimensionsImage.ts`,
// qui lit les premiers octets sans aucune dépendance.
//
// ET ELLE REFUSE au lieu de deviner : une capture illisible fait lever,
// donc le build s'arrête, plutôt que de servir une image sans
// dimensions qui fera sauter la page chez la lectrice.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dimensionsImage, type Dimensions } from "@/lib/blog/dimensionsImage";

const cache = new Map<string, Dimensions>();

export function tailleCapture(src: string): Dimensions {
  const deja = cache.get(src);
  if (deja) return deja;
  const octets = readFileSync(join(process.cwd(), "public", src.replace(/^\//, "")));
  const dim = dimensionsImage(octets);
  if (!dim) {
    throw new Error(
      `Capture ${src} : dimensions illisibles. next/image ne peut pas réserver sa place, la page sauterait au chargement.`,
    );
  }
  cache.set(src, dim);
  return dim;
}
