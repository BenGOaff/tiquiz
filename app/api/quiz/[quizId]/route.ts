// app/api/quiz/[quizId]/route.ts
// Single quiz operations: GET detail, PATCH update, DELETE
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { sanitizeSlug, sanitizeShareNetworks, BRAND_FONT_CHOICES } from "@/lib/quizBranding";
import { sanitizeRichText } from "@/lib/richText";

// Fields accepting rich-text HTML (bold, italic, links, images, alignment).
const RICH_TEXT_FIELDS = ["introduction"] as const;

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ quizId: string }> };

// GET — quiz with questions, results, and leads
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [quizRes, questionsRes, resultsRes, leadsRes] = await Promise.all([
      supabase.from("quizzes").select("*").eq("id", quizId).eq("user_id", user.id).maybeSingle(),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order"),
      supabase.from("quiz_results").select("*").eq("quiz_id", quizId).order("sort_order"),
      supabase.from("quiz_leads").select("*").eq("quiz_id", quizId).order("created_at", { ascending: false }),
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
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    // Build patch
    const allowedFields = [
      "title", "introduction", "cta_text", "cta_url", "privacy_url",
      "consent_text", "virality_enabled", "bonus_description",
      "share_message", "bonus_image_url", "status", "sio_share_tag_name", "sio_capture_tag", "locale",
      "address_form", "og_image_url", "og_description", "capture_heading", "capture_subtitle",
      "capture_first_name", "capture_last_name", "capture_phone", "capture_country",
      "custom_footer_text", "custom_footer_url",
      "brand_font", "brand_color_primary", "brand_color_background",
      "start_button_text",
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
      await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
      if ((body.questions as unknown[]).length > 0) {
        await supabase.from("quiz_questions").insert(
          (body.questions as Record<string, unknown>[]).map((q, i) => ({
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
                  return cleaned;
                })
              : [],
            sort_order: i,
          })),
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
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId)
      .eq("user_id", user.id);

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
