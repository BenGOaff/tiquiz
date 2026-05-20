// lib/publicUrl.ts
//
// Build the canonical public URL for the current request, honouring the
// custom-domain header set by middleware. Used by every public-facing
// route's generateMetadata() so that `og:url` and `<link rel="canonical">`
// match the actual hostname the visitor / scraper landed on.
//
// Why this matters: Next.js `metadataBase` in app/layout.tsx is a single
// static URL (https://tiquiz.com / https://quiz.tipote.com). When a quiz
// is served through a creator's custom domain, Next would still emit
// og:url pointing to the main host — iMessage / WhatsApp / Slack read
// og:url to display the hostname under the share preview, so creators
// who paid for a branded domain were seeing `quiz.tipote.com` in every
// share preview. Setting og:url + canonical explicitly fixes that.
//
// Falls back to returning `null` when the host header is missing
// (e.g. SSG/ISR contexts) so callers can skip the override and let
// metadataBase do its thing.

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function buildCanonicalUrl(path: string): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  // Trust the upstream proxy's protocol indication (Caddy sets this).
  // Default to https because every production request to a public page
  // is HTTPS; on localhost the missing header falls back to https which
  // is harmless in dev metadata.
  const proto = h.get("x-forwarded-proto") || "https";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${proto}://${host}${p}`;
}

// ─── Branding override pour les meta sociales ──────────────────────
// Quand un creator a un custom domain vérifié, on ne veut PLUS aucune
// mention "Tiquiz" dans les aperçus iMessage / WhatsApp / FB / etc.
// (Adeline, 19 mai 2026 : "si l'user met son domaine il ne veut plus
// voir de trace de tiquiz"). Cette fonction résout l'override par
// owner : son `share_site_name` s'il l'a renseigné, sinon le hostname
// vérifié comme fallback intelligent. Retourne `null` quand l'user
// n'a pas de custom domain → la route applique le siteName par défaut
// "Tiquiz" via app/layout.tsx (comportement historique préservé).

export type OwnerBranding = {
  /** Hostname custom domain (lower-case, sans port) — ex: "quiz.adelinecirade.com". */
  customHost: string;
  /** Nom de marque user-éditable (ex: "Adeline Cirade"). Null si pas rempli. */
  siteName: string | null;
  /** Favicon custom à afficher dans l'onglet navigateur. Null = on retombe
   *  sur le favicon Tiquiz par défaut (app/layout.tsx). Décision Béné
   *  (23 mai 2026) : favicon custom UNIQUEMENT quand custom domain. */
  faviconUrl: string | null;
};

/** Lookup owner branding from the user_id of a quiz/popquiz owner. */
export async function fetchOwnerBranding(userId: string): Promise<OwnerBranding | null> {
  const [{ data: cd }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("custom_domains")
      .select("hostname")
      .eq("user_id", userId)
      .eq("status", "verified")
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("share_site_name, brand_favicon_url")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const host = (cd as { hostname?: string | null } | null)?.hostname?.toLowerCase().trim();
  if (!host) return null;
  const p = profile as { share_site_name?: string | null; brand_favicon_url?: string | null } | null;
  const siteName = p?.share_site_name?.trim() ?? null;
  const favicon = p?.brand_favicon_url?.trim() ?? null;
  return {
    customHost: host,
    siteName: siteName && siteName.length > 0 ? siteName : null,
    faviconUrl: favicon && favicon.length > 0 ? favicon : null,
  };
}

/** Compute the effective site_name to display in og:site_name + <title> suffix. */
export function effectiveSiteName(branding: OwnerBranding | null, fallbackHost: string): string {
  if (!branding) return "Tiquiz"; // owner on main host → historical behaviour
  return branding.siteName || branding.customHost || fallbackHost;
}

