// lib/wallOfWins/stats.ts (Tiquiz)
//
// Agrégateur Wall of Wins Tiquiz (port adapté de Tipote, sans CA/sales,
// sans project_id). Lit business_events sur une fenêtre + comparaison
// vs période précédente.
//
// RÈGLE CARDINALE (Béné) : si tous les compteurs sont à 0, hasResults
// = false → le composant rend NULL (carte invisible). "Motivant ou rien".

import { countUserEvents } from "@/lib/businessEvents";
import { stripHtml } from "@/lib/richText";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface WallOfWinsStats {
  leadsCaptured: number;
  quizViews: number;
  quizCompletes: number;
  quizShares: number;
  topQuiz: { id: string; title: string; completes: number } | null;
  milestonesUnlocked: Array<{ key: string; emoji: string; title: string; unlockedAt: string }>;
}

export interface WallOfWinsPayload {
  hasResults: boolean;
  current: WallOfWinsStats;
  previous: WallOfWinsStats;
  range: { since: string; until: string };
}

export type WallOfWinsPeriod = "month" | "30d" | "90d";

export function resolveWindowForPeriod(
  period: WallOfWinsPeriod,
  now: Date = new Date(),
): { since: Date; until: Date } {
  const until = new Date(now.getTime());
  if (period === "month") {
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { since, until };
  }
  if (period === "30d") {
    return { since: new Date(now.getTime() - 30 * 864e5), until };
  }
  return { since: new Date(now.getTime() - 90 * 864e5), until };
}

export async function getWallOfWinsPayload(args: {
  userId: string;
  since: Date;
  until: Date;
}): Promise<WallOfWinsPayload> {
  const { userId, since, until } = args;
  const durationMs = until.getTime() - since.getTime();
  const previousUntil = since;
  const previousSince = new Date(since.getTime() - durationMs);

  const [current, previous] = await Promise.all([
    computeStatsForRange(userId, since, until),
    computeStatsForRange(userId, previousSince, previousUntil),
  ]);

  const hasResults =
    current.leadsCaptured > 0 ||
    current.quizViews > 0 ||
    current.quizCompletes > 0 ||
    current.quizShares > 0 ||
    current.milestonesUnlocked.length > 0;

  return {
    hasResults,
    current,
    previous,
    range: { since: since.toISOString(), until: until.toISOString() },
  };
}

async function computeStatsForRange(
  userId: string,
  since: Date,
  until: Date,
): Promise<WallOfWinsStats> {
  const opts = { since, until };
  const [leadsCaptured, quizViews, quizCompletes, quizShares, topQuiz, milestonesUnlocked] =
    await Promise.all([
      countUserEvents(userId, "lead_captured", opts),
      countUserEvents(userId, "quiz_view", opts),
      countUserEvents(userId, "quiz_complete", opts),
      countUserEvents(userId, "quiz_share", opts),
      fetchTopQuizInRange(userId, since, until),
      fetchMilestonesUnlockedInRange(userId, since, until),
    ]);

  return {
    leadsCaptured,
    quizViews,
    quizCompletes,
    quizShares,
    topQuiz,
    milestonesUnlocked,
  };
}

async function fetchTopQuizInRange(
  userId: string,
  since: Date,
  until: Date,
): Promise<WallOfWinsStats["topQuiz"]> {
  // Top quiz agrégé DANS la base (RPC), sans plafond (avant : cap 5000 →
  // au-delà, des complétions étaient silencieusement ignorées du calcul).
  const { data, error } = await supabaseAdmin.rpc("wall_top_quiz_completes", {
    p_user_id: userId,
    p_since: since.toISOString(),
    p_until: until.toISOString(),
  });
  if (error) return null;
  const top = ((data ?? []) as Array<{ quiz_id: string; completes: number; quiz_title: string | null }>)[0];
  if (!top || !top.quiz_id) return null;

  const topId = top.quiz_id;
  const topCount = Number(top.completes) || 0;

  let title = top.quiz_title ?? "";
  if (!title) {
    const { data: quizRow } = await supabaseAdmin
      .from("quizzes")
      .select("title")
      .eq("id", topId)
      .maybeSingle();
    title = (quizRow?.title as string | undefined) ?? "Quiz sans titre";
  }
  // Strip HTML cote serveur : les titres quiz sont du rich-text editor
  // (peuvent contenir <span style=...>), on les rend en texte plat ici
  // pour eviter les fuites HTML dans le payload (Adeline 4 juin 2026 :
  // "<div style=text-align:center>..." affiche tel quel sur mobile).
  return { id: topId, title: stripHtml(title) || title, completes: topCount };
}

async function fetchMilestonesUnlockedInRange(
  userId: string,
  since: Date,
  until: Date,
): Promise<WallOfWinsStats["milestonesUnlocked"]> {
  const { data, error } = await supabaseAdmin
    .from("user_milestones")
    .select("milestone_key, payload, unlocked_at")
    .eq("user_id", userId)
    .gte("unlocked_at", since.toISOString())
    .lt("unlocked_at", until.toISOString())
    .order("unlocked_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return ((data ?? []) as Array<{
    milestone_key: string;
    payload: { emoji?: string; title?: string; backfilled?: boolean } | null;
    unlocked_at: string;
  }>)
    .filter((row) => !row.payload?.backfilled)
    .map((row) => ({
      key: row.milestone_key,
      emoji: row.payload?.emoji ?? "🎉",
      title: row.payload?.title ?? row.milestone_key,
      unlockedAt: row.unlocked_at,
    }));
}
