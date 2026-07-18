// lib/affiliateTracking.ts
// Coeur serveur du suivi affilié de l'Atelier du Quiz. Calqué sur
// lib/affiliate/attribution.ts de Tipote, adapté : taux PAR PRODUIT
// (Quizing 70% / Tiquiz 40%) au lieu de paliers, et registre des affiliés
// = profiles.sio_affiliate_id (pas de table affiliates séparée ici).
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ATTRIBUTION_WINDOW_DAYS = 90;

// Taux par produit. Miroir de la config Systeme.io (source de vérité du
// PAIEMENT) : si Béné change le % côté SIO, changer ici aussi, sinon les
// gains affichés dans l'app divergent des paiements réels. Les commissions
// déjà en base gardent leur taux d'origine (commission_rate stocké par
// ligne), seules les ventes futures utilisent le nouveau taux.
// Historique Quizing : 100% au lancement, 70% depuis juillet 2026.
const QUIZING_RATE = 0.7;
const TIQUIZ_RATE = 0.4;

// Format Systeme.io : "sa" + 20-80 caractères hex.
export const SA_RE = /^sa[a-f0-9]{20,80}$/i;

type ProductMatch = { source_app: "quizing" | "tiquiz"; rate: number };

/** Normalise un offer/price id Systeme.io vers son coeur (ex.
 *  "offerprice-b3fe4b38" / "offer-price-b3fe4b38" / "b3fe4b38" -> "b3fe4b38"). */
