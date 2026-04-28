// app/api/quiz/[quizId]/track/route.ts
// Lightweight funnel event tracking (no auth).
//
// Each call writes a timestamped row in quiz_events AND bumps the
// matching cumulative counter on quizzes — both inside the same
// log_quiz_event RPC so the two never drift. Older API code that
// only used increment_quiz_counter still works (the counter is the
// same column), but new code paths reading from quiz_events get
// proper time-series data for the stats page.
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

    // Only forward known event types — anything else is a noop so we
    // don't pollute the events log with typos from older clients.
    if (event === "start" || event === "complete") {
      await supabaseAdmin.rpc("log_quiz_event", { quiz_id_input: quizId, event_type_input: event });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail user experience
    return NextResponse.json({ ok: true });
  }
}
