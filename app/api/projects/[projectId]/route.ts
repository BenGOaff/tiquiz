// app/api/projects/[projectId]/route.ts
//
// PATCH  → rename
// DELETE → supprime (jamais le projet par défaut)

import { NextRequest, NextResponse } from "next/server";

import {
  deleteProject,
  projectBelongsToUser,
  renameProject,
} from "@/lib/projects/queries";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ projectId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;
  const owns = await projectBelongsToUser(projectId, user.id);
  if (!owns) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String((body as { name?: string }).name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }

  const result = await renameProject(projectId, name);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;
  const owns = await projectBelongsToUser(projectId, user.id);
  if (!owns) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const result = await deleteProject(projectId);
  if (!result.ok) {
    if (result.error === "cannot_delete_default") {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: "Tu ne peux pas supprimer ton projet principal. Crée d'abord un autre projet, puis change tes contenus dessus.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
