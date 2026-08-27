// lib/admin/mrr.ts
//
// LE REVENU RÉCURRENT ET LE CHURN (Béné, 27 août 2026).
//
// "Oui je veux mon MRR et mon churn facilement trouvables."
//
// L'écran des statistiques montrait déjà l'ENCAISSÉ mois par mois. Ce
// n'est pas la même chose, et sur un business d'abonnement la confusion
// coûte cher : un annuel à 170 € et dix mensuels à 17 € font le même
// encaissement le mois où ils tombent, et pas du tout la même santé.
// L'encaissé monte et descend au rythme des échéances ; le MRR dit ce
// qui rentre CHAQUE mois tant que personne ne part.
//
// -- CE QU'ON REFUSE DE FAIRE ------------------------------------------
//
// **Un seul chiffre de MRR aurait menti.** Quelqu'un qui a demandé à
// partir paie encore jusqu'à la fin de sa période, et ne se renouvellera
// pas : le compter comme du récurrent gonfle le chiffre, l'exclure fait
// croire qu'il est déjà parti. On rend donc les DEUX, séparés, et
// l'écran les montre séparés.
//
// **Un pourcentage de churn sur trois personnes ne veut rien dire.** Sur
// une base de 3, un départ vaut 33 %. On ne calcule le taux qu'à partir
// de `BASE_MIN_CHURN`, et en dessous on montre les effectifs bruts.
// C'est la règle du funnel de Jocelyne (4 août) transposée à l'argent :
// la retenue ne s'obtient pas en la demandant, elle s'obtient en
// refusant de calculer.
//
// **Les plans à VIE ne sont pas du récurrent.** Ils ont payé une fois,
// ils ne repaieront jamais. Les compter donnerait un MRR qui ne rentre
// pas.
//
// -- LA PRÉCISION QU'ON ASSUME, ET QU'ON DIT ---------------------------
//
// Le montant vient du CATALOGUE d'aujourd'hui, pas du dernier paiement
// réel. Un abonné arrivé par Systeme.io sur un ancien tarif est donc
// compté au prix actuel. C'est un écart de quelques euros, connu et
// borné ; lire le dernier paiement serait pire, parce qu'une facture de
// montée de palier au prorata donnerait un montant qui n'est le tarif de
// personne. L'écran le dit en toutes lettres.
//
// Un plan qu'on ne sait pas chiffrer (un palier retiré du catalogue) est
// EXCLU et COMPTÉ : une ligne qui disparaît en silence est un trou qu'on
// ne peut plus expliquer six mois plus tard.

import { OWNER_CATALOG } from "@/lib/checkout/catalog";
import type { Person } from "@/lib/admin/people";

/** En dessous, un pourcentage de churn commente des individus. */
export const BASE_MIN_CHURN = 10;

/**
 * Ce qu'un palier rapporte CHAQUE MOIS, en centimes.
 *
 * Construit depuis le catalogue : deux tables de prix finiraient par
 * diverger, et celle-ci serait la fausse (personne ne la relit).
 * L'annuel est ramené au mois, c'est la définition même du MRR.
 */
export function mrrParPlanCents(): Record<string, number> {
  const par: Record<string, number> = {};
  for (const produit of Object.values(OWNER_CATALOG)) {
    const mensuel = produit.interval === "year"
      ? Math.round(produit.amountCents / 12)
      : produit.amountCents;
    par[produit.plan] = mensuel;
  }
  return par;
}

export type Mrr = {
  /** Ce qui se renouvellera le mois prochain. */
  cents: number;
  /** Ce qui paie encore mais a demandé à partir : du MRR déjà perdu. */
  enSursisCents: number;
  /** Combien de personnes derrière chaque chiffre. */
  abonnes: number;
  partants: number;
  /** Détail par palier, du plus gros au plus petit. */
  parPlan: { plan: string; abonnes: number; cents: number }[];
  /**
   * Les paliers qu'on ne sait pas chiffrer, avec leur effectif. Affichés
   * tels quels : on ne devine pas un prix, et on ne les cache pas.
   */
  nonChiffrables: { plan: string; personnes: number }[];
};

/** La date à laquelle cette personne a commencé à payer, ou `null`. */
export function premierPaiement(p: Pick<Person, "sales">): string | null {
  let plusAncien: string | null = null;
  for (const v of p.sales) {
    // Une vente remboursée n'a jamais commencé un abonnement.
    if (v.refundedAt) continue;
    const t = v.paidAt;
    if (!t) continue;
    if (plusAncien === null || Date.parse(t) < Date.parse(plusAncien)) plusAncien = t;
  }
  return plusAncien;
}

