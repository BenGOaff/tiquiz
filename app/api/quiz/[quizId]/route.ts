// app/api/quiz/[quizId]/route.ts
// Single quiz operations: GET detail, PATCH update, DELETE
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeSlug, sanitizeShareNetworks, BRAND_FONT_CHOICES } from "@/lib/quizBranding";
import { isReservedPublicSlug } from "@/lib/publicSlug";
import { isSlugTakenByPopquiz } from "@/lib/publicSlugServer";
import { sanitizeRichText } from "@/lib/richText";
import {
  applyFrenchTypography,
  applyFrenchTypographyToHtml,
  isFrenchLocale,
} from "@/lib/frenchTypography";
import { resolveQuizAuth } from "@/lib/embed/quizAuth";
import { computeLockedLeadIds, redactLockedLead, type LeadLike } from "@/lib/leadLock";
import { isPaidPlan } from "@/lib/planLimits";

const RICH_TEXT_FIELDS = ["introduction"] as const;

// Plain-text quiz fields that benefit from French typography (title, CTAs,
// headings, descriptions stored as flat text). Keep this list explicit so a
// new column doesn't silently get the transform.
const FR_TYPO_PLAIN_FIELDS = [
  "title",
  "cta_text",
  "consent_text",
  "share_message",
  "bonus_description",
  "bonus_intro_text",
  "start_button_text",
  "result_insight_heading",
  "result_projection_heading",
  "capture_heading",
  "capture_subtitle",
  "og_description",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const auth = await resolveQuizAuth(req, quizId);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

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
      auth.mode === "user"
        ? supabase.from("quiz_leads").select("*").eq("quiz_id", quizId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    ]);

    if (!quizRes.data) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    const resultTitleMap = new Map<string, string>();
    for (const r of resultsRes.data ?? []) {
      resultTitleMap.set(r.id, r.title);
    }

    let lockedIds = new Set<string>();
    let plan = "free";
    if (auth.mode === "user") {
      const { data: planRow } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", auth.userId)
        .maybeSingle();
      plan = String((planRow as { plan?: string | null } | null)?.plan ?? "free");
      if (!isPaidPlan(plan)) {
        const { data: ownedQuizzes } = await supabase
          .from("quizzes")
          .select("id")
          .eq("user_id", auth.userId);
        const ownedQuizIds = (ownedQuizzes ?? []).map((q: { id: string }) => q.id);
        if (ownedQuizIds.length > 0) {
          const { data: timeline } = await supabase
            .from("quiz_leads")
            .select("id, created_at")
            .in("quiz_id", ownedQuizIds);
          lockedIds = computeLockedLeadIds(timeline ?? [], plan);
        }
      }
    }

    const leads = (leadsRes.data ?? []).map((l: Record<string, unknown>) => {
      const enriched = {
        ...l,
        result_title:
          resultTitleMap.get(l.result_id as string) ??
          (l.result_title as string | null) ??
          null,
      };
      const locked = lockedIds.has(l.id as string);
      return locked
        ? redactLockedLead({ ...enriched, locked: true } as unknown as LeadLike & { locked: true })
        : { ...enriched, locked: false };
    });

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
      plan,
      locked_count: lockedIds.size,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

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

    const supabase = auth.mode === "user"
      ? await getSupabaseServerClient()
      : supabaseAdmin;

    // Fetch the existing locale alongside the ownership check so the
    // typography pass below knows which language to apply rules for, even
    // when the PATCH body doesn't change the locale.
    const ownerCheck = supabase
      .from("quizzes")
      .select("id, locale")
      .eq("id", quizId);
    const { data: existing } = await (auth.mode === "user"
      ? ownerCheck.eq("user_id", auth.userId)
      : ownerCheck.eq("embed_session_id", auth.sessionToken)).maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    if (auth.mode === "embed") {
      const FORBIDDEN_IN_EMBED = [
        "status", "slug", "sio_share_tag_name", "sio_api_key_id",
        "share_networks", "privacy_url", "consent_text",
      ] as const;
      for (const k of FORBIDDEN_IN_EMBED) delete body[k];
    }

    const allowedFields = [
      "title", "introduction", "cta_text", "cta_url", "privacy_url",
      "consent_text", "virality_enabled", "bonus_description",
      "bonus_intro_text",
      "share_message", "bonus_image_url", "bonus_unlocked_message", "status", "sio_share_tag_name", "locale",
      "ask_first_name", "ask_gender",
      "address_form", "og_image_url", "og_description", "capture_heading", "capture_subtitle",
      "capture_first_name", "capture_last_name", "capture_phone", "capture_country",
      "phone_required", "first_name_required", "last_name_required", "country_required",
      "show_consent_checkbox",
      "show_results_breakdown",
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

    for (const key of RICH_TEXT_FIELDS) {
      if (key in patch && typeof patch[key] === "string") {
        patch[key] = sanitizeRichText(patch[key] as string);
      }
    }

    if ("brand_font" in patch) {
      const val = patch.brand_font;
      if (val !== null && (typeof val !== "string" || !BRAND_FONT_CHOICES.includes(val as typeof BRAND_FONT_CHOICES[number]))) {
        patch.brand_font = null;
      }
    }

    const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    for (const key of ["brand_color_primary", "brand_color_background"] as const) {
      if (key in patch) {
        const val = patch[key];
        if (val !== null && (typeof val !== "string" || !hexRe.test(val))) patch[key] = null;
      }
    }

    if ("sio_api_key_id" in patch) {
      const val = patch.sio_api_key_id;
      if (val === null || val === "") {
        patch.sio_api_key_id = null;
      } else if (typeof val !== "string" || !UUID_RE.test(val)) {
        return NextResponse.json({ ok: false, error: "Invalid sio_api_key_id" }, { status: 400 });
      } else {
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

    if ("slug" in body) {
      const raw = body.slug;
      if (raw === null || (typeof raw === "string" && raw.trim() === "")) {
        patch.slug = null;
      } else {
        const cleaned = sanitizeSlug(raw);
        if (!cleaned) {
          return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
        }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(cleaned)) {
          return NextResponse.json({ ok: false, error: "Slug cannot look like an ID" }, { status: 400 });
        }
        // Reserved root paths (api, embed, robots.txt, dashboard…) —
        // on a creator's custom domain the slug sits at the URL root,
        // so anything in this list would shadow real routes.
        if (isReservedPublicSlug(cleaned)) {
          return NextResponse.json({ ok: false, error: "SLUG_RESERVED" }, { status: 409 });
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
        // Cross-type collision: a popquiz of the same user owning
        // this slug would make the custom-domain catch-all ambiguous
        // (test.ethilife.fr/foo could be either). Refuse the rename.
        // Only meaningful in user mode — embed-flow drafts are
        // anonymous and don't yet belong to a creator account.
        if (auth.mode === "user" && await isSlugTakenByPopquiz(auth.userId, cleaned)) {
          return NextResponse.json({ ok: false, error: "SLUG_TAKEN" }, { status: 409 });
        }
        patch.slug = cleaned;
      }
    }

    if ("share_networks" in body) {
      patch.share_networks = sanitizeShareNetworks(body.share_networks);
    }

    // FRENCH TYPOGRAPHY (Gwenn bug 2026-05-02): in French, a non-breaking
    // space precedes "strong" punctuation (`:`, `;`, `!`, `?`, `»`). The
    // regular ASCII space gets stripped or visually collapsed by
    // contentEditable normalization and Word paste, so we substitute a
    // hard NBSP at save time when the quiz's locale is French. Idempotent
    // — calling the helper twice yields the same string.
    const effectiveLocale =
      typeof patch.locale === "string"
        ? patch.locale
        : ((existing as { locale?: string | null }).locale ?? null);
    if (isFrenchLocale(effectiveLocale)) {
      for (const field of FR_TYPO_PLAIN_FIELDS) {
        if (typeof patch[field] === "string") {
          patch[field] = applyFrenchTypography(
            patch[field] as string,
            effectiveLocale,
          );
        }
      }
      for (const field of RICH_TEXT_FIELDS) {
        if (typeof patch[field] === "string") {
          patch[field] = applyFrenchTypographyToHtml(
            patch[field] as string,
            effectiveLocale,
          );
        }
      }
    }

    const { error } = await supabase.from("quizzes").update(patch).eq("id", quizId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    if ("questions" in body) {
      if (!Array.isArray(body.questions)) {
        return NextResponse.json(
          { ok: false, error: "INVALID_QUESTIONS_PAYLOAD", message: "questions must be an array" },
          { status: 400 },
        );
      }

      const incoming = body.questions as Record<string, unknown>[];

      const { data: snapshot, error: snapshotErr } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId);
      if (snapshotErr) {
        return NextResponse.json(
          { ok: false, error: "SNAPSHOT_FAILED", message: snapshotErr.message },
          { status: 500 },
        );
      }
      const snapshotRows = snapshot ?? [];

      if (incoming.length === 0 && snapshotRows.length > 0) {
        console.error(`[quiz PATCH] REFUSED empty-array wipe of ${snapshotRows.length} questions for quiz ${quizId}`);
        return NextResponse.json(
          {
            ok: false,
            error: "EMPTY_QUESTIONS_WIPE_REFUSED",
            message: "Refus de remplacer toutes tes questions par une liste vide. Recharge la page pour récupérer ta dernière version.",
          },
          { status: 400 },
        );
      }

      const ALLOWED_TYPES = new Set([
        "multiple_choice",
        "rating_scale",
        "star_rating",
        "free_text",
        "image_choice",
        "yes_no",
      ]);

      const sanitized = incoming.map((q, i) => {
        const rawType = typeof q.question_type === "string" ? q.question_type : "multiple_choice";
        const question_type = ALLOWED_TYPES.has(rawType) ? rawType : "multiple_choice";
        const questionText = applyFrenchTypography(
          String(q.question_text ?? ""),
          effectiveLocale,
        );
        return {
          quiz_id: quizId,
          question_text: questionText,
          options: Array.isArray(q.options)
            ? (q.options as Record<string, unknown>[]).map((o) => {
                const cleaned: Record<string, unknown> = {
                  text: applyFrenchTypography(
                    String(o?.text ?? ""),
                    effectiveLocale,
                  ),
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
      });

      const { error: deleteErr } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quizId);
      if (deleteErr) {
        return NextResponse.json(
          { ok: false, error: "DELETE_FAILED", message: deleteErr.message },
          { status: 500 },
        );
      }

      if (sanitized.length > 0) {
        const { error: insertErr } = await supabase.from("quiz_questions").insert(sanitized);
        if (insertErr) {
          console.error(`[quiz PATCH] Insert failed for quiz ${quizId}, attempting snapshot restore:`, insertErr.message);
          if (snapshotRows.length > 0) {
            const { error: restoreErr } = await supabase
              .from("quiz_questions")
              .insert(snapshotRows.map((r: Record<string, unknown>) => {
                const { created_at: _ca, updated_at: _ua, ...rest } = r as Record<string, unknown>;
                void _ca; void _ua;
                return rest;
              }));
            if (restoreErr) {
              console.error(`[quiz PATCH] CATASTROPHIC: snapshot restore also failed for quiz ${quizId}:`, restoreErr.message);
              return NextResponse.json(
                {
                  ok: false,
                  error: "INSERT_AND_RESTORE_FAILED",
                  message: "Sauvegarde échouée et restauration aussi. Ton éditeur a la version actuelle — ne quitte pas la page et réessaie.",
                  insert_error: insertErr.message,
                  restore_error: restoreErr.message,
                },
                { status: 500 },
              );
            }
          }
          return NextResponse.json(
            { ok: false, error: "INSERT_FAILED_RESTORED", message: `Sauvegarde échouée (${insertErr.message}), ta version précédente a été restaurée.` },
            { status: 500 },
          );
        }
      }
    }

    if ("results" in body) {
      if (!Array.isArray(body.results)) {
        return NextResponse.json(
          { ok: false, error: "INVALID_RESULTS_PAYLOAD", message: "results must be an array" },
          { status: 400 },
        );
      }

      const incoming = body.results as Record<string, unknown>[];

      const { data: snapshot, error: snapshotErr } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("quiz_id", quizId);
      if (snapshotErr) {
        return NextResponse.json(
          { ok: false, error: "SNAPSHOT_FAILED", message: snapshotErr.message },
          { status: 500 },
        );
      }
      const snapshotRows = (snapshot ?? []) as Array<{ id: string; title: string }>;

      if (incoming.length === 0 && snapshotRows.length > 0) {
        console.error(`[quiz PATCH] REFUSED empty-array wipe of ${snapshotRows.length} results for quiz ${quizId}`);
        return NextResponse.json(
          {
            ok: false,
            error: "EMPTY_RESULTS_WIPE_REFUSED",
            message: "Refus de remplacer tous tes résultats par une liste vide. Recharge la page pour récupérer ta dernière version.",
          },
          { status: 400 },
        );
      }

      const existingIds = new Set(snapshotRows.map((r) => r.id));

      interface SanitizedResult {
        quiz_id: string;
        title: string;
        description: string | null;
        insight: string | null;
        projection: string | null;
        cta_text: string | null;
        cta_url: string | null;
        sio_tag_name: string | null;
        sio_course_id: string | null;
        sio_community_id: string | null;
        sort_order: number;
        image_url: string | null;
        image_position: string;
      }

      const toUpdate: Array<{ id: string; data: SanitizedResult }> = [];
      const toInsert: SanitizedResult[] = [];

      incoming.forEach((r, i) => {
        // Apply French typography to every text-bearing field. Plain
        // strings get the simple regex; description/insight/projection
        // are HTML and use the HTML-aware helper (same regex applied to
        // the whole payload — see lib/frenchTypography.ts for why that's
        // safe).
        const sanitized: SanitizedResult = {
          quiz_id: quizId,
          title: applyFrenchTypography(
            String(r.title ?? ""),
            effectiveLocale,
          ),
          description:
            typeof r.description === "string"
              ? applyFrenchTypographyToHtml(
                  sanitizeRichText(r.description),
                  effectiveLocale,
                )
              : null,
          insight:
            typeof r.insight === "string"
              ? applyFrenchTypographyToHtml(
                  sanitizeRichText(r.insight),
                  effectiveLocale,
                )
              : null,
          projection:
            typeof r.projection === "string"
              ? applyFrenchTypographyToHtml(
                  sanitizeRichText(r.projection),
                  effectiveLocale,
                )
              : null,
          cta_text:
            r.cta_text == null
              ? null
              : applyFrenchTypography(String(r.cta_text), effectiveLocale),
          cta_url: r.cta_url == null ? null : String(r.cta_url),
          sio_tag_name: r.sio_tag_name == null ? null : String(r.sio_tag_name),
          sio_course_id: r.sio_course_id == null ? null : String(r.sio_course_id),
          sio_community_id:
            r.sio_community_id == null ? null : String(r.sio_community_id),
          sort_order: i,
          // Hero image of the result (Adeline, mai 2026). Stored
          // as its own column on quiz_results — NOT inline in the
          // rich-text description. Position is one of 5 logical
          // slots (top / after_title / after_description /
          // after_insight / bottom).
          image_url:
            typeof r.image_url === "string" && r.image_url.trim()
              ? r.image_url.trim()
              : null,
          image_position: (() => {
            const allowed = ["top", "after_title", "after_description", "after_insight", "bottom"];
            const v = typeof r.image_position === "string" ? r.image_position : "top";
            return allowed.includes(v) ? v : "top";
          })(),
        };

        const incomingId =
          typeof r.id === "string" && UUID_RE.test(r.id) ? r.id : null;
        if (incomingId && existingIds.has(incomingId)) {
          toUpdate.push({ id: incomingId, data: sanitized });
        } else {
          toInsert.push(sanitized);
        }
      });

      const incomingIdSet = new Set(toUpdate.map((u) => u.id));
      const toDelete = snapshotRows.filter((r) => !incomingIdSet.has(r.id));

      for (const upd of toUpdate) {
        const { error: upErr } = await supabase
          .from("quiz_results")
          .update(upd.data)
          .eq("id", upd.id);
        if (upErr) {
          return NextResponse.json(
            { ok: false, error: "UPDATE_FAILED", message: upErr.message },
            { status: 500 },
          );
        }
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("quiz_results")
          .insert(toInsert);
        if (insErr) {
          return NextResponse.json(
            { ok: false, error: "INSERT_FAILED", message: insErr.message },
            { status: 500 },
          );
        }
      }

      if (toDelete.length > 0 && auth.mode === "user") {
        for (const r of toDelete) {
          const { error: titleErr } = await supabase
            .from("quiz_leads")
            .update({ result_title: r.title })
            .eq("result_id", r.id)
            .is("result_title", null);
          if (titleErr) {
            console.error(
              `[quiz PATCH] result_title backfill failed for result ${r.id} on quiz ${quizId}:`,
              titleErr.message,
            );
            return NextResponse.json(
              {
                ok: false,
                error: "LEAD_BACKFILL_FAILED",
                message: titleErr.message,
              },
              { status: 500 },
            );
          }
        }

        const deletedIds = toDelete.map((r) => r.id);
        const { error: nullErr } = await supabase
          .from("quiz_leads")
          .update({ result_id: null })
          .in("result_id", deletedIds);
        if (nullErr) {
          return NextResponse.json(
            { ok: false, error: "LEADS_NULL_FAILED", message: nullErr.message },
            { status: 500 },
          );
        }
      }

      if (toDelete.length > 0) {
        const deletedIds = toDelete.map((r) => r.id);
        const { error: delErr } = await supabase
          .from("quiz_results")
          .delete()
          .in("id", deletedIds);
        if (delErr) {
          return NextResponse.json(
            { ok: false, error: "DELETE_FAILED", message: delErr.message },
            { status: 500 },
          );
        }
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
