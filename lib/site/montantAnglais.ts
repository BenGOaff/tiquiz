// lib/site/montantAnglais.ts
//
// UN MONTANT ÉCRIT À L'ANGLAISE, ET IL N'Y EN A QU'UNE ÉCRITURE.
//
// Béné, 8 septembre 2026 : "il faut à chaque fois utiliser le champ
// sémantique, les expressions, tournures de phrases, ponctuation etc.
// propre à chaque langue, c'est pas uniquement du mot à mot."
//
// Un montant EST de la ponctuation : `29,99 $` et `$29.99` disent le
// même prix, et le premier dans une page anglaise se lit comme une
// coquille. C'est exactement la faute mesurée le 8 septembre sur les
// articles anglais du blog, où ma propre table écrivait 22 fois
// `17 EUR` et 27 fois `40 %`.
//
// -- POURQUOI CE MODULE EXISTE ----------------------------------------
//
// Ces deux fonctions vivaient dans `lib/blog/faitsEn.ts`, privées. Le
// hub intégrations en a besoin pour son prix Zapier, et **deux copies
// d'un formateur de montant finissent toujours par diverger** : c'est
// le défaut que ce dépôt paie en boucle depuis juin, et ici la
// divergence donnerait deux prix pour le même abonnement selon la page
// lue.
//
// Le module est PUR : aucun import, donc le runner natif le charge, et
// une page publique ne paie rien pour l'importer.

/**
 * UN MONTANT EN DOLLARS, À L'ANGLAISE.
 *
 * Le symbole DEVANT, le point décimal, et pas de décimales quand elles
 * sont nulles : `$29.99`, `$79`. On ne convertit AUCUNE devise (règle
 * du 1er septembre) : Typeform et Zapier facturent en dollars, Tiquiz
 * en euros, et convertir demanderait un taux inventé, faux le
 * lendemain.
 */
export function usd(n: number): string {
  const a = Math.round(n * 100) / 100;
  return `$${Number.isInteger(a) ? String(a) : a.toFixed(2)}`;
}

/** Un montant en euros, à l'anglaise : symbole devant, point décimal. */
export function eur(n: number): string {
  const a = Math.round(n * 100) / 100;
  const s = Number.isInteger(a) ? String(a) : a.toFixed(2);
  return `€${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/**
 * LE MÊME MONTANT EN DOLLARS, À LA FRANÇAISE : le symbole APRÈS,
 * la virgule décimale, et une espace ORDINAIRE devant le symbole.
 *
 * Il vit ici et pas ailleurs pour une raison précise : le prix de
 * Zapier s'affiche dans les deux langues, et **c'est le MÊME nombre**.
 * Écrire les deux chaînes à la main laisserait l'une dériver de
 * l'autre le jour où Zapier change son tarif, et personne ne le
 * verrait avant qu'un lecteur ne compare les deux pages.
 *
 * L'ESPACE EST ORDINAIRE, ET C'EST MESURÉ, pas un choix de style.
 * `ZAPIER.professionnelParMois` valait `"29,99 $"` avec une espace
 * U+0020 depuis le 1er septembre, c'est à dire depuis le jour où le
 * prix a été relevé sur sa capture. Mon premier jet posait une
 * insécable (U+00A0) et le commentaire l'annonçait comme voulue :
 * les deux chaînes sont INDISCERNABLES à l'oeil, seul un hexdump les
 * sépare, et c'est le test du hub qui a rougi.
 *
 * Changer les octets rendus d'un prix en ligne n'était demandé par
 * personne, donc on ne le fait pas par effet de bord d'une
 * refactorisation. La règle de typographie française du 3 août vise
 * `? : ; !`, jamais le symbole d'une devise : il n'y avait rien à
 * corriger ici.
 */
export function usdFr(n: number): string {
  const a = Math.round(n * 100) / 100;
  const s = (Number.isInteger(a) ? String(a) : a.toFixed(2)).replace(".", ",");
  return `${s} $`;
}
