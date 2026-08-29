// lib/pilotage/appartenance.ts
//
// DE QUOI CETTE PERSONNE EST-ELLE CLIENTE (Béné, 29 août 2026).
//
// "Sur la liste de clients tu peux pas me faire un truc joli et que je
// vois en un clin d'oeil de QUOI il est client ? Tiquiz ? Atelier ?
// Tipote ?"
//
// -- UNE PERSONNE PEUT ÊTRE PLUSIEURS CHOSES, D'OÙ UNE LISTE ----------
//
// `readClientKind` répondait déjà "tiquiz | atelier | les-deux | aucun".
// C'est une réponse à choix unique, donc elle ne peut pas accueillir
// Tipote sans exploser en six valeurs ("tiquiz-et-tipote",
// "les-trois"...). On rend donc une LISTE : chaque appartenance est une
// pastille, et il en porte autant qu'il en a.
//
// -- ET LE GRATUIT N'EST PAS RIEN -------------------------------------
//
// Quelqu'un qui a un compte Tiquiz gratuit n'est pas client, mais ce
// n'est pas non plus une case vide : c'est un prospect inscrit, et
// c'est la population sur laquelle on travaille. Une ligne sans aucune
// pastille se lirait "je n'ai pas su", alors qu'on sait très bien.
//
// PUR : l'appelant apporte ce qu'il a lu, y compris ce qu'il n'a pas pu
// lire (Tipote vit dans une autre base).

export type Appartenance = "tiquiz" | "tiquiz-gratuit" | "atelier" | "tipote";

/** L'ordre d'affichage, FIXE. Le payant avant le gratuit. */
export const APPARTENANCES_ORDRE: readonly Appartenance[] = [
  "tiquiz",
  "atelier",
  "tipote",
  "tiquiz-gratuit",
];

export const NOM_APPARTENANCE: Readonly<Record<Appartenance, string>> = {
  tiquiz: "Tiquiz",
  "tiquiz-gratuit": "Tiquiz gratuit",
  atelier: "Atelier",
  tipote: "Tipote",
};

export interface EntreeAppartenance {
  hasTiquizAccount: boolean;
  plan: string;
  atelier: { status: string | null } | null;
  /**
   * A-t-elle un compte Tipote ?
   *
   * `null` veut dire QU'ON N'A PAS PU REGARDER (la base de Tipote vit
   * ailleurs, et la liaison peut être muette). Ce n'est pas `false` :
   * afficher "pas cliente Tipote" quand on n'a rien demandé serait une
   * affirmation qu'on ne peut pas soutenir.
   */
  tipote?: boolean | null;
}

/**
 * Tout ce dont cette personne est cliente, dans l'ordre d'affichage.
 *
 * `tiquiz` veut dire un plan PAYANT. Confondre avec le gratuit
 * gonflerait la clientèle payante, et c'est un chiffre sur lequel on
 * prend des décisions.
 */
export function appartenances(p: EntreeAppartenance): Appartenance[] {
  const plan = String(p.plan ?? "").trim().toLowerCase();
  const payant = p.hasTiquizAccount && plan !== "" && plan !== "free";
  const out: Appartenance[] = [];
  if (payant) out.push("tiquiz");
  if (p.atelier?.status === "active") out.push("atelier");
  if (p.tipote === true) out.push("tipote");
  if (p.hasTiquizAccount && !payant) out.push("tiquiz-gratuit");
  return APPARTENANCES_ORDRE.filter((a) => out.includes(a));
}

/** Combien de personnes par appartenance, pour les filtres qui portent leur nombre. */
export function compterAppartenances(
  gens: readonly EntreeAppartenance[],
): Record<Appartenance, number> {
  const out = { tiquiz: 0, "tiquiz-gratuit": 0, atelier: 0, tipote: 0 } as Record<
    Appartenance,
    number
  >;
  for (const g of gens) for (const a of appartenances(g)) out[a] += 1;
  return out;
}

/** Cette personne appartient-elle à ce produit ? Sert au filtre de la liste. */
export function estDe(p: EntreeAppartenance, a: Appartenance): boolean {
  return appartenances(p).includes(a);
}
