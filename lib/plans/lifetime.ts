// lib/plans/lifetime.ts
//
// LES PLANS QU'AUCUN WEBHOOK NE PEUT RAMENER À `free`.
//
// `beta` est offert à la main par Béné, `lifetime` est le palier payé une
// fois. Les deux ont été PROMIS à vie : le seul chemin légitime pour les
// retirer est la route d'administration, jamais un appel automatique.
//
// -- POURQUOI CETTE LISTE SORT DE LA ROUTE -----------------------------
//
// Elle vivait en constante locale dans `app/api/systeme-io/webhook/route.ts`.
// Tant qu'il n'y avait qu'un webhook, ça tenait. Le 20 août, un DEUXIÈME
// chemin de rétrogradation apparaît (le remboursement d'une vente
// encaissée par nous, via Stripe), et une liste de protections recopiée
// à deux endroits, c'est la garantie qu'un jour l'un des deux oubliera
// une entrée et rétrogradera un compte à vie.
//
// C'est mot pour mot le défaut que ce dépôt répare depuis des mois : les
// réseaux de partage, l'affichage du score, l'alignement du sous-titre,
// l'URL de l'Atelier. Une décision, un endroit.
//
// NB : `monthly_plus` et `yearly_plus` ne sont PAS ici. Ce sont des
// abonnements récurrents, qui DOIVENT pouvoir redescendre quand l'argent
// s'arrête, exactement comme `monthly` et `yearly`.

export const LIFETIME_PLANS: ReadonlySet<string> = new Set(["beta", "lifetime"]);

/** Ce plan a-t-il été promis à vie ? */
export function isLifetimePlan(plan: string | null | undefined): boolean {
  return LIFETIME_PLANS.has(String(plan ?? "").trim().toLowerCase());
}
