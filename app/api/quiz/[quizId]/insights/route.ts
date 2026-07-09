// app/api/quiz/[quizId]/insights/route.ts (Tiquiz)
//
// Analyse IA STRATÉGIQUE d'un quiz ou sondage (funnel, capture, profils,
// axes d'amelioration, actions ventes/captures). Distincte de
// survey-analysis (qui detaille les reponses). Gatee par PLAN
// (canUseAIAnalysis). Mises a jour gratuites (Tiquiz sans credits).
//
//   GET  -> analyse existante + flags (eligible, hasEnough, seuils).
//   POST -> genere/regenere si eligible + assez d'activite.

import { NextRequest, NextResponse } from "next/server";

import { canUseAIAnalysis, shouldShowPlusUpsell, PRICING_PLUS } from "@/lib/planLimits";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  aggregateQuizInsights,
  generateQuizInsights,
  INSIGHTS_MIN_LEADS,
  INSIGHTS_MIN_VIEWS,
} from "@/lib/quiz/insights";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function loadOwned(quizId: string, userId: string) {
  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("id, user_id, title, mode, ai_insights, ai_insights_at")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || quiz.user_id !== userId) return null;
  return quiz;
}

async function planContext(userId: string, email: string | null) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (profile as { plan?: string | null } | null)?.plan ?? null;
  return {
    eligible: canUseAIAnalysis(plan, { userId, email }),
    showUpsell: shouldShowPlusUpsell(plan),
  };
}

/** Assez d'activite pour analyser : au moins X leads OU Y vues. */
function hasEnough(a: { metrics: { leads: number; views: number } }): boolean {
  return a.metrics.leads >= INSIGHTS_MIN_LEADS || a.metrics.views >= INSIGHTS_MIN_VIEWS;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const quiz = await loadOwned(quizId, user.id);
  if (!quiz) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const aggregate = await aggregateQuizInsights(quizId, user.id);
  const ctxPlan = await planContext(user.id, user.email ?? null);

  return NextResponse.json({
    ok: true,
    analysis: quiz.ai_insights ?? null,
    analysisAt: quiz.ai_insights_at ?? null,
    mode: aggregate?.mode ?? "quiz",
    metrics: aggregate?.metrics ?? null,
    hasEnough: aggregate ? hasEnough(aggregate) : false,
    minLeads: INSIGHTS_MIN_LEADS,
    minViews: INSIGHTS_MIN_VIEWS,
    eligible: ctxPlan.eligible,
    showUpsell: ctxPlan.showUpsell,
  });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const quiz = await loadOwned(quizId, user.id);
  if (!quiz) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ctxPlan = await planContext(user.id, user.email ?? null);
  if (!ctxPlan.eligible) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_REQUIRED",
        message: `L'analyse IA de tes statistiques est reservee aux plans ${PRICING_PLUS.monthlyPlus.label} (${PRICING_PLUS.monthlyPlus.price}) et ${PRICING_PLUS.yearlyPlus.label} (${PRICING_PLUS.yearlyPlus.price}).`,
      },
      { status: 403 },
    );
  }

  const aggregate = await aggregateQuizInsights(quizId, user.id);
  if (!aggregate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (!hasEnough(aggregate)) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOT_ENOUGH_DATA",
        message: `Pas assez d'activite pour une analyse fiable. Reviens quand tu auras au moins ${INSIGHTS_MIN_LEADS} leads ou ${INSIGHTS_MIN_VIEWS} vues.`,
        metrics: aggregate.metrics,
      },
      { status: 422 },
    );
  }

  let analysis;
  try {
    analysis = await generateQuizInsights(aggregate);
  } catch (err) {
    console.error("[quiz/insights] generation failed", err);
    return NextResponse.json(
      { ok: false, error: "generation_failed", message: "L'analyse a echoue. Reessaie dans un instant." },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin
    .from("quizzes")
    .update({ ai_insights: analysis, ai_insights_at: nowIso })
    .eq("id", quizId);
  if (upErr) console.error("[quiz/insights] persist failed", upErr.message);

  return NextResponse.json({ ok: true, analysis, analysisAt: nowIso });
}
