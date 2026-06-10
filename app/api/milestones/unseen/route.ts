// app/api/milestones/unseen/route.ts (Tiquiz)
//
// GET : milestones débloqués mais pas encore vus par l'user connecté.
// Lu par <MilestoneToastListener /> au mount du dashboard.
//
// AT-MOST-ONCE (retour Gwenn 10 juin 2026 : "popups à chaque connexion") :
// cette route marque seen_at = now() via le client SERVICE-ROLE au moment
// même où elle sert le batch. Avant, le marquage dépendait du POST /seen
// client + de la policy RLS UPDATE — si l'un des deux manquait/échouait,
// seen_at restait NULL et les mêmes toasts re-poppaient à chaque session.
// Un milestone servi une fois ne peut désormais plus jamais re-popper,
// au prix (accepté) d'un toast perdu si l'user quitte la page avant
// l'affichage. Le POST /seen reste comme filet (idempotent).

import { NextResponse } from "next/server";

import { getMilestoneByKey } from "@/lib/milestones/catalog";
import { getActiveProjectScope } from "@/lib/projects/scopeFilter";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

  const rows = (data ?? []) as UnseenRow[];
  const milestones = rows.flatMap((row) => {
    const def = getMilestoneByKey(row.milestone_key);
    // Clé retirée du catalog : pas affichable, mais on la marque seen
    // quand même ci-dessous, sinon elle resterait unseen pour toujours
    // et saturerait le limit(20) à chaque fetch.
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

  if (rows.length > 0) {
    const now = new Date();
    // Service-role : ne dépend d'aucune policy RLS UPDATE. Scopé user_id
    // par sécurité même si les ids viennent de notre propre SELECT.
    const { error: markErr } = await supabaseAdmin
      .from("user_milestones")
      .update({ seen_at: now.toISOString() })
      .eq("user_id", user.id)
      .is("seen_at", null)
      .in("id", rows.map((r) => String(r.id)));
    if (markErr) {
      console.error("[milestones/unseen] mark seen failed", markErr.message);
    }

    // Rate-limit 1 batch / semaine, seulement si on a servi des toasts
    // visibles. Best-effort : la colonne peut ne pas encore exister en
    // prod (migration 20260611), on ignore l'erreur dans ce cas.
    if (milestones.length > 0) {
      const nextAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const { error: rlErr } = await supabaseAdmin
        .from("profiles")
        .update({ next_milestone_toast_at: nextAt.toISOString() })
        .eq("user_id", user.id);
      if (rlErr) {
        console.error("[milestones/unseen] rate-limit update failed", rlErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true, milestones });
}
