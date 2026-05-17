// lib/customDomains.ts
//
// Pure helpers shared by the custom-domain API routes, the request
// middleware and (soon) the Settings UI. Kept dependency-light so the
// middleware bundle stays small and so server components can import
// the types without pulling Node-only modules.
//
// The middleware imports from this file and runs on the Edge runtime,
// where `node:dns` does not exist. Any Node-only API used by API
// routes (e.g. verifyDomainDns) is loaded via `await import(...)`
// inside the function body so the static module graph the Edge
// bundler walks stays clean.

export type CustomDomainStatus = "pending_dns" | "verified" | "failed";

export type CustomDomainRow = {
  id: string;
  user_id: string;
  hostname: string;
  status: CustomDomainStatus;
  dns_target: string;
  error_message: string | null;
  last_checked_at: string | null;
  verified_at: string | null;
  ssl_issued_at: string | null;
  created_at: string;
  updated_at: string;
};

// Hostnames we control directly. A request whose Host matches one of
// these bypasses the custom-domain lookup entirely (normal routing).
// Keep this list in sync with the Caddyfile vhosts.
export const OWN_HOSTS: ReadonlySet<string> = new Set([
  "app.tiquiz.com",
  "tiquiz.com",
  "www.tiquiz.com",
  "quiz.tipote.com",
  "tus.tiquiz.com",
  "videos.tiquiz.com",
  "connect.tiquiz.com",
  // dev / preview
  "localhost",
  "127.0.0.1",
]);

/** Strip port + lowercase. Returns null when Host is unparseable. */
export function normaliseHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.split(":")[0] ?? null;
}

export function isOwnHost(host: string | null | undefined): boolean {
  const h = normaliseHost(host);
  if (!h) return true; // absent Host = treat as own to avoid edge churn
  return OWN_HOSTS.has(h);
}

// FQDN validation (max 253 chars, each label 1-63 chars, TLD 2+ letters).
// Rejects schemes, ports, paths, IPs, single-label hosts.
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function isValidHostname(raw: string): boolean {
  return HOSTNAME_RE.test(raw.toLowerCase().trim());
}

// Verification target. Configurable so the VPS can change IP without
// a code redeploy. The CNAME is informational (shown in the UI); the
// real DNS check is against the IP that the chain resolves to.
export const DNS_TARGET_IP =
  process.env.CUSTOM_DOMAIN_TARGET_IP ?? "82.25.115.166";
export const DNS_TARGET_CNAME =
  process.env.CUSTOM_DOMAIN_TARGET_CNAME ?? "connect.tiquiz.com";

export type DnsCheckResult = {
  ok: boolean;
  resolvedIps: string[];
  error?: string;
};

/**
 * Resolves the A records for `hostname` and checks one matches our VPS
 * IP. Works for both apex domains (A record straight to us) and
 * subdomains CNAMEd to our `connect.tiquiz.com` — the OS resolver
 * follows the CNAME chain transparently.
 *
 * Returns the resolved IPs alongside the verdict so the UI can show
 * "you pointed it to X instead of Y" when the check fails.
 */
export async function verifyDomainDns(hostname: string): Promise<DnsCheckResult> {
  try {
    // Lazy-loaded so the Edge bundler used by middleware.ts never sees
    // a static `node:dns` import. API routes calling this run on the
    // Node runtime where the dynamic import resolves normally.
    const { promises: dns } = await import("node:dns");
    const resolvedIps = await dns.resolve4(hostname);
    return { ok: resolvedIps.includes(DNS_TARGET_IP), resolvedIps };
  } catch (e) {
    return { ok: false, resolvedIps: [], error: (e as Error).message };
  }
}

/**
 * Feature gate. Until the VPS has Caddy + on-demand TLS configured,
 * shipping the API / middleware is harmless because every public path
 * short-circuits unless this returns true. Flip the env var on the VPS
 * (no redeploy) when the infra is ready.
 */
export function customDomainsEnabled(): boolean {
  return process.env.CUSTOM_DOMAINS_ENABLED === "true";
}
