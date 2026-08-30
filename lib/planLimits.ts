// lib/planLimits.ts
// Central source of truth for plan-based feature limits in Tiquiz.
// Aligned with the Tipote `lib/planLimits.ts` API surface so shared logic
// (e.g. `lib/leadLock.ts`) can be ported across repos with zero friction.

import { OWNER_CATALOG, type OwnerProductId } from "@/lib/checkout/catalog";

export type PlanId =
  | "free"
  | "lifetime"
  | "monthly"
  | "yearly"
  | "monthly_plus"
  | "yearly_plus"
  | "beta";

export function normalizePlanId(raw: string | null | undefined): PlanId {
  const s = (raw ?? "").trim().toLowerCase();
  if (
    s === "lifetime" ||
    s === "monthly" ||
    s === "yearly" ||
    s === "monthly_plus" ||
    s === "yearly_plus" ||
    s === "beta"
  ) {
    return s;
  }
  return "free";
}

/**
 * Plans qui ont accès aux features premium Tiquiz (multiprofils +
 * analyse IA des sondages). Béné 2 juin 2026 :
 *   - "beta"          → accès accordé manuellement (test interne, partenaires)
 *   - "lifetime"      → early adopters 57€ (Béné : "lifetime = beta", récompense)
 *   - "monthly_plus"  → nouveau palier « + » (commande Systeme.io à créer)
 *   - "yearly_plus"   → idem en annuel
 */
export function isPremiumPlan(plan: string | null | undefined): boolean {
  const s = (plan ?? "").trim().toLowerCase();
  return (
    s === "beta" ||
    s === "lifetime" ||
    s === "monthly_plus" ||
    s === "yearly_plus"
  );
}

/**
 * True si l'user a un plan payant qui doit VOIR les features premium
 * mais ne peut PAS y accéder (= cible des CTA upsell vers « + »).
 * Concrètement : monthly, yearly (sans suffixe « + »).
 *
 * Les free ne voient rien (statu quo, Béné : "free ne bouge pas").
 * Les beta / lifetime / monthly_plus / yearly_plus ne voient pas non
 * plus l'upsell (ils ont déjà l'accès).
 */
export function shouldShowPlusUpsell(plan: string | null | undefined): boolean {
  const s = (plan ?? "").trim().toLowerCase();
  return s === "monthly" || s === "yearly";
}

/**
 * True if the user is on any paying tier. PERMISSIVE BY DESIGN: anything
 * that isn't explicitly "free" (or empty/null) is treated as paid. This
 * way, if a new plan tier ships in the DB before this file is updated,
 * paying creators don't get locked out by accident.
 *
 * The `free` sentinel is the only value that triggers the lock, so creators
 * on a beta-style or one-off plan slug stay fully unblocked.
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const s = (plan ?? "").trim().toLowerCase();
  if (s === "" || s === "free") return false;
  return true;
}

/**
 * Analyse IA des résultats — feature PREMIUM Tiquiz couvrant
 * SONDAGES et QUIZ (Béné 2 juin 2026, après-midi : "Analyse IA c'est
 * pour les sondages ET les quiz").
 *
 * Accès via :
 *   - plans premium = beta, lifetime, monthly_plus, yearly_plus
 *     (cf. isPremiumPlan)
 *   - allowlist env TIQUIZ_SURVEY_AI_ALLOWLIST (IDs/emails séparés par
 *     virgule) pour tests ciblés sans toucher au code.
 *
 * Les plans free/monthly/yearly VOIENT la feature dans l'UI mais ne
 * peuvent pas l'utiliser (CTA upgrade vers monthly_plus/yearly_plus).
 * Cf. shouldShowPlusUpsell.
 */
export function canUseAIAnalysis(
  plan: string | null | undefined,
  opts?: { userId?: string | null; email?: string | null },
): boolean {
  if (isPremiumPlan(plan)) return true;

  const allowlist = (process.env.TIQUIZ_SURVEY_AI_ALLOWLIST ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0) {
    const uid = (opts?.userId ?? "").trim().toLowerCase();
    const mail = (opts?.email ?? "").trim().toLowerCase();
    if ((uid && allowlist.includes(uid)) || (mail && allowlist.includes(mail))) {
      return true;
    }
  }
  return false;
}

/**
 * @deprecated Renommé en canUseAIAnalysis (l'analyse IA couvre maintenant
 * quiz ET sondages, plus seulement les sondages). Alias conservé pour
 * compat des call-sites qui n'auraient pas encore été mis à jour.
 */
export const canUseSurveyAI = canUseAIAnalysis;

