// app/api/quiz/[quizId]/survey-results/route.ts (Tiquiz)
//
// GET ?format=json|csv — résultats d'un sondage pour son créateur.
// Owner-scoped. Port de la route Tipote (mono-user, pas de project_id).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aggregateSurvey, type SurveyAnswerRaw } from "@/lib/survey/analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeCsv(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  req: NextRequest,
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

  const format = (req.nextUrl.searchParams.get("format") ?? "json").toLowerCase();

  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("id, user_id, title")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || quiz.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (format === "json") {
    const aggregate = await aggregateSurvey(quizId, user.id);
    if (!aggregate) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, title: quiz.title, ...aggregate });
  }

  if (format === "csv") {
    const { data: questionsRaw } = await supabaseAdmin
      .from("quiz_questions")
      .select("question_text, options, sort_order")
      .eq("quiz_id", quizId)
      .order("sort_order", { ascending: true });
    const questions = (questionsRaw ?? []) as Array<{
      question_text: string | null;
      options: Array<{ text?: string }> | null;
      sort_order: number;
    }>;

    const { data: leads } = await supabaseAdmin
      .from("quiz_leads")
      .select("created_at, answers")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: true });

    const optionLabel = (qIdx: number, oIdx: number): string => {
      const q = questions.find((qq) => qq.sort_order === qIdx);
      const opt = Array.isArray(q?.options) ? q?.options[oIdx] : undefined;
      return String(opt?.text ?? `Option ${oIdx + 1}`);
    };

    const headers = ["Date", ...questions.map((q) => q.question_text ?? "Question")];
    const rows: string[][] = [];

    for (const lead of leads ?? []) {
      const answers = (lead as { answers?: SurveyAnswerRaw[] | null }).answers;
      const date = (lead as { created_at?: string }).created_at;
      const byQ: Record<number, string> = {};
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          const qi = typeof ans.question_index === "number" ? ans.question_index : null;
          if (qi === null) continue;
          if (Array.isArray(ans.option_indices)) {
            byQ[qi] = ans.option_indices.map((oi) => optionLabel(qi, oi)).join(" | ");
          } else if (typeof ans.option_index === "number") {
            byQ[qi] = optionLabel(qi, ans.option_index);
          } else if (typeof ans.rating === "number") {
            byQ[qi] = String(ans.rating);
          } else if (typeof ans.text === "string") {
            byQ[qi] = ans.text;
          }
        }
      }
      rows.push([
        date ? new Date(date).toLocaleDateString("fr-FR") : "",
        ...questions.map((q) => escapeCsv(byQ[q.sort_order] ?? "")),
      ]);
    }

    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "﻿";
    const safeTitle = String(quiz.title ?? "sondage").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);

    return new NextResponse(bom + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ ok: false, error: "bad_format" }, { status: 400 });
}
