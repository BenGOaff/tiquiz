"use client";

// hooks/useShareDomain.ts
//
// Reads the creator's preferred share-link hostname from
// /api/profile/share-domain and exposes everything the share-tab UI
// needs to render a domain selector + build share URLs.
//
// Used by quiz / survey / popquiz editors so the same "pick which of
// my domains to share from" UI behaves identically across all three.
// The actual API logic + validation lives in app/api/profile/share-
// domain/route.ts — this hook is just a thin client cache + setter.
//
// Lifecycle:
//   - On mount: GET the user's options + effective default.
//   - On change: optimistically update local state, fire-and-forget
//     PATCH to persist (failures are silent — the next GET reconciles).
//
// `shareOrigin` is the value callers should concatenate with `/q/...`
// or `/p/...`. It's always https:// once we know a domain, and falls
// back to window.location.origin while the GET is pending so links
// aren't briefly relative.

import { useCallback, useEffect, useState } from "react";

export interface UseShareDomain {
  /** The selected hostname (e.g. "test.ethilife.fr"). null until the GET resolves. */
  shareDomain: string | null;
  /** All pickable hostnames. Length <= 1 means there's nothing to choose. */
  shareDomainOptions: string[];
  /**
   * The origin to prepend when building share URLs. Falls back to
   * window.location.origin until the GET resolves so links never
   * render as bare paths in the meantime.
   */
  shareOrigin: string;
  /** Updates local state immediately + persists the choice in the background. */
  setShareDomain: (next: string) => void;
}

export function useShareDomain(): UseShareDomain {
  const [shareDomain, setShareDomainState] = useState<string | null>(null);
  const [shareDomainOptions, setShareDomainOptions] = useState<string[]>([]);

  useEffect(() => {
    let aborted = false;
    fetch("/api/profile/share-domain")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted || !data?.ok) return;
        setShareDomainOptions(Array.isArray(data.options) ? data.options : []);
        setShareDomainState(
          typeof data.effectiveDefault === "string" ? data.effectiveDefault : null,
        );
      })
      .catch(() => { /* silent — selector just won't appear */ });
    return () => { aborted = true; };
  }, []);

  const setShareDomain = useCallback((next: string) => {
    setShareDomainState(next);
    fetch("/api/profile/share-domain", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: next }),
    }).catch(() => { /* silent — next GET reconciles */ });
  }, []);

  const shareOrigin = shareDomain
    ? `https://${shareDomain}`
    : (typeof window !== "undefined" ? window.location.origin : "");

  return { shareDomain, shareDomainOptions, shareOrigin, setShareDomain };
}
