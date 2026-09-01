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
import { echapperMotifLike } from "@/lib/db/motifLike";

type RouteContext = { params: Promise<{ quizId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveQuizId(slugOrId: string): Promise<string | null> {
  const needle = slugOrId.trim();
  if (!needle) return null;
  if (UUID_RE.test(needle)) {
    const { data } = await supabaseAdmin.from("quizzes").select("id").eq("id", needle).maybeSingle();
    if (data?.id) return data.id as string;
  }
  const { data } = await supabaseAdmin.from("quizzes").select("id").ilike("slug", echapperMotifLike(needle)).maybeSingle();
  return (data?.id as string) ?? null;
}

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

  // Agrégation DANS la base (RPCs) — plus de lecture ligne par ligne
  // plafonnée à 1000. survey_answer_totals reproduit la même logique
  // (multi-select +1 par option cochée, sinon single +1) sur tout le
  // volume ; survey_response_count = nb de répondants (answers array).
  const [totalsRes, countRes] = await Promise.all([
    supabaseAdmin.rpc("survey_answer_totals", { p_quiz_id: quizId }),
    supabaseAdmin.rpc("survey_response_count", { p_quiz_id: quizId }),
  ]);
  if (totalsRes.error) {
    return NextResponse.json({ ok: false, error: "LOAD_FAILED" }, { status: 500 });
  }

  // Structure VIVANTE du sondage : c'est elle qui borne l'agrégat. Sans
  // ce filtre, une question ou une option supprimée continue d'être
  // comptée dans les totaux (elle n'a plus de libellé côté visiteur,
  // donc elle gonfle silencieusement le dénominateur et les % ne font
  // plus 100). Même règle que le funnel, cf. lib/quiz/funnel.ts.
  const { data: liveQuestions } = await supabaseAdmin
    .from("quiz_questions")
    .select("options, sort_order")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const optionCounts = ((liveQuestions ?? []) as { options?: unknown[] | null }[]).map(
    (q) => (Array.isArray(q.options) ? q.options.length : 0),
  );

  // totals[questionIdx][optionIdx] = count
  const totals: Record<number, Record<number, number>> = {};
  for (const r of (totalsRes.data ?? []) as { question_index: number; option_index: number; n: number }[]) {
    const qi = r.question_index;
    // Liste vide (lecture impossible) : on ne filtre rien plutôt que de
    // renvoyer un agrégat vide au visiteur.
    if (optionCounts.length > 0) {
      const liveOptions = optionCounts[qi];
      if (liveOptions === undefined) continue; // question supprimée depuis
      if (r.option_index >= liveOptions) continue; // option supprimée depuis
    }
    if (!totals[qi]) totals[qi] = {};
    totals[qi][r.option_index] = Number(r.n) || 0;
  }
  const totalResponses = Number(countRes.data ?? 0) || 0;

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
