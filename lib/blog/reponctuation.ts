// lib/blog/reponctuation.ts
//
// RENDRE AU TEXTE LES ESPACES QUE L'IMPORT LUI A PRISES.
//
// Béné, 30 août 2026, en lisant un article : la ponctuation était collée
// aux mots à 46 endroits. `Donc"c'est gratuit"`, `Tu tapes"meilleur
// outil quiz"`, `parles "funnel de conversion"à une maman`.
//
// -- LA CAUSE, ET POURQUOI ELLE NE SE VOIT PAS ------------------------
//
// Les chevrons français `«` et `»` ont été remplacés par des guillemets
// droits, parce que Béné n'en veut nulle part. Le remplacement a emporté
// l'espace qui les entourait. Le TEXTE reste juste, donc une relecture
// ne voit rien : seule la ponctuation cloche, et c'est exactement le
// genre de détail dont elle dit qu'il est "chiant et long à corriger"
// (3 août).
//
// 🚨 CET EN-TÊTE DISAIT "L'IMPORT remplace les chevrons". C'ÉTAIT FAUX,
// et je le corrige en place (8 septembre 2026). MESURÉ : aucune ligne de
// code, ni dans l'import ni ici, ne convertissait un chevron. La règle
// ne vivait que dans un test qui l'INTERDIT, donc un contenu écrit à la
// main la faisait rougir sans que rien ne sache la corriger. C'est
// exactement le défaut du tiret cadratin en entité, trouvé le même jour.
// `remplacerChevrons` existe désormais, et `reponctuer` l'applique.
//
// -- POURQUOI C'EST UN MODULE, ET PAS DES LIGNES DANS LE SCRIPT -------
//
// Le script `scripts/reparer-blog.mjs` RÉPARE, le test INTERDIT LA
// RECHUTE, et les deux doivent appliquer exactement la même règle. S'ils
// avaient chacun leur copie, le test finirait par accepter ce que le
// script corrige, ou l'inverse : c'est le motif des deux listes qui
// divergent, payé quatre fois dans ce dépôt.
//
// Le module est PUR : il ne lit aucun fichier, il ne connaît pas le
// blog. On lui donne du texte, il en rend.

/**
 * Rend au guillemet droit l'espace que le remplacement des chevrons lui
 * a prise.
 *
 * ON NE DEVINE PAS, ON COMPTE. Un guillemet en position impaire du
 * fragment OUVRE, en position paire il FERME, et les deux veulent
 * l'espace du côté OPPOSÉ :
 *
 *   `Donc"c'est gratuit"`      -> l'espace va AVANT (guillemet ouvrant)
 *   `conversion"à une maman`   -> l'espace va APRÈS (guillemet fermant)
 *
 * Sans ce comptage, le deuxième cas recevrait son espace du mauvais
 * côté, ce qui est faux dans l'autre sens et impossible à voir en
 * relisant une liste de remplacements.
 */
export function reparerGuillemets(texte: string): string {
  let ouvert = false;
  let out = "";
  const src = String(texte ?? "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c !== '"') {
      out += c;
      continue;
    }
    if (!ouvert) {
      if (/[\p{L}\p{N},;:)]/u.test(out.at(-1) ?? "")) out += " ";
      out += '"';
    } else {
      out += '"';
      if (/[\p{L}\p{N}]/u.test(src[i + 1] ?? "")) out += " ";
    }
    ouvert = !ouvert;
  }
  return out;
}

/**
 * Une phrase qui redémarre sans respirer : `par 2".Une autre cliente`.
 *
 * On ne touche QU'AU point qui suit un guillemet fermant. Un
 * `Systeme.io` ou un `17.5` ne doit jamais être coupé, et c'est le
 * guillemet qui rend le cas reconnaissable sans risque.
 */
