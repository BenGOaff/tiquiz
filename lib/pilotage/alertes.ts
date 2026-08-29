// lib/pilotage/alertes.ts
//
// CE QUI DEMANDE UNE ACTION, ET CE QUI A DÉJÀ ÉTÉ TRAITÉ.
//
// Béné, 29 août : "je dois pouvoir marquer comme traité, c'est un
// mauvais suivi de la plateforme pas un vrai sujet."
//
// Le cas : une vente encaissée le 11 juin dont aucun compte ne porte
// l'adresse. L'alerte est JUSTE, et elle ne s'éteindra jamais toute
// seule puisque la vente restera sans compte en face pour toujours. Une
// alerte permanente cesse d'être lue, et le jour où une vraie apparaît
// à côté, personne ne la voit.
//
// -- CE QUE "TRAITÉ" VEUT DIRE, ET CE QUE ÇA NE VEUT PAS DIRE ---------
//
// Ça éteint l'ALERTE. Ça n'efface ni la vente, ni son montant, ni sa
// date : elle reste dans l'écran des ventes et dans les totaux. Une
// fonction qui masquerait de l'argent rentré serait un mensonge, pas un
// confort.
//
// Et ça se DÉFAIT : un clic de travers ne doit pas cacher pour toujours
// un encaissement sans contrepartie.
//
// PUR : l'appelant apporte les ventes et l'ensemble déjà traité.

import type { Sale } from "@/lib/checkout/sales";

/** Le genre d'alerte, écrit une fois. Il finit en base. */
export const GENRE_VENTE_ORPHELINE = "vente-orpheline";

export interface TriAlertes<T> {
  /** Ce qui reste à faire. */
  actives: T[];
  /** Ce qui a déjà été traité : compté, jamais effacé. */
  traitees: T[];
}

/**
 * Sépare ce qui demande encore une action de ce qui est réglé.
 *
 * Les deux moitiés sortent : un écran qui ne rendrait que les actives
 * ne pourrait pas proposer de revenir en arrière, et une décision qu'on
 * ne peut plus défaire finit par ne plus être prise.
 */
export function trierAlertes<T>(
  lignes: readonly T[],
  reference: (x: T) => string,
  traiteesRefs: ReadonlySet<string>,
): TriAlertes<T> {
  const actives: T[] = [];
  const traitees: T[] = [];
  for (const l of lignes) {
    const ref = String(reference(l) ?? "").trim();
    // UNE LIGNE SANS RÉFÉRENCE RESTE ACTIVE. On ne peut pas la marquer
    // traitée (rien à écrire en base), donc la ranger dans "traité"
    // reviendrait à la faire disparaître sans que personne l'ait
    // décidé.
    if (ref && traiteesRefs.has(ref)) traitees.push(l);
    else actives.push(l);
  }
  return { actives, traitees };
}

/** La référence d'une vente, celle qui identifie l'argent. */
export function referenceVente(v: Pick<Sale, "ref">): string {
  return String(v.ref ?? "").trim();
}