/** Le jour où elle cesse d'être comptée, ou `null` si elle est toujours là. */
export function finAbonnement(p: Pick<Person, "churn">): string | null {
  // `endedAt` d'abord (c'est fait), puis `endsAt` (c'est prévu). Prendre
  // `cancelledAt` compterait quelqu'un comme parti alors qu'il a encore
  // un mois payé devant lui.
  return p.churn?.endedAt ?? p.churn?.endsAt ?? null;
}

/**
 * Le revenu récurrent d'AUJOURD'HUI.
 *
 * `abonne` et `partant` sont séparés parce qu'ils ne disent pas la même
 * chose : le premier va se renouveler, le second non.
 */
export function buildMrr(people: readonly Person[]): Mrr {
  const prix = mrrParPlanCents();
  const parPlan = new Map<string, { abonnes: number; cents: number }>();
  const inconnus = new Map<string, number>();
  let cents = 0;
  let enSursisCents = 0;
  let abonnes = 0;
  let partants = 0;

  for (const p of people) {
    // `avie` est exclu volontairement : il a payé une fois.
    if (p.status !== "abonne" && p.status !== "partant") continue;
    const plan = String(p.plan ?? "").trim();
    const mensuel = prix[plan];
    if (typeof mensuel !== "number") {
      inconnus.set(plan || "inconnu", (inconnus.get(plan || "inconnu") ?? 0) + 1);
      continue;
    }
    if (p.status === "abonne") {
      cents += mensuel;
      abonnes += 1;
      const vu = parPlan.get(plan) ?? { abonnes: 0, cents: 0 };
      parPlan.set(plan, { abonnes: vu.abonnes + 1, cents: vu.cents + mensuel });
    } else {
      enSursisCents += mensuel;
      partants += 1;
    }
  }

  return {
    cents,
    enSursisCents,
    abonnes,
    partants,
    parPlan: [...parPlan.entries()]
      .map(([plan, v]) => ({ plan, ...v }))
      .sort((a, b) => b.cents - a.cents || a.plan.localeCompare(b.plan)),
    nonChiffrables: [...inconnus.entries()]
      .map(([plan, personnes]) => ({ plan, personnes }))
      .sort((a, b) => b.personnes - a.personnes || a.plan.localeCompare(b.plan)),
  };
}

export type PointChurn = {
  /** `2026-08`. */
  mois: string;
  /** Payants au PREMIER jour du mois. C'est le dénominateur. */
  base: number;
  partis: number;
  nouveaux: number;
  /**
   * Le taux, ou `null` quand la base est trop petite pour qu'il veuille
   * dire quelque chose. `null` n'est PAS zéro, et l'écran le dit
   * autrement (les effectifs bruts).
   */
  tauxPct: number | null;
};

/** `2026-08` -> les bornes du mois, en millisecondes. */
function bornesDuMois(mois: string): { debut: number; fin: number } {
  const [a, m] = mois.split("-").map(Number);
  const debut = Date.UTC(a, (m ?? 1) - 1, 1);
  const fin = Date.UTC(a, m ?? 1, 1);
  return { debut, fin };
}

/**
 * Le churn mois par mois.
 *
 * `mois` est la liste À COUVRIR, fournie par l'appelant (la même que les
 * autres séries de l'écran) : deux fenêtres calculées séparément
 * donneraient deux axes différents sur le même graphique.
 */
export function serieChurn(
  people: readonly Person[],
  mois: readonly string[],
): PointChurn[] {
  // On ne relit pas les personnes à chaque mois : leur période de
  // paiement est calculée UNE fois.
  const periodes = people
    .map((p) => ({
      debut: premierPaiement(p),
      fin: finAbonnement(p),
    }))
    .filter((x) => x.debut !== null)
    .map((x) => ({
      debut: Date.parse(x.debut as string),
      fin: x.fin ? Date.parse(x.fin) : Number.POSITIVE_INFINITY,
    }))
    .filter((x) => Number.isFinite(x.debut));

  return mois.map((m) => {
    const { debut, fin } = bornesDuMois(m);
    let base = 0;
    let partis = 0;
    let nouveaux = 0;
    for (const p of periodes) {
      // Payant AVANT le premier jour du mois, et pas encore sorti.
      if (p.debut < debut && p.fin >= debut) base += 1;
      if (p.debut >= debut && p.debut < fin) nouveaux += 1;
      if (Number.isFinite(p.fin) && p.fin >= debut && p.fin < fin) partis += 1;
    }
    return {
      mois: m,
      base,
      partis,
      nouveaux,
      // Un taux sur une base minuscule commente des individus : on ne le
      // calcule pas, on ne le remplace pas par zéro.
      tauxPct: base >= BASE_MIN_CHURN ? Math.round((partis / base) * 1000) / 10 : null,
    };
  });
}
