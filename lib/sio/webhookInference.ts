// lib/sio/webhookInference.ts
//
// Logique pure d'inférence du plan Tiquiz à partir d'un payload SIO.
// Extraite du webhook pour permettre :
//   - les tests unitaires sans déclencher d'achat réel
//   - l'endpoint admin dry-run qui rejoue un payload sans écrire DB
//   - la cohérence : 1 seule source de vérité du routage plan
//
// AUCUNE dépendance Next.js / Supabase — module pur, importable depuis
// scripts/test-webhook-routing.mjs ET app/api/systeme-io/webhook/route.ts.

export type TiquizPlan =
  | "free"
  | "monthly"
  | "yearly"
  | "lifetime"
  | "beta"
  | "monthly_plus"
  | "yearly_plus";

/**
 * LES PLANS TARIFAIRES SYSTEME.IO, PAR LEUR ID NUMÉRIQUE.
 *
 * -- DEUX IDENTIFIANTS QU'ON A CONFONDUS PENDANT DEUX MOIS -------------
 *
 * Le 2 juin, on a noté que "tous les nouveaux bons de commande partagent
 * le même offer-price-id (`offerprice-dc9c3e75`)", et on a basculé le
 * routage sur l'URL pour contourner cette ambiguïté.
 *
 * C'était une confusion. `offerprice-dc9c3e75` est l'**id du bloc HTML**
 * de la page de commande (`<div id="offerprice-dc9c3e75">`), le même sur
 * tous les bons parce que c'est le même gabarit de page. Le webhook, lui,
 * n'envoie jamais ça : il envoie `pricePlan.id`, un entier UNIQUE par
 * plan tarifaire. Vérifié le 7 août 2026 sur le journal de production,
 * où la vente d'Ivan porte `3375217`.
 *
 * Conséquence : cette table n'est PAS un vestige, c'est la voie
 * principale. L'URL, elle, est absente des événements de vente (cf. le
 * bloc de la fin de fichier) : elle ne sert que sur les optins.
 */
export const OFFER_TO_PLAN: Record<string, TiquizPlan> = {
  // Mensuel, vendu 9€/mois À L'ÉPOQUE de ces bons. Le prix public est
  // passé à 17€/mois le 6 août 2026 : le montant ne sert PAS au routage
  // (on route sur l'id, puis sur l'URL du tunnel), donc ces commentaires
  // restent volontairement au prix historique. Les changer les rendrait
  // faux sans rien corriger.
  "offer-price-3198235": "monthly",
  "3198235": "monthly",
  // Annuel, vendu 90€/an à l'époque (170€/an depuis le 6 août 2026).
  "offer-price-3198261": "yearly",
  "3198261": "yearly",
  // Lifetime 57€ (terminé)
  "offer-price-3198280": "lifetime",
  "3198280": "lifetime",

  // ── LES PLANS DU NOUVEAU PRIX (drame Ivan, 7 août 2026) ────────────
  //
  // Ivan paie son mensuel, son compte reste en gratuit. Le journal de
  // production montre l'appel arrivé : `pricePlan.id = 3375217`, AUCUNE
  // URL de tunnel, réponse `unknown_offer:3375217`, accès refusé.
  //
  // Le bon de commande a gardé son URL, mais il vend depuis le 6 août un
  // NOUVEAU plan tarifaire ("NV tiquiz mensuel" à 17,00 €), dont l'id
  // était absent d'ici. Le refus est le bon comportement (on ne devine
  // jamais un plan payant), mais il laisse dehors un client qui a payé.
  //
  // Les deux paliers PLUS sont ajoutés dans la foulée : ils ne tenaient
  // QUE par leur URL depuis le 2 juin, donc ils étaient irroutables sur
  // une vente, exactement comme Ivan, sans que personne l'ait vu.
  //
  // **Changer un tarif dans Systeme.io crée un nouveau plan, donc un
  // nouvel id, donc une ligne à ajouter ici.** C'est une modification de
  // code déguisée en réglage.
  "offer-price-3375217": "monthly",
  "3375217": "monthly",
  "offer-price-3375221": "yearly",
  "3375221": "yearly",
  "offer-price-3278876": "monthly_plus",
  "3278876": "monthly_plus",
  "offer-price-3278878": "yearly_plus",
  "3278878": "yearly_plus",
};

/**
 * URL canoniques des tunnels Tipote.fr (Béné 2 juin 2026).
 *
 * ATTENTION À CE QUE CETTE TABLE PEUT ET NE PEUT PAS FAIRE. Un événement
 * de VENTE ne porte aucune URL (relevé le 7 août 2026) : elle ne sert
 * donc que sur les optins gratuits, où elle distingue le tunnel perso du
 * tunnel affilié. Au moment où l'argent rentre, seul l'id du plan
 * tranche.
 *
 * Format normalisé (via normalizeFunnelUrl) : `<host>/<path>` sans
 * protocole, sans www., sans trailing slash, sans query string, lowercase.
 */
