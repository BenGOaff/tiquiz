// lib/businessEvents.ts (Tiquiz)
//
// Helper unique d'INSERT dans business_events. Port adapté de Tipote :
// pas de project_id, pas de amount_cents/currency (Tiquiz ne tracke pas
// le CA créateur). Cf. CLAUDE_PITFALLS.md "Foundation business_events".
//
// INSERT direct via service-role (les users n'ont pas de policy INSERT).
// PAS de RPC (les RPC await-sans-lire-error masquent les échecs — bug
// historique sur les compteurs quiz Tiquiz, cf. track route).

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";

export type BusinessEventKind =
  | "lead_captured"
  | "quiz_view"
  | "quiz_start"
  | "quiz_complete"
  | "quiz_share"
  | "quiz_published"
  | "popquiz_published"
  | "milestone_unlocked";

export type BusinessEventSource = "internal" | "systemeio" | "manual";

export interface LogBusinessEventInput {
  userId: string;
  kind: BusinessEventKind;
  payload?: Record<string, unknown>;
  source?: BusinessEventSource;
  occurredAt?: string | Date | null;
  dedupeKey?: string | null;
}

export interface LogBusinessEventResult {
  ok: boolean;
  eventId?: number;
  reason?: "inserted" | "dedupe_skip" | "missing_user" | "db_error";
  error?: string;
}

const PG_UNIQUE_VIOLATION = "23505";

export async function logBusinessEvent(
  input: LogBusinessEventInput,
  client: SupabaseClient = supabaseAdmin,
): Promise<LogBusinessEventResult> {
  if (!input.userId) {
    return { ok: false, reason: "missing_user" };
  }

  const occurredAtIso =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString()
      : (input.occurredAt ?? null);

  // Multiprofils Tiquiz phase 3a : taguer le projet actif. Helper
  // ne jette JAMAIS — si rien à résoudre on insère project_id=NULL
  // (colonne nullable depuis 20260603).
  const projectId = await resolveProjectIdForInsert(input.userId);

  const row = {
    user_id: input.userId,
    project_id: projectId,
    kind: input.kind,
    payload: input.payload ?? {},
    source: input.source ?? "internal",
    dedupe_key: input.dedupeKey ?? null,
    occurred_at: occurredAtIso ?? new Date().toISOString(),
  };

  const { data, error } = await client
    .from("business_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return { ok: true, reason: "dedupe_skip" };
    }
    console.error("[businessEvents] insert failed", {
      kind: input.kind,
      source: input.source,
      error: error.message,
    });
    return { ok: false, reason: "db_error", error: error.message };
  }

  // Post-hook milestones (dynamic import pour casser la circular dep).
  void import("@/lib/milestones/engine")
    .then(({ evaluateMilestonesForUser }) =>
      evaluateMilestonesForUser({ userId: input.userId, eventKind: input.kind }),
    )
    .catch((err) => {
      console.error("[businessEvents] evaluate milestones failed", err);
    });

  return { ok: true, eventId: data?.id, reason: "inserted" };
}

// ----------------------------------------------------------------------------
// Lecture / agrégation
// ----------------------------------------------------------------------------

export async function countUserEvents(
  userId: string,
  kind: BusinessEventKind,
  opts: { since?: Date; until?: Date; client?: SupabaseClient } = {},
): Promise<number> {
  if (!userId) return 0;
  const client = opts.client ?? supabaseAdmin;
  let query = client
    .from("business_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind);

  if (opts.since) query = query.gte("occurred_at", opts.since.toISOString());
  if (opts.until) query = query.lt("occurred_at", opts.until.toISOString());

  const { count, error } = await query;
  if (error) {
    console.error("[businessEvents] countUserEvents failed", error.message);
    return 0;
  }
  return count ?? 0;
}

// ----------------------------------------------------------------------------
// Builders de dedupe keys
// ----------------------------------------------------------------------------

function hashEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    h = (h * 31 + normalized.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export const dedupeKeys = {
  quizLead: (quizId: string, email: string) =>
    `quiz_lead:${quizId}:${hashEmail(email)}`,
  quizComplete: (quizId: string, sessionId: string) =>
    `quiz_complete:${quizId}:${sessionId}`,
  quizShare: (quizId: string, key: string) => `quiz_share:${quizId}:${key}`,
};
