// lib/facture/paypalVente.ts
//
// CE QU'UN ÉVÉNEMENT PAYPAL DIT DE L'ARGENT, ET RIEN DE PLUS.
//
// Pur et testé, parce que c'est de la lecture de payload, et que la
// leçon du 7 août (drame Ivan) est écrite noir sur blanc : "raisonner
// sur la forme SUPPOSÉE d'un payload au lieu de la regarder". Ces
// fonctions figent la forme OBSERVÉE ; si PayPal la change un jour, un
// test rougit au lieu d'une facture fausse.
//
// ON FACTURE L'ENCAISSEMENT, PAS L'ACTIVATION.
// -------------------------------------------
// `BILLING.SUBSCRIPTION.ACTIVATED` arrive AUSSI quand l'abonnement
// démarre par un mois offert : aucun euro n'a bougé. Émettre une facture
// de 17 € à ce moment là facturerait un cadeau. C'est
// `PAYMENT.SALE.COMPLETED` qui dit qu'on a encaissé, et il arrive à
// CHAQUE échéance, donc la première comme les suivantes.

/** Un encaissement PayPal, réduit à ce qu'une facture demande. */
export interface EncaissementPaypal {
  /** L'identifiant de la vente chez PayPal. Clé d'idempotence. */
  saleRef: string;
  totalCents: number;
  currency: string;
  paidAt: string;
}

function nombreEnCents(v: unknown): number | null {
  // PayPal envoie des montants en CHAÎNE ("17.00"), jamais en nombre.
  // `Number("")` vaut 0 : sans le test de chaîne vide, un montant absent
  // deviendrait une facture à zéro euro.
  const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function texte(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/**
 * L'encaissement porté par un `PAYMENT.SALE.COMPLETED`.
 *
 * Rend null quand il n'y a pas de montant lisible : une facture sans
 * montant ne vaut rien, et un zéro inventé vaudrait pire.
 */
export function encaissementDepuisSale(
  resource: unknown,
  recuLe?: string | null,
): EncaissementPaypal | null {
  const r = obj(resource);
  const saleRef = texte(r.id);
  if (!saleRef) return null;
  const montant = obj(r.amount);
  const cents = nombreEnCents(montant.total);
  if (cents === null || cents <= 0) return null;
  return {
    saleRef,
    totalCents: cents,
    currency: (texte(montant.currency) || "EUR").toLowerCase(),
    paidAt: texte(r.create_time) || texte(recuLe) || new Date().toISOString(),
  };
}

/** Ce qu'un remboursement annule. `sale_id` désigne la vente d'origine. */
export interface RemboursementPaypal {
  /** L'identifiant du REMBOURSEMENT : la clé d'idempotence de l'avoir. */
  refundRef: string;
  /** La vente remboursée, celle dont on retrouve la facture. */
  saleRef: string | null;
  totalCents: number;
  currency: string;
  paidAt: string;
}

/**
 * Le remboursement porté par un `PAYMENT.SALE.REFUNDED`.
 *
 * **`amount.total` est le montant DE CE remboursement**, pas le total
 * remboursé depuis le début (`total_refunded_amount`). Confondre les
 * deux ferait un avoir de trop sur un second remboursement partiel.
 */
export function remboursementDepuisRefund(
  resource: unknown,
  recuLe?: string | null,
): RemboursementPaypal | null {
  const r = obj(resource);
  const refundRef = texte(r.id);
  if (!refundRef) return null;
  const montant = obj(r.amount);
  const cents = nombreEnCents(montant.total);
  if (cents === null || cents <= 0) return null;
  return {
    refundRef,
    saleRef: texte(r.sale_id) || null,
    totalCents: cents,
    currency: (texte(montant.currency) || "EUR").toLowerCase(),
    paidAt: texte(r.create_time) || texte(recuLe) || new Date().toISOString(),
  };
}
