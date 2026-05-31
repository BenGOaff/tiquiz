// app/api/quiz/[quizId]/aggregate-responses/route.ts
//
// Public GET endpoint qui retourne, par question, le nombre de
// participants ayant choisi chaque option. Réservé au mode sondage
// (`quizzes.mode = 'survey'`) ET gaté par `show_aggregate_responses`
// — l'auteur doit explicitement activer l'option dans les paramètres
// du sondage. Sinon 403.
//
// Source de vérité : `quiz_leads.answers` (JSONB). Chaque ligne est
// un participant ; `answers` est un array d'objets
// `{ question_index, option_index?, option_indices?, rating?, stars?, text? }`.
// On agrège les choix discrets (`option_index` + `option_indices` pour
// multi-select). Les questions free_text / rating / stars n'ont pas de
// pourcentage par option côté visiteur, on ne renvoie rien pour elles
// (le client peut ignorer ces indexes).
//
// Cache : 60s edge SWR. Les sondages bougent lentement côté agrégat
// (pas besoin de temps réel par lead), et un visiteur qui rafraîchit
// ne peut pas tirer plus vite que le SWR.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ quizId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveQuizId(slugOrId: string): Promise<string | null> {
  const needle = slugOrId.trim();
  if (!needle) return null;
  if (UUID_RE.test(needle)) {
    const { data } = await supabaseAdmin.from("quizzes").select("id").eq("id", needle).maybeSingle();
    if (data?.id) return data.id as string;
  }
  const { data } = await supabaseAdmin.from("quizzes").select("id").ilike("slug", needle).maybeSingle();
  return (data?.id as string) ?? null;
}

type SurveyAnswer = {
  question_index?: number;
  option_index?: number;
  option_indices?: number[];
};

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { quizId: rawQuizId } = await ctx.params;
  const quizId = await resolveQuizId(rawQuizId);
  if (!quizId) {
    return NextResponse.json({ ok: false, error: "QUIZ_NOT_FOUND" }, { status: 404 });
  }

  const { data: quiz, error: quizErr } = await supabaseAdmin
    .from("quizzes")
    .select("id, mode, show_aggregate_responses")
    .eq("id", quizId)
    .maybeSingle();

  if (quizErr || !quiz) {
    return NextResponse.json({ ok: false, error: "QUIZ_NOT_FOUND" }, { status: 404 });
  }

  if ((quiz as { mode?: string | null }).mode !== "survey") {
    return NextResponse.json({ ok: false, error: "NOT_SURVEY" }, { status: 400 });
  }

  if ((quiz as { show_aggregate_responses?: boolean | null }).show_aggregate_responses !== true) {
    return NextResponse.json({ ok: false, error: "AGGREGATE_DISABLED" }, { status: 403 });
  }

  // On lit le minimum nécessaire — uniquement la colonne answers.
  const { data: leads, error: leadsErr } = await supabaseAdmin
    .from("quiz_leads")
    .select("answers")
    .eq("quiz_id", quizId);

  if (leadsErr) {
    return NextResponse.json({ ok: false, error: "LOAD_FAILED" }, { status: 500 });
  }

  // totals[questionIdx][optionIdx] = count
  const totals: Record<number, Record<number, number>> = {};
  let totalResponses = 0;

  for (const lead of leads ?? []) {
    const answers = (lead as { answers?: SurveyAnswer[] | null }).answers;
    if (!Array.isArray(answers)) continue;
    totalResponses += 1;
    for (const ans of answers) {
      const qi = typeof ans.question_index === "number" ? ans.question_index : null;
      if (qi === null) continue;
      if (!totals[qi]) totals[qi] = {};
      // Multi-select : on incrémente une fois par option cochée.
      if (Array.isArray(ans.option_indices)) {
        for (const oi of ans.option_indices) {
          if (typeof oi === "number") {
            totals[qi][oi] = (totals[qi][oi] ?? 0) + 1;
          }
        }
      } else if (typeof ans.option_index === "number") {
        totals[qi][ans.option_index] = (totals[qi][ans.option_index] ?? 0) + 1;
      }
      // free_text / rating / stars : pas d'option discrète, on ne les agrège
      // pas ici (le client peut afficher autre chose ou simplement skip).
    }
  }

  return NextResponse.json(
    { ok: true, totals, total_responses: totalResponses },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
        "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    },
  );
}
