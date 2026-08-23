// lib/affiliate/moisOffertLien.ts
//
// LE MOIS OFFERT NE S'OUVRE QUE SUR UN LIEN DU SYSTÈME COURANT.
//
// Béné, 23 août 2026 : "uniquement avec le système d'affiliation en
// cours et pas sur les anciens liens systeme io (qui restent valides
// mais ne seront plus ceux à utiliser dans le futur)". Et, sur le même
// sujet : "uniquement sur les liens affiliés n'oublie pas, c'est pas
// pour celui qui tombe sur la page de vente tout seul".
//
// -- POURQUOI UN MARQUEUR, ET PAS LE `sa` SEUL -------------------------
//
// Les deux générations de liens portent le MÊME `?sa=`, avec la même
// forme et le même propriétaire : un ancien lien Systeme.io et un lien
// de l'espace affilié sont indiscernables une fois arrivés chez nous.
// Le `sa` dit QUI est payé, il ne peut pas dire PAR QUELLE GÉNÉRATION
// de lien la personne est venue.
//
// D'où le marqueur `?mo=1`, ajouté par `buildAffiliateLink()` côté
// Tipote, donc présent sur tout ce que l'espace affilié fabrique
// AUJOURD'HUI et sur rien de ce qui a été copié dans Systeme.io. Les
// anciens liens continuent de commissionner exactement comme avant :
// c'est le CADEAU qui est réservé, pas la vente.
//
// -- ET IL EST ATTACHÉ AU `sa` QU'IL ACCOMPAGNE ------------------------
//
// Le cookie ne porte pas "oui", il porte L'IDENTIFIANT pour lequel le
// marqueur est arrivé. Sans ça, quelqu'un venu une fois par un lien
// récent garderait un "oui" flottant qui offrirait le mois sur
// n'importe quel lien suivant, ancien compris. Or l'attribution suit le
// DERNIER lien (`pickSa`) : les deux moitiés de la décision doivent
// donc parler du même lien, sinon on paie l'un et on offre au titre de
// l'autre.
//
// -- ET LE COOKIE EST `httpOnly` --------------------------------------
//
// Contrairement à `tq_sa`, que le bon de commande doit lire dans le
// navigateur, celui-ci n'est lu QUE côté serveur. `httpOnly` le met
// hors de portée de la page, donc hors de portée d'un affilié qui
// voudrait s'écrire un marqueur à la main pour recycler un ancien lien.

/** Le marqueur dans l'URL d'un lien fabriqué par l'espace affilié. */
export const MO_PARAM = "mo";

/** Sa seule valeur acceptée. */
export const MO_VALUE = "1";

/** Le cookie de première partie qui porte l'identifiant marqué. */
export const MO_COOKIE = "tq_mo";

/** Le marqueur est-il présent dans l'URL ? */
export function marqueurPresent(valeur: unknown): boolean {
  return String(valeur ?? "").trim() === MO_VALUE;
}

/**
 * Ce checkout arrive-t-il par un lien du système courant ?
 *
 * `sa` = l'identifiant réellement retenu pour la commission,
 * `cookie` = ce que le middleware a rangé au passage du lien.
 * Les deux doivent désigner le MÊME lien.
 */
export function lienOuvreLeMoisOffert(sa: string | null | undefined, cookie: unknown): boolean {
  const ref = String(sa ?? "").trim();
  if (!ref) return false;
  return String(cookie ?? "").trim().toLowerCase() === ref.toLowerCase();
}

/**
 * Le bon de commande doit-il ANNONCER les 30 jours offerts ?
 *
 * Deux sources, et la règle est celle de `pickSa` : **l'URL gagne**.
 * Elle doit gagner ici aussi, pour deux raisons :
 *   - au tout premier chargement, le cookie que le middleware vient de
 *     poser n'est pas encore relisible par la page, donc s'en remettre
 *     à lui ferait une page muette exactement sur le lien qui offre ;
 *   - si l'acheteuse arrive par un lien plus récent que son cookie,
 *     c'est le lien qui compte, sinon l'écran annonce le cadeau au nom
 *     d'un lien qui n'est plus celui qui sera commissionné.
 *
 * Ce que l'écran annonce reste une ANNONCE : le droit au cadeau est
 * tranché côté serveur au moment du paiement, non-cumul compris.
 */
export function pageOuvreLeMoisOffert(args: {
  saUrl: string | null;
  moUrl: unknown;
  saCookie: string | null;
  moCookie: unknown;
}): boolean {
  if (args.saUrl) return marqueurPresent(args.moUrl);
  return lienOuvreLeMoisOffert(args.saCookie, args.moCookie);
}
