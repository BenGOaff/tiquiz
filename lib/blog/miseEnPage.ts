// lib/blog/miseEnPage.ts
//
// LA MISE EN PAGE DES ARTICLES : ce que l'import a laissé derrière lui.
//
// Béné, 1er septembre 2026, en relisant le blog en ligne :
//
//   "Regarde la mise en page est pourrie : [la liste des 7 modèles de
//    titres] avec des chiffres incohérents. Chiffres ajoutés aux sauts
//    de ligne au lieu des vraies phrases. Des sauts de ligne énormes
//    dans les paragraphes et des espaces minimum entre les titres...
//    bref c'est n'importe quoi.
//    J'ai des gens qui vont LIRE ces pages donc elles doivent être
//    nickel ! Mise en page soignée, lecture facile et agréable, pas
//    d'erreur."
//
// -- CE QUE L'IMPORT A PRODUIT, MESURÉ SUR LE CORPUS ------------------
//
// L'éditeur de Systeme.io écrit un élément par appui sur Entrée. Une
// ligne vide devient donc un vrai élément, vide, que le navigateur
// NUMÉROTE quand il est dans une liste ordonnée :
//
//   | ce qui traîne                        | occurrences |
//   |--------------------------------------|-------------|
//   | `<li></li>` vides                    |      5      |
//   | `<p><br></p>` et `<p><br><br></p>`   |     35      |
//   | `<p><br>` en tête de paragraphe      |     26      |
//
// Les cinq `<li>` vides sont ceux qu'elle a vus : sur la liste des sept
// modèles de titres, ils prennent les numéros 2, 4, 6, 8 et 10, et les
// vraies phrases se retrouvent en 1, 3, 5, 7, 9 et 11.
//
// Les 61 autres sont ses "sauts de ligne énormes" : un paragraphe porte
// déjà sa marge, un `<br>` en plus fait un trou.
//
// -- ET LA HIÉRARCHIE DES TITRES ÉTAIT À L'ENVERS ---------------------
//
// Trouvé en mesurant, elle ne l'a pas nommé : sur CINQ articles sur dix,
// la section s'ouvre en `h3` et ses sous-sections sont des `h2`. Une
// sous-section s'affiche donc PLUS GROSSE que la section qui la
// contient. C'est ça, ses "espaces minimum entre les titres" : ce n'est
// pas l'espacement qui manque, c'est la hiérarchie qui est inversée,
// donc le contraste de taille qui joue à l'envers.
//
// Ça se paie aussi en référencement : un moteur lit la structure des
// titres pour comprendre le plan d'un article.
//
// -- LA RÈGLE, ET POURQUOI ELLE NE DEVINE RIEN ------------------------
//
// **Le premier niveau de titre rencontré est le niveau de section ; les
// suivants s'emboîtent dans l'ordre où ils apparaissent.**
//
// C'est tout. On ne juge pas du contenu, on ne "corrige" pas un plan :
// on préserve la structure RELATIVE de l'article et on la recale sur le
// `h1` de la page. Vérifié sur les dix articles du corpus : les cinq
// inversés sont remis à l'endroit, les cinq autres ne bougent pas d'un
// caractère.

import type { Bloc } from "@/lib/blog/articles";

/**
 * Un élément de liste qui ne porte rien.
 *
 * Il peut contenir un paragraphe vide, un saut de ligne, une espace
 * insécable, ou rien : l'éditeur de Systeme.io produit les quatre.
 */
const LI_VIDE = /<li>(?:\s|&nbsp;|<br\s*\/?>|<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)*<\/li>/gi;

/** Un paragraphe qui ne porte que des sauts de ligne. */
const P_VIDE = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;

/**
 * Un saut de ligne en TÊTE de paragraphe.
 *
 * Le paragraphe porte déjà sa marge : ce `<br>` ajoute une ligne vide
 * par dessus, et c'est le "saut de ligne énorme" qu'elle décrit.
 * Un `<br>` AU MILIEU d'un paragraphe est laissé tel quel : là, il
 * sépare volontairement deux lignes.
 */
const BR_EN_TETE = /(<p[^>]*>)(?:\s*<br\s*\/?>)+\s*/gi;

/** Un saut de ligne juste avant la fermeture : il ne sert à rien non plus. */
const BR_EN_QUEUE = /(?:\s*<br\s*\/?>)+\s*(<\/p>)/gi;

/**
 * Le HTML d'un bloc, débarrassé de ce que l'import a laissé.
 *
 * IDEMPOTENT, et c'est l'invariant qui compte : ce nettoyage tourne à
 * chaque passage de `npm run blog:reparer`, donc sa sortie doit être un
 * point fixe. Sans ça le contenu dérive un peu plus à chaque exécution,
 * et personne ne voit rien avant que ce soit illisible (leçon de la
 * typographie française, 1er septembre).
 */
