// lib/admin/emailParam.ts
//
// L'ADRESSE LUE DANS UNE URL, DÉCODÉE UNE FOIS POUR TOUTES.
//
// -- CE QUE ÇA A CASSÉ (Béné, 31 août 2026) ----------------------------
//
// "J'ai testé le ref de Nina : je ne suis pas taguée comme étant
// affiliée de Nina dans le suivi. Je ne peux jamais savoir qui a envoyé
// qui."
//
// Sa fiche client s'ouvrait sur un titre `blagardette%2Btestaffi2%40
// gmail.com`. Ce n'était pas qu'un défaut d'affichage : la ligne
// "Amené par" se cherche dans une table indexée par l'adresse RÉELLE.
//
//   attributions["blagardette%2Btestaffi2%40gmail.com"]  ->  undefined
//
// Et comme `@` s'encode TOUJOURS en `%40` dans un segment d'URL, la
// recherche échouait pour **tout le monde**, pas seulement pour les
// adresses à `+`. La ligne ne s'affichait donc jamais, sur aucune
// fiche, et le suivi d'affiliation avait l'air de ne rien savoir.
//
// -- ET LA CAUSE EST UN COMMENTAIRE QUI DISAIT LE CONTRAIRE ------------
//
// La page portait : "Next décode déjà le segment : `a%40b.fr` arrive en
// `a@b.fr`." C'est faux, et c'est pour ça que personne ne décodait. Sa
// jumelle `app/admin/clients/[email]` décodait, elle. Un garde-fou qui
// ne protège qu'un des deux jumeaux ne protège personne, et une règle
// écrite en commentaire n'est pas une règle.
//
// -- POURQUOI UNE FONCTION ET PAS UN `decodeURIComponent` -------------
//
// Parce que `decodeURIComponent` LÈVE sur un `%` isolé (`URIError`), et
// qu'un lien tapé de travers ou coupé par un client mail en produit.
// Une fiche client qui plante en 500 est pire que la valeur brute.
// Et parce qu'une adresse se compare en minuscules : la normaliser ici
// évite que chaque écran choisisse la sienne.

/**
 * Décode le segment d'URL d'une adresse, sans jamais lever.
 *
 * Rend la chaîne NORMALISÉE (décodée, sans espaces, en minuscules) :
 * c'est sous cette forme qu'elle sert de clé partout ailleurs.
 */
export function lireEmailParam(brut: string | null | undefined): string {
  const s = String(brut ?? "").trim();
  if (!s) return "";
  let decode = s;
  try {
    decode = decodeURIComponent(s);
  } catch {
    // `%` isolé, ou séquence tronquée : on garde ce qu'on a. Mieux vaut
    // une fiche qui s'ouvre sur une adresse imparfaite qu'un 500.
  }
  // Un `+` dans un segment de CHEMIN est un vrai `+` (c'est dans une
  // QUERY qu'il vaut une espace). On ne le convertit donc PAS : le
  // faire casserait toutes les adresses en `+alias`, qui sont
  // exactement celles avec lesquelles on teste.
  return decode.trim().toLowerCase();
}
