// app/api/projects/route.ts
//
// CRUD multiprofils (phase 2 du chantier).
//
// GET  → liste les projets du user authentifié
// POST → crée un nouveau projet (gated : canUseMultiProjects)
//
// Les routes existantes (quiz, popquiz, etc.) ne sont PAS encore
// filtrées par projet — phase 3 viendra activer le scoping. Cette
// phase 2 livre juste les rails (API + UI).

import { NextRequest, NextResponse } from "next/server";

import { canUseMultiProjects } from "@/lib/planLimits";
import {
  createProject,
  listProjectsForUser,
} from "@/lib/projects/queries";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getPlanEligibility(userId: string, email: string | null) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (profile as { plan?: string | null } | null)?.plan ?? null;
  return canUseMultiProjects(plan, { userId, email });
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const projects = await listProjectsForUser(user.id);
  const eligible = await getPlanEligibility(user.id, user.email ?? null);

  return NextResponse.json({
    ok: true,
    projects,
    canCreateMore: eligible,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const eligible = await getPlanEligibility(user.id, user.email ?? null);
  if (!eligible) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_REQUIRED",
        message: "La création de plusieurs projets est disponible dans un plan supérieur.",
      },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = String((body as { name?: string }).name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "name_required" },
      { status: 400 },
    );
  }

  const result = await createProject(user.id, name);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, project: result }, { status: 201 });
}
