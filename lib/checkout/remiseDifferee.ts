// lib/checkout/remiseDifferee.ts
//
// LA REMISE QUI ATTEND LA FIN DU MOIS OFFERT.
//
// Béné, 25 août 2026 : "un pourcentage sur le premier mois APRÈS le mois
// gratuit".
//
// -- POURQUOI ON NE POSE PAS LE COUPON TOUT DE SUITE -------------------
//
// Un abonnement Stripe avec essai gratuit émet une facture à 0 € au
// démarrage. La documentation de Stripe dit qu'un coupon `duration:
// once` porte sur la "première CHARGE", ce qui devrait épargner cette
// facture à zéro. "Devrait" n'est pas une base pour décider de ce qu'un
// client paie : si la lecture est fausse, la remise se consomme sur une
// facture à zéro, et l'acheteur paie plein tarif au premier vrai mois en
// croyant avoir eu son code. Il ne s'en apercevrait que sur son relevé.
//
// Et `duration: repeating` sur N mois pose la même question en pire : la
// facture d'essai pourrait manger un mois sur les N.
//
// On ne parie donc pas. Quand il y a un essai, LE COUPON EST POSÉ SUR
// L'ABONNEMENT À LA FIN DE L'ESSAI, sur l'événement que Stripe envoie
// exprès pour ça (`customer.subscription.trial_will_end`, trois jours
// avant). La remise porte alors, sans ambiguïté possible, sur la
// première échéance PAYÉE.
//
// -- CE QU'ON ÉCRIT, ET POURQUOI ---------------------------------------
//
// L'avantage voyage dans les metadata de l'abonnement, en clair : on
// ÉCRIT le fait au lieu de le déduire plus tard. Déduire "il y a un code
// donc il y a une remise" serait faux (un code peut donner des jours
// offerts, pas une remise), et c'est la leçon du mois offert du 23 août.

/** Ce qu'on range dans les metadata Stripe pour le retrouver plus tard. */
export const META_REMISE_PCT = "remise_pct";
export const META_REMISE_DUREE = "remise_duree";
export const META_REMISE_MOIS = "remise_mois";
export const META_REMISE_CODE = "discount_code";

export type RemiseEnAttente = {
  percentOff: number;
  duree: "once" | "forever" | "months";
  mois: number | null;
  code: string;
};

/**
 * La remise à poser, lue dans les metadata d'un abonnement.
 *
 * Rend `null` sur tout ce qui n'est pas exploitable. Un abonnement sans
 * remise en attente est le cas NORMAL : la très grande majorité des
 * abonnements passent ici sans rien à faire, et il ne faut surtout pas
 * qu'ils déclenchent quoi que ce soit.
 */
export function lireRemiseEnAttente(
  metadata: Record<string, unknown> | null | undefined,
): RemiseEnAttente | null {
  const m = metadata ?? {};
  const pct = Number(m[META_REMISE_PCT]);
  if (!Number.isInteger(pct) || pct < 1 || pct > 90) return null;

  const brut = String(m[META_REMISE_DUREE] ?? "once");
  const duree = brut === "forever" ? "forever" : brut === "months" ? "months" : "once";

  let mois: number | null = null;
  if (duree === "months") {
    const n = Number(m[META_REMISE_MOIS]);
    // Une remise "sur N mois" sans N n'est pas applicable : on ne
    // choisit pas un N à la place de Béné.
    if (!Number.isInteger(n) || n < 1 || n > 36) return null;
    mois = n;
  }

  return { percentOff: pct, duree, mois, code: String(m[META_REMISE_CODE] ?? "").trim() };
}

/**
 * Faut-il poser la remise MAINTENANT sur cet abonnement ?
 *
 * `dejaPosee` est un PARAMÈTRE OBLIGATOIRE, et c'est le garde-fou :
 * Stripe rejoue ses webhooks, et poser deux fois un coupon `forever`
 * offrirait deux remises cumulées à quelqu'un qui n'en avait qu'une. On
 * lit donc l'abonnement AVANT, et un abonnement qui porte déjà une
 * remise n'en reçoit pas une seconde.
 */
export function poserLaRemise(args: {
  remise: RemiseEnAttente | null;
  dejaPosee: boolean;
  statut: string | null | undefined;
}): boolean {
  if (!args.remise) return false;
  if (args.dejaPosee) return false;
  // Un abonnement déjà mort ne reçoit pas de remise : ce serait écrire
  // sur un objet que plus personne ne regarde.
  const statut = String(args.statut ?? "").trim();
  if (statut === "canceled" || statut === "incomplete_expired") return false;
  return true;
}

/** La forme du coupon Stripe qui porte cette remise. */
export function couponPourRemise(remise: RemiseEnAttente): Record<string, string | number> {
  const base: Record<string, string | number> = {
    percent_off: remise.percentOff,
    duration: remise.duree,
    name: remise.code ? `Code ${remise.code}` : `Remise ${remise.percentOff} %`,
    max_redemptions: 1,
  };
  if (remise.duree === "months" && remise.mois) {
    base.duration_in_months = remise.mois;
  }
  if (remise.code) base["metadata[discount_code]"] = remise.code;
  return base;
}
