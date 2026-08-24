// lib/affiliate/memeAdresse.ts
//
// DEUX ADRESSES QUI VONT DANS LA MÊME BOÎTE.
//
// `bene+tiquiz@gmail.com`, `b.e.n.e@gmail.com` et `bene@gmail.com`
// arrivent toutes chez la même personne : chez Gmail, les points sont
// ignorés et tout ce qui suit un `+` aussi.
//
// -- POURQUOI CE FICHIER EXISTE (audit du 26 août 2026) ----------------
//
// Cette règle vivait ICI, enfermée dans `lib/trial/moisOffert.ts`, donc
// elle ne gardait que le CADEAU. L'ARGENT (la commission affiliée, côté
// Tipote) comparait les adresses brutes : acheter avec `moi+1@gmail.com`
// suffisait à se payer 40 % de son propre abonnement.
//
// On protégeait donc le mois offert mieux que le versement, alors que
// c'est le versement qui part et ne revient pas. `moisOffert.ts`
// DÉLÈGUE désormais ici : une seule règle, dans les trois dépôts, sous
// le même nom de fichier.

/**
 * Les domaines où les points ne comptent pas.
 *
 * Le `+` est retiré chez tout le monde (la convention est générale) ;
 * les points ne le sont QUE chez Gmail, parce qu'ailleurs
 * `jean.dupont@` et `jeandupont@` peuvent être deux personnes
 * différentes, et les confondre refuserait une commission légitime.
 */
const DOMAINES_GMAIL = new Set(["gmail.com", "googlemail.com"]);

/** L'adresse ramenée à la boîte qu'elle désigne vraiment. */
export function normaliserAdresse(brut: unknown): string {
  const v = String(brut ?? "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at <= 0) return v;
  let local = v.slice(0, at);
  const domaine = v.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (DOMAINES_GMAIL.has(domaine)) {
    local = local.replace(/\./g, "");
    // `googlemail.com` EST `gmail.com` : Google livre les deux dans la
    // meme boite. Les garder distincts laisserait passer l'alias le plus
    // simple qui soit, celui qui ne demande meme pas de `+`.
    return `${local}@gmail.com`;
  }
  return `${local}@${domaine}`;
}

/**
 * Deux adresses qui désignent la même personne.
 *
 * Rend `false` sur une adresse vide : "je ne sais pas" n'est pas "c'est
 * la même", et refuser une commission sur une inconnue serait pire que
 * le risque qu'on couvre.
 */
export function memePersonne(a: unknown, b: unknown): boolean {
  const na = normaliserAdresse(a);
  const nb = normaliserAdresse(b);
  return na.length > 0 && na === nb;
}
