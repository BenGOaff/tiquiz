// lib/admin/affiliatePayouts.ts
//
// QUI VEND, COMBIEN, ET CE QUE TU DOIS SORTIR CE MOIS CI.
//
// Béné, 21 août : "les affiliés : qui vend, combien, mes factures... vue
// en un clin d'oeil des revenus récurrents et des sommes à sortir aux
// affiliés chaque mois pour calculer mon bénéfice restant."
//
// -- LES MÊMES RÈGLES QUE CE QUE VOIT L'AFFILIÉE -----------------------
//
// Le cycle d'une commission existe déjà, et il est calqué sur celui de
// Systeme.io : garantie 30 jours, puis à verser, puis versé. Il est
// appliqué dans `getAffiliateGains()` côté Atelier, c'est à dire sur
// l'écran que l'affiliée elle même regarde.
//
// **On applique EXACTEMENT le même.** Un écran qui recalcule à sa façon
// ce qu'un autre écran affiche finit toujours par le contredire, et ici
// la contradiction serait la pire possible : l'affiliée lit un montant,
// Béné en lit un autre, et il n'y a pas de bonne réponse à donner.
//
// -- POURQUOI LA GARANTIE COMPTE ---------------------------------------
//
// Tant qu'on est dans les 30 jours du satisfait ou remboursé, un
// remboursement peut annuler la commission. La montrer comme "à sortir"
// ferait provisionner de l'argent qui ne sortira peut être jamais, et
// fausserait le bénéfice restant dans le mauvais sens.
//
// -- AUCUN POURCENTAGE INVENTÉ -----------------------------------------
//
// Le taux n'est jamais recalculé ici : chaque ligne porte le sien
// (`commission_cents` est figé à la vente). Un quiz vendu à 70 % en juin
// garde 70 % même si le taux change en septembre.

/** La fenêtre du satisfait ou remboursé. Miroir de `GUARANTEE_HOLD_DAYS`. */
export const HOLD_DAYS = 30;

/** D'où vient la commission. Deux programmes, deux bases de données. */
export type CommissionSource = "tiquiz" | "atelier";

/** Une ligne de commission, normalisée par les deux endpoints partenaires. */
export interface CommissionRow {
  source: CommissionSource;
  sa: string;
  /** Le nom de l'affiliée, quand on le connaît. */
  name?: string | null;
  email?: string | null;
  productName?: string | null;
  saleCents: number;
  commissionCents: number;
  /** Le statut brut en base : pending, approved, paid, cancelled... */
  status: string;
  saleAt: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
}

/**
 * Où en est une commission.
 *
 * - `guarantee` : vendue il y a moins de 30 jours, peut encore sauter ;
 * - `payable`   : acquise, elle partira au prochain versement ;
 * - `paid`      : déjà versée ;
 * - `refunded`  : annulée (remboursement, rejet).
 */
export type CommissionStage = "guarantee" | "payable" | "paid" | "refunded";

const ANNULES = new Set(["refunded", "cancelled", "rejected"]);

export function readCommissionStage(row: CommissionRow, maintenant: Date): CommissionStage {
  const statut = String(row.status ?? "").toLowerCase();
  if (row.refundedAt || ANNULES.has(statut)) return "refunded";
  if (statut === "paid") return "paid";

  const vente = row.saleAt ? Date.parse(row.saleAt) : NaN;
  // Sans date de vente exploitable, on ne peut pas dire si la garantie
  // est passee. On la considere ACQUISE : ces lignes sont anciennes (une
  // vente d'aujourd'hui porte toujours sa date), et les compter en
  // garantie les cacherait pour toujours.
  if (!Number.isFinite(vente)) return "payable";

  const finGarantie = vente + HOLD_DAYS * 24 * 3600 * 1000;
  return maintenant.getTime() < finGarantie ? "guarantee" : "payable";
}

/** Le bilan d'une affiliée. */
export interface AffiliateLine {
  sa: string;
  name: string | null;
  email: string | null;
  /** Les programmes où elle a vendu. Une affiliée peut vendre les deux. */
  sources: CommissionSource[];
  salesCount: number;
  /** Ce qu'elle t'a fait encaisser. */
  salesCents: number;
  /** Acquis, pas encore versé. C'est ce qui part au prochain versement. */
  payableCents: number;
  /** Encore sous garantie : à ne PAS provisionner. */
  guaranteeCents: number;
  /** Déjà versé. */
  paidCents: number;
  /** Annulé par un remboursement. */
  refundedCents: number;
  lastSaleAt: string | null;
}

