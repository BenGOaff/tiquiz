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
 * Analyse IA des sondages — option PAYANTE d'un plan plus cher (Béné,
 * juin 2026). Le plan premium dédié n'existe PAS ENCORE (pricing en
 * pause). En attendant :
 *   - on autorise le plan "beta" (accès accordé manuellement) pour que
 *     Béné puisse tester la feature en prod ;
 *   - on autorise aussi une allowlist d'IDs/emails via env
 *     TIQUIZ_SURVEY_AI_ALLOWLIST (séparés par virgule) pour des tests
 *     ciblés sans toucher au code.
 *
 * ⚠️ QUAND LE PLAN PREMIUM SORTIRA : ajouter son slug ici (ex.
 * `s === "pro"`). NE PAS ouvrir à isPaidPlan() — ce serait offrir la
 * feature à tous les lifetime/monthly/yearly actuels, ce qui n'est PAS
 * l'intention (c'est un palier au-dessus).
 */
export function canUseSurveyAI(
  plan: string | null | undefined,
  opts?: { userId?: string | null; email?: string | null },
): boolean {
  const s = (plan ?? "").trim().toLowerCase();
  if (s === "beta") return true;

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
 * Multiprofils — option PAYANTE d'un plan supérieur (Béné, juin 2026).
 * Même palier que canUseSurveyAI : le plan premium n'existe pas encore
 * (pricing en pause). En attendant : plan "beta" + allowlist env
 * `TIQUIZ_MULTIPROJECTS_ALLOWLIST` pour tester.
 *
 * ⚠️ QUAND LE PLAN PREMIUM SORTIRA : ajouter son slug ici. NE PAS
 * ouvrir à isPaidPlan() — c'est un palier au-dessus.
 *
 * Cf. ROADMAP_RETENTION "Multiprofils Tiquiz — DESIGN" et le pitfall
 * en tête de CLAUDE_PITFALLS.md.
 */
export function canUseMultiProjects(
  plan: string | null | undefined,
  opts?: { userId?: string | null; email?: string | null },
): boolean {
  const s = (plan ?? "").trim().toLowerCase();
  if (s === "beta") return true;

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

