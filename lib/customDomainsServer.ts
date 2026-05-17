// lib/customDomainsServer.ts
//
// Node-runtime-only piece of the custom-domains feature: the actual
// DNS lookup. Kept separate from lib/customDomains.ts so the Edge
// middleware never pulls `node:dns` into its bundle (Turbopack traces
// dynamic imports too, so the split has to be at the module level).
//
// Only API routes that need to verify ownership should import from
// here. Everything else stays on lib/customDomains.ts.

import "server-only";
import { promises as dns } from "node:dns";

import { DNS_TARGET_IP } from "./customDomains";

export type DnsCheckResult = {
  ok: boolean;
  resolvedIps: string[];
  error?: string;
};

/**
 * Resolves the A records for `hostname` and checks one matches our VPS
 * IP. Works for both apex domains (A record straight to us) and
 * subdomains CNAMEd to our `connect.tipote.com` — the OS resolver
 * follows the CNAME chain transparently.
 *
 * Returns the resolved IPs alongside the verdict so the UI can show
 * "you pointed it to X instead of Y" when the check fails.
 */
export async function verifyDomainDns(hostname: string): Promise<DnsCheckResult> {
  try {
    const resolvedIps = await dns.resolve4(hostname);
    return { ok: resolvedIps.includes(DNS_TARGET_IP), resolvedIps };
  } catch (e) {
    return { ok: false, resolvedIps: [], error: (e as Error).message };
  }
}
