// tests/logic/aide/specificiteCss.mts
//
// L'ARITHMETIQUE QUI A COUTE QUATRE FOIS LE MEME BUG.
//
// Bene, 5 septembre 2026, sur la landing : "texte fonce sur fond fonce :
// illisible", puis "texte blanc sur bouton blanc ? Vraiment ?". Une seule
// cause : une regle qui vise un `a` NU pese (0,1,1) et bat toute regle de
// bouton en (0,1,0), donc elle decide de la couleur de TOUS les boutons,
// qui sont des liens.
//
// Le meme jour, sur les pages fonctionnalites : le bouton "Creer mon
// compte gratuit" sortait BLEU SUR BLEU, contraste mesure a 1:1, donc
// invisible. Quatrieme fois.
//
// -- POURQUOI UN HELPER PARTAGE, ET PAS UNE COPIE ---------------------
//
// La deuxieme feuille de style aurait eu sa propre copie du calcul, et
// deux copies d'une meme regle finissent toujours par diverger : c'est
// le defaut que ces depots paient en boucle depuis juin. Une seule
// implementation, deux appelants.
//
// -- ON CALCULE, ON NE CHERCHE PAS UNE CHAINE ------------------------
//
// Figer `:not([class])` empecherait de corriger autrement, et une regle
// d'heritage reecrite d'une autre facon referait exactement le bug. Un
// garde-fou qui fige une FORMULATION empeche de corriger la
// formulation : celui-ci vise le FAIT.

/** [classes et assimiles, elements]. Aucun id dans ces feuilles. */
export function specificite(sel: string): [number, number] {
  const classes = (sel.match(/\.[a-z0-9_-]+/gi) ?? []).length;
  const attrs = (sel.match(/\[[^\]]*\]/g) ?? []).length;
  const pseudoClasses = (sel.match(/:(?!:)(?!not\b)[a-z-]+/gi) ?? []).length;
  const elements = (sel.match(/(^|[\s>+~])[a-z][a-z0-9]*/gi) ?? []).length;
  return [classes + attrs + pseudoClasses, elements];
}

/** a gagne-t-il sur b ? A egalite de poids, le dernier ecrit gagne, donc `>=`. */
export function gagne(a: [number, number], b: [number, number]): boolean {
  return a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1]);
}

export interface RegleDeCouleur {
  sel: string;
  decls: string;
}

/**
 * Les regles de la feuille qui posent une `color`, selecteur par
 * selecteur, bornees au prefixe du module plus tout ce qui vise un `a`.
 */
export function reglesDeCouleur(css: string, prefixe: string): RegleDeCouleur[] {
  return [...css.matchAll(/([^{}@\/]+)\{([^{}]*)\}/g)]
    .flatMap(([, sels, decls]) =>
      sels
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.startsWith(prefixe) || /(^|\s)a(\s|$|:|\.)/.test(s))
        .map((s) => ({ sel: s, decls })),
    )
    .filter((r) => /(^|[;{\s])color\s*:/.test(r.decls));
}

/**
 * Les selecteurs qui visent TOUS les liens, c'est a dire ceux qui
 * finissent par un `a` nu. Ce sont eux qui attrapent les boutons.
 */
export function viseTousLesLiens(regles: RegleDeCouleur[]): RegleDeCouleur[] {
  return regles.filter((r) => /(^|[\s>+~])a$/.test(r.sel));
}
