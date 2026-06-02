// lib/businessOutcomes.ts (Tiquiz)
//
// Compteurs "vérité historique" pour les milestones (port adapté de
// Tipote). Lit les tables source historiques, PAS business_events seul
// (créée 2026-06-04) — un user Tiquiz avec 500 leads ne doit pas voir
// "first_lead" se débloquer. Cf. CLAUDE_PITFALLS "Foundation".
//
// Tables source Tiquiz :
//   - lead_captured   → quiz_leads via JOIN quizzes.user_id
//   - quiz_complete   → quiz_events event_type='complete' via JOIN
//   - quiz_share      → quiz_events event_type='share' via JOIN
//   - quiz_view       → quiz_events event_type='view' via JOIN
//   - quiz_published  → quizzes status='active' (mode='quiz')
//   - popquiz_published → popquizzes status='active' si la table existe
//
// MULTIPROFILS (phase 3b, juin 2026) : opts.projectId permet de
// SCOPER les compteurs au projet actif. Effet "nouveau projet =
// compte neuf" — "premier lead", "10 leads" se redéclenchent par
// projet. Quand opts.projectId est absent ou null → comptage global
// (comportement historique préservé).

import { countUserEvents, type BusinessEventKind } from "@/lib/businessEvents";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface CountOutcomesOpts {
  /** Project scope. null/undefined = comptage global (legacy). */
  projectId?: string | null;
}

export async function countOutcomes(
  userId: string,
  kind: BusinessEventKind,
  opts: CountOutcomesOpts = {},
): Promise<number> {
  switch (kind) {
    case "lead_captured":
      return countLeadsForUser(userId, opts);
    case "quiz_complete":
      return countQuizEventsForUser(userId, "complete", opts);
    case "quiz_share":
      return countQuizEventsForUser(userId, "share", opts);
    case "quiz_view":
      return countQuizEventsForUser(userId, "view", opts);
    case "quiz_published":
      return countPublishedQuizzesForUser(userId, opts);
    case "popquiz_published":
      return countPublishedPopquizzesForUser(userId, opts);
    default:
      return countUserEvents(userId, kind);
  }
}

async function userQuizIds(
  userId: string,
  opts: CountOutcomesOpts,
): Promise<string[]> {
  let q = supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("user_id", userId);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);

  const { data, error } = await q;
  if (error) {
    console.error("[outcomes] quizzes select failed", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.id as string);
}

async function countLeadsForUser(
  userId: string,
  opts: CountOutcomesOpts,
): Promise<number> {
  const quizIds = await userQuizIds(userId, opts);
  if (quizIds.length === 0) return 0;
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < quizIds.length; i += CHUNK) {
    const slice = quizIds.slice(i, i + CHUNK);
    const { count, error } = await supabaseAdmin
      .from("quiz_leads")
      .select("id", { count: "exact", head: true })
      .in("quiz_id", slice);
    if (error) {
      console.error("[outcomes] quiz_leads count failed", error.message);
      return total;
    }
    total += count ?? 0;
  }
  return total;
}

async function countQuizEventsForUser(
  userId: string,
  eventType: "view" | "start" | "complete" | "share",
  opts: CountOutcomesOpts,
): Promise<number> {
  const quizIds = await userQuizIds(userId, opts);
  if (quizIds.length === 0) return 0;
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < quizIds.length; i += CHUNK) {
    const slice = quizIds.slice(i, i + CHUNK);
    const { count, error } = await supabaseAdmin
      .from("quiz_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", eventType)
      .in("quiz_id", slice);
    if (error) {
      console.error("[outcomes] quiz_events count failed", error.message);
      return total;
    }
    total += count ?? 0;
  }
  return total;
}

async function countPublishedQuizzesForUser(
  userId: string,
  opts: CountOutcomesOpts,
): Promise<number> {
  let q = supabaseAdmin
    .from("quizzes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if (opts.projectId) q = q.eq("project_id", opts.projectId);

  const { count, error } = await q;
  if (error) {
    console.error("[outcomes] quizzes published count failed", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countPublishedPopquizzesForUser(
  userId: string,
  opts: CountOutcomesOpts,
): Promise<number> {
  // popquizzes peut ne pas exister sur tous les déploiements — on tente,
  // et en cas d'erreur (table absente) on retourne 0 silencieusement.
  let q = supabaseAdmin
    .from("popquizzes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if (opts.projectId) q = q.eq("project_id", opts.projectId);

  const { count, error } = await q;
  if (error) {
    return 0;
  }
  return count ?? 0;
}
