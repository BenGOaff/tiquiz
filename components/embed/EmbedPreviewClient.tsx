"use client";

// components/embed/EmbedPreviewClient.tsx
// Orchestrator for the iframe-based sales-page preview. Manages the
// 4-phase funnel (form → generating → edit → publishing) and the
// data wiring against /api/embed/quiz/*. The actual UI is split into
// focused step components (EmbedForm, EmbedEditor, EmbedPaywall) so
// the look stays close to the rest of Tiquiz via shared shadcn UI.

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import EmbedForm from "./EmbedForm";
import EmbedEditor from "./EmbedEditor";
import EmbedPaywall from "./EmbedPaywall";
import { getEmbedStrings } from "./embed-i18n";
import type {
  EmbedInputs, EmbedLocale, EmbedPhase, EmbedQuiz,
} from "./embed-types";

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

function normalizeQuiz(raw: unknown): EmbedQuiz {
  const q = (raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {}) as EmbedQuiz;
  if (!Array.isArray(q.questions)) q.questions = [];
  q.questions = q.questions.map((qu) => ({
    ...qu,
    question_text: String((qu as { question_text?: string; text?: string }).question_text ?? (qu as { text?: string }).text ?? ""),
    options: Array.isArray(qu.options) ? qu.options.map((o) => ({ ...o, text: String(o.text || "") })) : [],
  }));
  if (!Array.isArray(q.results)) q.results = [];
  return q;
}

export default function EmbedPreviewClient({
  initialSessionToken, locale, source, checkoutUrl,
}: Props) {
  const t = getEmbedStrings(locale);
  const [phase, setPhase] = useState<EmbedPhase>(initialSessionToken ? "loading" : "form");
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [inputs, setInputs] = useState<EmbedInputs>(DEFAULT_INPUTS);
  const [quiz, setQuiz] = useState<EmbedQuiz | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [savedForLater, setSavedForLater] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // ── Hydrate from existing session ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!initialSessionToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/embed/quiz/${encodeURIComponent(initialSessionToken)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json?.ok && json?.quiz) {
          setQuiz(normalizeQuiz(json.quiz));
          setSavedForLater(!!json.saved_for_later);
          setPhase("edit");
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

  // ── Debounced save ──────────────────────────────────────────────
  const scheduleSave = useCallback((nextQuiz: EmbedQuiz, opts?: { savedForLater?: boolean }) => {
    if (!sessionToken) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        try { localStorage.setItem(STORAGE_KEY, sessionToken); } catch { /* private mode */ }
        await fetch("/api/embed/quiz/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            session_token: sessionToken,
            quiz: nextQuiz,
            saved_for_later: !!opts?.savedForLater,
          }),
        });
      } catch { /* silent */ }
    }, 1000);
  }, [sessionToken]);

  function handleQuizChange(next: EmbedQuiz) {
    setQuiz(next);
    scheduleSave(next);
  }

  // ── Submit form → SSE generate ──────────────────────────────────
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
          } else if (ev === "result" && payload.quiz) {
            const nq = normalizeQuiz(payload.quiz);
            setQuiz(nq);
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

  function handlePublish() {
    setPhase("publishing");
  }

  function handleUnlock() {
    if (!quiz) return;
    // Final save before bridging to the parent.
    scheduleSave(quiz, { savedForLater: true });
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    fetch("/api/embed/quiz/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_token: sessionToken,
        quiz,
        saved_for_later: true,
      }),
    }).catch(() => { /* fire-and-forget */ });

    // Tell the parent page to open its checkout. The bridge script
    // (public/embed/bridge.js) listens for this exact message type
    // and resolves the right pricing anchor for the host page.
    try {
      window.parent.postMessage({
        type: "tiquiz-embed-checkout",
        session_token: sessionToken,
        checkout_url: checkoutUrl,
      }, "*");
    } catch { /* sandboxed iframe — fall back to direct nav */ }

    // Direct fallback: if the parent doesn't have the bridge installed
    // we still send the visitor to the configured checkout URL with
    // the session token appended.
    try {
      const sep = checkoutUrl.includes("?") ? "&" : "?";
      const hashIdx = checkoutUrl.indexOf("#");
      const base = hashIdx === -1 ? checkoutUrl : checkoutUrl.slice(0, hashIdx);
      const hash = hashIdx === -1 ? "" : checkoutUrl.slice(hashIdx);
      const finalUrl = `${base}${sep}tq_session=${encodeURIComponent(sessionToken)}${hash}`;
      // Top-level navigation (escapes the iframe).
      window.top!.location.href = finalUrl;
    } catch { /* cross-origin top — bridge or _blank only */ }
  }

  function handleSaveForLater() {
    if (!quiz) return;
    fetch("/api/embed/quiz/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_token: sessionToken,
        quiz,
        saved_for_later: true,
      }),
    }).then(() => setSavedForLater(true)).catch(() => { /* silent */ });
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-background text-foreground p-4 sm:p-6 flex flex-col">
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 mr-2 animate-spin" /> {t.genConnect}
          </div>
        )}

        {phase === "form" && (
          <div className="flex-1 flex items-center justify-center">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Loader2 className="size-10 text-primary animate-spin mb-4" />
            <p className="font-semibold">{progress || t.genStep}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{t.genSub}</p>
          </div>
        )}

        {phase === "edit" && quiz && (
          <EmbedEditor
            locale={locale}
            quiz={quiz}
            onChange={handleQuizChange}
            onPublish={handlePublish}
          />
        )}

        {phase === "publishing" && quiz && (
          <EmbedPaywall
            locale={locale}
            quiz={quiz}
            sessionToken={sessionToken}
            savedForLater={savedForLater}
            onSaveForLater={handleSaveForLater}
            onUnlock={handleUnlock}
            onBack={() => setPhase("edit")}
          />
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          {t.poweredBy}{" "}
          <a href="https://www.tipote.fr/tiquiz" target="_blank" rel="noopener" className="font-semibold hover:underline">Tiquiz</a>
        </p>
      </div>
    </div>
  );
}
