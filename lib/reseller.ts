// lib/reseller.ts
//
// Helpers du modèle revendeur (option A, Béné 11 juin 2026).
//
// Un revendeur = un user Tiquiz normal qui possède une ligne dans
// `resellers` (créée par Béné via l'admin). Ses clients sont des comptes
// Tiquiz 100% standards tagués `profiles.reseller_id`.
//
// Règles de sécurité non négociables :
// - Toutes les requêtes des routes /api/reseller/* passent par le
//   service-role MAIS sont systématiquement scopées reseller_id : un
//   revendeur ne voit JAMAIS un compte hors de son portefeuille.
// - RGPD : le revendeur ne voit que des COMPTEURS (nb quiz, nb leads...),
//   jamais le contenu des quiz ni les leads de ses clients.

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ResellerRow {
  id: string;
  user_id: string;
  name: string;
  status: "active" | "suspended";
  commission_tiers: Array<{ max_active: number | null; rate: number }>;
  /** Config de paiement par plan payant (monthly, yearly, monthly_plus,
   * yearly_plus) :
   * - stripe : lien de paiement Stripe du revendeur (Payment Link)
   * - paypal : lien de paiement PayPal du revendeur
   * - sio    : URL de SON bon de commande Systeme.io (s'il préfère SIO)
   * Stripe/PayPal alimentent le bon de commande Tiquiz hébergé
   * (/order/<slug>/<plan>). Legacy : une string nue = stripe. */
  checkout_urls: Partial<
    Record<string, { stripe?: string; paypal?: string; sio?: string } | string>
  >;
  /** Secret du webhook entrant générique (provisioning auto). */
  webhook_token: string | null;
  /** Identifiant public des bons de commande hébergés (/order/<slug>/<plan>). */
  slug: string | null;
  /** Contact support du revendeur, affiché dans les emails d'accès de
   * ses clients (reply-to). NULL = template Supabase par défaut. */
  support_email: string | null;
  /** Tarifs du revendeur par plan.
   * - label : texte libre affiché sur le bon de commande hébergé
   *   (ex. "19 € / mois"). Affichage uniquement.
   * - amount_cents : prix déclaré en CENTIMES, base du calcul de la
   *   commission mensuelle (cron reseller-invoices). Plans annuels :
   *   prix de l'année, mensualisé par le cron (/12). */
  pricing: Partial<Record<string, { label?: string; amount_cents?: number }>>;
  created_at: string;
}

export interface ResellerSession {
  userId: string;
  email: string | null;
  reseller: ResellerRow;
}

/**
 * Retourne la session revendeur du user connecté, ou null si le user
 * n'est pas connecté / n'est pas revendeur / est suspendu.
 */
export async function getResellerSession(): Promise<ResellerSession | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseAdmin
    .from("resellers")
    .select(
      // NB : ne JAMAIS ajouter ici une colonne recente sans garantir la
      // migration. Si une colonne manque, ce SELECT plante et le user
      // n'est plus reconnu revendeur (drame /reseller -> dashboard).
      // Les colonnes recentes (handle, paiement...) sont lues separement.
      "id,user_id,name,status,commission_tiers,checkout_urls,webhook_token,slug,pricing,support_email,created_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[reseller] read reseller failed", error.message);
    return null;
  }
  const reseller = data as ResellerRow | null;
  if (!reseller || reseller.status !== "active") return null;

  return { userId: user.id, email: user.email ?? null, reseller };
}

/**
 * Journalise une action revendeur (service-role, best-effort : un échec
 * de log ne doit pas faire échouer l'action métier).
 */
export async function logResellerAction(args: {
  resellerId: string;
  /** null pour les actions automatiques (webhook, cron). */
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("reseller_actions").insert({
    reseller_id: args.resellerId,
    actor_user_id: args.actorUserId ?? null,
    target_user_id: args.targetUserId ?? null,
    target_email: args.targetEmail ?? null,
    action: args.action,
    meta: args.meta ?? {},
  });
  if (error) {
    console.error("[reseller] action log failed", args.action, error.message);
  }
}

/** Plans qu'un revendeur peut attribuer à ses clients. Lifetime exclu
 * (offre terminée, contrainte business) et beta réservé à Béné. */
export const RESELLER_ALLOWED_PLANS = [
  "free",
  "monthly",
  "yearly",
  "monthly_plus",
  "yearly_plus",
] as const;

export type ResellerAllowedPlan = (typeof RESELLER_ALLOWED_PLANS)[number];

export function isResellerAllowedPlan(plan: unknown): plan is ResellerAllowedPlan {
  return (
    typeof plan === "string" &&
    (RESELLER_ALLOWED_PLANS as readonly string[]).includes(plan)
  );
}

export interface PlanPayment {
  stripe?: string;
  paypal?: string;
  sio?: string;
}

/** Normalise une entrée checkout_urls (legacy string = lien stripe). */
export function normalizePlanPayment(
  value: { stripe?: string; paypal?: string; sio?: string } | string | undefined,
): PlanPayment {
  if (!value) return {};
  if (typeof value === "string") return { stripe: value };
  return value;
}

/** LICENCE (définition Béné 11 juin 2026) : un compte PAYANT, quel que
 * soit le plan (mensuel, annuel, plus ou normal). Un compte gratuit
 * n'est PAS une licence. Béné ne prend commission que sur les licences :
 * "je ne touche que s'il touche". */
export const PAID_PLANS = [
  "monthly",
  "yearly",
  "monthly_plus",
  "yearly_plus",
  "lifetime",
] as const;

export function isPaidPlan(plan: string | null | undefined): boolean {
  return Boolean(plan && (PAID_PLANS as readonly string[]).includes(plan));
}

/** Barème Béné (11 juin 2026), paliers sur le nombre de LICENCES :
 * 1 à 200 -> 40%, 201 à 1000 -> 35%, 1001 à 2000 -> 30%,
 * 2001 à 3000 -> 25%, 3001 et plus -> 20%.
 * Le palier s'applique en fonction du nombre de licences actives
 * (bornes incluses : 200 licences -> 40%, 201 -> 35%). */
export function commissionRateFor(
  licences: number,
  tiers: ResellerRow["commission_tiers"],
): number {
  const sorted = [...(tiers ?? [])].sort((a, b) => {
    if (a.max_active === null) return 1;
    if (b.max_active === null) return -1;
    return a.max_active - b.max_active;
  });
  for (const tier of sorted) {
    if (tier.max_active === null || licences <= tier.max_active) return tier.rate;
  }
  return sorted.length > 0 ? sorted[sorted.length - 1].rate : 0;
}
