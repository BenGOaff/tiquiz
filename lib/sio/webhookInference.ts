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
 * Anciens bons de commande Tiquiz — IDs numériques uniques.
 * Conservés pour rétrocompat ; les nouveaux bons (depuis 2 juin 2026
 * après-midi) partagent tous le même offer-price-id, donc on bascule
 * sur le matching par URL.
 */
export const OFFER_TO_PLAN: Record<string, TiquizPlan> = {
  // Mensuel 9€/mois
  "offer-price-3198235": "monthly",
  "3198235": "monthly",
  // Annuel 90€/an
  "offer-price-3198261": "yearly",
  "3198261": "yearly",
  // Lifetime 57€ (terminé)
  "offer-price-3198280": "lifetime",
  "3198280": "lifetime",
};

/**
 * URL canoniques des bons de commande Tipote.fr (Béné 2 juin 2026).
 * Source de vérité pour le routage des nouveaux paliers (mensuel+ /
 * annuel+) dont les offer-price-id sont ambigus.
 *
 * Format normalisé (via normalizeFunnelUrl) : `<host>/<path>` sans
 * protocole, sans www., sans trailing slash, sans query string, lowercase.
 */
export const URL_TO_PLAN: Record<string, TiquizPlan> = {
  "tipote.fr/tiquiz-gratuit": "free",
  "tipote.fr/tiquiz-mensuel": "monthly",
  "tipote.fr/tiquiz-annuel": "yearly",
  "tipote.fr/tiquiz-mensuel-plus": "monthly_plus",
  "tipote.fr/tiquiz-annuel-plus": "yearly_plus",
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
