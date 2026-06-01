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
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface EvaluateMilestonesArgs {
  userId: string;
  eventKind: BusinessEventKind;
}

export async function evaluateMilestonesForUser(
  args: EvaluateMilestonesArgs,
): Promise<{ unlocked: string[]; ok: boolean }> {
  const candidates = milestonesForKind(args.eventKind);
  if (candidates.length === 0) {
    return { unlocked: [], ok: true };
  }

  const candidateKeys = candidates.map((c) => c.key);
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("user_milestones")
    .select("milestone_key")
    .eq("user_id", args.userId)
    .in("milestone_key", candidateKeys);

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

  const totalCount = await countOutcomes(args.userId, args.eventKind);

  const unlocked: string[] = [];
  for (const milestone of toEvaluate) {
    if (totalCount < milestone.trigger.threshold) {
      break; // triés ASC → les suivants sont aussi hors de portée
    }
    const { error: insErr } = await supabaseAdmin
      .from("user_milestones")
      .insert({
        user_id: args.userId,
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
