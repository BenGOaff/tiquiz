// app/api/quiz/generate/route.ts
// AI-powered quiz generation using Claude (Anthropic).
// Returns SSE stream with heartbeats to prevent proxy timeouts.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { buildQuizGenerationPrompt, buildQuizImportPrompt } from "@/lib/prompts/quiz/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

function getClaudeApiKey(): string {
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY_OWNER?.trim() ||
    ""
  );
}

function getClaudeModel(): string {
  return (
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514"
  );
}

export async function POST(req: NextRequest) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Claude API key missing on the server." },
      { status: 500 },
    );
  }

  let system: string;
  let userPrompt: string;

  try {
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

    // Two modes share this endpoint:
    //  - "generate" (default): creator fills a form → AI writes a quiz from scratch
    //  - "import": creator pastes raw content → AI structures it into a quiz
    const mode = String(body.mode ?? "generate").trim();
    const isImport = mode === "import";

    // Fetch user's branding profile for tone + target personalization
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("brand_tone, address_form, target_audience")
      .eq("user_id", user.id)
      .maybeSingle();

    const toneFromBody = String(body.tone ?? "").trim();
    const resolvedTone = toneFromBody || profile?.brand_tone || "inspirant";
    const resolvedAddressForm = body.addressForm === "vous" || body.addressForm === "tu"
      ? body.addressForm
      : (profile?.address_form ?? "tu");

    if (isImport) {
      const content = String(body.content ?? "").trim();
      if (!content) {
        return NextResponse.json({ ok: false, error: "content is required for import mode" }, { status: 400 });
      }
      if (content.length > 50_000) {
        return NextResponse.json({ ok: false, error: "content exceeds 50000 characters" }, { status: 400 });
      }
      const prompts = buildQuizImportPrompt({
        content,
        locale: String(body.locale ?? "fr"),
        addressForm: resolvedAddressForm === "vous" ? "vous" : "tu",
        tone: resolvedTone,
      });
      system = prompts.system;
      userPrompt = prompts.user;
    } else {
      const objective = String(body.objective ?? "").trim();
      const target = String(body.target ?? "").trim();
      if (!objective || !target) {
        return NextResponse.json(
          { ok: false, error: "objective and target are required" },
          { status: 400 },
        );
      }

      const format = body.format === "short" ? "short" : "long";
      const segmentation = body.segmentation === "level" ? "level" : "profile";
      const defaultQuestionCount = format === "short" ? 5 : 8;

      const prompts = buildQuizGenerationPrompt({
        objective,
        target,
        tone: resolvedTone,
        cta: String(body.cta ?? ""),
        bonus: String(body.bonus ?? ""),
        intention: String(body.intention ?? ""),
        questionCount: Math.min(12, Math.max(3, Number(body.questionCount) || defaultQuestionCount)),
        resultCount: Math.min(5, Math.max(2, Number(body.resultCount) || 3)),
        locale: String(body.locale ?? "fr"),
        addressForm: resolvedAddressForm === "vous" ? "vous" : "tu",
        format,
        segmentation,
      });
      system = prompts.system;
      userPrompt = prompts.user;
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }

  // SSE stream with heartbeats
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendSSE(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      const heartbeat = setInterval(() => {
        try { sendSSE("heartbeat", { status: "generating" }); } catch { /* stream closed */ }
      }, 5000);

      try {
        sendSSE("progress", { step: "Generating your quiz…" });

        const timeoutMs = 180_000;
        const abortController = new AbortController();
        const timer = setTimeout(() => abortController.abort(), timeoutMs);

        let res: Response;
        try {
          res = await fetch(CLAUDE_API_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            signal: abortController.signal,
            body: JSON.stringify({
              model: getClaudeModel(),
              max_tokens: 8000,
              temperature: 0.7,
              system,
              messages: [{ role: "user", content: userPrompt }],
            }),
          });
        } catch (fetchErr) {
          const name = String((fetchErr as Error)?.name ?? "");
          if (name === "AbortError") {
            sendSSE("error", { ok: false, error: `Claude API timeout after ${timeoutMs / 1000}s.` });
            return;
          }
          throw fetchErr;
        } finally {
          clearTimeout(timer);
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("[quiz/generate] Claude API error:", res.status, errText.slice(0, 500));
          if (res.status === 401) {
            sendSSE("error", { ok: false, error: "Anthropic API key is invalid or expired. Check ANTHROPIC_API_KEY in your environment." });
          } else if (res.status === 429) {
            sendSSE("error", { ok: false, error: "Too many requests to Claude. Retry in a few seconds." });
          } else {
            sendSSE("error", { ok: false, error: `Claude API error (${res.status}). Please retry.` });
          }
          return;
        }

        let json: Record<string, unknown>;
        try {
          json = await res.json() as Record<string, unknown>;
        } catch (parseErr) {
          console.error("[quiz/generate] Failed to parse Claude response as JSON:", parseErr);
          sendSSE("error", { ok: false, error: "Invalid Claude response. Please retry." });
          return;
        }

        const parts = Array.isArray(json?.content) ? json.content : [];
        const raw = (parts as Record<string, unknown>[])
          .map((p) => (p?.type === "text" ? String(p?.text ?? "") : ""))
          .filter(Boolean)
          .join("")
          .trim();

        if (!raw) {
          console.error("[quiz/generate] Empty response from Claude. stop_reason:", json?.stop_reason, "content length:", parts.length);
          sendSSE("error", { ok: false, error: "AI returned an empty response. Please retry." });
          return;
        }

        if (json?.stop_reason === "max_tokens") {
          sendSSE("error", { ok: false, error: "Generation was truncated. Try with fewer questions." });
          return;
        }

        // Robust JSON extraction
        let quiz: unknown;
        try {
          const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            quiz = JSON.parse(codeBlockMatch[1].trim());
          } else {
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            if (start !== -1 && end !== -1 && end > start) {
              quiz = JSON.parse(raw.slice(start, end + 1));
            } else {
              quiz = JSON.parse(raw);
            }
          }
        } catch {
          console.error("[quiz/generate] JSON extraction failed. Raw (first 500 chars):", raw.slice(0, 500));
          sendSSE("error", { ok: false, error: "AI returned invalid JSON. Please retry." });
          return;
        }

        sendSSE("result", { ok: true, quiz });
      } catch (e) {
        console.error("[quiz/generate] SSE stream error:", e);
        sendSSE("error", { ok: false, error: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
