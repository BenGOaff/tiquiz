// app/api/quiz/[quizId]/sync-systeme/route.ts
// Sync quiz leads to Systeme.io.
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
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";

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
      .select("sio_api_key_id")
      .eq("id", quizId)
      .eq("user_id", user.id)
      .maybeSingle();

    const resolved = await resolveApiKey(user.id, {
      explicitKeyId: (quizRow as { sio_api_key_id?: string | null } | null)?.sio_api_key_id ?? null,
    });
    if (!resolved) {
      return NextResponse.json({ ok: false, error: "No Systeme.io API key configured" }, { status: 400 });
    }
    const apiKey = resolved.apiKey;

    // Determine which leads to sync
    let leadsQuery = supabaseAdmin
      .from("quiz_leads")
      .select("id, email, first_name, last_name, phone, country, result_id")
      .eq("quiz_id", quizId);

    if (leadIds.length > 0) {
      leadsQuery = leadsQuery.in("id", leadIds);
    }

    const { data: leads } = await leadsQuery;

    // For individual lead sync, get result tags
    const resultTagMap = new Map<string, string>();
    if (!tagName && leadIds.length > 0) {
      const resultIds = [...new Set((leads ?? []).map((l) => l.result_id).filter(Boolean))];
      if (resultIds.length > 0) {
        const { data: results } = await supabaseAdmin
          .from("quiz_results")
          .select("id, sio_tag_name")
          .in("id", resultIds);
        for (const r of results ?? []) {
          if (r.sio_tag_name) resultTagMap.set(r.id, r.sio_tag_name);
        }
      }
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const syncedLeadIds: string[] = [];

    for (const lead of leads ?? []) {
      try {
        // Determine tag for this lead
        const effectiveTag = tagName || (lead.result_id ? resultTagMap.get(lead.result_id) : null);
        if (!effectiveTag) {
          errors++;
          if (errorDetails.length < 10) errorDetails.push(`No tag for ${lead.email}`);
          continue;
        }

        // Find or create tag in Systeme.io
        let tagId: number | null = null;
        const searchRes = await sioUserRequest<{ items: { id: number; name: string }[] }>(apiKey, `/tags?query=${encodeURIComponent(effectiveTag)}&limit=100`);
        if (searchRes.ok && searchRes.data?.items) {
          const match = searchRes.data.items.find((t) => t.name.toLowerCase() === effectiveTag.toLowerCase());
          if (match) tagId = match.id;
        }
        if (!tagId) {
          const createRes = await sioUserRequest<{ id: number }>(apiKey, "/tags", { method: "POST", body: { name: effectiveTag } });
          if (createRes.ok && createRes.data) tagId = createRes.data.id;
        }
        if (!tagId) {
          errors++;
          if (errorDetails.length < 10) errorDetails.push(`Failed to create tag for ${lead.email}`);
          continue;
        }

        // Find or create contact
        const findRes = await sioUserRequest<{ items: { id: number }[] }>(apiKey, `/contacts?email=${encodeURIComponent(lead.email)}&limit=10`);
        let contactId: number | null = null;

        if (findRes.ok && findRes.data?.items?.length) {
          contactId = findRes.data.items[0].id;
        } else {
          const fields: { slug: string; value: string }[] = [];
          if (lead.first_name) fields.push({ slug: "first_name", value: lead.first_name });
          if (lead.last_name) fields.push({ slug: "surname", value: lead.last_name });
          if (lead.phone) fields.push({ slug: "phone_number", value: lead.phone });

          const createRes = await sioUserRequest<{ id: number }>(apiKey, "/contacts", {
            method: "POST",
            body: { email: lead.email, locale: "fr", ...(fields.length ? { fields } : {}) },
          });
          if (createRes.ok && createRes.data) contactId = createRes.data.id;
        }

        if (contactId) {
          await sioUserRequest(apiKey, `/contacts/${contactId}/tags`, { method: "POST", body: { tagId } });
          synced++;
          syncedLeadIds.push(lead.id);
        } else {
          errors++;
          if (errorDetails.length < 10) errorDetails.push(`No contact created for ${lead.email}`);
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
        })
        .in("id", syncedLeadIds);
    }

    return NextResponse.json({ ok: true, synced, errors, errorDetails });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
