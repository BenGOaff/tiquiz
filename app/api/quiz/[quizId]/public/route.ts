// app/api/quiz/[quizId]/public/route.ts
// Public endpoints for quiz visitors (no auth required).
// GET: fetch active quiz data
// POST: submit lead (email capture) + auto-send to Systeme.io with result tag
// PATCH: mark share + auto-apply share tag in Systeme.io
//
// SIO KEY RESOLUTION
// ------------------
// The API key used to sync each lead is resolved through the cascade in
// lib/sio/resolveApiKey.ts: explicit quiz.sio_api_key_id → user default →
// any user key → legacy plaintext column. This guarantees that when a
// funnel-builder manages multiple Systeme.io workspaces (one per client),
// every lead lands in the workspace attached to its quiz — never another.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveQuizBranding } from "@/lib/quizBranding";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";
import { isNewLeadLocked } from "@/lib/leadLock";
import { isPaidPlan } from "@/lib/planLimits";

// No `force-dynamic`: it would make Vercel inject `Cache-Control: private, no-store`,
// overriding the edge-SWR headers set on the GET response and forcing `cf-cache-status: DYNAMIC`.
export const maxDuration = 30;

type RouteContext = { params: Promise<{ quizId: string }> };

const SIO_BASE = "https://api.systeme.io/api";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveQuizId(
  admin: typeof supabaseAdmin,
  slugOrId: string,
  opts: { requireActive?: boolean } = {},
): Promise<string | null> {
  const needle = slugOrId.trim();
  if (!needle) return null;

  if (UUID_RE.test(needle)) {
    const q = admin.from("quizzes").select("id").eq("id", needle);
    const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
    if (data?.id) return data.id as string;
  }

  const q = admin.from("quizzes").select("id").ilike("slug", needle);
  const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
  return (data?.id as string) ?? null;
}

