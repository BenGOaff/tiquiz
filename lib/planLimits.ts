// lib/planLimits.ts
// Central source of truth for plan-based feature limits in Tiquiz.
// Aligned with the Tipote `lib/planLimits.ts` API surface so shared logic
// (e.g. `lib/leadLock.ts`) can be ported across repos with zero friction.

export type PlanId = "free" | "lifetime" | "monthly" | "yearly";

export function normalizePlanId(raw: string | null | undefined): PlanId {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "lifetime" || s === "monthly" || s === "yearly") return s;
  return "free";
}

/** True if the user is on any paying tier. Used to bypass all free-tier gates. */
export function isPaidPlan(plan: string | null | undefined): boolean {
  return normalizePlanId(plan) !== "free";
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
