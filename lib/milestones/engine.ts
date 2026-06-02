// lib/milestones/engine.ts (Tiquiz)
//
// Engine d'évaluation des milestones. Port adapté de Tipote : pas
// d'email (Tiquiz n'a pas de mailer), pas de project_id. Le milestone
// débloqué est juste inséré dans user_milestones ; le toast est montré
// client-side par <MilestoneToastListener /> au prochain mount du
// dashboard (qui lit /api/milestones/unseen).
//
// Lit la VRAIE historique via countOutcomes (pas business_events seul).

import type { BusinessEventKind } from "@/lib/businessEvents";
import { countOutcomes } from "@/lib/businessOutcomes";
import { milestonesForKind } from "@/lib/milestones/catalog";
import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface EvaluateMilestonesArgs {
  userId: string;
  eventKind: BusinessEventKind;
  /**
   * Project ID SCOPE pour le milestone (multiprofils phase 3b).
   * Quand fourni : les compteurs sont mesurés UNIQUEMENT sur ce projet
   * (ex. "premier lead" se redéclenche par projet) et le user_milestones
   * inséré est lié à ce projet.
   * Quand absent : fallback resolveProjectIdForInsert (projet actif via
   * cookie ou projet par défaut).
   */
  projectId?: string | null;
}

export async function evaluateMilestonesForUser(
  args: EvaluateMilestonesArgs,
): Promise<{ unlocked: string[]; ok: boolean }> {
  const candidates = milestonesForKind(args.eventKind);
  if (candidates.length === 0) {
    return { unlocked: [], ok: true };
  }

  // Résoudre le projet d'évaluation : explicit > cookie/default.
  const projectId =
    args.projectId !== undefined
      ? args.projectId
      : await resolveProjectIdForInsert(args.userId);

  const candidateKeys = candidates.map((c) => c.key);
  // Existing milestones scopés au projet : "premier lead" peut se
  // redéclencher dans le projet B même s'il a été débloqué dans le A.
  let existingQuery = supabaseAdmin
    .from("user_milestones")
    .select("milestone_key")
    .eq("user_id", args.userId)
    .in("milestone_key", candidateKeys);
  if (projectId) existingQuery = existingQuery.eq("project_id", projectId);

  const { data: existing, error: existingErr } = await existingQuery;

  if (existingErr) {
    console.error("[milestones] read existing failed", existingErr.message);
    return { unlocked: [], ok: false };
  }
  const existingKeys = new Set(
    (existing ?? []).map((r) => r.milestone_key as string),
  );

  const toEvaluate = candidates.filter((c) => !existingKeys.has(c.key));
  if (toEvaluate.length === 0) {
    return { unlocked: [], ok: true };
  }

  // Compteur scopé au projet pour que "10 leads" se compte projet par
  // projet (cf. countOutcomes opts.projectId).
  const totalCount = await countOutcomes(args.userId, args.eventKind, {
    projectId: projectId ?? null,
  });

  const unlocked: string[] = [];
  for (const milestone of toEvaluate) {
    if (totalCount < milestone.trigger.threshold) {
      break; // triés ASC → les suivants sont aussi hors de portée
    }
    const { error: insErr } = await supabaseAdmin
      .from("user_milestones")
      .insert({
        user_id: args.userId,
        project_id: projectId,
        milestone_key: milestone.key,
        payload: {
          count: totalCount,
          emoji: milestone.emoji,
          title: milestone.title,
        },
      });
    if (insErr) {
      if (insErr.code === "23505") continue; // débloqué en concurrent
      console.error("[milestones] unlock insert failed", milestone.key, insErr.message);
      continue;
    }
    unlocked.push(milestone.key);
  }

  return { unlocked, ok: true };
}
