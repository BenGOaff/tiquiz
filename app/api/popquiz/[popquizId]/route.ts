// app/api/popquiz/[popquizId]/route.ts
// Single-popquiz operations. For now: DELETE only.
// GET / PATCH will land with the editor flow.
//
// RLS on `popquizzes` already gates by user_id, but we double-check
// auth here so an unauthenticated request is rejected with 401
// instead of an opaque "Not Found".

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ popquizId: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { popquizId } = await params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // popquiz_cues cascade on this delete; popquiz_videos stays
  // around (FK is RESTRICT) and is fine to leave — a future cleanup
  // job will sweep videos no longer referenced by any popquiz.
  const { error } = await supabase
    .from("popquizzes")
    .delete()
    .eq("id", popquizId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
