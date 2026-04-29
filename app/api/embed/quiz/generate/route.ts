// app/api/embed/quiz/generate/route.ts
// PUBLIC quiz generation for the sales-page embed (systeme.io & co).
//
// Differences vs the authenticated /api/quiz/generate:
//   - No Supabase auth required.
//   - Email is captured up-front (the price of the magic).
//   - Rate-limited by email + IP (DB-backed, see lib/embed/rateLimit).
//   - Inputs are deliberately minimal (sujet / audience / objectif).
//     We map them onto the existing prompt builder so the prompt
//     library stays single-source-of-truth.
//   - Returns the generated quiz AND a session_token the embed reuses
//     for /save and /claim. We never expose the DB row id.
//   - Stream is SSE so the embed can show a "live writing" effect.

import { NextRequest } from "next/server";
import { buildQuizGenerationPrompt } from "@/lib/prompts/quiz/system";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { corsHeaders, preflight } from "@/lib/embed/cors";
import { checkRateLimit, clientIp, hashIp } from "@/lib/embed/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// The embed exposes generator knobs in step 1 (matches /quiz/new).
// Defaults are applied in the request handler when the visitor leaves
// a field at zero. Token cap stays low — even a 10-question quiz with
// 5 profiles fits comfortably.
const EMBED_MAX_TOKENS = 6000;

function getClaudeApiKey(): string {
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY_OWNER?.trim() ||
    ""
  );
}

