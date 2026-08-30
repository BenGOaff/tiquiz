// components/site/VisuelArticle.tsx
//
// UNE IMAGE DANS UN ARTICLE, À SA TAILLE.
//
// Béné, 30 août 2026 : "certaines images sont d'une taille
// disproportionnée c'est carrément n'importe quoi."
//
// Trois défauts empilés, tous mesurés avant correction :
//
//   1. LA COLONNE. Le corps faisait 1168 px, et `w-full` étirait tout
//      dedans. `gwenn.webp` (200 px) était agrandie 5,8 fois.
//   2. LA HAUTEUR. `publicite-quiz.webp` (842 x 1808) occupait 2508 px
//      de haut, soit deux écrans et demi pour une capture.
//   3. LA VARIANTE TÉLÉPHONE, affichée EN PLUS de la grande, donc le
//      même schéma deux fois, la deuxième fois étiré en hauteur.
//
// Le composant ne décide rien : il appelle `normaliserImages` (qui a
// déjà apparié les variantes) et `tailleRendue` (qui borne). Les deux
// sont pures et testées.
//
// `width` et `height` sont TOUJOURS écrits quand on les connaît : sans
// eux, la page saute à chaque image qui arrive, et ce saut est ce que
// Google mesure sous le nom de décalage cumulé.

import { tailleRendue } from "@/lib/blog/imagesDisque";

export default function VisuelArticle({
  src,
  alt,
  mobile,
  epingle,
  priorite = false,
}: {
  src: string;
  alt: string;
  /** La variante dessinée pour un téléphone, si elle existe. */
  mobile?: string;
  /** L'épingle verticale de l'article : c'est ELLE que Pinterest prend. */
  epingle?: string | null;
  priorite?: boolean;
}) {
  const taille = tailleRendue(src);

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      {...(taille ? { width: taille.largeur, height: taille.hauteur } : {})}
      loading={priorite ? "eager" : "lazy"}
      {...(priorite ? { fetchPriority: "high" as const } : {})}
      // L'épingle proposée par l'extension Pinterest est la VERTICALE,
      // pas le schéma en 16/9 qui ne circule pas dans un flux. C'est
      // exactement ce que `data-pin-media` sert à dire.
      {...(epingle ? { "data-pin-media": epingle } : {})}
      className="rounded-xl"
      // `min(100%, Xpx)` et pas `Xpx` : sur un téléphone de 375 px, une
      // borne fixe à 720 déborderait de l'écran. Les deux bornes doivent
      // tenir en même temps, c'est ce que `min()` dit exactement.
      style={taille ? { maxWidth: `min(100%, ${taille.largeur}px)` } : undefined}
    />
  );

  // PAS DE LÉGENDE SOUS L'IMAGE, et c'est délibéré : les `alt` du
  // corpus importé sont vides pour 80 % d'entre eux, et faux pour
  // d'autres ("tiquiz amazon" porté par trois images sans rapport).
  // Les afficher publierait ces erreurs au lieu de les cacher. Un `alt`
  // vide est d'ailleurs le comportement JUSTE pour un lecteur d'écran
  // quand le texte autour explique déjà le schéma.
  return (
    <div className="my-9">
      {mobile ? (
        <picture>
          {/* La version haute EN DESSOUS de 640 px, la large au dessus.
              Une seule des deux est chargée : le navigateur choisit
              avant de télécharger quoi que ce soit. */}
          <source media="(max-width: 639px)" srcSet={mobile} />
          {image}
        </picture>
      ) : (
        image
      )}
    </div>
  );
}
