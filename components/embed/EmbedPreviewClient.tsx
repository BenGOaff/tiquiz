"use client";

// components/embed/EmbedPreviewClient.tsx
// Orchestrator for the iframe-based sales-page preview. Manages the
// 3-phase funnel (form → generating → edit) and the
// data wiring against /api/embed/quiz/*. The actual UI is split into
// focused step components (EmbedForm, EmbedEditor, EmbedPaywall) so
// the look stays close to the rest of Tiquiz via shared shadcn UI.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import EmbedForm from "./EmbedForm";
import { getEmbedStrings } from "./embed-i18n";
import type {
  EmbedInputs, EmbedLocale, EmbedPhase,
} from "./embed-types";

// QuizDetailClient is heavy (drag-and-drop, dnd-kit, recharts in some
// imports). Code-split it so the form step doesn't pull the whole
// editor bundle on first paint.
const QuizDetailClient = dynamic(
  () => import("@/components/quiz/QuizDetailClient"),
  { ssr: false, loading: () => null },
);

type Props = {
  initialSessionToken: string;
  locale: EmbedLocale;
  source: string;
  checkoutUrl: string;
};

const STORAGE_KEY = "tiquiz_embed_session";

const DEFAULT_INPUTS: EmbedInputs = {
  topic: "", audience: "", objective: "qualifier",
  questionCount: 5, tone: "inspirant",
  askFirstName: false, askGender: false,
};

export default function EmbedPreviewClient({
  initialSessionToken, locale, source, checkoutUrl,
}: Props) {
  const t = getEmbedStrings(locale);
  const [phase, setPhase] = useState<EmbedPhase>(initialSessionToken ? "loading" : "form");
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [quizId, setQuizId] = useState<string>("");
  const [inputs, setInputs] = useState<EmbedInputs>(DEFAULT_INPUTS);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  // Persist the latest token in localStorage so the dashboard claim
  // hook (components/dashboard/EmbedAutoClaim.tsx) can pick it up
  // after signup.
  useEffect(() => {
    if (sessionToken) {
      try { localStorage.setItem("tiquiz_embed_session", sessionToken); } catch { /* private mode */ }
    }
  }, [sessionToken]);

  // QuizDetailClient calls window.parent.postMessage directly when
  // the visitor clicks 'Débloquer Tiquiz', which lands on the host
  // page's bridge.js (one window hop, no relay needed). The host
  // page's iframe data-checkout takes priority for the URL choice;
  // checkoutUrl here is the URL we initially passed to the iframe
  // src, kept as a hard fallback when the bridge isn't installed.
  void checkoutUrl;

  // ── Hydrate from existing session ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!initialSessionToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/embed/quiz/${encodeURIComponent(initialSessionToken)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json?.ok && json?.quiz_id) {
          // The session was generated post-migration: a real anonymous
          // quiz row is in place, mount QuizDetailClient against it.
          setQuizId(String(json.quiz_id));
          setPhase("edit");
        } else if (json?.ok && json?.quiz) {
          // Legacy session: only the JSON blob exists. Fall back to
          // the form so the visitor regenerates — we don't try to
          // back-fill the row server-side here.
          setPhase("form");
        } else {
          // Token gone (purged) — start fresh.
          setPhase("form");
        }
      } catch {
        setPhase("form");
      }
    })();
    return () => { cancelled = true; };
  }, [initialSessionToken]);

  // ── Submit form → SSE generate ──────────────────────────────────
  // Save / save-for-later helpers from the previous architecture are
  // gone: QuizDetailClient now PATCHes /api/quiz/[id]?embed=token
  // directly with its own debounce. Single source of truth.
  async function handleSubmit() {
    if (!inputs.topic || inputs.topic.trim().length < 3) {
      return setError(t.errTopic);
    }
    if (!inputs.audience || inputs.audience.trim().length < 2) {
      return setError(t.errAudience);
    }
    setError("");
    setPhase("generating");
    setProgress(t.genConnect);

    try {
      const res = await fetch("/api/embed/quiz/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: inputs.topic.trim(),
          audience: inputs.audience.trim(),
          objective: inputs.objective,
          questionCount: inputs.questionCount,
          tone: inputs.tone,
          askFirstName: inputs.askFirstName,
          askGender: inputs.askGender,
          locale,
          source,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        let msg = text || `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j?.error) msg = String(j.error);
        } catch { /* not JSON */ }
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let token = sessionToken;
      // Read SSE stream until we get a "result" or "error" event.
      // Other events (progress / heartbeat / session) are surfaced
      // as live progress text.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          let ev = "message", data = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          let payload: Record<string, unknown> = {};
          try { payload = JSON.parse(data); } catch { continue; }
          if (ev === "session" && typeof payload.session_token === "string") {
            token = payload.session_token;
            setSessionToken(token);
            try { localStorage.setItem(STORAGE_KEY, token); } catch { /* private mode */ }
          } else if (ev === "progress" && typeof payload.step === "string") {
            setProgress(payload.step);
          } else if (ev === "result" && typeof payload.quiz_id === "string") {
            // The route now materializes a real anonymous quiz row
            // and returns its id; we mount QuizDetailClient against
            // it. The legacy `quiz` JSON is also forwarded for
            // backward-compat but ignored here.
            setQuizId(payload.quiz_id);
            if (typeof payload.session_token === "string") setSessionToken(payload.session_token);
            setPhase("edit");
            return;
          } else if (ev === "error") {
            setError(typeof payload.error === "string" ? payload.error : t.errGeneric);
            setPhase("form");
            return;
          }
        }
      }
      // Stream ended without result event — treat as error.
      setError(t.errGeneric);
      setPhase("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
      setPhase("form");
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  // Edit phase is rendered full-bleed so QuizDetailClient gets the
  // whole iframe viewport (it uses h-screen + its own internal
  // grid). The earlier phases sit inside a centered, padded wrapper.
  if (phase === "edit" && quizId) {
    return <QuizDetailClient quizId={quizId} embedSessionToken={sessionToken} />;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Generous outer padding so neither the form nor the loader
          ever touches the iframe edge. The iframe itself carries the
          rounded corners + shadow — we keep the content area calm
          and centered with a comfortable gutter. */}
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col px-8 sm:px-12 py-10 sm:py-14">
        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 mr-2 animate-spin" /> {t.genConnect}
          </div>
        )}

        {phase === "form" && (
          <div className="flex-1 flex items-center justify-center py-4">
            <EmbedForm
              locale={locale}
              inputs={inputs}
              error={error}
              onChange={(p) => setInputs((i) => ({ ...i, ...p }))}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        {phase === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <Loader2 className="size-10 text-primary animate-spin mb-4" />
            <p className="font-semibold">{progress || t.genStep}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{t.genSub}</p>
          </div>
        )}
      </div>
    </div>
  );
}
