// lib/blog/visuelsPerimes.ts
//
// LES VISUELS QU'ON NE PUBLIE PAS, ET LA RAISON DE CHACUN.
//
// Trouvés le 8 septembre, en REGARDANT les images des articles une par
// une pour leur écrire un texte alternatif. Les NEUF vivaient en
// production, la plupart depuis le 29 août.
//
// La liste s'est allongée dans la journée : quatre en écrivant les
// textes alternatifs ANGLAIS de l'article qui recrute les affiliés,
// cinq en préparant la traduction des six articles restés en français.
// Le motif est toujours le même, et c'est pour ça qu'ils sont ensemble
// ici : un CHIFFRE périmé dessiné dans une image, que le corps de
// l'article contredit depuis qu'il a été corrigé, lui, en code.
//
// -- CE QU'ILS MONTRENT, ET POURQUOI ÇA COÛTE -------------------------
//
// Ce sont les deux captures de l'article qui RECRUTE les affiliés, dans
// les deux langues :
//
// 1. le tableau de bord affilié, qui écrit en toutes lettres « tu peux
//    remplacer la destination par n'importe quelle URL tipote.fr,
//    tipote.com ou tipote.blog, ajoute juste `?sa=...` à la fin ».
//    Depuis le 24 août, c'est exactement le lien qui NE PAIE PLUS
//    PERSONNE : la page de Systeme.io ignore ce paramètre, notre
//    middleware ne voit jamais la requête, et leur webhook ne sait lire
//    qu'un `sa`. On donnait donc, en image, la marche à suivre pour
//    fabriquer des liens morts, sur la page qui recrute.
//
// 2. le simulateur de commissions, à **9 €/mois et 90 €/an**, c'est à
//    dire le tarif d'AVANT le 6 août, qui projette 7 430,40 € (FR) et
//    $5 702,40 (EN). Le corps de l'article, lui, est corrigé depuis le
//    31 août (`faitsProgramme.ts`) et annonce 17 € : la page se
//    contredisait donc elle même, le texte contre l'image.
//
// -- POURQUOI ON RETIRE, AU LIEU DE CORRIGER --------------------------
//
// Ce sont des DESSINS : aucun remplacement de texte ne peut les
// atteindre. C'est le précédent du 1er septembre, où trois visuels aux
// chiffres périmés n'ont PAS été posés, avec leur raison écrite à côté.
// Un chiffre faux sur la page qui recrute ne se découvre qu'au premier
// virement, et c'est là qu'on perd un affilié.
//
// -- L'EMPREINTE EST CE QUI REND LE RETRAIT RÉVERSIBLE ----------------
//
// Retirer par le CHEMIN seul serait un piège : Béné redessine l'image
// sous le même nom, et elle reste masquée pour toujours, en silence.
// L'entrée porte donc l'empreinte du fichier ÉCARTÉ, et le test la
// relit : un fichier redessiné fait ROUGIR le garde-fou, qui dit de
// retirer son entrée. Le sens de l'erreur est le bon : on ne peut pas
// republier un visuel périmé sans le voir, et on ne peut pas garder
// masqué un visuel corrigé sans le voir non plus.
//
// Ce module est PUR : il ne lit aucun fichier. La comparaison
// d'empreinte vit dans le test, qui a le droit de toucher au disque ;
// `normaliserImages` tourne dans un composant serveur, et une lecture
// de disque de plus par image y serait payée à chaque rendu.

/** Un visuel écarté, avec ce qui permet de savoir s'il a été refait. */
export interface VisuelPerime {
  /** Le chemin tel qu'il est écrit dans le bloc image. */
  chemin: string;
  /** Les 16 premiers caractères du sha256 du fichier ÉCARTÉ. */
  empreinte: string;
  /** Pourquoi il ne se publie pas. Sans elle, le prochain passage le remet. */
  raison: string;
}

export const VISUELS_PERIMES: readonly VisuelPerime[] = [
  {
    chemin: "/blog/img/tiquizaffiliation.webp",
    empreinte: "dd7b7ed6da607266",
    raison:
      "le tableau de bord affilié y explique de coller `?sa=...` sur une URL tipote.fr : depuis le 24 août, ce lien ne paie plus personne",
  },
  {
    chemin: "/blog/img/en/monthly-recurring-income-tiquiz-affiliate-252317915d.webp",
    empreinte: "252317915d3f5fa2",
    raison: "la version anglaise de la même capture, avec la même consigne `?sa=`",
  },
  {
    chemin: "/blog/img/affiliationtiquiz.webp",
    empreinte: "4b6a7e61842c9e22",
    raison:
      "le simulateur de commissions y affiche 9 €/mois et 90 €/an, le tarif d'avant le 6 août, et projette 7 430,40 €",
  },
  {
    chemin: "/blog/img/en/monthly-recurring-income-tiquiz-affiliate-f07444fceb.webp",
    empreinte: "f07444fcebfa2d28",
    raison: "la même capture en anglais, à $9/month et $90/year, projetant $5 702,40",
  },
  // ── TROUVÉS LE 8 SEPTEMBRE, en regardant les images des 6 articles
  // restés en français pour leur écrire un texte alternatif anglais.
  //
  // Les cinq portent un CHIFFRE PÉRIMÉ, et trois d'entre eux vivent sur
  // la page qui COMPARE Tiquiz à ses concurrents, c'est à dire à
  // l'endroit exact où un lecteur va vérifier.
  {
    chemin: "/blog/img/tiquiztarifs.webp",
    empreinte: "5ab73aa427b7caa4",
    raison:
      "la grille de tarifs y affiche 9 €/mois, le tarif d'avant le 6 août : le corps de l'article annonce 17 €",
  },
  {
    chemin: "/blog/img/schema-connexion-systemeio-large.webp",
    empreinte: "02a4a0fb23514c83",
    raison:
      "la pastille Zapier y annonce + 19,99 $ / mois, alors que la capture de leur page de tarifs (lib/site/integrations.ts) dit 29,99 $",
  },
  {
    chemin: "/blog/img/schema-connexion-systemeio-mobile.webp",
    empreinte: "b52b56b6b775aeaf",
    raison: "la variante téléphone du même schéma, avec le même + 19,99 $ / mois",
  },
  {
    chemin: "/blog/img/tableaucomparatifdoutilshorizontal.webp",
    empreinte: "3ab128e2206fefd1",
    raison:
      "Tiquiz y est à 9 €/mois ou 90 €/an, ET sa colonne Note est décalée d'une ligne (il y est noté Vimeo Interactive)",
  },
  {
    chemin: "/blog/img/svg-12-comparatif-outils-popquiz-fr.svg",
    empreinte: "21078f90a4652355",
    raison:
      "Tiquiz Annuel y est à 90 €/an avec une projection à 450 € sur cinq ans, et son pied porte tipote.fr/tiquiz, une adresse qui ne commissionne plus",
  },
];

const CHEMINS = new Set(VISUELS_PERIMES.map((v) => v.chemin));

/** Vrai quand ce visuel ne doit pas etre publie. */
export function visuelPerime(src: string): boolean {
  return CHEMINS.has(String(src ?? ""));
}
