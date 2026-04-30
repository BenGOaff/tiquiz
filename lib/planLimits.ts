// lib/planLimits.ts
// Central source of truth for plan-based feature limits in Tiquiz.
// Aligned with the Tipote `lib/planLimits.ts` API surface so shared logic
// (e.g. `lib/leadLock.ts`) can be ported across repos with zero friction.

export type PlanId = "free" | "lifetime" | "monthly" | "yearly" | "beta";

export function normalizePlanId(raw: string | null | undefined): PlanId {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "lifetime" || s === "monthly" || s === "yearly" || s === "beta") return s;
  return "free";
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
 * Free-tier ceilings. Captures keep coming when the cap is hit; only the
 * UI-visible portion is gated (see `lib/leadLock.ts` for the lock logic
 * and `app/api/quiz/route.ts` for the creation gate).
 */
export const FREE_LIMITS = {
  /** Max active items per mode — i.e. up to 1 quiz AND 1 sondage allowed */
  maxQuizzesPerMode: 1,
  /** Visible leads per rolling 30-day window — captures keep happening, the rest blur */
  visibleLeadsPerMonth: 10,
} as const;

