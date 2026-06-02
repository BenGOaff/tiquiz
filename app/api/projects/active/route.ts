// app/api/projects/active/route.ts
//
// POST { projectId } → bascule le user sur ce projet.
// Pose un cookie `tiquiz_active_project` (non httpOnly volontairement
// pour parité avec le pattern Tipote — le ProjectSwitcher UI lit le
// cookie côté client pour synchroniser son état sans aller-retour).
//
// GET → renvoie l'ID du projet actif courant (pour synchroniser le UI
// au mount sans devoir relister tous les projets).
//
// Note : ce endpoint POST coexiste avec switchProject() côté client
// (lib/projects/client.ts) qui pose le cookie directement. Les deux
// chemins fonctionnent ; le POST API existe pour les cas où on a déjà
// le contexte serveur sous la main et qu'on évite un round-trip JS.

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
    httpOnly: false, // lisible client-side par ProjectSwitcher (parité Tipote)
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
  });
  return res;
}
