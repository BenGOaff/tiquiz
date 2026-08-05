// app/api/insights/global/route.ts (Tiquiz)
//
// Analyse IA STRATÉGIQUE GLOBALE : compte-rendu de pilotage sur TOUS les
// quiz/sondages du user. Gatee par PLAN (canUseAIAnalysis). Persistee
// dans user_insight_reports (un rapport par user, mis a jour a la demande).
//
//   GET  -> rapport existant + flags (eligible, hasEnough, totals).
//   POST -> genere/regenere si eligible + assez d'activite globale.

import { NextRequest, NextResponse } from "next/server";

import { canUseAIAnalysis, shouldShowPlusUpsell, PRICING_PLUS } from "@/lib/planLimits";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { recordAiReport } from "@/lib/insights/history";
import {
  aggregateGlobalInsights,
  generateGlobalInsights,
  GLOBAL_MIN_LEADS,
} from "@/lib/insights/global";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

async function loadReport(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_insight_reports")
    .select("report, generated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const [report, aggregate, ctxPlan] = await Promise.all([
    loadReport(user.id),
    aggregateGlobalInsights(user.id),
    planContext(user.id, user.email ?? null),
  ]);

  const totalLeads = aggregate?.totals.leads ?? 0;
  return NextResponse.json({
    ok: true,
    analysis: (report as { report?: unknown } | null)?.report ?? null,
    analysisAt: (report as { generated_at?: string } | null)?.generated_at ?? null,
    totals: aggregate?.totals ?? null,
    hasEnough: totalLeads >= GLOBAL_MIN_LEADS,
    minLeads: GLOBAL_MIN_LEADS,
    eligible: ctxPlan.eligible,
    showUpsell: ctxPlan.showUpsell,
  });
}

export async function POST(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctxPlan = await planContext(user.id, user.email ?? null);
  if (!ctxPlan.eligible) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_REQUIRED",
        message: `L'analyse IA strategique est reservee aux plans ${PRICING_PLUS.monthlyPlus.label} (${PRICING_PLUS.monthlyPlus.price}) et ${PRICING_PLUS.yearlyPlus.label} (${PRICING_PLUS.yearlyPlus.price}).`,
      },
      { status: 403 },
    );
  }

  const aggregate = await aggregateGlobalInsights(user.id);
  if (!aggregate) {
    return NextResponse.json(
      { ok: false, error: "NO_PROJECTS", message: "Cree au moins un quiz ou un sondage pour lancer l'analyse." },
      { status: 422 },
    );
  }
  if (aggregate.totals.leads < GLOBAL_MIN_LEADS) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOT_ENOUGH_DATA",
        message: `Pas assez d'activite pour une analyse fiable. Reviens quand tu auras au moins ${GLOBAL_MIN_LEADS} leads au total.`,
        totals: aggregate.totals,
      },
      { status: 422 },
    );
  }

  let report;
  try {
    report = await generateGlobalInsights(aggregate);
  } catch (err) {
    console.error("[insights/global] generation failed", err);
    return NextResponse.json(
      { ok: false, error: "generation_failed", message: "L'analyse a echoue. Reessaie dans un instant." },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin.from("user_insight_reports").upsert(
    { user_id: user.id, report, generated_at: nowIso, updated_at: nowIso },
    { onConflict: "user_id" },
  );
  if (upErr) console.error("[insights/global] persist failed", upErr.message);

  // La table ci-dessus a `user_id` en cle primaire : elle ne garde que le
  // DERNIER rapport. On en archive une copie (cf. lib/insights/history.ts).
  await recordAiReport({
    userId: user.id,
    scope: "account",
    quizId: null,
    report,
    model: report.model,
    generatedAt: nowIso,
  });

  return NextResponse.json({ ok: true, analysis: report, analysisAt: nowIso });
}
