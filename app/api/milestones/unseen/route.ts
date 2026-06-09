// app/api/milestones/unseen/route.ts (Tiquiz)
//
// GET : milestones débloqués mais pas encore vus par l'user connecté.
// Lu par <MilestoneToastListener /> au mount du dashboard.

import { NextResponse } from "next/server";

import { getMilestoneByKey } from "@/lib/milestones/catalog";
import { getActiveProjectScope } from "@/lib/projects/scopeFilter";
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

  // Rate-limit serveur (Béné 3 juin 2026, mirror Tipote) : 1 batch /
  // semaine max. Si profiles.next_milestone_toast_at est dans le futur,
  // on retourne 0 milestones. Sinon, le batch est servi et le client
  // appelle /seen qui programme next à now() + 7d.
  const { data: profile } = await supabase
    .from("profiles")
    .select("next_milestone_toast_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const nextAt =
    (profile as { next_milestone_toast_at: string | null } | null)?.next_milestone_toast_at;
  if (nextAt && new Date(nextAt) > new Date()) {
    return NextResponse.json({ ok: true, milestones: [] });
  }

  // Phase 3b multiprofils : un nouveau projet démarre avec 0 milestones.
  const scope = await getActiveProjectScope(user.id, user.email ?? null);
  let query = supabase
    .from("user_milestones")
    .select("id,milestone_key,unlocked_at")
    .eq("user_id", user.id)
    .is("seen_at", null)
    .order("unlocked_at", { ascending: true })
    .limit(20);
  if (scope) query = query.eq("project_id", scope);

  const { data, error } = await query;

  if (error) {
    console.error("[milestones/unseen] read failed", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const milestones = ((data ?? []) as UnseenRow[]).flatMap((row) => {
    const def = getMilestoneByKey(row.milestone_key);
    if (!def) return [];
    return [
      {
        // BIGSERIAL -> string (cf. seen route, drame Gwenn 8 juin 2026).
        id: String(row.id),
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
