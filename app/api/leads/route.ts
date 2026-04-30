// app/api/leads/route.ts
// GET: list all leads across all user's quizzes
// POST: force sync a lead to Systeme.io

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { lockAndRedact, type LeadLike } from "@/lib/leadLock";

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
      return NextResponse.json({ ok: true, leads: [], quizzes: [], plan: "free" });
    }

    const quizIds = quizzes.map((q: { id: string }) => q.id);

    // Get all leads for those quizzes
    const { data: leads, error } = await supabase
      .from("quiz_leads")
      .select("*, quiz_results(title, sio_tag_name)")
      .in("quiz_id", quizIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const plan = String((profileRow as { plan?: string | null } | null)?.plan ?? "free");

    // Enrich leads with quiz title, then apply free-tier lock + PII redaction
    // server-side. Locked leads come back with `••••` placeholders so the UI
    // can blur them visually without ever holding plaintext.
    const quizMap = Object.fromEntries(quizzes.map((q: { id: string; title: string }) => [q.id, q.title]));
    const enriched = (leads ?? []).map((lead: Record<string, unknown>) => ({
      ...lead,
      quiz_title: quizMap[lead.quiz_id as string] ?? "—",
    })) as unknown as LeadLike[];

    const gated = lockAndRedact(enriched, plan).map((l) =>
      // The Supabase join returns the nested {quiz_results: {title, sio_tag_name}}
      // which the generic redactor doesn't know about — strip it for locked rows
      // so the visitor's chosen result profile can't leak through DevTools either.
      l.locked ? { ...l, quiz_results: null } : l,
    );
    const lockedCount = gated.filter((l) => l.locked).length;

    return NextResponse.json({
      ok: true,
      leads: gated,
      quizzes,
      plan,
      locked_count: lockedCount,
    });
  } catch (err) {
    console.error("[Leads API]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
