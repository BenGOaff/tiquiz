"use client";

// components/dashboard/EmbedAutoClaim.tsx
// Bridge from the public sales-page embed to the user's dashboard.
//
// Flow:
//   1) On the sales page, the embed widget builds + saves a quiz
//      under a uuid session_token, stored in localStorage AND appended
//      to the checkout URL as ?tq_session=…
//   2) After purchase + signup, the user lands on /dashboard. We pick
//      the token up from either source and POST it to /api/embed/quiz/claim
//      with their auth cookie. The endpoint imports the draft into
//      `quizzes` + `quiz_questions` + `quiz_results` and marks the
//      embed session as claimed.
//   3) We clear the storage / URL param so subsequent reloads don't
//      re-trigger the call (claim is idempotent server-side anyway,
//      but the toast would re-fire).
//
// Mount once on the dashboard. It renders nothing when there's no
// pending token.

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const STORAGE_KEY = "tiquiz_embed_session";
const URL_PARAM = "tq_session";

export default function EmbedAutoClaim() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Guard against double-firing in React strict mode dev re-renders.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const fromUrl = searchParams.get(URL_PARAM);
    let fromStorage: string | null = null;
    try { fromStorage = localStorage.getItem(STORAGE_KEY); } catch { /* private mode */ }

    const token = (fromUrl || fromStorage || "").trim();
    if (!token) return;
    fired.current = true;

    (async () => {
      try {
        const res = await fetch("/api/embed/quiz/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_token: token }),
        });
        const json = await res.json().catch(() => ({}));

        // Always clear the bookkeeping so a refresh doesn't loop. Even
        // a 409 ("already claimed") means we're done with this token.
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
        if (fromUrl) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete(URL_PARAM);
          const qs = params.toString();
          router.replace(qs ? `?${qs}` : "?", { scroll: false });
        }

        if (res.ok && json?.ok && json?.quiz_id) {
          toast.success("Ton quiz t'attendait — il est dans ton compte ✨", {
            action: {
              label: "Ouvrir",
              onClick: () => router.push(`/quiz/${json.quiz_id}`),
            },
          });
          // Force the dashboard's quiz list to re-fetch.
          router.refresh();
        } else if (res.status === 404 || res.status === 409) {
          // 404 = stale token (old browser, session purged), 409 =
          // already claimed on a previous visit. Silent in both cases.
        } else if (json?.error) {
          console.warn("[EmbedAutoClaim]", res.status, json.error);
        }
      } catch (err) {
        console.warn("[EmbedAutoClaim] network error:", err);
      }
    })();
  }, [router, searchParams]);

  return null;
}
