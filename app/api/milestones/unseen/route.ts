// app/api/milestones/unseen/route.ts (Tiquiz)
//
// GET : milestones débloqués mais pas encore vus par l'user connecté.
// Lu par <MilestoneToastListener /> au mount du dashboard.

import { NextResponse } from "next/server";

import { getMilestoneByKey } from "@/lib/milestones/catalog";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface UnseenRow {
  id: string;
  milestone_key: string;
  unlocked_at: string;
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_milestones")
    .select("id,milestone_key,unlocked_at")
    .eq("user_id", user.id)
    .is("seen_at", null)
    .order("unlocked_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[milestones/unseen] read failed", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const milestones = ((data ?? []) as UnseenRow[]).flatMap((row) => {
    const def = getMilestoneByKey(row.milestone_key);
    if (!def) return [];
    return [
      {
        id: row.id,
        key: row.milestone_key,
        emoji: def.emoji,
        title: def.title,
        body: def.body,
        ctaLabel: def.ctaLabel ?? null,
        ctaUrl: def.ctaUrl ?? null,
      },
    ];
  });

  return NextResponse.json({ ok: true, milestones });
}