/** Un mois de l'historique. */
export interface AffiliateMonth {
  /** "2026-08". */
  key: string;
  salesCents: number;
  /** Toutes commissions confondues, remboursements exclus. */
  commissionCents: number;
  /** Ce qui te reste : ventes moins commissions. */
  netCents: number;
  salesCount: number;
}

export interface AffiliatePayouts {
  affiliates: AffiliateLine[];
  /** Du plus récent au plus ancien, 12 mois au plus. */
  months: AffiliateMonth[];
  totals: {
    salesCents: number;
    payableCents: number;
    guaranteeCents: number;
    paidCents: number;
    refundedCents: number;
    /** Nombre d'affiliées qui ont vendu au moins une fois. */
    sellers: number;
  };
}

/** "2026-08" a partir d'une date ISO. `null` si elle est illisible. */
function moisDe(iso: string | null | undefined): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MAX_MOIS = 12;

export function buildAffiliatePayouts(
  rows: readonly CommissionRow[],
  maintenant: Date,
): AffiliatePayouts {
  const parAffiliee = new Map<string, AffiliateLine>();
  const parMois = new Map<string, AffiliateMonth>();

  for (const row of rows ?? []) {
    const sa = String(row?.sa ?? "").trim();
    if (!sa) continue;

    const stage = readCommissionStage(row, maintenant);
    const vente = Math.max(0, Math.round(Number(row.saleCents) || 0));
    const commission = Math.max(0, Math.round(Number(row.commissionCents) || 0));

    let ligne = parAffiliee.get(sa);
    if (!ligne) {
      ligne = {
        sa,
        name: row.name?.trim() || null,
        email: row.email?.trim() || null,
        sources: [],
        salesCount: 0,
        salesCents: 0,
        payableCents: 0,
        guaranteeCents: 0,
        paidCents: 0,
        refundedCents: 0,
        lastSaleAt: null,
      };
      parAffiliee.set(sa, ligne);
    }
    // Le nom peut manquer sur une ligne et pas sur une autre : on garde
    // le premier qu'on trouve plutot que d'afficher un identifiant nu.
    if (!ligne.name && row.name?.trim()) ligne.name = row.name.trim();
    if (!ligne.email && row.email?.trim()) ligne.email = row.email.trim();
    if (row.source && !ligne.sources.includes(row.source)) ligne.sources.push(row.source);

    if (stage === "refunded") {
      // Une vente remboursee ne compte NI dans ce qu'elle a vendu, NI
      // dans le chiffre du mois : l'argent est reparti.
      ligne.refundedCents += commission;
      continue;
    }

    ligne.salesCount += 1;
    ligne.salesCents += vente;
    if (stage === "paid") ligne.paidCents += commission;
    else if (stage === "guarantee") ligne.guaranteeCents += commission;
    else ligne.payableCents += commission;

    if (row.saleAt && (!ligne.lastSaleAt || row.saleAt > ligne.lastSaleAt)) {
      ligne.lastSaleAt = row.saleAt;
    }

    const cle = moisDe(row.saleAt);
    if (cle) {
      const mois = parMois.get(cle) ?? {
        key: cle,
        salesCents: 0,
        commissionCents: 0,
        netCents: 0,
        salesCount: 0,
      };
      mois.salesCents += vente;
      mois.commissionCents += commission;
      mois.netCents = mois.salesCents - mois.commissionCents;
      mois.salesCount += 1;
      parMois.set(cle, mois);
    }
  }

  const affiliates = [...parAffiliee.values()].sort((a, b) => {
    // Ce qu'elle t'a rapporte d'abord : c'est la question posee.
    if (b.salesCents !== a.salesCents) return b.salesCents - a.salesCents;
    return (a.name ?? a.sa) < (b.name ?? b.sa) ? -1 : 1;
  });

  const months = [...parMois.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .slice(0, MAX_MOIS);

  const totals = affiliates.reduce(
    (acc, a) => ({
      salesCents: acc.salesCents + a.salesCents,
      payableCents: acc.payableCents + a.payableCents,
      guaranteeCents: acc.guaranteeCents + a.guaranteeCents,
      paidCents: acc.paidCents + a.paidCents,
      refundedCents: acc.refundedCents + a.refundedCents,
      sellers: acc.sellers + (a.salesCount > 0 ? 1 : 0),
    }),
    {
      salesCents: 0,
      payableCents: 0,
      guaranteeCents: 0,
      paidCents: 0,
      refundedCents: 0,
      sellers: 0,
    },
  );

  return { affiliates, months, totals };
}
