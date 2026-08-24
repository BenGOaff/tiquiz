// lib/affiliate/refLien.ts
//
// LE CODE PUBLIC D'UNE AFFILIÉE, DEPUIS SON LIEN JUSQU'À SA COMMISSION.
//
// Béné, 24 août 2026 : "je ne veux surtout pas de sa dans les nouveaux
// liens sinon y'a forcément un moment où on va merder, trouver autre
// chose nom de zeus ! Y'a pas que ce système, c'est celui de systeme io
// c'est tout !!"
//
// -- CE QUE ÇA CHANGE, ET CE QUE ÇA SIMPLIFIE --------------------------
//
// Nos liens portent `?ref=jocelyne`. Les anciens tunnels Systeme.io
// portent `?sa=sa00168442b3f...`, et ils restent valides : ils
// commissionnent exactement comme avant.
//
// **Le nom du paramètre dit donc à lui seul la génération du lien.**
// C'est ce qui a permis de supprimer le marqueur `mo=1` du 23 août : le
// mois offert s'ouvre quand la personne est venue par un `?ref=`, et
// c'est tout. Un marqueur en moins, c'est un endroit en moins où on
// pouvait l'oublier.
//
// -- LE FORMAT EST JUMEAU DE CELUI DE TIPOTE ---------------------------
//
// `lib/affiliate/ref.ts` côté Tipote fabrique et valide les codes ; ici
// on ne fait que les LIRE. Les deux fichiers doivent accepter le même
// jeu de caractères : un code accepté là-bas et refusé ici serait une
// affiliée jamais payée, sans le moindre symptôme.
//
// -- ET ON NE FAIT JAMAIS CONFIANCE À L'URL ----------------------------
//
// Ce code finit dans une requête SQL et dans un versement. On ne garde
// donc que ce qui a EXACTEMENT la forme d'un code : minuscules,
// chiffres, tirets, 3 à 20 caractères. Tout le reste est jeté sans
// bruit. La VÉRIFICATION qu'il désigne quelqu'un se fait chez Tipote,
// contre la table `affiliates` : ici on ne fait que la forme.

/** Le format d'un code public. Jumeau de `sanitizeRef` côté Tipote. */
export const REF_RE = /^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])?$/;

/** Longueurs, identiques à celles de Tipote. */
export const REF_MIN_LENGTH = 3;
export const REF_MAX_LENGTH = 20;

/** Le nom du paramètre dans nos liens. */
export const REF_PARAM = "ref";

/**
 * Le cookie de première partie qui porte le code entre la page de vente
 * et le paiement.
 *
 * Nom court et neutre : il est visible par l'acheteuse dans son
 * navigateur, il n'a pas à raconter notre plomberie.
 */
export const REF_COOKIE = "tq_ref";

/**
 * UN AN, COMME CHEZ SYSTEME.IO.
 *
 * Béné, 26 août 2026 : "son cookie est posé pour 1 an sur le device de
 * son prospect."
 *
 * C'était 90 jours. Un prospect qui cliquait en janvier et achetait en
 * juin ne payait donc plus personne, alors que le programme promet un
 * an : l'affilié avait fait le travail et perdait la vente sur un délai
 * qu'il ne maîtrise pas. Un quiz se partage longtemps, et une décision
 * d'abonnement se prend rarement le jour du clic.
 */
export const REF_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Le code s'il est valide, `null` sinon.
 *
 * Ne jette jamais : appelée sur des valeurs qui viennent d'une URL
 * publique et d'un cookie, donc de n'importe où.
 */
export function readRef(value: unknown): string | null {
  const propre = String(value ?? "").trim().toLowerCase();
  if (propre.length < REF_MIN_LENGTH || propre.length > REF_MAX_LENGTH) return null;
  return REF_RE.test(propre) ? propre : null;
}

/**
 * Qui gagne entre l'URL et le cookie : **l'URL, toujours.**
 *
 * Quelqu'un arrive par le lien de Martine, ne paie pas, revient trois
 * jours plus tard par le lien de Christian et achète : c'est Christian
 * qui a fermé la vente. C'est la règle déjà appliquée au `sa` et aux
 * conversions par email ("last touch"), et deux règles opposées selon
 * le chemin donneraient deux réponses pour la même vente.
 */
export function pickRef(depuisUrl: unknown, depuisCookie: unknown): string | null {
  return readRef(depuisUrl) ?? readRef(depuisCookie);
}

/**
 * Le code tel que le bon de commande le voit depuis le navigateur.
 *
 * Vit ici et pas dans le composant pour la raison habituelle : une
 * logique enfermée dans un composant React n'est pas testable, donc
 * elle n'est pas testée, donc c'est là que les bugs s'installent. Et
 * celui là ne se verrait pas à l'écran.
 */
export function readRefFromBrowser(recherche: string, cookies: string): string | null {
  let depuisUrl: string | null = null;
  try {
    depuisUrl = new URLSearchParams(recherche || "").get(REF_PARAM);
  } catch {
    depuisUrl = null;
  }

  let depuisCookie: string | null = null;
  for (const morceau of String(cookies ?? "").split(";")) {
    const i = morceau.indexOf("=");
    if (i < 0) continue;
    if (morceau.slice(0, i).trim() !== REF_COOKIE) continue;
    try {
      depuisCookie = decodeURIComponent(morceau.slice(i + 1).trim());
    } catch {
      depuisCookie = morceau.slice(i + 1).trim();
    }
    break;
  }

  return pickRef(depuisUrl, depuisCookie);
}
