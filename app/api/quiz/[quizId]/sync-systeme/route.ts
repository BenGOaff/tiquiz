// app/api/quiz/[quizId]/sync-systeme/route.ts
// Renvoie des leads vers la DESTINATION du quiz (Systeme.io, ou une
// connexion CRM comme GoHighLevel, 14 septembre 2026). Le nom de la
// route date d'avant : les écrans l'appellent, on ne le change pas.
// Supports two modes:
//   1. Bulk with tag: { tagName: "..." } — syncs ALL leads and applies tag (from QuizDetailClient)
//   2. Individual leads: { lead_ids: ["uuid",...] } — syncs specific leads using their result's tag (from LeadsShell)
//
// The API key used is the one attached to the quiz (quizzes.sio_api_key_id),
// resolved via the cascade in lib/sio/resolveApiKey.ts. This means a user
// with several SIO accounts (one per client) syncs each quiz's leads to
// the right Systeme.io workspace automatically.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resoudreDestination } from "@/lib/integrations/store";
import { envoyerLead } from "@/lib/integrations/envoyer";
import { computeLockedLeadIds } from "@/lib/leadLock";
import { isPaidPlan } from "@/lib/planLimits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ quizId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const tagName = String(body.tagName ?? "").trim();
    const leadIds: string[] = Array.isArray(body.lead_ids) ? body.lead_ids : [];

    if (!tagName && leadIds.length === 0) {
      return NextResponse.json({ ok: false, error: "tagName or lead_ids required" }, { status: 400 });
    }

    // Use the key attached to the quiz (cascading resolver). This is what
    // makes multi-client SIO accounts work: each quiz can target a
    // different Systeme.io workspace.
    const { data: quizRow } = await supabaseAdmin
      .from("quizzes")
      .select("sio_api_key_id, connexion_id, project_id")
      .eq("id", quizId)
      .eq("user_id", user.id)
      .maybeSingle();

    const typedQuizRow = quizRow as {
      sio_api_key_id?: string | null;
      connexion_id?: string | null;
      project_id?: string | null;
    } | null;
    // LA MÊME destination que la capture : un renvoi depuis Mes leads
    // part là où le lead serait parti tout seul.
    const destination = await resoudreDestination(user.id, {
      connexionId: typedQuizRow?.connexion_id ?? null,
      sioKeyId: typedQuizRow?.sio_api_key_id ?? null,
      projectId: typedQuizRow?.project_id ?? null,
    });
    if (!destination) {
      return NextResponse.json({ ok: false, error: "No Systeme.io API key configured" }, { status: 400 });
    }
    if (destination.type === "pause") {
      return NextResponse.json({ ok: false, error: "CONNEXION_EN_PAUSE" }, { status: 409 });
    }

    // Determine which leads to sync
    let leadsQuery = supabaseAdmin
      .from("quiz_leads")
      .select("id, email, first_name, last_name, phone, country, result_id, created_at")
      .eq("quiz_id", quizId);

    if (leadIds.length > 0) {
      leadsQuery = leadsQuery.in("id", leadIds);
    }

    const { data: leadsRaw } = await leadsQuery;

    // Free-tier guard: locked leads must NOT leave the platform via SIO sync,
    // otherwise paying for Systeme.io would let creators trivially extract
    // the PII the leads UI is hiding behind a blur.
    const { data: planRow } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const plan = String((planRow as { plan?: string | null } | null)?.plan ?? "free");
    let leads = leadsRaw;
    let skippedLocked = 0;
    if (!isPaidPlan(plan)) {
      const { data: ownedQuizzes } = await supabaseAdmin
        .from("quizzes")
        .select("id")
        .eq("user_id", user.id);
      const ownedQuizIds = (ownedQuizzes ?? []).map((q: { id: string }) => q.id);
      if (ownedQuizIds.length > 0) {
        const { data: timeline } = await supabaseAdmin
          .from("quiz_leads")
          .select("id, created_at")
          .in("quiz_id", ownedQuizIds);
        const lockedIds = computeLockedLeadIds(timeline ?? [], plan);
        const before = (leads ?? []).length;
        leads = (leads ?? []).filter((l: { id: string }) => !lockedIds.has(l.id));
        skippedLocked = before - leads.length;
      }
    }

    // For individual lead sync, get result tags. Multi-tags par profil
    // (Gwenn 12 juillet 2026) : chaque profil peut avoir plusieurs tags
    // (sio_tag_names) ; fallback sur l'ancien sio_tag_name single.
    const resultTagMap = new Map<string, string[]>();
    if (!tagName && leadIds.length > 0) {
      const resultIds = [...new Set((leads ?? []).map((l) => l.result_id).filter(Boolean))];
      if (resultIds.length > 0) {
        const { data: results } = await supabaseAdmin
          .from("quiz_results")
          .select("id, sio_tag_name, sio_tag_names")
          .in("id", resultIds);
        for (const r of results ?? []) {
          const arr = Array.isArray((r as { sio_tag_names?: unknown }).sio_tag_names)
            ? ((r as { sio_tag_names: unknown[] }).sio_tag_names).map((v) => String(v ?? "").trim()).filter(Boolean)
            : [];
          const tags = arr.length > 0 ? arr : (r.sio_tag_name ? [String(r.sio_tag_name).trim()] : []);
          if (tags.length > 0) resultTagMap.set(r.id, tags);
        }
      }
    }

    let synced = 0;
    let errors = 0;
    let fournisseur: string | null = null;
    const errorDetails: string[] = [];
    const syncedLeadIds: string[] = [];

    for (const lead of leads ?? []) {
      try {
        // Determine tag(s) for this lead — un bouton "tag global" force un
        // seul tag ; sinon on prend TOUS les tags du profil.
        const effectiveTags = tagName
          ? [tagName]
          : (lead.result_id ? (resultTagMap.get(lead.result_id) ?? []) : []);
        if (effectiveTags.length === 0) {
          errors++;
          if (errorDetails.length < 10) errorDetails.push(`No tag for ${lead.email}`);
          continue;
        }

        const envoi = await envoyerLead(
          destination,
          {
            email: lead.email,
            prenom: lead.first_name ?? null,
            nom: lead.last_name ?? null,
            telephone: lead.phone ?? null,
            pays: lead.country ?? null,
            tags: effectiveTags,
          },
          user.id,
        );
        if (envoi?.ok) {
          synced++;
          syncedLeadIds.push(lead.id);
          fournisseur = envoi.fournisseur;
        } else {
          errors++;
          if (errorDetails.length < 10) errorDetails.push(`${lead.email}: ${envoi?.erreur ?? "envoi impossible"}`);
          // Un jeton refusé ne se réessaie pas sur les leads suivants :
          // ils échoueraient tous pareil, et chacun rappellerait l'outil.
          if (envoi && "deconnecte" in envoi) break;
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        errors++;
        if (errorDetails.length < 10) errorDetails.push(e instanceof Error ? e.message : String(e));
      }
    }

    // Update DB sync status for successfully synced leads
    if (syncedLeadIds.length > 0) {
      await supabaseAdmin
        .from("quiz_leads")
        .update({
          sio_synced: true,
          sio_synced_at: new Date().toISOString(),
          sio_tag_applied: tagName || null,
          sync_fournisseur: fournisseur,
        })
        .in("id", syncedLeadIds);
    }

    return NextResponse.json({ ok: true, synced, errors, skipped_locked: skippedLocked, errorDetails });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