async function sioFetch(
  apiKey: string,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }
  const res = await fetch(`${SIO_BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function ensureSioTag(apiKey: string, tagName: string): Promise<number | null> {
  const search = await sioFetch(apiKey, `/tags?query=${encodeURIComponent(tagName)}&limit=100`);
  if (search.ok && Array.isArray((search.data as Record<string, unknown>)?.items)) {
    const items = (search.data as Record<string, unknown[]>).items as Record<string, unknown>[];
    const match = items.find((t) => String(t.name).toLowerCase() === tagName.toLowerCase());
    if (match?.id) return Number(match.id);
  }
  const create = await sioFetch(apiKey, "/tags", { method: "POST", body: { name: tagName } });
  if (create.ok && (create.data as Record<string, unknown>)?.id) return Number((create.data as Record<string, unknown>).id);
  if (create.status === 422) {
    const retry = await sioFetch(apiKey, `/tags?query=${encodeURIComponent(tagName)}&limit=100`);
    if (retry.ok && Array.isArray((retry.data as Record<string, unknown>)?.items)) {
      const items = (retry.data as Record<string, unknown[]>).items as Record<string, unknown>[];
      const match = items.find((t) => String(t.name).toLowerCase() === tagName.toLowerCase());
      if (match?.id) return Number(match.id);
    }
  }
  return null;
}

function buildSioFields(
  fields: { firstName?: string; surname?: string; phoneNumber?: string; country?: string } | undefined,
  includeCountry: boolean,
): { slug: string; value: string }[] {
  if (!fields) return [];
  const out: { slug: string; value: string }[] = [];
  if (fields.firstName) out.push({ slug: "first_name", value: fields.firstName });
  if (fields.surname) out.push({ slug: "surname", value: fields.surname });
  if (fields.phoneNumber) out.push({ slug: "phone_number", value: fields.phoneNumber });
  if (includeCountry && fields.country) out.push({ slug: "country", value: fields.country });
  return out;
}

async function ensureSioContact(
  apiKey: string,
  email: string,
  fields?: { firstName?: string; surname?: string; phoneNumber?: string; country?: string },
): Promise<number | null> {
  const search = await sioFetch(apiKey, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
  if (search.ok && Array.isArray((search.data as Record<string, unknown>)?.items)) {
    const items = (search.data as Record<string, unknown[]>).items as Record<string, unknown>[];
    if (items.length > 0) {
      const existingId = Number(items[0].id);
      if (fields && Object.values(fields).some(Boolean)) {
        const patchFields = buildSioFields(fields, true);
        if (patchFields.length > 0) {
          const patchRes = await sioFetch(apiKey, `/contacts/${existingId}`, { method: "PATCH", body: { fields: patchFields } });
          if (!patchRes.ok && fields.country) {
            const fallback = buildSioFields(fields, false);
            if (fallback.length > 0) await sioFetch(apiKey, `/contacts/${existingId}`, { method: "PATCH", body: { fields: fallback } });
          }
        }
      }
      return existingId;
    }
  }

  const contactBody: Record<string, unknown> = { email, locale: "fr" };
  const sioFields = buildSioFields(fields, true);
  if (sioFields.length > 0) contactBody.fields = sioFields;
  const create = await sioFetch(apiKey, "/contacts", { method: "POST", body: contactBody });
  if (create.ok && (create.data as Record<string, unknown>)?.id) return Number((create.data as Record<string, unknown>).id);

  if (create.status === 422) {
    const retrySearch = await sioFetch(apiKey, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
    if (retrySearch.ok && Array.isArray((retrySearch.data as Record<string, unknown>)?.items)) {
      const items = (retrySearch.data as Record<string, unknown[]>).items as Record<string, unknown>[];
      if (items.length > 0) return Number(items[0].id);
    }
    if (fields?.country) {
      const fallbackBody: Record<string, unknown> = { email, locale: "fr" };
      const fallbackFields = buildSioFields(fields, false);
      if (fallbackFields.length > 0) fallbackBody.fields = fallbackFields;
      const retryCreate = await sioFetch(apiKey, "/contacts", { method: "POST", body: fallbackBody });
      if (retryCreate.ok && (retryCreate.data as Record<string, unknown>)?.id) return Number((retryCreate.data as Record<string, unknown>).id);
    }
  }
  return null;
}

async function applyTagToContact(
  apiKey: string,
  email: string,
  tagName: string,
  fields?: { firstName?: string; surname?: string; phoneNumber?: string; country?: string },
): Promise<number | null> {
  try {
    const tagId = await ensureSioTag(apiKey, tagName);
    if (!tagId) return null;
    const contactId = await ensureSioContact(apiKey, email, fields);
    if (!contactId) return null;
    await sioFetch(apiKey, `/contacts/${contactId}/tags`, { method: "POST", body: { tagId } });
    return contactId;
  } catch (e) {
    console.error("[Systeme.io auto-tag] Error:", e);
    return null;
  }
}

async function enrichSioContact(apiKey: string, contactId: number, quizResultTitle: string) {
  try {
    await sioFetch(apiKey, `/contacts/${contactId}`, {
      method: "PATCH",
      body: { fields: [{ slug: "tiquiz_result", value: quizResultTitle }] },
    });
  } catch (e) {
    console.error("[Systeme.io enrich] Error:", e);
  }
}

async function enrollInSioCourse(apiKey: string, courseId: string, contactId: number) {
  try {
    await sioFetch(apiKey, `/school/courses/${courseId}/enrollments`, { method: "POST", body: { contactId } });
  } catch (e) {
    console.error("[Systeme.io course enrollment] Error:", e);
  }
}

async function addToSioCommunity(apiKey: string, communityId: string, contactId: number) {
  try {
    await sioFetch(apiKey, `/community/communities/${communityId}/memberships`, { method: "POST", body: { contactId } });
  } catch (e) {
    console.error("[Systeme.io community add] Error:", e);
  }
}

// ── GET — public quiz data ───────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const admin = supabaseAdmin;

    // Embed preview path: an anonymous embed visitor wants to see
    // their (still-draft, still-anonymous) quiz play live before
    // checkout. We skip the active-status filter when the URL carries
    // ?embed=<UUID> AND the resolved row's embed_session_id matches.
    // This never exposes another user's draft because:
    //   1) the token is a unique UUID stored in localStorage / URL
    //   2) we re-check the embed_session_id on the row itself below
    const embedToken = (() => {
      const raw = req.nextUrl.searchParams.get("embed");
      return raw && UUID_RE.test(raw) ? raw : null;
    })();

    const quizId = await resolveQuizId(admin, slugOrId, { requireActive: !embedToken });
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    if (embedToken) {
      const { data: gate } = await admin
        .from("quizzes")
        .select("embed_session_id, user_id")
        .eq("id", quizId)
        .maybeSingle();
      if (!gate || gate.user_id !== null || gate.embed_session_id !== embedToken) {
        return NextResponse.json({ ok: false, error: "Preview token mismatch" }, { status: 404 });
      }
    }

    const [quizRes, questionsRes, resultsRes] = await Promise.all([
      admin.from("quizzes").select("id,user_id,title,introduction,cta_text,cta_url,start_button_text,privacy_url,consent_text,virality_enabled,bonus_description,bonus_image_url,share_message,locale,address_form,views_count,capture_heading,capture_subtitle,capture_first_name,capture_last_name,capture_phone,capture_country,ask_first_name,ask_gender,slug,brand_font,brand_color_primary,brand_color_background,custom_footer_text,custom_footer_url,share_networks,og_description,og_image_url,mode,show_consent_checkbox").eq("id", quizId).maybeSingle(),
      admin.from("quiz_questions").select("id,question_text,options,sort_order,question_type,config").eq("quiz_id", quizId).order("sort_order"),
      admin.from("quiz_results").select("id,title,description,insight,projection,cta_text,cta_url,sort_order").eq("quiz_id", quizId).order("sort_order"),
    ]);

    if (!quizRes.data) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    const quizRow = quizRes.data as Record<string, unknown>;
    const quizUserId = quizRow.user_id as string | undefined;
    const quizAddressForm = quizRow.address_form as string | null;
    let addressForm = quizAddressForm === "tu" || quizAddressForm === "vous" ? quizAddressForm : "tu";
    let fallbackPrivacyUrl = "";
    let profileRow: Record<string, unknown> | null = null;

    if (quizUserId) {
      const { data: bp } = await admin
        .from("profiles")
        .select("address_form, privacy_url, brand_logo_url, brand_font, brand_color_primary, plan")
        .eq("user_id", quizUserId)
        .maybeSingle();
      profileRow = (bp as Record<string, unknown>) ?? null;
      if (!quizAddressForm) {
        addressForm = profileRow?.address_form === "vous" ? "vous" : "tu";
      }
      fallbackPrivacyUrl = String(profileRow?.privacy_url ?? "").trim();
    }

    const branding = resolveQuizBranding(
      {
        brand_font: quizRow.brand_font as string | null,
        brand_color_primary: quizRow.brand_color_primary as string | null,
        brand_color_background: quizRow.brand_color_background as string | null,
      },
      {
        brand_font: profileRow?.brand_font as string | null,
        brand_color_primary: profileRow?.brand_color_primary as string | null,
        brand_logo_url: profileRow?.brand_logo_url as string | null,
      },
    );

    // Custom footer is a paid-plan feature: hide it for free creators
    // (and only for free — beta / lifetime / monthly / yearly all keep it).
    // Permissive check via isPaidPlan: anything that isn't `free` counts as
    // paid, so future plan slugs don't accidentally lose the custom footer
    // until this file is updated.
    const ownerPlan = String(profileRow?.plan ?? "free").trim();
    const customFooterText = isPaidPlan(ownerPlan) ? (quizRow.custom_footer_text as string | null) : null;
    const customFooterUrl = isPaidPlan(ownerPlan) ? (quizRow.custom_footer_url as string | null) : null;

    // log_quiz_event bumps the cumulative counter AND writes a dated
    // row in quiz_events — both transactional, so the stats page can
    // do real time-series analysis (per-day views, week-over-week
    // trends, etc.) on top of the same data the lifetime counters use.
    admin
      .rpc("log_quiz_event", { quiz_id_input: quizId, event_type_input: "view" })
      .then(() => {})
      .then(undefined, () => {});

    const { user_id: _uid, ...quizPublic } = quizRow;
    void _uid;
    const effectivePrivacyUrl = String(quizPublic.privacy_url ?? "").trim() || fallbackPrivacyUrl;

    // Edge-SWR resilience for published quizzes: visitors keep seeing the quiz
    // even when origin is down (deploy / crash / DB hiccup) for up to 24h. Skip
    // caching for embed previews (creator-only, evolving drafts).
    const cacheHeaders: Record<string, string> = embedToken
      ? { "Cache-Control": "private, no-store, max-age=0" }
      : {
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
          "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
          "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
        };

    return NextResponse.json({
      ok: true,
      quiz: {
        ...quizPublic,
        address_form: addressForm,
        privacy_url: effectivePrivacyUrl || null,
        custom_footer_text: customFooterText,
        custom_footer_url: customFooterUrl,
      },
      questions: (questionsRes.data ?? []).map((q: Record<string, unknown>) => ({
        ...q,
        options: q.options as { text: string; result_index: number }[],
        question_type: (q.question_type as string) ?? "multiple_choice",
        config: (q.config as Record<string, unknown>) ?? {},
      })),
      results: resultsRes.data ?? [],
      branding,
    }, { headers: cacheHeaders });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── POST — submit lead + auto-tag in Systeme.io ────────────────

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const admin = supabaseAdmin;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const quizId = await resolveQuizId(admin, slugOrId, { requireActive: true });
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    // Pull sio_api_key_id alongside user_id so the right SIO workspace
    // gets the lead. Reading both in one query avoids any race where the
    // editor changes the attached key between SELECT and sync.
    const { data: quiz } = await admin
      .from("quizzes")
      .select("id, user_id, title, sio_api_key_id")
      .eq("id", quizId)
      .maybeSingle();

    if (!quiz) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    try {
      const { data: limitResult } = await admin.rpc("increment_response_count", { p_user_id: quiz.user_id });
      if (limitResult && typeof limitResult === "object" && (limitResult as Record<string, unknown>).allowed === false) {
        console.warn(`[Tiquiz] Quiz owner ${quiz.user_id} hit response limit`);
      }
    } catch {
      // fail-open: never block quiz visitors
    }

    const resultId = (body.result_id as string) ?? null;
    const firstName = String(body.first_name ?? "").trim().slice(0, 100);
    const lastName = String(body.last_name ?? "").trim().slice(0, 100);
    const phone = String(body.phone ?? "").trim().slice(0, 30);
    const country = String(body.country ?? "").trim().slice(0, 50);
    const rawGender = String(body.gender ?? "").trim().toLowerCase();
    const gender: "m" | "f" | "x" | null = rawGender === "m" || rawGender === "f" || rawGender === "x" ? rawGender : null;
    const answers = Array.isArray(body.answers) ? body.answers : null;

    const { data: lead, error } = await admin
      .from("quiz_leads")
      .upsert(
        {
          quiz_id: quizId,
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          country: country || null,
          result_id: resultId,
          consent_given: Boolean(body.consent_given),
          ...(gender ? { gender } : {}),
          ...(answers ? { answers } : {}),
        },
        { onConflict: "quiz_id,email" },
      )
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    if (lead?.id) {
      const leadId = lead.id;
      const quizUserId = quiz.user_id;
      const quizSioApiKeyId = (quiz as { sio_api_key_id?: string | null }).sio_api_key_id ?? null;

      (async () => {
        try {
          // Free-tier guard: skip SIO auto-sync if this brand-new lead is
          // already locked for the creator. Without this, a free creator
          // could lift the blur out-of-band by reading the lead in their
          // own Systeme.io account.
          const { data: planRow } = await admin
            .from("profiles")
            .select("plan")
            .eq("user_id", quizUserId)
            .maybeSingle();
          const plan = String((planRow as { plan?: string | null } | null)?.plan ?? "free");
          if (!isPaidPlan(plan)) {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: ownedQuizzes } = await admin
              .from("quizzes")
              .select("id")
              .eq("user_id", quizUserId);
            const ownedQuizIds = (ownedQuizzes ?? []).map((q: { id: string }) => q.id);
            if (ownedQuizIds.length > 0) {
              const { count } = await admin
                .from("quiz_leads")
                .select("id", { count: "exact", head: true })
                .in("quiz_id", ownedQuizIds)
                .gte("created_at", since);
              if (isNewLeadLocked(count ?? 0, plan)) return;
            }
          }

          // Cascade: explicit quiz key → user default → any user key →
          // legacy plaintext. The user_id scoping inside resolveApiKey
          // guarantees we can NEVER pick a key belonging to another user,
          // even if a corrupted FK pointed somewhere foreign.
          const resolved = await resolveApiKey(quizUserId, {
            explicitKeyId: quizSioApiKeyId,
          });
          if (!resolved) return;
          const apiKey = resolved.apiKey;

          let sioTagName = "";
          let courseId = "";
          let communityId = "";
          let resultTitle = "";
          if (resultId) {
            const { data: result } = await admin
              .from("quiz_results")
              .select("sio_tag_name, sio_course_id, sio_community_id, title")
              .eq("id", resultId)
              .maybeSingle();
            sioTagName = String((result as Record<string, unknown>)?.sio_tag_name ?? "").trim();
            courseId = String((result as Record<string, unknown>)?.sio_course_id ?? "").trim();
            communityId = String((result as Record<string, unknown>)?.sio_community_id ?? "").trim();
            resultTitle = String((result as Record<string, unknown>)?.title ?? "").trim();
          }

          const sioContactId = await ensureSioContact(apiKey, email, {
            firstName: firstName || undefined,
            surname: lastName || undefined,
            phoneNumber: phone || undefined,
            country: country || undefined,
          });
          if (!sioContactId) return;

          const tagsToApply = sioTagName ? [sioTagName] : [];

          for (const tagName of tagsToApply) {
            try {
              const tagId = await ensureSioTag(apiKey, tagName);
              if (!tagId) continue;
              await sioFetch(apiKey, `/contacts/${sioContactId}/tags`, {
                method: "POST",
                body: { tagId },
              });
            } catch (e) {
              console.error("[Systeme.io tag apply] Error:", e);
            }
          }

          if (resultTitle) await enrichSioContact(apiKey, sioContactId, resultTitle);
          if (courseId) await enrollInSioCourse(apiKey, courseId, sioContactId);
          if (communityId) await addToSioCommunity(apiKey, communityId, sioContactId);

          await admin
            .from("quiz_leads")
            .update({
              sio_synced: true,
              sio_synced_at: new Date().toISOString(),
              sio_tag_applied: tagsToApply.join(",") || null,
              sio_last_attempt_at: new Date().toISOString(),
              sio_last_error: null,
            })
            .eq("id", leadId);
        } catch (e) {
          console.error("[Systeme.io auto-tag POST] Error:", e);
          try {
            await admin
              .from("quiz_leads")
              .update({
                sio_last_attempt_at: new Date().toISOString(),
                sio_last_error: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500),
              })
              .eq("id", leadId);
          } catch {
            /* the lead may have been deleted concurrently; ignore */
          }
        }
      })();
    }

    return NextResponse.json({ ok: true, leadId: lead?.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── PATCH — mark share + auto-apply share tag ──────────────────

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const admin = supabaseAdmin;

    const quizId = await resolveQuizId(admin, slugOrId);
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const { data: updatedLeads, error: updateErr } = await admin
      .from("quiz_leads")
      .update({ has_shared: true, bonus_unlocked: true })
      .eq("quiz_id", quizId)
      .eq("email", email)
      .select("id");

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    if (!updatedLeads || updatedLeads.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Lead not found for this email" },
        { status: 404 },
      );
    }

    // Pull sio_api_key_id so the share tag is applied on the same SIO
    // workspace as the lead's original capture sync.
    const { data: quiz } = await admin
      .from("quizzes")
      .select("sio_share_tag_name, user_id, sio_api_key_id")
      .eq("id", quizId)
      .maybeSingle();

    if (quiz) {
      // log_quiz_event = counter + dated row so share velocity is
      // visible in the stats time-series, not just the lifetime total.
      await admin
        .rpc("log_quiz_event", { quiz_id_input: quizId, event_type_input: "share" });

      const quizRow = quiz as { sio_share_tag_name?: string | null; user_id?: string; sio_api_key_id?: string | null };
      const shareTagName = String(quizRow.sio_share_tag_name ?? "").trim();
      const quizUserId = quizRow.user_id;
      const quizSioApiKeyId = quizRow.sio_api_key_id ?? null;

      if (shareTagName && quizUserId) {
        (async () => {
          try {
            // Same cascade as POST so the share tag lands in the same
            // workspace where the lead lives.
            const resolved = await resolveApiKey(quizUserId, {
              explicitKeyId: quizSioApiKeyId,
            });
            if (!resolved) return;
            await applyTagToContact(resolved.apiKey, email, shareTagName);
          } catch (e) {
            console.error("[Systeme.io auto-tag PATCH] Error:", e);
          }
        })();
      }
    }

    return NextResponse.json({ ok: true, bonus_unlocked: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
