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
// L'import du 29 août remplace les chevrons français `«` et `»` par des
// guillemets droits, parce que Béné n'en veut nulle part. Le
// remplacement a emporté l'espace qui les entourait. Le TEXTE reste
// juste, donc une relecture ne voit rien : seule la ponctuation cloche,
// et c'est exactement le genre de détail dont elle dit qu'il est
// "chiant et long à corriger" (3 août).
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
export function reponctuer(html: string): string {
  return String(html ?? "")
    .split(/(<[^>]*>)/)
    .map((m, i) => (i % 2 === 1 ? m : reparerEmojiColle(reparerPointColle(reparerGuillemets(m)))))
    .join("");
}
