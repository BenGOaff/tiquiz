// lib/sales/iconesV2.ts
//
// TROIS ICÔNES, ET 593 Ko DE POLICE POUR LES AFFICHER.
//
// Béné, 2 septembre 2026 : "ok pour la vitesse et les images on fait
// quoi ?"
//
// -- CE QUI A ÉTÉ COMPTÉ -----------------------------------------------
//
// La page charge SEPT fichiers de police, 906 Ko en tout. Les deux plus
// gros sont Font Awesome Pro :
//
//     ec0fe13feeed.woff2   334 Ko   Font Awesome 7 Pro 400
//     0a1c925a25af.woff2   259 Ko   Font Awesome 7 Pro 900
//
// Et la page emploie EXACTEMENT TROIS icônes :
//
//     fa-check-circle   106 fois
//     fa-arrow-right     21 fois
//     fa-video            1 fois
//
// 593 Ko pour trois dessins. C'est le deuxième poste de poids de la
// page, juste après les fonds de section.
//
// -- COMMENT ON LES REMPLACE SANS RIEN DÉPLACER ------------------------
//
// On ne touche PAS au HTML : les `<i class="fas fa-check-circle">`
// restent en place, avec leurs classes, donc tout le CSS de la page
// continue de s'appliquer (les marges, la largeur de 1,25 em, le
// `display:block`, la couleur héritée). Mesuré avant d'écrire une
// ligne : ces icônes portent un `margin-left:-25px` et un
// `margin-right:10px` qui viennent de la page, et une hauteur qui suit
// la ligne. Les remplacer par une balise `<svg>` aurait tout décalé.
//
// On DESSINE dans l'élément, par `mask-image`. Le masque prend la
// couleur de `background-color`, qu'on met à `currentColor` : la
// couleur reste donc celle que la page décide, cocher par cocher (elle
// varie, mesuré : sept couleurs différentes selon les colonnes).
//
// -- LES DESSINS SONT LES NÔTRES ---------------------------------------
//
// Ce sont des formes génériques redessinées ici, pas les tracés de Font
// Awesome Pro, qui sont sous licence. Une coche dans un cercle, une
// flèche, une caméra : personne ne possède ça.

/** Une icône : son nom de classe Font Awesome, et son dessin. */
export interface IconeV2 {
  /** La classe employée dans la page (`fa-check-circle`). */
  readonly classe: string;
  /** Le contenu du SVG, en 24x24. */
  readonly dessin: string;
  /** Combien de fois elle apparaît, relevé le 2 septembre 2026. */
  readonly vues: number;
}

export const ICONES_V2: readonly IconeV2[] = [
  {
    classe: "fa-check-circle",
    vues: 106,
    // LA COCHE EST DÉCOUPÉE, PAS DESSINÉE PAR DESSUS.
    //
    // Un masque CSS ne lit que l'ALPHA : une coche blanche posée sur le
    // disque est opaque, donc elle fait partie du masque, donc elle
    // prend la couleur du disque. Résultat mesuré au premier essai :
    // 106 pastilles pleines dans la grille tarifaire, sans coche.
    // Le `<mask>` SVG rend la coche TRANSPARENTE, et c'est ce trou que
    // le masque CSS recopie.
    dessin:
      '<mask id="tqvC"><rect width="24" height="24" fill="#fff"/>' +
      '<path d="M7.6 12.3l2.9 2.9 5.9-6.2" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></mask>' +
      '<circle cx="12" cy="12" r="10" mask="url(#tqvC)"/>',
  },
  {
    classe: "fa-arrow-right",
    vues: 21,
    dessin:
      '<path d="M4 12h15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>' +
      '<path d="M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  {
    // LE BOUTON « REMONTER », que mon premier comptage avait raté : il
    // ne vit pas dans un `class="fas fa-..."` comme les autres. C'est le
    // garde-fou du script qui l'a dit, pas moi, et c'est exactement ce
    // qu'on lui demande : sans lui, retirer les polices aurait laissé un
    // carré vide en bas de la page.
    classe: "fa-chevron-circle-up",
    vues: 1,
    // Même découpe que la coche, pour la même raison.
    dessin:
      '<mask id="tqvU"><rect width="24" height="24" fill="#fff"/>' +
      '<path d="M8 13.4l4-4 4 4" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></mask>' +
      '<circle cx="12" cy="12" r="10" mask="url(#tqvU)"/>',
  },
  {
    classe: "fa-video",
    vues: 1,
    dessin:
      '<rect x="2.5" y="6.5" width="12.5" height="11" rx="2.2"/>' +
      '<path d="M15.8 11.2l4.6-2.7c.5-.3 1.1.05 1.1.62v5.76c0 .57-.6.92-1.1.62l-4.6-2.7z"/>',
  },
] as const;

/** Le SVG complet d'une icône, en data URI prêt pour un `mask-image`. */
export function dataUriIcone(icone: IconeV2): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">${icone.dessin}</svg>`;
  // On encode le strict nécessaire : un data URI SVG lisible se relit,
  // et il est plus court qu'un base64.
  const encode = svg
    .replace(/"/g, "'")
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\s+/g, " ");
  return `url("data:image/svg+xml,${encode}")`;
}

/**
 * Le CSS qui dessine les trois icônes.
 *
 * `-webkit-mask` en plus de `mask` : les deux, parce que le préfixe est
 * encore ce que lisent des navigateurs qui tournent chez de vraies
 * clientes, et qu'une icône invisible sur une grille tarifaire coûte
 * plus cher que trois lignes de CSS.
 */
export function cssIcones(): string {
  const regles = ICONES_V2.map((i) => {
    const u = dataUriIcone(i);
    return (
      `.tqv-ico.${i.classe}::after{` +
      `-webkit-mask-image:${u};mask-image:${u};` +
      `background-color:currentColor}`
    );
  }).join("");
  return (
    // L'élément garde sa boîte (largeur 1,25 em, hauteur de la ligne) ;
    // le dessin est centré dedans, à 1 em, comme le faisait le glyphe.
    `.tqv-ico{display:inline-block;position:relative}` +
    `.tqv-ico::after{content:"";position:absolute;top:50%;left:50%;` +
    `width:1em;height:1em;transform:translate(-50%,-50%);` +
    `-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;` +
    `-webkit-mask-position:center;mask-position:center;` +
    `-webkit-mask-size:contain;mask-size:contain}` +
    regles
  );
}

/**
 * Les familles de police à ne plus déclarer.
 *
 * On retire les `@font-face` de Font Awesome, et EUX SEULS : Open Sans
 * et Inter portent tout le texte de la page.
 *
 * ATTENTION : le retrait n'est sûr QUE si plus aucune icône ne compte
 * sur le glyphe. Une classe `fa-` oubliée deviendrait un carré vide sur
 * la grille tarifaire, et personne ne le verrait avant une cliente. Le
 * script compte les icônes traitées et refuse de construire s'il en
 * reste une.
 */
export const FAMILLES_RETIREES: readonly string[] = [
  "Font Awesome 7 Brands",
  "Font Awesome 7 Duotone",
  "Font Awesome 7 Pro",
  "Font Awesome 5 Brands",
  "Font Awesome 5 Duotone",
  "Font Awesome 5 Pro",
  "FontAwesome",
] as const;
