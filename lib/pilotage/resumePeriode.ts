// lib/pilotage/resumePeriode.ts
//
// TOUT L'ÉCRAN PARLE DE LA MÊME PÉRIODE, OU IL MENT.
//
// Béné veut choisir sa période dès l'accueil, "partout". Le piège est
// entier là dedans : si le sélecteur ne déplaçait que le graphique
// pendant que les compteurs du haut parlent d'autre chose, deux
// chiffres se contrediraient sur la même page, et c'est celui du haut
// qu'on croit.
//
// D'où UNE fonction qui rend TOUT ce qui dépend de la période. Un écran
// ne peut plus en filtrer une partie et oublier le reste : il n'a plus
// qu'une seule source.
//
// PUR : ni horloge ni base.

import { dansLaPeriode, moisCouverts, type Periode } from "@/lib/pilotage/periode";
import { serieEmpilee, type SerieEmpilee } from "@/lib/pilotage/serieEmpilee";
import { derniersContacts, dernieresVentes } from "@/lib/pilotage/recents";
import type { Person } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";

export interface ResumePeriode {
  encaisseCents: number;
  rembourseCents: number;
  /** Les ventes encaissées dans la période. */
  ventes: number;
  /** Les comptes créés dans la période. */
  nouveauxComptes: number;
  /** Les départs constatés dans la période. */
  departs: number;
  serie: SerieEmpilee;
  contacts: Person[];
  dernieresVentes: ReturnType<typeof dernieresVentes>;
  /** Des ventes dont on ne connaît pas le montant, DANS cette période. */
  sansMontant: number;
}

export function resumePeriode(args: {
  sales: readonly Sale[];
  people: readonly Person[];
  periode: Periode;
  maintenant: Date;
}): ResumePeriode {
  const { periode, maintenant } = args;

  const ventes = args.sales.filter((v) => dansLaPeriode(v.paidAt, periode));

  // LE REMBOURSEMENT COMPTE DANS LE MOIS OÙ IL A LIEU, pas dans celui de
  // la vente. C'est ce que fait une banque, et c'est ce à quoi Béné
  // comparera : un remboursement de juin sur une vente d'avril sort de
  // la trésorerie en juin.
  const rembourses = args.sales.filter((v) => dansLaPeriode(v.refundedAt, periode));

  const contacts = args.people.filter((p) => dansLaPeriode(p.createdAt, periode));

  const fin = periode.fin ? new Date(`${periode.fin}T23:59:59Z`) : maintenant;

  return {
    encaisseCents: ventes
      .filter((v) => !v.refundedAt)
      .reduce((s, v) => s + (Number(v.amountCents) || 0), 0),
    rembourseCents: rembourses.reduce((s, v) => s + (Number(v.amountCents) || 0), 0),
    ventes: ventes.filter((v) => !v.refundedAt).length,
    nouveauxComptes: contacts.length,
    departs: args.people.filter(
      (p) => p.status === "parti" && dansLaPeriode(p.lastSignIn, periode),
    ).length,
    // La série lit les MÊMES ventes filtrées : le graphique ne peut
    // donc pas montrer autre chose que le compteur au dessus de lui.
    serie: serieEmpilee(ventes, fin, moisCouverts(periode, maintenant)),
    contacts: derniersContacts(contacts, 6),
    dernieresVentes: dernieresVentes(
      args.people
        .map((p) => ({ ...p, sales: p.sales.filter((v) => dansLaPeriode(v.paidAt, periode)) }))
        .filter((p) => p.sales.length > 0),
      6,
    ),
    sansMontant: ventes.filter((v) => !v.refundedAt && v.amountSource === "inconnu").length,
  };
}
