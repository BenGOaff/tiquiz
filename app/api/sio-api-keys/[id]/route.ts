// app/api/sio-api-keys/[id]/route.ts
// PATCH  — rename a key, or promote it to default.
// DELETE — remove a key. If it was default, the repo auto-promotes the
//          oldest remaining key, so the user is never left with keys but
//          no default. Quizzes that referenced this key fall back to the
//          new default via ON DELETE SET NULL on quizzes.sio_api_key_id.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { deleteKey, updateKey } from "@/lib/sio/keysRepo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const patch: { name?: string; isDefault?: boolean } = {};
    if (typeof body?.name === "string") patch.name = body.name.slice(0, 80);
    if (typeof body?.isDefault === "boolean") patch.isDefault = body.isDefault;

    if (patch.name === undefined && patch.isDefault === undefined) {
      return NextResponse.json({ ok: false, error: "NOTHING_TO_UPDATE" }, { status: 400 });
    }

    try {
      const updated = await updateKey(user.id, id, patch);
      if (!updated) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true, key: updated });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate|unique/i.test(msg)) {
        return NextResponse.json({ ok: false, error: "NAME_TAKEN" }, { status: 409 });
      }
      throw e;
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    await deleteKey(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
