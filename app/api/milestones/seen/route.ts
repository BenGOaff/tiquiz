// app/api/milestones/seen/route.ts (Tiquiz)
//
// POST { ids: string[] } : marque les milestones vus (seen_at = now()).
// RLS force user_id = auth.uid() → impossible de marquer ceux d'autrui.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]) : [];
  const validIds = ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  if (validIds.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const now = new Date();
  const { error, count } = await supabase
    .from("user_milestones")
    .update({ seen_at: now.toISOString() }, { count: "exact" })
    .eq("user_id", user.id)
    .is("seen_at", null)
    .in("id", validIds);

  if (error) {
    console.error("[milestones/seen] update failed", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  // Rate-limit serveur (Béné 3 juin 2026) : programme le prochain batch
  // dans 7 jours. La route /unseen filtre dessus → max 1×/semaine.
  const nextAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  await supabase
    .from("profiles")
    .update({ next_milestone_toast_at: nextAt.toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, updated: count ?? 0 });
}