export const URL_TO_PLAN: Record<string, TiquizPlan> = {
  // Tunnels PERSO de Béné (sans commission affiliée).
  "tipote.fr/tiquiz-gratuit": "free",
  "tipote.fr/tiquiz-mensuel": "monthly",
  "tipote.fr/tiquiz-annuel": "yearly",
  "tipote.fr/tiquiz-mensuel-plus": "monthly_plus",
  "tipote.fr/tiquiz-annuel-plus": "yearly_plus",
  // Tunnels AFFILIÉS (avec "part", commission affiliée). MÊME plan ouvert
  // que le tunnel perso. Sans ces entrées, une vente Tiquiz via lien affilié
  // ne routait sur aucun plan -> mauvais accès (drame Béné 27 juin 2026).
  "tipote.fr/part-tiquiz-gratuit": "free",
  "tipote.fr/part-tiquiz-mensuel": "monthly",
  "tipote.fr/part-tiquiz-annuel": "yearly",
  "tipote.fr/tiquiz-mensuel-plus-part": "monthly_plus",
  "tipote.fr/tiquiz-annuel-plus-part": "yearly_plus",
};

/**
 * Normalise une URL pour comparaison dans URL_TO_PLAN.
 * Strip protocole, www, query string, trailing slash, lowercase.
 */
export function normalizeFunnelUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

export function inferPlanFromUrl(url: string | null | undefined): TiquizPlan | null {
  const normalized = normalizeFunnelUrl(url);
  if (!normalized) return null;
  return URL_TO_PLAN[normalized] ?? null;
}

/**
 * Cherche le plan associé à un offer-price-id (legacy, anciens bons).
 * Tolérant aux variations de format (avec/sans préfixe, chiffres seuls).
 */
export function inferPlanFromOfferId(offerId: string | null | undefined): TiquizPlan | null {
  if (!offerId) return null;
  const id = String(offerId).trim().toLowerCase();
  if (id in OFFER_TO_PLAN) return OFFER_TO_PLAN[id]!;
  if (`offer-price-${id}` in OFFER_TO_PLAN) return OFFER_TO_PLAN[`offer-price-${id}`]!;
  const num = id.match(/(\d{5,})/);
  if (num) {
    if (num[1] in OFFER_TO_PLAN) return OFFER_TO_PLAN[num[1]!]!;
    if (`offer-price-${num[1]}` in OFFER_TO_PLAN) return OFFER_TO_PLAN[`offer-price-${num[1]}`]!;
  }
  return null;
}

/** Paths à essayer pour extraire l'URL du bon de commande depuis un payload SIO.
 *  Large par design — SIO change parfois la shape selon le type d'event. */
export const URL_PATHS = [
  "funnel.url",
  "data.funnel.url",
  "funnel_step.url",
  "data.funnel_step.url",
  "order.source_url",
  "data.order.source_url",
  "source_url",
  "data.source_url",
  "checkout_url",
  "data.checkout_url",
  "data.order.checkout_url",
  "order.funnel.url",
  "data.order.funnel.url",
  "order.funnel_step.url",
  "data.order.funnel_step.url",
] as const;

/** Paths à essayer pour l'offer-price-id (legacy). */
export const OFFER_ID_PATHS = [
  "pricePlan.id",
  "data.pricePlan.id",
  "data.offer_price_plan.id",
  "data.offer_price.id",
  "product_id",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepGet(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractStr(body: any, paths: readonly string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

export interface InferenceResult {
  plan: TiquizPlan | null;
  source: "url" | "offer" | "none";
  sourceUrl: string | null;
  normalizedUrl: string | null;
  offerId: string | null;
  planFromUrl: TiquizPlan | null;
  planFromOffer: TiquizPlan | null;
}

/**
 * Fonction MAÎTRESSE : prend un payload SIO brut, extrait URL + offerId,
 * tente l'inférence dans l'ordre (URL prioritaire, offer en fallback).
 * Retourne un objet riche pour diagnostic en logs et dry-run.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inferPlanFromPayload(rawBody: any): InferenceResult {
  const sourceUrl = extractStr(rawBody, URL_PATHS);
  const offerId = extractStr(rawBody, OFFER_ID_PATHS);
  const planFromUrl = inferPlanFromUrl(sourceUrl);
  const planFromOffer = inferPlanFromOfferId(offerId);
  const plan = planFromUrl ?? planFromOffer;
  return {
    plan,
    source: planFromUrl ? "url" : planFromOffer ? "offer" : "none",
    sourceUrl,
    normalizedUrl: normalizeFunnelUrl(sourceUrl),
    offerId,
    planFromUrl,
    planFromOffer,
  };
}
