// app/api/quiz/[quizId]/survey-analysis/route.ts (Tiquiz)
//
// Analyse IA des résultats d'un sondage. Tiquiz n'a PAS de crédits →
// gatée par PLAN (canUseSurveyAI — option payante d'un plan plus cher,
// cf. lib/planLimits). Min 5 réponses.
//
//   GET  → renvoie l'analyse existante + flags (eligible, hasEnough).
//   POST → génère/régénère (si éligible + assez de réponses).

import { NextRequest, NextResponse } from "next/server";

import {
  canUseSurveyAI,
  shouldShowPlusUpsell,
  PRICING_PLUS,
} from "@/lib/planLimits";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  aggregateSurvey,
  generateSurveyAnalysis,
  SURVEY_AI_MIN_RESPONSES,
} from "@/lib/survey/analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function loadOwnedSurvey(quizId: string, userId: string) {
  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("id, user_id, title, mode, survey_ai_analysis, survey_ai_analysis_at")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || quiz.user_id !== userId) return null;
  return quiz;
}

async function resolvePlanContext(userId: string, email: string | null) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (profile as { plan?: string | null } | null)?.plan ?? null;
  return {
    eligible: canUseSurveyAI(plan, { userId, email }),
    // True pour monthly/yearly → UI affiche un upsell vers mensuel+/annuel+
    // au lieu du simple "Bientôt disponible".
    showUpsell: shouldShowPlusUpsell(plan),
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const quiz = await loadOwnedSurvey(quizId, user.id);
  if (!quiz) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const aggregate = await aggregateSurvey(quizId, user.id);
  const totalResponses = aggregate?.totalResponses ?? 0;
  const planCtx = await resolvePlanContext(user.id, user.email ?? null);

  return NextResponse.json({
    ok: true,
    analysis: quiz.survey_ai_analysis ?? null,
    analysisAt: quiz.survey_ai_analysis_at ?? null,
    totalResponses,
    minResponses: SURVEY_AI_MIN_RESPONSES,
    hasEnough: totalResponses >= SURVEY_AI_MIN_RESPONSES,
    eligible: planCtx.eligible,
    showUpsell: planCtx.showUpsell,
  });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const quiz = await loadOwnedSurvey(quizId, user.id);
  if (!quiz) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Gate par plan (feature premium : mensuel+ / annuel+).
  const planCtx = await resolvePlanContext(user.id, user.email ?? null);
  if (!planCtx.eligible) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_REQUIRED",
        message: `L'analyse IA des résultats est réservée aux plans ${PRICING_PLUS.monthlyPlus.label} (${PRICING_PLUS.monthlyPlus.price}) et ${PRICING_PLUS.yearlyPlus.label} (${PRICING_PLUS.yearlyPlus.price}).`,
      },
      { status: 403 },
    );
  }

  const aggregate = await aggregateSurvey(quizId, user.id);
  if (!aggregate) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (aggregate.totalResponses < SURVEY_AI_MIN_RESPONSES) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOT_ENOUGH_RESPONSES",
        message: "Il n'y a pas assez de réponses pour une analyse pertinente.",
        totalResponses: aggregate.totalResponses,
        minResponses: SURVEY_AI_MIN_RESPONSES,
      },
      { status: 422 },
    );
  }

  let analysis;
  try {
    analysis = await generateSurveyAnalysis(aggregate, String(quiz.title ?? "Sondage"));
  } catch (err) {
    console.error("[survey-analysis] generation failed", err);
    return NextResponse.json(
      { ok: false, error: "generation_failed", message: "L'analyse a échoué. Réessaie dans un instant." },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabaseAdmin
    .from("quizzes")
    .update({ survey_ai_analysis: analysis, survey_ai_analysis_at: nowIso })
    .eq("id", quizId);
  if (updateErr) {
    console.error("[survey-analysis] persist failed", updateErr.message);
  }

  return NextResponse.json({ ok: true, analysis, analysisAt: nowIso });
}
