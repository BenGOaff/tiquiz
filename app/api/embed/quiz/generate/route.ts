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

// Embed-specific defaults: short quiz (5 questions, 3 profiles) so the
// "wow" effect lands fast and Claude tokens stay cheap.
const EMBED_QUESTION_COUNT = 5;
const EMBED_RESULT_COUNT = 3;
const EMBED_MAX_TOKENS = 4000;

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

  const email = String(body.email ?? "").trim().toLowerCase();
  const topic = String(body.topic ?? "").trim();
  const audience = String(body.audience ?? "").trim();
  const objective = String(body.objective ?? "").trim();
  const locale = String(body.locale ?? "fr").trim();
  const source = String(body.source ?? "").trim().slice(0, 200) || null;

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: "Email invalide." }, { status: 400, headers });
  }
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
  // the lead. The row's id is the session_token returned to the
  // embed.
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
    return Response.json({ ok: false, error: "Impossible d'initialiser la session." }, { status: 500, headers });
  }
  const sessionToken = sessionRow.id as string;

  // Build the prompt via the same library the authenticated route
  // uses — single source of truth for tone, structure, JSON schema.
  const prompts = buildQuizGenerationPrompt({
    objective,
    target: audience,
    intention: topic,
    tone: "inspirant",
    questionCount: EMBED_QUESTION_COUNT,
    resultCount: EMBED_RESULT_COUNT,
    locale,
    addressForm: "tu",
    format: "short",
    segmentation: "profile",
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

        // Persist the freshly-generated draft so /save (the editor
        // PATCH) can update it and /claim (the post-checkout webhook)
        // can pick it up.
        await supabaseAdmin
          .from("embed_quiz_sessions")
          .update({ quiz })
          .eq("id", sessionToken);

        sse("result", { ok: true, quiz, session_token: sessionToken });
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
