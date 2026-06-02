// app/api/projects/active/route.ts
//
// POST { projectId } → bascule le user sur ce projet.
// Pose un cookie HTTP-only `tiquiz_project` lu par getActiveProjectId
// dans les routes scopées (phase 3).
//
// GET → renvoie l'ID du projet actif courant (pour synchroniser le UI
// au mount sans devoir relister tous les projets).

import { NextRequest, NextResponse } from "next/server";

import { getActiveProjectId } from "@/lib/projects/activeProject";
import { projectBelongsToUser } from "@/lib/projects/queries";
import {
  ACTIVE_PROJECT_COOKIE,
  ACTIVE_PROJECT_COOKIE_MAX_AGE,
} from "@/lib/projects/types";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const activeId = await getActiveProjectId(supabase, user.id);
  return NextResponse.json({ ok: true, activeProjectId: activeId });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const projectId = String((body as { projectId?: string }).projectId ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId_required" }, { status: 400 });
  }

  const owns = await projectBelongsToUser(projectId, user.id);
  if (!owns) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true, activeProjectId: projectId });
  res.cookies.set({
    name: ACTIVE_PROJECT_COOKIE,
    value: projectId,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
  });
  return res;
}
