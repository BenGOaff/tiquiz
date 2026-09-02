// lib/sales/imagesV2.ts
//
// LES IMAGES SURDIMENSIONNÉES DE LA PAGE DE VENTE.
//
// Béné, 2 septembre 2026 : "oui vas y pour les portraits en faisant
// attention de ne rien dégrader en qualité pour aucun des devices et
// moteurs de recherche."
//
// Les portraits de témoignages font 1024 x 1024 et s'affichent en
// 48 x 48 : vingt et une fois trop grands. À eux vingt-deux, ils pèsent
// 1286 Ko sur une page qui en fait 1556.
//
// -- LA TAILLE D'AFFICHAGE EST MESURÉE, PAS SUPPOSÉE ------------------
//
// `afficheeMax` est le MAXIMUM relevé sur QUATRE largeurs d'écran
// (390, 768, 1280, 1920), toutes images différées forcées à charger.
// Une image petite sur un ordinateur peut être grande sur un téléphone :
// mesurer un seul écran, c'est dégrader l'autre. Et une image encore
// différée rend 0 x 0, ce qui la ferait passer pour non affichée.
//
// -- LA CIBLE EST TROIS FOIS L'AFFICHAGE ------------------------------
//
// Deux fois couvre les écrans Retina courants ; trois fois couvre aussi
// les téléphones à très forte densité (3x). Sur une vignette de 48 px,
// la différence entre 96 et 144 pixels coûte quelques kilo-octets et
// ferme la question. **On ne descend JAMAIS en dessous de ça**, et on ne
// dépasse jamais la taille réelle : on ne fabrique pas de pixels.
//
// -- CE QU'ON NE TOUCHE PAS, ET C'EST LE PLUS IMPORTANT ---------------
//
// 1. **Les SVG.** Ils sont VECTORIELS : ils sont déjà parfaits à toutes
//    les densités, et les rasteriser serait exactement la dégradation
//    qu'elle demande d'éviter. `a787cf8c0b74.svg` (47 Ko) et
//    `22617289340f.svg` (97 Ko) sont du vrai vectoriel, 28 et 77 tracés,
//    zéro bitmap dedans : vérifié, pas supposé. Ils restent tels quels.
// 2. **Les GIF animés.** Une conversion qui ne demande pas
//    explicitement l'animation ne garde que la première image, et
//    personne ne le voit avant la mise en ligne (leçon des visuels du
//    blog).
// 3. **L'`og:image`.** C'est `c7c793ad598e.gif`, vérifié dans la page :
//    aucune image de cette liste n'est celle que les moteurs et les
//    réseaux affichent en aperçu.
// 4. **Les fichiers d'origine.** On écrit un fichier NOUVEAU
//    (`<nom>-<largeur>.webp`) et la vraie page de vente continue de
//    servir les siens : le chantier ne doit rien changer à ce qui est
//    en ligne tant que Béné n'a pas basculé.
//
// -- ET UNE IMAGE DONT LA MARGE EST FAIBLE RESTE INTACTE --------------
//
// On ne réduit que si la taille réelle fait au moins DEUX fois la cible,
// et si le fichier pèse au moins 10 Ko. En dessous, le gain ne vaut pas
// le risque de retoucher une image qui allait bien.

export interface ImageSurdimensionnee {
  /** Le nom du fichier dans `public/v/tiquiz/`. */
  fichier: string;
  /** Sa taille réelle, lue dans le fichier. */
  naturelle: readonly [number, number];
  /** La plus grande taille d'affichage relevée sur les quatre largeurs. */
  afficheeMax: readonly [number, number];
  /** La largeur visée : trois fois l'affichage, bornée par le réel. */
  cible: number;
}

export const IMAGES_SURDIMENSIONNEES: readonly ImageSurdimensionnee[] = [
  { fichier: "9b6bcf9a4fdb.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "ec4a664513b1.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "9b16a0a7d33f.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "39cddeab9489.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "4c289d252946.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "b63d1e4f290b.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "9ed1ddc2a09f.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "72f867a768dd.webp", naturelle: [1024, 1024], afficheeMax: [48, 48], cible: 144 },
  { fichier: "425d46aa062b.webp", naturelle: [800, 800], afficheeMax: [48, 48], cible: 144 },
  { fichier: "fb9aab2a3438.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "b980595bef8c.webp", naturelle: [1500, 773], afficheeMax: [108, 56], cible: 324 },
  { fichier: "3089473d0b33.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "3c784e1f489a.webp", naturelle: [800, 800], afficheeMax: [48, 48], cible: 144 },
  { fichier: "b474dd490206.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "8629b749bd40.webp", naturelle: [1421, 1357], afficheeMax: [48, 48], cible: 144 },
  { fichier: "70db92d7817f.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "7d265fde9f4a.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "c52457fd6112.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "45eea45dcb9d.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "87edd75bf22d.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
  { fichier: "7754c4f54a90.webp", naturelle: [480, 480], afficheeMax: [40, 40], cible: 120 },
  { fichier: "45dd58b35935.webp", naturelle: [640, 640], afficheeMax: [48, 48], cible: 144 },
] as const;

/** La densité d'écran couverte. Ne pas descendre en dessous. */
export const DENSITE_COUVERTE = 3;

/** Le nom du fichier réduit, dérivé du nom d'origine. */
export function nomReduit(fichier: string, largeur: number): string {
  const base = fichier.replace(/\.[a-z0-9]+$/i, "");
  return `${base}-${largeur}.webp`;
}

/**
 * La hauteur qui garde le RATIO. On réduit, on ne recadre jamais : une
 * photo recadrée coupe des visages, et c'est exactement le reproche fait
 * aux images de réponse le 4 août.
 */
export function hauteurCible(image: ImageSurdimensionnee): number {
  const [w, h] = image.naturelle;
  return Math.max(1, Math.round((image.cible * h) / w));
}
