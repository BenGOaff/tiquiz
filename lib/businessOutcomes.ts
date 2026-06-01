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

import { countUserEvents, type BusinessEventKind } from "@/lib/businessEvents";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function countOutcomes(
  userId: string,
  kind: BusinessEventKind,
): Promise<number> {
  switch (kind) {
    case "lead_captured":
      return countLeadsForUser(userId);
    case "quiz_complete":
      return countQuizEventsForUser(userId, "complete");
    case "quiz_share":
      return countQuizEventsForUser(userId, "share");
    case "quiz_view":
      return countQuizEventsForUser(userId, "view");
    case "quiz_published":
      return countPublishedQuizzesForUser(userId);
    case "popquiz_published":
      return countPublishedPopquizzesForUser(userId);
    default:
      return countUserEvents(userId, kind);
  }
}

async function userQuizIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("user_id", userId);
  if (error) {
    console.error("[outcomes] quizzes select failed", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.id as string);
}

async function countLeadsForUser(userId: string): Promise<number> {
  const quizIds = await userQuizIds(userId);
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
): Promise<number> {
  const quizIds = await userQuizIds(userId);
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

async function countPublishedQuizzesForUser(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("quizzes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) {
    console.error("[outcomes] quizzes published count failed", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countPublishedPopquizzesForUser(userId: string): Promise<number> {
  // popquizzes peut ne pas exister sur tous les déploiements — on tente,
  // et en cas d'erreur (table absente) on retourne 0 silencieusement.
  const { count, error } = await supabaseAdmin
    .from("popquizzes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) {
    return 0;
  }
  return count ?? 0;
}