export function reparerPointColle(texte: string): string {
  return String(texte ?? "").replace(/(["”])\.([A-ZÀ-ÖØ-Þ])/gu, "$1. $2");
}

/** Un emoji collé au mot suivant (`🤯D'un côté`) : l'import a mangé le saut de ligne. */
export function reparerEmojiColle(texte: string): string {
  return String(texte ?? "").replace(/(\p{Extended_Pictographic})(?=[\p{Lu}\p{Ll}])/gu, "$1 ");
}

/**
 * Les trois réparations, sur le TEXTE VISIBLE seulement.
 *
 * On découpe sur les balises : le `"` d'un attribut n'est pas un
 * guillemet de citation, et lui ajouter une espace casserait le HTML.
 * C'est la même précaution que `applyFrenchTypographyToHtml`, et pour
 * la même raison : insérer est plus dangereux que convertir.
 */
/**
 * RETIRE LES TIRETS LONGS, la signature que Béné bannit partout.
 *
 * Règle du 7 juin, absolue : aucun em-dash `—` ni en-dash `–` dans un
 * contenu que quelqu'un lit. Elle vivait dans un test qui INTERDIT
 * (`blog.test.mts`), et dans aucune règle qui CORRIGE : un import
 * pouvait donc en rapporter un, et il fallait aller le retirer à la
 * main. C'est arrivé le 8 septembre, sur une phrase rendue au
 * `strategie-quiz-marketing-tiquiz`.
 *
 * ON N'AGIT QUE SUR UN TIRET ENTOURÉ D'ESPACES, et c'est le
 * discriminant : là il joue le rôle d'une pause forte, et la virgule le
 * remplace exactement. Un tiret COLLÉ (`2020–2024`, `Nord–Sud`) est une
 * plage ou une composition, et le convertir écrirait autre chose.
 *
 * La virgule est le remplacement le plus sûr des quatre qu'elle
 * autorise (`,` `:` `(...)` `.`) : elle marche dans une phrase
 * affirmative comme dans une énumération, sans jamais couper la phrase
 * en deux.
 */
export function retirerTiretsLongs(fragment: string): string {
  // ET LES ENTITÉS COMPTENT AUTANT QUE LE CARACTÈRE.
  //
  // `&mdash;` s'affiche exactement comme `—`, et le test qui interdit
  // le tiret long cherchait le CARACTÈRE : deux em-dash sont entrés
  // dans le comparatif des outils le 8 septembre, à travers un garde
  // qui ne pouvait pas les voir. Un test qui ne distingue pas ce qu'il
  // est censé distinguer est pire qu'un test absent.
  const separateur = "(?:\\s|&nbsp;)+";
  const tiret = "(?:[—–]|&mdash;|&ndash;|&#8212;|&#8211;)";
  return fragment.replace(new RegExp(`${separateur}${tiret}${separateur}`, "g"), ", ");
}

/**
 * LES CHEVRONS DEVIENNENT DES GUILLEMETS DROITS.
 *
 * Béné n'en veut nulle part, c'est une règle absolue depuis le 7 juin,
 * et `tests/logic/blog.test.mts` l'INTERDIT. Elle n'était corrigée par
 * rien : un texte écrit à la main (ou collé depuis une page rendue)
 * faisait donc rougir le test sans qu'aucune commande sache le réparer.
 *
 * L'ESPACE INTÉRIEURE PART AVEC LE CHEVRON, et c'est la moitié qui
 * compte. En français un chevron porte une espace de son côté intérieur
 * (souvent insécable) : la garder donnerait `" C'est un sujet "`, donc
 * la faute inverse de celle que ce module existe pour corriger.
 *
 * L'espace EXTÉRIEURE, elle, est conservée : `dit : « C'est` doit
 * rester `dit : "C'est`, pas `dit :"C'est`.
 *
 * Les entités comptent aussi (`&laquo;`, `&#171;`) : elles s'affichent
 * exactement pareil, et un garde qui ne cherche que le caractère les
 * laisse passer. C'est la leçon du tiret cadratin, payée le 8 septembre.
 *
 * IDEMPOTENTE par construction : une fois qu'il n'y a plus de chevron,
 * le motif ne trouve plus rien.
 */
export function remplacerChevrons(fragment: string): string {
  const espace = "(?:\\s|&nbsp;)*";
  return String(fragment ?? "")
    .replace(new RegExp(`(?:«|&laquo;|&#171;)${espace}`, "g"), '"')
    .replace(new RegExp(`${espace}(?:»|&raquo;|&#187;)`, "g"), '"');
}

export function reponctuer(html: string): string {
  return String(html ?? "")
    .split(/(<[^>]*>)/)
    .map((m, i) => (i % 2 === 1 ? m : retirerTiretsLongs(reparerEmojiColle(reparerPointColle(reparerGuillemets(remplacerChevrons(m)))))))
    .join("");
}
