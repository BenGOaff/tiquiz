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

import {
  canUseMultiProjects,
  shouldShowPlusUpsell,
} from "@/lib/planLimits";
import { createEmptyBusinessProfileForProject } from "@/lib/projects/businessProfile";
import {
  createProject,
  listProjectsForUser,
} from "@/lib/projects/queries";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getPlanContext(userId: string, email: string | null) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (profile as { plan?: string | null } | null)?.plan ?? null;
  return {
    plan,
    canCreateMore: canUseMultiProjects(plan, { userId, email }),
    // True pour monthly/yearly — l'UI doit afficher le switcher avec
    // un CTA upgrade vers monthly_plus/yearly_plus. False pour free
    // (statu quo) ET pour les plans premium (déjà accès).
    showUpsell: shouldShowPlusUpsell(plan),
  };
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
  const ctx = await getPlanContext(user.id, user.email ?? null);

  return NextResponse.json({
    ok: true,
    projects,
    canCreateMore: ctx.canCreateMore,
    // Pour l'UI : si true on affiche le switcher même avec 1 projet et
    // un CTA upgrade vers mensuel+ / annuel+ (cible monthly / yearly).
    showUpsell: ctx.showUpsell,
    plan: ctx.plan,
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

  const ctx = await getPlanContext(user.id, user.email ?? null);
  if (!ctx.canCreateMore) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_REQUIRED",
        message:
          "La création de plusieurs projets est réservée aux plans Tiquiz mensuel+ et annuel+. Passe au palier supérieur pour débloquer.",
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

  // Multiprofils Tiquiz : un nouveau projet = compte neuf. On crée un
  // business_profile VIDE (onboarding_completed=false) pour que le
  // ProjectSwitcher / Settings sachent qu'il faut un mini-onboarding
  // sur ce projet. Best-effort : si l'INSERT échoue, le user peut
  // toujours utiliser le projet (fallback profiles côté lecture).
  await createEmptyBusinessProfileForProject(user.id, result.id);

  return NextResponse.json({ ok: true, project: result }, { status: 201 });
}
