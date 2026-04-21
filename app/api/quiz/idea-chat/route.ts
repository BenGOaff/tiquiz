// app/api/quiz/idea-chat/route.ts
// Conversational brainstorming endpoint for the "Pas d'idée ?" chat.
// Uses Haiku (cheap + fast) to guide the user in 4-5 turns, then emits a
// structured brief the main generator consumes. Hard-capped at 6 user turns.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { buildQuizChatSystemPrompt } from "@/lib/prompts/quiz/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MAX_USER_TURNS = 6;

type ChatMessage = { role: "user" | "assistant"; content: string };

function getClaudeApiKey(): string {
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY_OWNER?.trim() ||
    ""
  );
}

function getChatModel(): string {
  // Haiku = cheap + fast. Chat is a structured conversation, not creative work.
  return process.env.ANTHROPIC_CHAT_MODEL?.trim() || "claude-haiku-4-5-20251001";
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
  let messages: ChatMessage[];

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

    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    messages = rawMessages
      .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").slice(0, 2000),
      }))
      .filter((m) => m.content.trim().length > 0) as ChatMessage[];

    // Hard cap: count user turns only (system prompt is separate)
    const userTurnCount = messages.filter((m) => m.role === "user").length;
    if (userTurnCount > MAX_USER_TURNS) {
      return NextResponse.json(
        { ok: false, error: "Too many turns. Restart the conversation or use the direct form." },
        { status: 400 },
      );
    }

    // Fetch profile context to pre-seed the assistant
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("address_form, target_audience")
      .eq("user_id", user.id)
      .maybeSingle();

    const addressForm = profile?.address_form === "vous" ? "vous" : "tu";
    const targetAudience = String(profile?.target_audience ?? "").trim();
    const locale = String(body.locale ?? "fr");

    system = buildQuizChatSystemPrompt({ locale, addressForm, targetAudience });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }

  // SSE stream of assistant deltas
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendSSE(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const timeoutMs = 45_000;
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
              model: getChatModel(),
              max_tokens: 800,
              temperature: 0.6,
              system,
              messages,
              stream: true,
            }),
          });
        } catch (fetchErr) {
          const name = String((fetchErr as Error)?.name ?? "");
          if (name === "AbortError") {
            sendSSE("error", { ok: false, error: "Claude API timeout." });
            return;
          }
          throw fetchErr;
        } finally {
          clearTimeout(timer);
        }

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          console.error("[idea-chat] Claude API error:", res.status, errText.slice(0, 500));
          sendSSE("error", { ok: false, error: `Claude API error (${res.status}).` });
          return;
        }

        // Relay Anthropic SSE stream, extracting text deltas
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload) as Record<string, unknown>;
              if (parsed.type === "content_block_delta") {
                const delta = parsed.delta as Record<string, unknown> | undefined;
                if (delta?.type === "text_delta") {
                  const text = String(delta.text ?? "");
                  if (text) {
                    full += text;
                    sendSSE("delta", { text });
                  }
                }
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }

        // Try to extract a JSON brief from the final message
        let brief: Record<string, unknown> | null = null;
        const match = full.match(/```json\s*([\s\S]*?)```/);
        if (match) {
          try {
            brief = JSON.parse(match[1].trim()) as Record<string, unknown>;
          } catch {
            // Malformed JSON — ignore, the user will continue chatting
          }
        }

        sendSSE("done", { full, brief });
      } catch (e) {
        console.error("[idea-chat] SSE stream error:", e);
        sendSSE("error", { ok: false, error: e instanceof Error ? e.message : "Unknown error" });
      } finally {
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
