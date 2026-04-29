// app/api/quiz/[quizId]/route.ts
// Single quiz operations: GET detail, PATCH update, DELETE
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeSlug, sanitizeShareNetworks, BRAND_FONT_CHOICES } from "@/lib/quizBranding";
import { sanitizeRichText } from "@/lib/richText";
import { resolveQuizAuth } from "@/lib/embed/quizAuth";

// Fields accepting rich-text HTML (bold, italic, links, images, alignment).
const RICH_TEXT_FIELDS = ["introduction"] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ quizId: string }> };

// GET — quiz with questions, results, and leads
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const auth = await resolveQuizAuth(req, quizId);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Embed-mode visitors read through the service role (RLS doesn't
    // grant them anything because user_id IS NULL); user-mode keeps
    // its supabase client + RLS for defence in depth. Both paths
    // converge on the same table, the same shape, the same response.
    const supabase = auth.mode === "user"
      ? await getSupabaseServerClient()
      : supabaseAdmin;

    const baseQuiz = supabase.from("quizzes").select("*").eq("id", quizId);
    const quizQuery = auth.mode === "user"
      ? baseQuiz.eq("user_id", auth.userId)
      : baseQuiz.eq("embed_session_id", auth.sessionToken);

    const [quizRes, questionsRes, resultsRes, leadsRes] = await Promise.all([
      quizQuery.maybeSingle(),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order"),
      supabase.from("quiz_results").select("*").eq("quiz_id", quizId).order("sort_order"),
      // Anonymous quizzes have no leads — skip the round-trip.
      auth.mode === "user"
        ? supabase.from("quiz_leads").select("*").eq("quiz_id", quizId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    ]);

    if (!quizRes.data) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    // Build result title lookup
    const resultTitleMap = new Map<string, string>();
    for (const r of resultsRes.data ?? []) {
      resultTitleMap.set(r.id, r.title);
    }

    const leads = (leadsRes.data ?? []).map((l: Record<string, unknown>) => ({
      ...l,
      result_title: resultTitleMap.get(l.result_id as string) ?? null,
    }));

    return NextResponse.json({
      ok: true,
      quiz: {
        ...quizRes.data,
        questions: (questionsRes.data ?? []).map((q: Record<string, unknown>) => ({
          ...q,
          options: q.options as { text: string; result_index: number }[],
        })),
        results: resultsRes.data ?? [],
      },
      leads,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// PATCH — update quiz fields, questions, results
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const auth = await resolveQuizAuth(req, quizId);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // user-mode keeps RLS; embed-mode operates as service role with
    // an explicit embed_session_id filter so a forged quizId can
    // never reach a row that isn't this session's.
    const supabase = auth.mode === "user"
      ? await getSupabaseServerClient()
      : supabaseAdmin;

    const ownerCheck = supabase.from("quizzes").select("id").eq("id", quizId);
    const { data: existing } = await (auth.mode === "user"
      ? ownerCheck.eq("user_id", auth.userId)
      : ownerCheck.eq("embed_session_id", auth.sessionToken)).maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    // Embed visitors must not be able to publish (status=active),
    // pick a public slug, attach SIO tags / API keys, or otherwise
    // touch fields that only make sense once a real account owns
    // the quiz. We strip them here as an upfront gate so the rest
    // of the handler doesn't have to special-case the mode.
    if (auth.mode === "embed") {
      const FORBIDDEN_IN_EMBED = [
        "status", "slug", "sio_share_tag_name", "sio_api_key_id",
        "share_networks", "privacy_url", "consent_text",
      ] as const;
      for (const k of FORBIDDEN_IN_EMBED) delete body[k];
    }

    // Build patch
    const allowedFields = [
      "title", "introduction", "cta_text", "cta_url", "privacy_url",
      "consent_text", "virality_enabled", "bonus_description",
      "share_message", "bonus_image_url", "status", "sio_share_tag_name", "locale",
      "ask_first_name", "ask_gender",
      "address_form", "og_image_url", "og_description", "capture_heading", "capture_subtitle",
      "capture_first_name", "capture_last_name", "capture_phone", "capture_country",
      "show_consent_checkbox",
      "custom_footer_text", "custom_footer_url",
      "brand_font", "brand_color_primary", "brand_color_background",
      "start_button_text",
      "result_insight_heading", "result_projection_heading",
      "sio_api_key_id",
    ];

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in body) patch[key] = body[key];
    }

    // Sanitize rich-text fields server-side (defence in depth, browser already sanitizes)
    for (const key of RICH_TEXT_FIELDS) {
      if (key in patch && typeof patch[key] === "string") {
        patch[key] = sanitizeRichText(patch[key] as string);
      }
    }

    // Validate brand_font against whitelist (null = clear)
    if ("brand_font" in patch) {
      const val = patch.brand_font;
      if (val !== null && (typeof val !== "string" || !BRAND_FONT_CHOICES.includes(val as typeof BRAND_FONT_CHOICES[number]))) {
        patch.brand_font = null;
      }
    }

    // Validate hex colors (null = clear, otherwise must be #rgb or #rrggbb)
    const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    for (const key of ["brand_color_primary", "brand_color_background"] as const) {
      if (key in patch) {
        const val = patch[key];
        if (val !== null && (typeof val !== "string" || !hexRe.test(val))) patch[key] = null;
      }
    }

    // sio_api_key_id: must be a UUID owned by this user, or null. We re-check
    // ownership against sio_api_keys so the editor cannot smuggle a key-id
    // belonging to another user via a forged PATCH body.
    if ("sio_api_key_id" in patch) {
      const val = patch.sio_api_key_id;
      if (val === null || val === "") {
        patch.sio_api_key_id = null;
      } else if (typeof val !== "string" || !UUID_RE.test(val)) {
        return NextResponse.json({ ok: false, error: "Invalid sio_api_key_id" }, { status: 400 });
      } else {
        // sio_api_key_id is stripped from the body in embed mode (it's
        // a user-only field), so this branch only ever runs with
        // mode==="user". The narrowing here keeps TS happy without a
        // runtime guard the user path doesn't need.
        if (auth.mode !== "user") {
          return NextResponse.json({ ok: false, error: "Forbidden in embed mode" }, { status: 403 });
        }
        const { data: keyRow } = await supabase
          .from("sio_api_keys")
          .select("id")
          .eq("id", val)
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (!keyRow) {
          return NextResponse.json({ ok: false, error: "sio_api_key_id not found" }, { status: 400 });
        }
      }
    }

    // Slug: sanitize, verify uniqueness (case-insensitive) against other quizzes
    if ("slug" in body) {
      const raw = body.slug;
      if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
        patch.slug = null;
      } else {
        const cleaned = sanitizeSlug(raw);
        if (!cleaned) {
          return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
        }
        // Never allow a slug that looks like a UUID (would shadow direct /q/{id} access)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(cleaned)) {
          return NextResponse.json({ ok: false, error: "Slug cannot look like an ID" }, { status: 400 });
        }
        const { data: conflict } = await supabase
          .from("quizzes")
          .select("id")
          .ilike("slug", cleaned)
          .neq("id", quizId)
          .limit(1)
          .maybeSingle();
        if (conflict) {
          return NextResponse.json({ ok: false, error: "SLUG_TAKEN" }, { status: 409 });
        }
        patch.slug = cleaned;
      }
    }

    // Share networks: enum-filter + dedupe
    if ("share_networks" in body) {
      patch.share_networks = sanitizeShareNetworks(body.share_networks);
    }

    const { error } = await supabase.from("quizzes").update(patch).eq("id", quizId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Update questions if provided
    if (Array.isArray(body.questions)) {
      const ALLOWED_TYPES = new Set([
        "multiple_choice",
        "rating_scale",
        "star_rating",
        "free_text",
        "image_choice",
        "yes_no",
      ]);
      await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
      if ((body.questions as unknown[]).length > 0) {
        await supabase.from("quiz_questions").insert(
          (body.questions as Record<string, unknown>[]).map((q, i) => {
            const rawType = typeof q.question_type === "string" ? q.question_type : "multiple_choice";
            const question_type = ALLOWED_TYPES.has(rawType) ? rawType : "multiple_choice";
            return {
              quiz_id: quizId,
              question_text: String(q.question_text ?? ""),
              options: Array.isArray(q.options)
                ? (q.options as Record<string, unknown>[]).map((o) => {
                    const cleaned: Record<string, unknown> = {
                      text: String(o?.text ?? ""),
                      result_index: Number.isFinite(Number(o?.result_index)) ? Number(o?.result_index) : 0,
                    };
                    const tag = String(o?.sio_tag_name ?? "").trim();
                    if (tag) cleaned.sio_tag_name = tag;
                    if (typeof o?.image_url === "string" && o.image_url.trim()) {
                      cleaned.image_url = String(o.image_url).trim();
                    }
                    return cleaned;
                  })
                : [],
              sort_order: i,
              question_type,
              config: q.config && typeof q.config === "object" && !Array.isArray(q.config) ? q.config : {},
            };
          }),
        );
      }
    }

    // Update results if provided
    if (Array.isArray(body.results)) {
      await supabase.from("quiz_results").delete().eq("quiz_id", quizId);
      if ((body.results as unknown[]).length > 0) {
        await supabase.from("quiz_results").insert(
          (body.results as Record<string, unknown>[]).map((r, i) => ({
            quiz_id: quizId,
            title: String(r.title ?? ""),
            description: typeof r.description === "string" ? sanitizeRichText(r.description) : null,
            insight: typeof r.insight === "string" ? sanitizeRichText(r.insight) : null,
            projection: typeof r.projection === "string" ? sanitizeRichText(r.projection) : null,
            cta_text: r.cta_text ?? null,
            cta_url: r.cta_url ?? null,
            sio_tag_name: r.sio_tag_name ?? null,
            sio_course_id: r.sio_course_id ?? null,
            sio_community_id: r.sio_community_id ?? null,
            sort_order: i,
          })),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// DELETE — delete quiz (cascades to questions, results, leads)
// Embed mode (anonymous quizzes) deliberately rejects DELETE; the
// visitor doesn't own the row in any meaningful sense yet, and the
// embed_quiz_sessions GC job is responsible for purging orphans.
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const auth = await resolveQuizAuth(req, quizId);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.mode !== "user") {
      return NextResponse.json({ ok: false, error: "Forbidden in embed mode" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId)
      .eq("user_id", auth.userId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
