// lib/spotlight.ts
// Chantier E : detection des caps "mise en avant" + creation du candidat
// + brouillon d'etude de cas. Server-only. Idempotent (unique user+milestone).
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateCaseStudyDraft } from "@/lib/generate/caseStudy";
import type { TiquizMetrics } from "@/lib/types";

export interface SpotlightMilestone {
  code: string;
  label: string;
  reached: (m: TiquizMetrics) => boolean;
}

// Caps dignes d'une mise en avant (de la vraie traction, pas un coup).
export const SPOTLIGHT_MILESTONES: SpotlightMilestone[] = [
  { code: "leads_10", label: "10 leads captés", reached: (m) => (m.leads ?? 0) >= 10 },
  { code: "leads_50", label: "50 leads captés", reached: (m) => (m.leads ?? 0) >= 50 },
];

export interface NewSpotlight {
  userId: string;
  milestone: string;
  label: string;
}

/**
 * Detecte le cap nouvellement franchi pour un eleve. On ne celebre QUE le
 * palier le plus eleve atteint : les paliers inferieurs deja depasses sont
 * enregistres en silence (status 'superseded') pour ne pas les redeclencher
 * ni polluer l'admin. Renvoie le(s) nouveau(x) candidat(s) a celebrer.
 */
export async function checkSpotlights(
  userId: string,
  metrics: TiquizMetrics | null,
): Promise<NewSpotlight[]> {
  if (!metrics) return [];

  // SPOTLIGHT_MILESTONES est ordonne du plus bas au plus haut.
  const reached = SPOTLIGHT_MILESTONES.filter((ms) => ms.reached(metrics));
  if (reached.length === 0) return [];
  const highest = reached[reached.length - 1];

  const { data: existing } = await supabaseAdmin
    .from("spotlights")
    .select("milestone")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => r.milestone as string));

  const created: NewSpotlight[] = [];
  for (const ms of reached) {
    if (have.has(ms.code)) continue;

    if (ms.code === highest.code) {
      // Le palier le plus haut : on celebre (brouillon + candidat).
      const draft = await generateCaseStudyDraft(userId, metrics);
      const { error } = await supabaseAdmin.from("spotlights").insert({
        user_id: userId,
        milestone: ms.code,
        status: "candidate",
        draft,
        metrics,
      });
      if (!error) created.push({ userId, milestone: ms.code, label: ms.label });
    } else {
      // Palier inferieur deja depasse : enregistre en silence, pas de fete.
      await supabaseAdmin.from("spotlights").insert({
        user_id: userId,
        milestone: ms.code,
        status: "superseded",
        metrics,
      });
    }
  }
  return created;
}