/**
 * Multiprofils — feature PREMIUM Tiquiz (Béné juin 2026).
 *
 * Accès via :
 *   - plans premium = beta, lifetime, monthly_plus, yearly_plus
 *     (cf. isPremiumPlan)
 *   - allowlist env TIQUIZ_MULTIPROJECTS_ALLOWLIST pour tests ciblés.
 *
 * Les plans monthly/yearly VOIENT le ProjectSwitcher mais ne peuvent
 * pas créer de nouveaux projets (CTA upgrade vers monthly_plus/yearly_plus).
 * Cf. shouldShowPlusUpsell.
 *
 * Cf. ROADMAP_RETENTION "Multiprofils Tiquiz — DESIGN" et le pitfall
 * en tête de CLAUDE_PITFALLS.md.
 */
export function canUseMultiProjects(
  plan: string | null | undefined,
  opts?: { userId?: string | null; email?: string | null },
): boolean {
  if (isPremiumPlan(plan)) return true;

  const allowlist = (process.env.TIQUIZ_MULTIPROJECTS_ALLOWLIST ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0) {
    const uid = (opts?.userId ?? "").trim().toLowerCase();
    const mail = (opts?.email ?? "").trim().toLowerCase();
    if ((uid && allowlist.includes(uid)) || (mail && allowlist.includes(mail))) {
      return true;
    }
  }
  return false;
}

/**
 * Free-tier ceilings. Captures keep coming when the cap is hit; only the
 * UI-visible portion is gated (see `lib/leadLock.ts` for the lock logic
 * and `app/api/quiz/route.ts` for the creation gate).
 */
export const FREE_LIMITS = {
  /** Max active items per mode — i.e. up to 1 quiz AND 1 sondage allowed */
  maxQuizzesPerMode: 1,
  /** Max popquizzes (vidéo + cuepoints) — même politique que les quiz */
  maxPopquizzes: 1,
  /** Visible leads per rolling 30-day window — captures keep happening, the rest blur */
  visibleLeadsPerMonth: 10,
} as const;

/**
 * Limite du nombre de clés Systeme.io connectées par USER (Béné 2 juin 2026
 * — correction du 2/06 après-midi : "Yearly normal : une seule clé api
 * systeme io aussi").
 *
 * Renvoie true si le plan permet PLUSIEURS clés API SIO.
 *   - free, monthly, yearly → false (= 1 clé max, refus à la 2e via
 *     POST /api/sio-api-keys)
 *   - lifetime, beta, monthly_plus, yearly_plus → true (premium tout débloqué)
 *
 * Le multi-clés reste l'apanage des plans PREMIUM (+) — pour les
 * funnel-builders qui gèrent plusieurs workspaces Systeme.io (un par
 * client, par exemple).
 */
export function canConnectMultipleSioKeys(plan: string | null | undefined): boolean {
  const s = (plan ?? "").trim().toLowerCase();
  return isPremiumPlan(s);
}

/**
 * Prix publics des paliers PLUS, utilisés dans les messages d'upsell
 * (403 de /api/projects, /api/sio-api-keys, analyses IA, dialogues).
 *
 * -- CE COMMENTAIRE DISAIT "SOURCE DE VÉRITÉ UNIQUE", ET C'ÉTAIT FAUX --
 *
 * Les prix y étaient ÉCRITS EN DUR ("29€/mois", "290€/an") alors que
 * `OWNER_CATALOG` (lib/checkout/catalog.ts) les porte déjà : c'est lui
 * qui fait payer, et c'est lui qu'affiche le bon de commande. Deux
 * tables de prix, donc deux prix le jour où l'un des deux bouge, et
 * c'est celui des messages d'erreur qui serait resté en arrière sans
 * que personne ne le voie (trouvé à l'audit du 30 août 2026).
 *
 * Ils sont maintenant DÉRIVÉS du catalogue. Il n'y a plus qu'une table.
 *
 * Au passage : "mensuel+" devient "mensuel PLUS", la convention de
 * marque de Béné, et l'espace avant € est insécable.
 */
function prixPublic(id: OwnerProductId, rythme: string): string {
  const p = OWNER_CATALOG[id];
  // Sans décimales quand le prix est rond : "29 €/mois" et pas
  // "29,00 €/mois", qui alourdit un message d'erreur.
  const montant = p.amountCents % 100 === 0 ? String(p.amountCents / 100) : (p.amountCents / 100).toFixed(2).replace(".", ",");
  return `${montant}\u00a0€/${rythme}`;
}

export const PRICING_PLUS = {
  monthlyPlus: {
    label: OWNER_CATALOG["mensuel-plus"].label.replace(/\bPlus\b/, "PLUS"),
    price: prixPublic("mensuel-plus", "mois"),
  },
  yearlyPlus: {
    label: OWNER_CATALOG["annuel-plus"].label.replace(/\bPlus\b/, "PLUS"),
    price: prixPublic("annuel-plus", "an"),
  },
} as const;

/** Texte standard pour les messages d'upsell vers les plans + */
export function plusUpsellText(): string {
  return `Passe en ${PRICING_PLUS.monthlyPlus.label} (${PRICING_PLUS.monthlyPlus.price}) ou ${PRICING_PLUS.yearlyPlus.label} (${PRICING_PLUS.yearlyPlus.price}) pour débloquer.`;
}

