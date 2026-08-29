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

/**
 * Au delà, on ne remonte plus les lignes au navigateur.
 *
 * Le TOTAL, lui, est toujours juste : c'est la liste qui est bornée,
 * pas le compteur. L'inverse ferait mentir un chiffre d'affaires.
 */
const PLAFOND_VENTES = 500;

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
  /**
   * TOUTES les ventes de la période, la plus récente d'abord.
   *
   * Bornée, et le nombre TOTAL est rendu à côté : une liste coupée en
   * silence fait croire qu'on a tout vu, et sur de l'argent ça se paie
   * cher.
   */
  toutesVentes: { vente: Sale; email: string; nom: string | null }[];
  totalVentesPeriode: number;
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

  // Les ventes de la période, RATTACHÉES à leur acheteur. Une vente
  // orpheline (aucun compte ne porte son adresse) reste dans la liste :
  // c'est justement celle qu'il faut voir.
  const parEmail = new Map<string, Person>();
  for (const p of args.people) parEmail.set(p.email.toLowerCase(), p);
  const toutes = ventes
    .map((vente) => {
      const email = String(vente.email ?? "").toLowerCase();
      const p = parEmail.get(email);
      return { vente, email: vente.email ?? "", nom: p?.name ?? vente.name ?? null };
    })
    .sort((a, b) => {
      const ta = Date.parse(String(a.vente.paidAt ?? ""));
      const tb = Date.parse(String(b.vente.paidAt ?? ""));
      if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
      if (!Number.isFinite(ta)) return 1;
      if (!Number.isFinite(tb)) return -1;
      return tb - ta;
    });

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
    toutesVentes: toutes.slice(0, PLAFOND_VENTES),
    totalVentesPeriode: toutes.length,
  };
}
