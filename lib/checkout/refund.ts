// lib/checkout/refund.ts
//
// CE QU'UN REMBOURSEMENT DOIT DÉCLENCHER, ET CE QU'IL NE DOIT PAS.
//
// Béné, 20 août : "si je rembourse les 47 €, l'accès est coupé ou pas ?
// L'user reçoit quelle info ?"
//
// Réponse d'avant ce fichier : l'accès n'était pas coupé, et l'acheteur
// ne recevait que l'email de remboursement de Stripe, dans le gabarit de
// Stripe. Sur un produit avec garantie 30 jours, ça veut dire que
// n'importe qui pouvait acheter, demander son remboursement, et garder
// l'Atelier à vie.
//
// -- POURQUOI UNE FONCTION PURE POUR TROIS LIGNES ----------------------
//
// Parce que la décision "rembourser = couper" est FAUSSE dans un cas, et
// que ce cas arrive vraiment : le remboursement PARTIEL. Un geste
// commercial de 10 €, une erreur de montant corrigée, et l'acheteur se
// retrouverait dehors alors qu'il a payé 37 € pour rester dedans.
//
// C'est exactement la famille de bugs du 1er août : une logique écrite
// pour un cas appliquée telle quelle à un autre, et rien ne la contredit
// avant que la cliente ne le découvre. Ici elle est nommée, isolée et
// testée, donc le prochain qui touchera au webhook ne pourra pas
// l'oublier.

/** Ce que Stripe nous envoie d'un remboursement, réduit à ce qui décide. */
export interface ChargeRembourseeMinimal {
  /** Le montant encaissé au départ, en centimes. */
  amount?: number | null;
  /** Le cumul remboursé à ce jour, en centimes. */
  amount_refunded?: number | null;
  /** Le drapeau de Stripe quand tout a été rendu. */
  refunded?: boolean | null;
}

export type RefundOutcome = "full" | "partial" | "none";

/**
 * Total, partiel, ou rien.
 *
 * On ne se fie pas au seul drapeau `refunded` : il existe, mais un
 * cumul de remboursements partiels qui atteint le total doit compter
 * comme un remboursement total, et rien ne garantit l'ordre dans lequel
 * les deux informations arrivent. Les deux voies mènent donc à "full".
 *
 * Un montant de départ inconnu ou nul ferme : on ne coupe pas un accès
 * sur une charge qu'on n'a pas su lire.
 */
export function readRefundOutcome(charge: ChargeRembourseeMinimal | null | undefined): RefundOutcome {
  if (!charge) return "none";
  const total = Number(charge.amount ?? 0);
  const rendu = Number(charge.amount_refunded ?? 0);
  if (!Number.isFinite(total) || !Number.isFinite(rendu) || rendu <= 0) {
    return charge.refunded === true && total > 0 ? "full" : "none";
  }
  if (charge.refunded === true) return "full";
  if (total > 0 && rendu >= total) return "full";
  return "partial";
}
