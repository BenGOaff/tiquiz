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
  /**
   * True when the selected domain is a creator's custom domain (not
   * the multi-tenant main host). The catch-all route at
   * app/[publicSlug] serves bare slugs on these, so share URLs can
   * drop the /q/ or /p/ prefix.
   */
  isCustomDomain: boolean;
  /**
   * Build the public share URL for a quiz or popquiz. On a custom
   * domain we drop the type prefix (`test.ethilife.fr/<slug>`); on
   * the main host we keep it (`quiz.tipote.com/q/<slug>`) because
   * the root is multi-tenant.
   */
  buildPublicUrl: (kind: "q" | "p", slug: string, suffix?: string) => string;
}

export function useShareDomain(): UseShareDomain {
  const [shareDomain, setShareDomainState] = useState<string | null>(null);
  const [shareDomainOptions, setShareDomainOptions] = useState<string[]>([]);
  const [mainHost, setMainHost] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    fetch("/api/profile/share-domain")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted || !data?.ok) return;
        setShareDomainOptions(Array.isArray(data.options) ? data.options : []);
        setMainHost(typeof data.mainHost === "string" ? data.mainHost : null);
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

  // "Is this a custom domain?" — true when the picked hostname is
  // neither the main host (per API) nor a development origin. We
  // err on the side of "no" during the brief pre-fetch window so
  // URLs render with the /q/ prefix until we know better, matching
  // the historical behaviour.
  const isCustomDomain =
    !!shareDomain && !!mainHost && shareDomain !== mainHost;

  const buildPublicUrl = useCallback(
    (kind: "q" | "p", slug: string, suffix = "") => {
      if (!shareOrigin) return `/${slug}${suffix}`;
      return isCustomDomain
        ? `${shareOrigin}/${slug}${suffix}`
        : `${shareOrigin}/${kind}/${slug}${suffix}`;
    },
    [shareOrigin, isCustomDomain],
  );

  return {
    shareDomain,
    shareDomainOptions,
    shareOrigin,
    setShareDomain,
    isCustomDomain,
    buildPublicUrl,
  };
}
