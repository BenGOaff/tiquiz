// lib/checkout/plansAVie.ts
//
// LES ACCÈS QU'AUCUN ABONNEMENT NE GOUVERNE.
//
// `lifetime` (l'offre à 57 € terminée) et `beta` : ils ont été payés une
// fois, ou donnés, et ils ne se renouvellent pas. Toute mécanique qui
// touche au plan doit donc les laisser TRANQUILLES, sinon on retire un
// accès à vie à quelqu'un parce qu'un abonnement qui n'a jamais existé
// n'a pas été retrouvé.
//
// La liste vivait en DEUX exemplaires (`cancelSubscriptions.ts` et
// `admin/people.ts`). Deux listes qui disent la même chose finissent
// toujours par diverger : le jour où un troisième plan à vie apparaît,
// une seule des deux le connaîtrait, et l'écran dirait "Abonné" pendant
// que l'annulation lui retirerait son accès.

/** Les plans qui ne dépendent d'aucun abonnement. */
export const PLANS_A_VIE: ReadonlySet<string> = new Set(["beta", "lifetime"]);

/** Ce plan est-il à vie ? Tolère la casse et les espaces. */
export function estPlanAVie(plan: unknown): boolean {
  return PLANS_A_VIE.has(String(plan ?? "").trim().toLowerCase());
}