function normalizeOfferId(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/offer[-_\s]?price[-_\s]?/g, "")
    .replace(/price[-_\s]?plan[-_\s]?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Offer price ids fournis par Béné depuis les bons de commande Systeme.io.
// Source de détection FIABLE (le nom de produit ou l'URL peuvent manquer dans
// le payload de vente). Tous les plans Tiquiz partagent le MÊME offer id
// (le tunnel utilise un id unique) : pas besoin de les distinguer ici, ils
// sont tous à 40%.
const QUIZING_OFFER_IDS = new Set(["b3fe4b38"].map(normalizeOfferId));
const TIQUIZ_OFFER_IDS = new Set(["dc9c3e75"].map(normalizeOfferId));

/** Extrait l'offer/price id depuis les chemins Systeme.io courants. */
export function extractOfferId(body: unknown): string | null {
  const paths = [
    "pricePlan.id",
    "data.pricePlan.id",
    "order.pricePlan.id",
    "offer_price_plan.id",
    "data.offer_price_plan.id",
    "offer_price.id",
    "data.offer_price.id",
    "offerPrice.id",
    "order.offer_price.id",
    "offer.id",
    "data.offer.id",
    "price_plan_id",
    "offer_price_id",
  ];
  for (const p of paths) {
    const v = pick(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

// Chemins où trouver l'URL du bon de commande / tunnel (mirror Tiquiz).
const FUNNEL_URL_PATHS = [
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
  "page_url",
  "data.page_url",
  "contact.source_url",
  "referrer",
];

export function extractFunnelUrl(body: unknown): string | null {
  for (const p of FUNNEL_URL_PATHS) {
    const v = pick(body, p);
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normUrl(u: string | null): string {
  return String(u ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/**
 * Détecte le produit ET l'éligibilité à commission, à partir de l'URL du
 * tunnel (source de vérité). RÈGLE BÉNÉ (27 juin 2026) : seuls les tunnels
 * AFFILIÉS donnent une commission, jamais les tunnels perso.
 *   Quizing : /atelier-du-quiz = affilié ; /atelier-du-quiz-bene = perso.
 *   Tiquiz  : tout BDC contenant "part" = affilié ; sans "part" = perso.
 * L'offer id (partagé entre les deux tunnels) ne sert que de filet si l'URL
 * manque (l'éligibilité repose alors sur la présence d'un sa : un achat perso
 * de Béné n'a pas de sa affilié).
 */
export function detectProduct(
  funnelUrl: string | null,
  offerId: string | null,
  ...texts: Array<unknown>
): ProductMatch | null {
  const url = normUrl(funnelUrl);

  // 1. Décision par URL de tunnel.
  if (url) {
    if (url.includes("atelier-du-quiz")) {
      // Tunnel perso de Béné -> AUCUNE commission.
      if (url.includes("atelier-du-quiz-bene")) return null;
      return { source_app: "quizing", rate: QUIZING_RATE };
    }
    if (url.includes("tiquiz")) {
      // Affilié uniquement si le BDC contient "part".
      return url.includes("part") ? { source_app: "tiquiz", rate: TIQUIZ_RATE } : null;
    }
  }

  // 2. Filet offer id (URL absente). Éligibilité garantie par le gate sa.
  if (offerId) {
    const norm = normalizeOfferId(offerId);
    if (QUIZING_OFFER_IDS.has(norm)) return { source_app: "quizing", rate: QUIZING_RATE };
    if (TIQUIZ_OFFER_IDS.has(norm)) return { source_app: "tiquiz", rate: TIQUIZ_RATE };
  }

  // 3. Filet texte (mêmes exclusions perso).
  const hay = texts
    .filter((t) => typeof t === "string")
    .join(" ")
    .toLowerCase();
  if (hay) {
    if (hay.includes("atelier-du-quiz") && !hay.includes("atelier-du-quiz-bene")) {
      return { source_app: "quizing", rate: QUIZING_RATE };
    }
    if (hay.includes("tiquiz") && hay.includes("part")) {
      return { source_app: "tiquiz", rate: TIQUIZ_RATE };
    }
  }
  return null;
}

/** Extrait un sa valide depuis une string brute, une URL, ou un "?sa=". */
export function extractSaFromString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (SA_RE.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const sa = url.searchParams.get("sa");
    if (sa && SA_RE.test(sa)) return sa;
  } catch {
    /* fall through */
  }
  const m = trimmed.match(/[?&]sa=([^&\s]+)/i);
  if (m && m[1]) {
    const decoded = decodeURIComponent(m[1]);
    if (SA_RE.test(decoded)) return decoded;
  }
  return null;
}

/** Lit en profondeur une valeur via un chemin "a.b.c", sans any. */
function pick(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Cherche un sa dans les chemins courants d'un payload Systeme.io. */
export function extractSaFromPayload(body: unknown): string | null {
  const paths = [
    "sa",
    "data.sa",
    "contact.fields.sa",
    "data.contact.fields.sa",
    "fields.sa",
    "contact.source_url",
    "data.contact.source_url",
    "source_url",
    "data.source_url",
    "contact.opt_in_url",
    "contact.referrer",
    "referrer",
    "page_url",
    "data.page_url",
    "order.source_url",
    "checkout_url",
  ];
  for (const p of paths) {
    const sa = extractSaFromString(pick(body, p));
    if (sa) return sa;
  }
  return null;
}

export function extractEmail(body: unknown): string | null {
  const paths = [
    "email",
    "contact.email",
    "data.email",
    "data.contact.email",
    "customer.email",
    "data.customer.email",
    "fields.email",
    "data.fields.email",
  ];
  for (const p of paths) {
    const c = pick(body, p);
    if (typeof c === "string" && c.includes("@")) return c.trim().toLowerCase();
  }
  return null;
}

export function extractOrderId(body: unknown): string | null {
  const paths = ["order.id", "data.order.id", "order_id", "orderId", "data.order_id", "id", "data.id"];
  for (const p of paths) {
    const c = pick(body, p);
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return null;
}

/** Montant de la vente en centimes. Systeme.io envoie des euros décimaux. */
export function extractAmountCents(body: unknown): number {
  const paths = ["order.total", "data.order.total", "amount", "total", "price", "order.amount", "data.amount", "data.total"];
  for (const p of paths) {
    const c = pick(body, p);
    const n = typeof c === "number" ? c : typeof c === "string" ? Number(c.replace(",", ".")) : NaN;
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
  }
  return 0;
}

export function extractProductName(body: unknown): string | null {
  const paths = [
    "product_name",
    "order.product_name",
    "data.order.product_name",
    "product.name",
    "data.product.name",
    "offer.name",
    "order.name",
  ];
  for (const p of paths) {
    const c = pick(body, p);
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 300);
  }
  return null;
}

export interface AffiliateCommissionRow {
  id: string;
  source_app: "quizing" | "tiquiz";
  product_name: string | null;
  sale_amount_cents: number;
  commission_cents: number;
  status: string;
  sale_at: string;
}

export interface AffiliateGains {
  totalCents: number;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  quizingCents: number;
  tiquizCents: number;
  salesCount: number;
  recent: AffiliateCommissionRow[];
}

/**
 * Agrège les commissions réelles d'un affilié (par son sa). Lecture serveur
 * (service role) : le dashboard appelle ça avec le sa stocké sur le profil.
 */
export async function getAffiliateGains(sa: string): Promise<AffiliateGains> {
  const empty: AffiliateGains = {
    totalCents: 0,
    pendingCents: 0,
    approvedCents: 0,
    paidCents: 0,
    quizingCents: 0,
    tiquizCents: 0,
    salesCount: 0,
    recent: [],
  };
  if (!sa || !SA_RE.test(sa)) return empty;

  const { data } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("id, source_app, product_name, sale_amount_cents, commission_cents, status, sale_at")
    .eq("sa", sa)
    .order("sale_at", { ascending: false })
    .limit(500);

  const rows = (data as AffiliateCommissionRow[] | null) ?? [];
  const g = { ...empty, recent: rows.slice(0, 25) };
  for (const r of rows) {
    // Les commissions annulées / rejetées ne comptent pas dans les gains.
    if (r.status === "cancelled" || r.status === "rejected") continue;
    g.salesCount += 1;
    g.totalCents += r.commission_cents;
    if (r.status === "pending") g.pendingCents += r.commission_cents;
    else if (r.status === "approved") g.approvedCents += r.commission_cents;
    else if (r.status === "paid") g.paidCents += r.commission_cents;
    if (r.source_app === "quizing") g.quizingCents += r.commission_cents;
    else if (r.source_app === "tiquiz") g.tiquizCents += r.commission_cents;
  }
  return g;
}

async function findRecentConversion(email: string): Promise<{ id: string; sa: string } | null> {
  const since = new Date(Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("affiliate_conversions")
    .select("id, sa")
    .eq("email", email.toLowerCase())
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; sa: string } | null) ?? null;
}

export type AttributeResult =
  | { status: "attributed"; sa: string; commission_cents: number }
  | { status: "not_our_product" }
  | { status: "no_affiliate_match" }
  | { status: "affiliate_not_registered"; sa: string }
  | { status: "duplicate" }
  | { status: "error"; error: string };

/**
 * Attribue une vente Systeme.io à un affilié Quizing et crée la commission.
 * - sa : pris dans le payload, sinon via la conversion récente de l'email.
 * - registre : le sa doit appartenir à un élève ayant activé l'affiliation
 *   (profiles.sio_affiliate_id). Sinon on n'attribue pas.
 * - anti-auto-affiliation : on refuse si l'acheteur est l'affilié lui-même.
 */
export async function attributeQuizingSale(input: {
  email: string;
  sio_order_id: string;
  sale_amount_cents: number;
  product: ProductMatch;
  product_name?: string | null;
  sa_hint?: string | null;
  sale_at?: Date;
  raw_payload?: unknown;
}): Promise<AttributeResult> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!email) return { status: "no_affiliate_match" };

    let sa = input.sa_hint && SA_RE.test(input.sa_hint) ? input.sa_hint : null;
    let conversionId: string | null = null;
    if (!sa) {
      const conv = await findRecentConversion(email);
      if (!conv) return { status: "no_affiliate_match" };
      sa = conv.sa;
      conversionId = conv.id;
    }

    // Registre Quizing : le sa doit correspondre à un affilié activé.
    const { data: affProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("sio_affiliate_id", sa)
      .maybeSingle();
    const aff = affProfile as { id: string; email: string | null } | null;
    if (!aff) return { status: "affiliate_not_registered", sa };

    // Anti-auto-affiliation.
    if ((aff.email ?? "").toLowerCase() === email) {
      return { status: "no_affiliate_match" };
    }

    const commissionCents = Math.round(input.sale_amount_cents * input.product.rate);

    const { error } = await supabaseAdmin.from("affiliate_commissions").insert({
      sa,
      sio_order_id: input.sio_order_id,
      source_app: input.product.source_app,
      customer_email: email,
      conversion_id: conversionId,
      product_name: input.product_name ?? null,
      sale_amount_cents: input.sale_amount_cents,
      commission_rate: input.product.rate,
      commission_cents: commissionCents,
      currency: "EUR",
      status: "pending",
      sale_at: (input.sale_at ?? new Date()).toISOString(),
      raw_payload: input.raw_payload ?? null,
    });

    if (error) {
      if (error.code === "23505") return { status: "duplicate" };
      return { status: "error", error: error.message };
    }
    return { status: "attributed", sa, commission_cents: commissionCents };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}