function getClaudeModel(): string {
  // The embed runs on the public marketing surface so we default to
  // a fast/cheap model; the env var lets us promote to Sonnet if the
  // qualitative bar drifts.
  return (
    process.env.ANTHROPIC_EMBED_MODEL?.trim() ||
    "claude-haiku-4-5-20251001"
  );
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// Map the embed's free-text "audience" + "objectif" onto the exact
// shape buildQuizGenerationPrompt expects, without re-deriving the
// 16 strategic objectives here. We just whitelist the values.
const EMBED_OBJECTIVES = new Set([
  "engagement", "eduquer", "qualifier", "sensibiliser",
  "decouvrir", "tester", "diagnostiquer", "orienter",
]);

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Server is not configured for AI generation." },
      { status: 500, headers },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers });
  }

  // Email is OPTIONAL at this step now: the new funnel asks for it
  // only at the publish step, after the quiz is generated and edited
  // (Tally / Typeform pattern — don't sell before you've delighted).
  // If supplied we still store it; otherwise the row starts with a
  // NULL email and /save fills it in later.
  const rawEmail = String(body.email ?? "").trim().toLowerCase();
  const email = rawEmail && isValidEmail(rawEmail) ? rawEmail : null;
  const topic = String(body.topic ?? "").trim();
  const audience = String(body.audience ?? "").trim();
  const objective = String(body.objective ?? "").trim();
  const locale = String(body.locale ?? "fr").trim();
  const source = String(body.source ?? "").trim().slice(0, 200) || null;

  // Generator knobs the embed now exposes in step-1 (matches the
  // authenticated /quiz/new form so the quiz the visitor sees is
  // representative of what they get post-checkout).
  const questionCount = Math.min(10, Math.max(3, Number(body.questionCount) || 5));
  const resultCount = Math.min(5, Math.max(2, Number(body.resultCount) || 3));
  const format = body.format === "long" ? "long" : "short";
  const segmentation = body.segmentation === "level" ? "level" : "profile";
  const askFirstName = Boolean(body.askFirstName);
  const askGender = Boolean(body.askGender);
  const ALLOWED_TONES = new Set(["inspirant", "fun", "professionnel", "coach", "expert", "bienveillant"]);
  const toneRaw = String(body.tone ?? "inspirant").trim().toLowerCase();
  const tone = ALLOWED_TONES.has(toneRaw) ? toneRaw : "inspirant";
  const addressForm = body.addressForm === "vous" ? "vous" : "tu";

  if (topic.length < 3 || topic.length > 200) {
    return Response.json({ ok: false, error: "Le sujet doit faire entre 3 et 200 caractères." }, { status: 400, headers });
  }
  if (audience.length < 2 || audience.length > 200) {
    return Response.json({ ok: false, error: "Précise ton audience (2 à 200 caractères)." }, { status: 400, headers });
  }
  if (!EMBED_OBJECTIVES.has(objective)) {
    return Response.json({ ok: false, error: "Objectif inconnu." }, { status: 400, headers });
  }

  const ipHash = hashIp(clientIp(req));
  const rate = await checkRateLimit({ email, ipHash });
  if (!rate.ok) {
    return Response.json(
      {
        ok: false,
        error: rate.reason === "email"
          ? "Tu as déjà généré plusieurs quiz récemment. Reviens dans 1h ou commande Tiquiz pour des générations illimitées."
          : "Trop de requêtes depuis ton réseau. Réessaie dans 1h.",
      },
      { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  // Persist the session up-front: even if generation fails we keep
  // the row so the embed can /save edits onto it later. The row's
  // id is the session_token returned to the embed.
  const { data: sessionRow, error: insertErr } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .insert({
      email,
      inputs: { topic, audience, objective, locale },
      source,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (insertErr || !sessionRow) {
    console.error("[embed/generate] failed to create session:", insertErr);
    // Surface the actual Postgres error in the body so deployment
    // problems (table missing → "relation … does not exist", NOT NULL
    // violations on a stale schema, etc.) are diagnosable from the
    // browser console instead of being lost in the server logs.
    const detail = insertErr?.message
      || insertErr?.hint
      || (typeof insertErr === "string" ? insertErr : "Insertion impossible.");
    const isMissingTable = /relation .*embed_quiz_sessions.* does not exist/i.test(detail);
    const userMsg = isMissingTable
      ? "Tiquiz n'a pas encore appliqué la migration de l'embed. Demande à ton admin de pousser supabase/migrations/023 + 024."
      : "Impossible d'initialiser la session : " + detail;
    return Response.json({ ok: false, error: userMsg }, { status: 500, headers });
  }
  const sessionToken = sessionRow.id as string;

  // Build the prompt via the same library the authenticated route
  // uses — single source of truth for tone, structure, JSON schema.
  const prompts = buildQuizGenerationPrompt({
    objective,
    target: audience,
    intention: topic,
    tone,
    questionCount,
    resultCount,
    locale,
    addressForm,
    format,
    segmentation,
    askFirstName,
    askGender,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sse(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      const heartbeat = setInterval(() => {
        try { sse("heartbeat", { t: Date.now() }); } catch { /* closed */ }
      }, 5000);

      try {
        sse("session", { session_token: sessionToken });
        sse("progress", { step: "Ton quiz se construit…" });

        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 120_000);

        let res: Response;
        try {
          res = await fetch(CLAUDE_API_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            signal: abort.signal,
            body: JSON.stringify({
              model: getClaudeModel(),
              max_tokens: EMBED_MAX_TOKENS,
              temperature: 0.7,
              system: prompts.system,
              messages: [{ role: "user", content: prompts.user }],
            }),
          });
        } catch (err) {
          if ((err as Error)?.name === "AbortError") {
            sse("error", { ok: false, error: "L'IA a mis trop de temps. Réessaie." });
            return;
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("[embed/generate] Claude error", res.status, t.slice(0, 300));
          sse("error", { ok: false, error: "L'IA est momentanément indisponible. Réessaie dans quelques secondes." });
          return;
        }

        const json = await res.json() as Record<string, unknown>;
        const parts = Array.isArray(json?.content) ? json.content : [];
        const raw = (parts as Record<string, unknown>[])
          .map((p) => (p?.type === "text" ? String(p?.text ?? "") : ""))
          .join("")
          .trim();

        if (!raw) {
          sse("error", { ok: false, error: "Réponse IA vide. Réessaie." });
          return;
        }

        let quiz: unknown;
        try {
          const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlock) {
            quiz = JSON.parse(codeBlock[1].trim());
          } else {
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            quiz = start !== -1 && end > start
              ? JSON.parse(raw.slice(start, end + 1))
              : JSON.parse(raw);
          }
        } catch {
          sse("error", { ok: false, error: "JSON IA invalide. Réessaie." });
          return;
        }

        // Materialize the AI draft as a REAL anonymous quiz row
        // (user_id NULL, embed_session_id = sessionToken) so the
        // visitor edits via the same QuizDetailClient + endpoints
        // every Tiquiz user uses. The JSONB blob on the embed
        // session is kept as a safety net — saves through the
        // existing /api/embed/quiz/save still work for legacy clients.
        const draft = quiz as Record<string, unknown>;
        const draftQuestions = Array.isArray(draft.questions) ? draft.questions : [];
        const draftResults = Array.isArray(draft.results) ? draft.results : [];

        const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
        const brandFontRaw = typeof draft.brand_font === "string" ? draft.brand_font : "";
        const brandPrimaryRaw = typeof draft.brand_color_primary === "string" ? draft.brand_color_primary : "";
        const brandBgRaw = typeof draft.brand_color_background === "string" ? draft.brand_color_background : "";

        // The unique partial index on embed_session_id forbids two
        // anonymous quizzes per session. If a previous attempt left
        // one behind (rare — failed insert mid-flight), wipe it
        // first so the visitor isn't stuck on a stale generation.
        await supabaseAdmin
          .from("quizzes")
          .delete()
          .eq("embed_session_id", sessionToken);

        const { data: quizRow, error: quizInsertErr } = await supabaseAdmin
          .from("quizzes")
          .insert({
            user_id: null,
            embed_session_id: sessionToken,
            mode: "quiz",
            title: String(draft.title ?? "Mon quiz").slice(0, 200),
            introduction: typeof draft.introduction === "string"
              ? draft.introduction.slice(0, 2000)
              : (typeof draft.description === "string" ? draft.description.slice(0, 2000) : null),
            cta_text: typeof draft.cta_text === "string" ? draft.cta_text : null,
            cta_url: typeof draft.cta_url === "string" ? draft.cta_url : null,
            share_message: typeof draft.share_message === "string" ? draft.share_message : null,
            locale: typeof draft.locale === "string" ? draft.locale : locale,
            address_form: addressForm,
            ask_first_name: askFirstName,
            ask_gender: askGender,
            status: "draft",
            brand_font: brandFontRaw || null,
            brand_color_primary: HEX_RE.test(brandPrimaryRaw) ? brandPrimaryRaw : null,
            brand_color_background: HEX_RE.test(brandBgRaw) ? brandBgRaw : null,
          })
          .select("id")
          .single();

        if (quizInsertErr || !quizRow) {
          console.error("[embed/generate] quiz materialization failed:", quizInsertErr);
          sse("error", { ok: false, error: "Création du quiz impossible." });
          return;
        }

        // Insert questions + results. We use the same field shape the
        // authenticated POST /api/quiz uses so QuizDetailClient reads
        // them back identically — no special embed code path.
        if (draftQuestions.length > 0) {
          await supabaseAdmin.from("quiz_questions").insert(
            (draftQuestions as Record<string, unknown>[]).map((q, i) => ({
              quiz_id: quizRow.id,
              question_text: String(q.question_text ?? q.text ?? ""),
              options: Array.isArray(q.options) ? q.options : [],
              sort_order: i,
              question_type: "multiple_choice",
              config: {},
            })),
          );
        }
        if (draftResults.length > 0) {
          await supabaseAdmin.from("quiz_results").insert(
            (draftResults as Record<string, unknown>[]).map((r, i) => ({
              quiz_id: quizRow.id,
              title: String(r.title ?? ""),
              description: typeof r.description === "string" ? r.description : null,
              insight: typeof r.insight === "string" ? r.insight : null,
              projection: typeof r.projection === "string" ? r.projection : null,
              cta_text: typeof r.cta_text === "string" ? r.cta_text : null,
              cta_url: typeof r.cta_url === "string" ? r.cta_url : null,
              sort_order: i,
            })),
          );
        }

        // Mirror the JSON onto the embed session for the legacy /save
        // path. New clients ignore this column — they PATCH the real
        // quiz row directly.
        await supabaseAdmin
          .from("embed_quiz_sessions")
          .update({ quiz })
          .eq("id", sessionToken);

        sse("result", {
          ok: true,
          quiz,
          quiz_id: quizRow.id,
          session_token: sessionToken,
        });
      } catch (e) {
        console.error("[embed/generate] stream error:", e);
        sse("error", { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
