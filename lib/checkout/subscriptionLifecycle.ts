// lib/checkout/subscriptionLifecycle.ts
//
// QUAND EST-CE QU'UN ABONNEMENT S'ARRÊTE VRAIMENT, ET QUAND COUPE-T-ON.
//
// Trouvé le 21 août en préparant le tableau de bord de Béné, qui
// demandait "qui a arrêté son abo". La réponse était : personne ne le
// sait, et c'est pire que ça.
//
// -- LE TROU ------------------------------------------------------------
//
// `OWNER_STRIPE_EVENTS` n'écoutait que quatre événements : paiement
// réussi, paiement différé réussi ou échoué, remboursement. **Aucun
// événement d'abonnement.** Concrètement, sur Tiquiz qui vend du mensuel
// et de l'annuel :
//
//   - quelqu'un qui résilie garde son plan payant indéfiniment ;
//   - un renouvellement qui échoue ne coupe rien ;
//   - et la question "qui est parti" n'a aucune donnée derrière.
//
// C'est la même famille que le remboursement du 20 août ("si je
// rembourse, l'accès est coupé ou pas ?" : non, et rien de nous), sauf
// que là ça concerne le mode de vente principal de Tiquiz.
//
// -- LE PIÈGE, ET IL EST L'INVERSE DE CE QU'ON CROIT --------------------
//
// La correction évidente serait "il résilie -> je coupe". Elle est
// FAUSSE, et elle volerait le client.
//
// Quelqu'un qui résilie son mensuel le 3 du mois a payé jusqu'au 30.
// Stripe le sait : il met `cancel_at_period_end: true` et laisse
// l'abonnement `active` jusqu'à la fin de la période payée, puis envoie
// `customer.subscription.deleted` le jour où ça s'arrête vraiment.
//
// **On coupe sur `deleted`, jamais sur l'intention de partir.** C'est
// exactement la distinction du remboursement partiel : un geste de 5 EUR
// sur un abonnement à 17 EUR ne met pas dehors quelqu'un qui a payé
// 12 EUR pour rester.
//
// Et `past_due` ne coupe pas non plus : c'est une carte qui vient
// d'expirer, Stripe réessaie plusieurs jours. Couper au premier échec
// mettrait dehors des gens qui vont payer, sans qu'ils comprennent.
// Quand Stripe abandonne, il passe en `unpaid` ou `canceled`, et LÀ on
// coupe.
//
// -- LA MÉCANIQUE EST UN PARAMÈTRE --------------------------------------
//
// `readSubscriptionOutcome(eventType, subscription)` : on ne peut pas
// décider sans avoir dit de quel événement on parle. C'est la règle du
// 1er août, celle qui survit au prochain qui touchera au fichier.

/** Les événements d'abonnement qu'on écoute. */
export const OWNER_SUBSCRIPTION_EVENTS = [
  // L'abonnement s'arrête POUR DE BON. C'est le seul qui coupe l'accès.
  "customer.subscription.deleted",
  // Résiliation programmée, réactivation, changement de statut. Ne coupe
  // que sur un statut terminal.
  "customer.subscription.updated",
  // Le renouvellement a été encaissé : c'est ce qui alimentera le revenu
  // récurrent. Ne touche jamais à l'accès.
  "invoice.paid",
  // Un prélèvement a échoué. On l'enregistre, on ne coupe pas : Stripe
  // réessaie, et couper au premier échec mettrait dehors des gens qui
  // vont payer.
  "invoice.payment_failed",
  // L'essai gratuit se termine dans trois jours. Stripe l'envoie exprès
  // pour ça, et c'est le moment où on pose la remise d'un code
  // "pourcentage sur le premier mois APRÈS le mois gratuit" (Béné, 25
  // août 2026). Ne touche jamais à l'accès.
  "customer.subscription.trial_will_end",
] as const;

export type SubscriptionOutcome =
  /** L'abonnement est fini : on retire le plan payant. */
  | "revoke"
  /**
   * Il se passe quelque chose qu'il faut CONSIGNER, mais l'accès reste
   * ouvert : résiliation programmée, prélèvement en échec, réactivation.
   */
  | "notice"
  /** Rien à faire côté accès. */
  | "keep";

/** Ce qu'on lit d'un abonnement Stripe. Volontairement réduit. */
export interface RawSubscription {
  id?: string | null;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: number | null;
  canceled_at?: number | null;
  cancellation_details?: {
    feedback?: string | null;
    comment?: string | null;
    reason?: string | null;
  } | null;
  items?: {
    data?: { price?: { unit_amount?: number | null; currency?: string | null } | null }[] | null;
  } | null;
}

/**
 * Les statuts qui veulent dire "c'est fini, il ne paiera plus".
 *
 * `past_due` n'en fait PAS partie, et c'est le point le plus important
 * de ce fichier.
 */
const STATUTS_TERMINES = new Set(["canceled", "unpaid", "incomplete_expired"]);

