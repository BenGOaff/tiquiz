// app/api/projects/[projectId]/route.ts
//
// PATCH  → rename + visual identity (alignement Tipote :
//          accent_color, icon_emoji, use_branding_logo)
// DELETE → supprime (jamais le projet par défaut)

import { NextRequest, NextResponse } from "next/server";

import {
  deleteProject,
  projectBelongsToUser,
  updateProject,
  type UpdateProjectPatch,
} from "@/lib/projects/queries";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ projectId: string }> };

interface PatchBody {
  name?: string;
  accent_color?: string | null;
  icon_emoji?: string | null;
  use_branding_logo?: boolean;
}

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

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const patch: UpdateProjectPatch = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (body.accent_color !== undefined) patch.accent_color = body.accent_color;
  if (body.icon_emoji !== undefined) patch.icon_emoji = body.icon_emoji;
  if (typeof body.use_branding_logo === "boolean") {
    patch.use_branding_logo = body.use_branding_logo;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "nothing_to_update" },
      { status: 400 },
    );
  }

  const result = await updateProject(projectId, patch);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, project: result.project });
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
