// app/api/leads/route.ts
// GET: list all leads across all user's quizzes
// POST: force sync a lead to Systeme.io

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all quiz IDs owned by user
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, title")
      .eq("user_id", user.id);

    if (!quizzes || quizzes.length === 0) {
      return NextResponse.json({ ok: true, leads: [], quizzes: [] });
    }

    const quizIds = quizzes.map((q: { id: string }) => q.id);

    // Get all leads for those quizzes
    const { data: leads, error } = await supabase
      .from("quiz_leads")
      .select("*, quiz_results(title, sio_tag_name)")
      .in("quiz_id", quizIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enrich leads with quiz title
    const quizMap = Object.fromEntries(quizzes.map((q: { id: string; title: string }) => [q.id, q.title]));
    const enriched = (leads ?? []).map((lead: Record<string, unknown>) => ({
      ...lead,
      quiz_title: quizMap[lead.quiz_id as string] ?? "—",
    }));

    return NextResponse.json({ ok: true, leads: enriched, quizzes });
  } catch (err) {
    console.error("[Leads API]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