/** Les statuts où l'abonnement est vivant et payé. */
const STATUTS_VIVANTS = new Set(["active", "trialing", "past_due", "paused"]);

export interface SubscriptionRead {
  outcome: SubscriptionOutcome;
  /** Pourquoi, en un mot, pour les journaux et le tableau de bord. */
  reason:
    | "ended"
    | "cancel_scheduled"
    | "reactivated"
    | "payment_failed"
    | "renewed"
    | "still_active"
    | "unknown_event";
  /** L'abonnement va s'arrêter, sans être encore arrêté. */
  churnPending: boolean;
}

/**
 * Que fait-on de cet événement d'abonnement ?
 *
 * `eventType` est OBLIGATOIRE : deux événements portent le même objet et
 * n'appellent pas la même décision.
 */
export function readSubscriptionOutcome(
  eventType: string | null | undefined,
  subscription: RawSubscription | null | undefined,
): SubscriptionRead {
  const type = String(eventType ?? "").trim();
  const statut = String(subscription?.status ?? "").trim().toLowerCase();

  if (type === "customer.subscription.deleted") {
    // Le seul qui coupe. Stripe l'envoie à la fin de la période payée,
    // ou tout de suite si la résiliation était immédiate.
    return { outcome: "revoke", reason: "ended", churnPending: false };
  }

  if (type === "customer.subscription.updated") {
    if (STATUTS_TERMINES.has(statut)) {
      return { outcome: "revoke", reason: "ended", churnPending: false };
    }
    if (subscription?.cancel_at_period_end === true) {
      // IL A DEMANDÉ À PARTIR, IL N'EST PAS PARTI. Il a payé jusqu'au
      // bout de sa période : couper ici serait le voler. On consigne,
      // et c'est ce moment là qui est le bon pour lui demander pourquoi,
      // pendant qu'il est encore client.
      return { outcome: "notice", reason: "cancel_scheduled", churnPending: true };
    }
    if (STATUTS_VIVANTS.has(statut)) {
      // Soit rien n'a bougé côté accès, soit il a annulé sa résiliation.
      // On consigne la réactivation : sans elle, le tableau de bord
      // continuerait de le compter comme partant.
      return { outcome: "notice", reason: "reactivated", churnPending: false };
    }
    // Un statut qu'on ne sait pas nommer (`incomplete`, ou un nouveau).
    // **On ne coupe pas sur ce qu'on ne comprend pas** : le risque d'un
    // client mis dehors à tort est plus cher que celui d'un accès gardé
    // quelques jours de trop, et le `deleted` finira par arriver.
    return { outcome: "keep", reason: "still_active", churnPending: false };
  }

  if (type === "customer.subscription.trial_will_end") {
    // L'essai se termine dans trois jours. Rien à faire côté accès :
    // il est ouvert et il le reste. C'est la route qui y pose la remise
    // en attente, s'il y en a une.
    return { outcome: "keep", reason: "still_active", churnPending: false };
  }

  if (type === "invoice.payment_failed") {
    return { outcome: "notice", reason: "payment_failed", churnPending: false };
  }

  if (type === "invoice.paid") {
    return { outcome: "notice", reason: "renewed", churnPending: false };
  }

  return { outcome: "keep", reason: "unknown_event", churnPending: false };
}

/** Cet événement concerne-t-il le cycle de vie d'un abonnement ? */
export function isSubscriptionEvent(eventType: string | null | undefined): boolean {
  const type = String(eventType ?? "").trim();
  return (OWNER_SUBSCRIPTION_EVENTS as readonly string[]).includes(type);
}

/**
 * Ce que Stripe nous dit du départ, quand le client est passé par le
 * portail client.
 *
 * C'est de la donnée GRATUITE et on ne la collectait pas : Stripe pose
 * `cancellation_details.feedback` (une raison parmi une liste) et
 * `.comment` (son texte libre). Béné veut "consigner ces réponses pour
 * level up l'outil" : une partie est déjà là, sans rien lui demander.
 */
export function readCancellationFeedback(
  subscription: RawSubscription | null | undefined,
): { feedback: string | null; comment: string | null } {
  const d = subscription?.cancellation_details ?? null;
  const propre = (v: unknown): string | null => {
    const s = String(v ?? "").trim();
    return s ? s.slice(0, 2000) : null;
  };
  return { feedback: propre(d?.feedback), comment: propre(d?.comment) };
}

/** Le montant de l'abonnement, en centimes, ou `null`. */
export function readSubscriptionAmount(
  subscription: RawSubscription | null | undefined,
): { amountCents: number | null; currency: string | null } {
  const prix = subscription?.items?.data?.[0]?.price ?? null;
  const montant = Number(prix?.unit_amount);
  return {
    amountCents: Number.isFinite(montant) ? montant : null,
    currency: String(prix?.currency ?? "").trim().toLowerCase() || null,
  };
}

/** Une date Stripe (secondes) en ISO, ou `null`. */
export function stripeDateToIso(seconds: number | null | undefined): string | null {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}
