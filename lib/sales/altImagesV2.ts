// lib/sales/altImagesV2.ts
//
// LE TEXTE ALTERNATIF DES IMAGES DE LA PAGE DE VENTE.
//
// Béné, 2 septembre 2026 : "pour les images tu peux bosser dessus ?"
//
// MESURÉ : 89 balises `<img>` sur 105 n'ont aucun `alt`, pour 34
// fichiers distincts. C'est trois choses perdues d'un coup, et c'est
// exactement ce qui avait été corrigé sur le blog le 31 août : une
// lectrice aveugle n'entend rien, Google ne sait pas ce qu'il y a dans
// l'image, et un modèle de langue non plus.
//
// -- UN `alt` VIDE N'EST PAS UN `alt` MANQUANT -------------------------
//
// C'est la distinction que fait tout le travail ici, et la rater dans un
// sens ou dans l'autre coûte quelque chose :
//
//   `alt=""`          « cette image ne dit rien de plus que le texte
//                     à côté ». Le lecteur d'écran la SAUTE, et c'est
//                     ce qu'on veut.
//   pas d'`alt` du tout  le lecteur d'écran lit le NOM DU FICHIER, donc
//                     « slash v slash tiquiz slash 4 c 2 8 9 d 2 5 ».
//   un `alt` bavard   « photo du portrait de Gwenn, cliente » posé à
//                     côté du mot « Gwenn » : on fait lire deux fois la
//                     même chose, et la page devient pénible à écouter.
//
// **Toutes les images ont donc été REGARDÉES**, une par une, dans une
// planche contact, puis rapprochées de leur contexte dans la page. Le
// nom du fichier ne dit rien (`4cbcfa67a819.webp`), et c'est justement
// la règle du 1er septembre sur les visuels du blog : un visuel se
// classe en le regardant, jamais d'après son nom.

/** Ce que chaque image dit, ou ne dit pas. */
export interface AltImage {
  /** Le chemin exact, tel qu'il apparaît dans `src`. */
  readonly src: string;
  /**
   * Le texte, ou `""` quand l'image est décorative.
   *
   * `""` est une DÉCISION, pas un oubli : elle est écrite ici, et le
   * script refuse de construire s'il rencontre une image absente de
   * cette table.
   */
  readonly alt: string;
  /** Pourquoi ce choix. Jamais affiché. */
  readonly pourquoi: string;
}

/** Les deux images qui PORTENT du texte, dessiné en tracés. */
const PORTEUSES: readonly AltImage[] = [
  {
    src: "/v/tiquiz/a787cf8c0b74.svg",
    alt: "Gratuit à vie, pas besoin de carte bancaire",
    pourquoi:
      "Le texte est dessiné en TRACÉS dans le SVG, pas en balise <text> : " +
      "il n'existe donc pour personne d'autre que l'oeil. Et c'est une " +
      "promesse commerciale, répétée 12 fois sur la page.",
  },
  {
    src: "/v/tiquiz/22617289340f.svg",
    alt: "Paiement sécurisé, satisfaction garantie, données protégées",
    pourquoi:
      "Même cas, et c'est le bandeau de réassurance posé sous chaque " +
      "carte de tarif, donc juste avant le bouton qui fait payer.",
  },
] as const;

/**
 * Les images DÉCORATIVES, regardées une par une.
 *
 * Elles se rangent en quatre familles, et chacune a la même raison :
 * le texte qui les accompagne dit déjà tout.
 */
