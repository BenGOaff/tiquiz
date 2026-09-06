// lib/site/blocsAnimes.ts
//
// LES BLOCS ANIMÉS LEVÉS DE SA PAGE DE VENTE, EN DONNÉES PURES.
//
// -- POURQUOI ICI, ET PAS DANS `anims.tsx` --------------------------
//
// `anims.tsx` LIT LE DISQUE, et il porte du JSX : le runner de tests
// natif ne sait charger ni l'un ni l'autre (`ERR_UNKNOWN_FILE_EXTENSION`
// sur un `.tsx`). Une table enfermée là dedans n'est donc pas testable,
// donc pas testée, et c'est exactement là que les bugs s'installent
// (règle du 1er août).
//
// Les DONNÉES vivent donc ici, la LECTURE du fichier reste là bas.

/** Les blocs levés, et ce que chacun MONTRE. */
export const BLOCS_ANIMES = {
  "viralite-trafic": "Le trafic et les leads qui montent quand les visiteurs partagent.",
  "leads-qualifies": "Les leads qui tombent un par un, avec leur nom et l'heure de capture.",
  "offres-sur-mesure": "La question qui fait dire au visiteur ce qu'il veut vraiment acheter.",
  "comparatif-formats": "Le quiz contre l'ebook et la formation offerte, critère par critère.",
  "generation-ia": "Le brief tapé, puis le quiz qui s'écrit tout seul.",
  "opt-in-vs-quiz": "Un PDF qu'on ne lit pas contre un quiz auquel on répond.",
  "opt-in-vs-quiz-mobile": "La même chose, sa variante mobile.",
  "ton-branding": "Le même quiz qui prend les couleurs et le logo de la créatrice.",
  "ton-branding-mobile": "La même chose, sa variante mobile.",
  "tes-pixels": "Les pixels Meta, Analytics et Ads qui se posent sur le quiz.",
  "tes-pixels-mobile": "La même chose, sa variante mobile.",
} as const;

export type BlocAnime = keyof typeof BLOCS_ANIMES;

/**
 * LES BLOCS LEVÉS QUI N'ONT PAS ENCORE DE PAGE, ET POURQUOI.
 *
 * La refonte du 6 septembre a déplacé les sections de la landing vers
 * les huit pages de fonctionnalités, chacune avec son visuel. Deux
 * blocs sont restés sans page, et ce n'est pas un oubli : ils
 * illustrent tous les deux "POURQUOI un quiz plutôt qu'un PDF", qui
 * n'est pas une fonctionnalité de Tiquiz mais un argument de format.
 *
 * ILS SONT DÉCLARÉS ICI PLUTÔT QUE POSÉS QUELQUE PART, parce que les
 * poser au hasard ferait exactement ce que Béné a relevé le
 * 5 septembre : "ton logo ta marque arrive comme un cheveu sur la
 * soupe, sans texte ni contexte, incompréhensible."
 *
 * Le test EXIGE cette raison écrite : une exemption muette est une
 * exemption que le prochain passage prend pour un oubli et "finit".
 */
export const BLOCS_EN_ATTENTE: Record<string, string> = {
  "opt-in-vs-quiz":
    "Il oppose un PDF qu'on ne lit pas a un quiz auquel on repond : c'est l'argument \"pourquoi un quiz\", qui a quitte la landing courte le 6 septembre et n'a pas encore de page a lui. A poser le jour ou Bene tranche ou vit cet argument.",
  "comparatif-formats":
    "Meme sujet : il compare le quiz a l'ebook et a la formation offerte, critere par critere. Il porte de VRAIES phrases (donc il n'est pas decoratif), et le poser sous un titre qui parle d'autre chose le rendrait incomprehensible.",
};

/**
 * LES DEUX CLASSES QUI DÉCLENCHENT SES ANIMATIONS.
 *
 * Ses règles s'écrivent `.tqvs.tqz-visible .machin{animation:...}` : un
 * bloc levé de sa page reste INERTE tant que la classe n'est pas posée.
 * Deux familles coexistent (`tqz-visible` et `tqz1-visible`), et on
 * pose les deux : une classe qu'un bloc n'utilise pas ne lui coûte
 * rien, une classe manquante lui coûte son animation.
 *
 * -- POURQUOI ELLE VIT ICI, ET PAS DANS `anims.tsx` -------------------
 *
 * `DeclencheurAnims` est un composant CLIENT et il en a besoin.
 * `anims.tsx` lit le disque (`node:fs`), donc l'importer depuis le
 * navigateur casse le bundle : "the chunking context does not support
 * external modules (request: node:fs)".
 *
 * ET `tsc` NE LE VOIT PAS. Il a répondu exit 0 sur exactement cette
 * faute le 6 septembre : c'est le bundler qui refuse, à l'exécution,
 * et seul le filet de captures l'a attrapé. C'est la leçon de
 * `pdf-parse` (7 août) : un vert local ne prouve rien sur ce qui se
 * passe une fois compilé.
 */
export const DECLENCHEURS = ["tqz-visible", "tqz1-visible"] as const;