export function nettoyerMiseEnPage(html: string): string {
  let out = String(html ?? "");
  // Les éléments de liste vides d'abord : un `<li><p><br></p></li>`
  // deviendrait sinon un `<li></li>` au tour suivant, donc il faudrait
  // deux passages pour le voir disparaître.
  out = out.replace(LI_VIDE, "");
  out = out.replace(P_VIDE, "");
  out = out.replace(BR_EN_TETE, "$1");
  out = out.replace(BR_EN_QUEUE, "$1");
  // Une liste qui n'avait QUE des éléments vides ne doit pas laisser sa
  // coquille derrière elle.
  out = out.replace(/<(ol|ul)>\s*<\/\1>/gi, "");
  return out;
}

/**
 * CE QUE L'IMPORT A CASSÉ, ARTICLE PAR ARTICLE.
 *
 * Une table explicite, comme `faitsProgramme.ts` : ce sont des dégâts de
 * STRUCTURE sur un contenu précis, et une règle devinée qui réabsorbe un
 * paragraphe dans la liste d'au dessus finirait par avaler du texte
 * légitime ailleurs. On écrit donc les couples à la main, avec leur
 * raison.
 */
export const CORRECTIONS_STRUCTURE: readonly {
  de: string;
  vers: string;
  pourquoi: string;
}[] = [
  {
    // LE TITRE ANNONÇAIT SEPT MODÈLES, LA LISTE EN CONTENAIT SIX.
    //
    // Le septième était tombé HORS de la liste, en paragraphe, juste
    // après le `</ol>`. Béné n'a relevé que la numérotation, mais c'est
    // le plus grave des deux : le titre mentait.
    de: '</ol><p><strong>"Quelle offre devrais-tu lancer en premier pour [résultat] ?"</strong> → aide à décider</p>',
    vers:
      '<li><p><strong>"Quelle offre devrais-tu lancer en premier pour [résultat] ?"</strong> → aide à décider</p></li></ol>',
    pourquoi: "le 7e modele de titre etait sorti de la liste",
  },
];

/** Applique les corrections de structure. Rend le HTML et le compte. */
export function corrigerStructure(html: string): { html: string; corriges: number } {
  let out = String(html ?? "");
  let corriges = 0;
  for (const regle of CORRECTIONS_STRUCTURE) {
    if (out.includes(regle.de)) {
      out = out.split(regle.de).join(regle.vers);
      corriges += 1;
    }
  }
  return { html: out, corriges };
}

/**
 * La bannière posée EN TÊTE du corps, alors que la page affiche déjà la
 * couverture juste au dessus.
 *
 * Béné, 1er septembre 2026, sur l'étude de cas de Jocelyne : "il faut
 * supprimer l'ancienne couverture, c'est quoi l'intérêt d'avoir deux
 * couvertures ??"
 *
 * Aucun : la page pose `a.couverture` en pleine largeur avant le
 * premier bloc. Une image en tête du corps est donc toujours une
 * deuxième bannière, et chez Jocelyne c'était en plus l'ANCIENNE.
 *
 * La condition porte sur la présence d'une couverture : un article qui
 * n'en aurait pas peut légitimement ouvrir sur une image.
 */
export function retirerBanniereEnTete(blocs: readonly Bloc[], couverture: string): Bloc[] {
  if (!couverture.trim()) return [...blocs];
  return blocs[0]?.type === "image" ? blocs.slice(1) : [...blocs];
}

/**
 * Les niveaux de titre, recalés sur l'ordre d'apparition.
 *
 * Le PREMIER niveau rencontré devient 2 (le plus haut sous le `h1` de
 * l'article), le deuxième niveau distinct devient 3, et ainsi de suite.
 * La structure relative est préservée à l'identique : on ne fusionne
 * jamais deux niveaux, on ne réordonne jamais un plan.
 *
 * Le type n'accepte que 2 ou 3 : au delà, on plafonne à 3 plutôt que de
 * produire une valeur que le rendu ne sait pas afficher.
 */
export function normaliserNiveauxTitres(blocs: readonly Bloc[]): Bloc[] {
  const ordre: number[] = [];
  for (const b of blocs) {
    if (b.type === "titre" && !ordre.includes(b.niveau)) ordre.push(b.niveau);
  }
  // Rien à faire quand l'article commence déjà par son niveau le plus
  // haut : c'est le cas de la moitié du corpus, et un remplacement qui
  // ne change rien reste un fichier réécrit pour rien.
  if (ordre.length === 0) return [...blocs];

  const table = new Map<number, 2 | 3>();
  ordre.forEach((niveau, i) => table.set(niveau, i === 0 ? 2 : 3));

  return blocs.map((b) =>
    b.type === "titre" ? { ...b, niveau: table.get(b.niveau) ?? b.niveau } : b,
  );
}