const DECORATIVES: readonly { src: string; quoi: string }[] = [
  // Les six pictogrammes de « intègre-le partout » : chacun est collé à
  // son libellé (Pop-up, Page d'accueil, Pied de page, En-tête, Article
  // de blog, Appel à l'action).
  { src: "/v/tiquiz/d1c07cfe727b.svg", quoi: "pictogramme, son libellé est à côté" },
  { src: "/v/tiquiz/fb22a890214e.svg", quoi: "pictogramme, son libellé est à côté" },
  { src: "/v/tiquiz/6c96b93b06eb.svg", quoi: "pictogramme, son libellé est à côté" },
  { src: "/v/tiquiz/6088408904d5.svg", quoi: "pictogramme, son libellé est à côté" },
  { src: "/v/tiquiz/6f33994fff6f.svg", quoi: "pictogramme, son libellé est à côté" },
  { src: "/v/tiquiz/7875ce4df380.svg", quoi: "pictogramme, son libellé est à côté" },

  // Les traits, filets et fonds : ils n'ont aucun contenu.
  { src: "/v/tiquiz/a2cc11c36e0b.svg", quoi: "filet de séparation" },
  { src: "/v/tiquiz/82f611a78f98.svg", quoi: "filet de séparation" },
  { src: "/v/tiquiz/d99921f20b60.svg", quoi: "petit pictogramme de carte barrée, déjà dit par le texte" },
  { src: "/v/tiquiz/26fb6d391934.webp", quoi: "courbe pointillée décorative" },
  { src: "/v/tiquiz/5ade49313fad.webp", quoi: "aplat décoratif" },

  // Les illustrations : elles accompagnent un texte qui dit la même
  // chose, ou elles sont le décor d'une maquette dont TOUT le contenu
  // est déjà en texte dans la page (les trois écrans du mini-tunnel).
  { src: "/v/tiquiz/5b9f02b9d358.webp", quoi: "décor de la maquette, son écran est en texte juste à côté" },
  { src: "/v/tiquiz/2690f4aec92c.webp", quoi: "décor de la maquette, son écran est en texte juste à côté" },
  { src: "/v/tiquiz/4cbcfa67a819.webp", quoi: "décor de la maquette, son écran est en texte juste à côté" },
  { src: "/v/tiquiz/cd999b6b8dca.webp", quoi: "baguette magique, illustration du paragraphe" },
  { src: "/v/tiquiz/de20f4d74f48.webp", quoi: "illustration, le titre dit la même chose" },
  { src: "/v/tiquiz/85641fa0f281.gif", quoi: "animation d'ambiance" },

  // Les portraits des témoignages. Le prénom et le métier sont écrits
  // À CÔTÉ, en texte : « Photo de Gwenn » ferait lire Gwenn deux fois.
  { src: "/v/tiquiz/7d265fde9f4a.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/425d46aa062b.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/b474dd490206.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/45dd58b35935.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/3c784e1f489a.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/45eea45dcb9d.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/fb9aab2a3438.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/70db92d7817f.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/85f9bbeaf5fa.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/8629b749bd40.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/39cddeab9489.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/87edd75bf22d.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/3089473d0b33.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/c52457fd6112.webp", quoi: "portrait, le nom est en texte à côté" },
  { src: "/v/tiquiz/9ed1ddc2a09f.webp", quoi: "portrait, le nom est en texte à côté" },
] as const;

/**
 * LE LOGO, et le seul `alt` de la capture qui était FAUX.
 *
 * Il apparaît deux fois : en haut, avec `alt="Logo Tipote"`, et dans le
 * pied de page, sans rien. Or le logo AFFICHE « tiquiz » : sur la page
 * qui vend Tiquiz, son seul texte alternatif nommait l'autre marque.
 *
 * On corrige, et c'est la seule exception à la règle « on n'écrase
 * jamais un alt existant » (blog, 1er septembre) : cette règle a
 * elle même son échappatoire, « la table gagne sur ce qu'elle NOMME »,
 * écrite exactement pour les textes hérités qui disent faux.
 *
 * Le second, dans le pied de page, est DÉCORATIF : c'est le même logo,
 * déjà annoncé en haut. Le renommer ferait entendre « Tiquiz » deux fois
 * à qui écoute la page.
 */
export const LOGO: AltImage = {
  src: "/v/tiquiz/b980595bef8c.webp",
  // VIDE, et ce n'est pas une contradiction : cette table ne s'applique
  // qu'aux images qui n'ont AUCUN alt, donc au seul exemplaire du pied
  // de page. Celui du haut est corrigé à part, parce qu'il en a déjà un
  // et qu'il dit faux.
  alt: "",
  pourquoi:
    "Le logo affiche « tiquiz », et la capture le décrivait « Logo Tipote ». " +
    "Corrigé en haut de page ; l'exemplaire du pied de page reste décoratif.",
};

export const ALT_IMAGES_V2: readonly AltImage[] = [
  LOGO,
  ...PORTEUSES,
  ...DECORATIVES.map((d) => ({
    src: d.src,
    alt: "",
    pourquoi: `Décorative : ${d.quoi}.`,
  })),
];

const PAR_SRC = new Map(ALT_IMAGES_V2.map((a) => [a.src, a]));

/** Le texte d'une image, ou `undefined` si elle n'est pas dans la table. */
export function altDe(src: string): string | undefined {
  return PAR_SRC.get(src.split("?")[0])?.alt;
}

/** Les images de la page qu'on ne sait pas encore classer. */
export function nonClassees(sources: readonly string[]): string[] {
  return [...new Set(sources.map((s) => s.split("?")[0]))].filter(
    (s) => s.startsWith("/v/tiquiz/") && !PAR_SRC.has(s),
  );
}
