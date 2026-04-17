// app/api/quiz/[quizId]/track/route.ts
// Lightweight funnel event tracking (no auth)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ quizId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveId(slugOrId: string): Promise<string | null> {
  if (UUID_RE.test(slugOrId)) return slugOrId;
  const { data } = await supabaseAdmin.from("quizzes").select("id").ilike("slug", slugOrId).maybeSingle();
  return (data?.id as string) ?? null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const { event } = await req.json();

    const quizId = await resolveId(slugOrId);
    if (!quizId) return NextResponse.json({ ok: true });

    if (event === "start") {
      await supabaseAdmin.rpc("increment_quiz_counter", { quiz_id_input: quizId, counter_name: "starts_count" });
    } else if (event === "complete") {
      await supabaseAdmin.rpc("increment_quiz_counter", { quiz_id_input: quizId, counter_name: "completions_count" });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail user experience
    return NextResponse.json({ ok: true });
  }
}
