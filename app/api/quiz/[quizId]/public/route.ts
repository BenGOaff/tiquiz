// app/api/quiz/[quizId]/public/route.ts
// Public endpoints for quiz visitors (no auth required).
// GET: fetch active quiz data
// POST: submit lead (email capture) + auto-send to Systeme.io with result tag
// PATCH: mark share + auto-apply share tag in Systeme.io

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveQuizBranding } from "@/lib/quizBranding";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ quizId: string }> };

const SIO_BASE = "https://api.systeme.io/api";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolves the "[quizId]" URL segment — which may be a UUID or a custom slug —
 * to the real quiz row's id. Returns null if not found/inactive.
 */
async function resolveQuizId(
  admin: typeof supabaseAdmin,
  slugOrId: string,
  opts: { requireActive?: boolean } = {},
): Promise<string | null> {
  const needle = slugOrId.trim();
  if (!needle) return null;

  // Try UUID direct first
  if (UUID_RE.test(needle)) {
    const q = admin.from("quizzes").select("id").eq("id", needle);
    const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
    if (data?.id) return data.id as string;
  }

  // Fallback: slug (case-insensitive)
  const q = admin.from("quizzes").select("id").ilike("slug", needle);
  const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
  return (data?.id as string) ?? null;
}

// ── Systeme.io helpers ──────────────────────────────────────────

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

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { quizId: slugOrId } = await context.params;
    const admin = supabaseAdmin;

    const quizId = await resolveQuizId(admin, slugOrId, { requireActive: true });
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    const [quizRes, questionsRes, resultsRes] = await Promise.all([
      admin.from("quizzes").select("id,user_id,title,introduction,cta_text,cta_url,start_button_text,privacy_url,consent_text,virality_enabled,bonus_description,bonus_image_url,share_message,locale,address_form,views_count,capture_heading,capture_subtitle,capture_first_name,capture_last_name,capture_phone,capture_country,slug,brand_font,brand_color_primary,brand_color_background,custom_footer_text,custom_footer_url,share_networks,og_description,og_image_url").eq("id", quizId).maybeSingle(),
      admin.from("quiz_questions").select("id,question_text,options,sort_order").eq("quiz_id", quizId).order("sort_order"),
      admin.from("quiz_results").select("id,title,description,insight,projection,cta_text,cta_url,sort_order").eq("quiz_id", quizId).order("sort_order"),
    ]);

    if (!quizRes.data) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    // Resolve address_form (quiz-level overrides profile-level) + fallback privacy_url + branding
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

    // Compute resolved branding for the visitor
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

    // Only paid plans can override the Tiquiz footer. Free plan → footer ignored.
    const plan = String(profileRow?.plan ?? "free").trim();
    const isPaid = plan === "lifetime" || plan === "monthly" || plan === "yearly";
    const customFooterText = isPaid ? (quizRow.custom_footer_text as string | null) : null;
    const customFooterUrl = isPaid ? (quizRow.custom_footer_url as string | null) : null;

    // Increment view count atomically. The previous SELECT-then-UPDATE
    // pattern lost increments under concurrent load: two visitors would
    // read the same stale count and both write "+1", losing one hit.
    // The RPC already exists and is used for starts_count / completions_count.
    admin
      .rpc("increment_quiz_counter", { quiz_id_input: quizId, counter_name: "views_count" })
      .then(() => {})
      .then(undefined, () => {});

    const { user_id: _uid, ...quizPublic } = quizRow;
    void _uid;
    const effectivePrivacyUrl = String(quizPublic.privacy_url ?? "").trim() || fallbackPrivacyUrl;

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
      })),
      results: resultsRes.data ?? [],
      branding,
    });
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
    // Reject malformed addresses ("a@", "@b", "foo@bar" without a TLD) so the
    // lead list isn't polluted and the Systeme.io sync doesn't reject them.
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const quizId = await resolveQuizId(admin, slugOrId, { requireActive: true });
    if (!quizId) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    const { data: quiz } = await admin
      .from("quizzes")
      .select("id, user_id, title")
      .eq("id", quizId)
      .maybeSingle();

    if (!quiz) {
      return NextResponse.json({ ok: false, error: "Quiz not found or inactive" }, { status: 404 });
    }

    // ── Check response limit for free plan ──
    try {
      const { data: limitResult } = await admin.rpc("increment_response_count", { p_user_id: quiz.user_id });
      if (limitResult && typeof limitResult === "object" && (limitResult as Record<string, unknown>).allowed === false) {
        // Still save the lead but mark the quiz owner has hit limit
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
          ...(answers ? { answers } : {}),
        },
        { onConflict: "quiz_id,email" },
      )
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // ── Auto-send to Systeme.io (non-blocking) ──
    if (lead?.id) {
      const leadId = lead.id;
      (async () => {
        try {
          const { data: profile } = await admin
            .from("profiles")
            .select("sio_user_api_key")
            .eq("user_id", quiz.user_id)
            .maybeSingle();

          const apiKey = String((profile as Record<string, unknown>)?.sio_user_api_key ?? "").trim();
          if (!apiKey) return;

          // Fetch result details (if any)
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

          // Ensure contact once, then apply the result tag
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

          // Update lead sync status in DB. Also clear any previous error
          // markers since the sync succeeded this time.
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
          // Record the failure on the lead so a future dashboard panel
          // can surface "N leads failed to sync to Systeme.io" and offer a
          // retry button. Previously these errors were only in server
          // logs and the lead silently stayed at sio_synced=false forever.
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

    // Mark share — and verify the row actually matched a lead. Previously a
    // PATCH with a bogus/unknown email silently matched 0 rows and still
    // returned ok:true while incrementing shares_count, so the visitor
    // thought they'd unlocked the bonus but no lead was credited.
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
      // No lead exists for this (quiz, email): don't credit the share and
      // don't pretend the bonus is unlocked. Client can recover by
      // re-capturing the email first.
      return NextResponse.json(
        { ok: false, error: "Lead not found for this email" },
        { status: 404 },
      );
    }

    const { data: quiz } = await admin
      .from("quizzes")
      .select("sio_share_tag_name, user_id")
      .eq("id", quizId)
      .maybeSingle();

    if (quiz) {
      // Atomic increment; see GET for rationale.
      await admin
        .rpc("increment_quiz_counter", { quiz_id_input: quizId, counter_name: "shares_count" });

      const shareTagName = String((quiz as Record<string, unknown>).sio_share_tag_name ?? "").trim();
      if (shareTagName && (quiz as Record<string, unknown>).user_id) {
        (async () => {
          try {
            const { data: profile } = await admin
              .from("profiles")
              .select("sio_user_api_key")
              .eq("user_id", (quiz as Record<string, unknown>).user_id as string)
              .maybeSingle();
            const apiKey = String((profile as Record<string, unknown>)?.sio_user_api_key ?? "").trim();
            if (!apiKey) return;
            await applyTagToContact(apiKey, email, shareTagName);
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
