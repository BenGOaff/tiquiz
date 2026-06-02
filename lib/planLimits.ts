// lib/planLimits.ts
// Central source of truth for plan-based feature limits in Tiquiz.
// Aligned with the Tipote `lib/planLimits.ts` API surface so shared logic
// (e.g. `lib/leadLock.ts`) can be ported across repos with zero friction.

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
 * Analyse IA des sondages — feature PREMIUM Tiquiz (Béné juin 2026).
 *
 * Accès via :
 *   - plans premium = beta, lifetime, monthly_plus, yearly_plus
 *     (cf. isPremiumPlan)
 *   - allowlist env TIQUIZ_SURVEY_AI_ALLOWLIST (IDs/emails séparés par
 *     virgule) pour tests ciblés sans toucher au code.
 *
 * Les plans monthly/yearly VOIENT la feature dans l'UI mais ne peuvent
 * pas l'utiliser (CTA upgrade vers monthly_plus/yearly_plus). Cf.
 * shouldShowPlusUpsell.
 */
export function canUseSurveyAI(
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

