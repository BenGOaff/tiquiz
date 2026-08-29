// lib/customDomains.ts
//
// Pure helpers shared by the custom-domain API routes, the request
// middleware and (soon) the Settings UI. Kept dependency-light so the
// middleware bundle stays small and so server components can import
// the types without pulling Node-only modules.
//
// The middleware imports from this file and runs on the Edge runtime,
// where `node:dns` (and the rest of node:*) is unavailable. Turbopack
// traces dynamic imports too, so the DNS verification helper lives in
// the sibling file lib/customDomainsServer.ts — only API routes (Node
// runtime) import that one.

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
  // Favicon servi dans l'onglet navigateur pour les routes publiques
  // de CE domaine. Si null, on retombe sur le favicon Tiquiz par défaut.
  favicon_url: string | null;
};

// Hostnames we control directly. A request whose Host matches one of
// these bypasses the custom-domain lookup entirely (normal routing).
// Keep this list in sync with the Caddyfile vhosts.
//
// The marketing tipote.com / .fr live on Systeme.io and never reach
// this server, so they are intentionally absent from this list — a
// request landing here with that Host would have to be spoofed.
export const OWN_HOSTS: ReadonlySet<string> = new Set([
  "quiz.tipote.com",
  "app.tipote.com",
  "n8n.tipote.com",
  "tus.tipote.com",
  "tus.quiz.tipote.com",
  "videos.tipote.com",
  "videos.quiz.tipote.com",
  "connect.tipote.com",
  // Nos domaines de vente (chantier du 20 aout). Sans eux, le portier
  // des domaines personnalises les prendrait pour le domaine d'une
  // creatrice et repondrait 404 a tout sauf a un slug de quiz.
  // A garder en phase avec SALES_HOSTS (lib/sales/salesHosts.ts) ET
  // avec les vhosts du Caddyfile.
  "tiquiz.fr",
  "www.tiquiz.fr",
  // Le centre de pilotage (29 aout). SANS CETTE LIGNE il repondrait 404
  // sur tout : le portier prendrait son hote pour le domaine d'une
  // creatrice, exactement le trou trouve le 24 aout sur les domaines de
  // vente. A garder en phase avec le rewrite de next.config.ts.
  "pilotage.tipote.com",
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
// a code redeploy.
//
// LE CNAME N'EST PLUS "INFORMATIONNEL" (drame Bene, 3 aout 2026). Il
// etait affiche a l'ecran comme la marche a suivre, mais le controle ne
// regardait que l'IP au bout de la chaine : on refusait donc des
// domaines configures exactement comme demande. C'est desormais la
// preuve PRINCIPALE, et l'IP le repli pour les domaines a l'apex.
export const DNS_TARGET_IP =
  process.env.CUSTOM_DOMAIN_TARGET_IP ?? "82.25.115.166";
export const DNS_TARGET_CNAME =
  process.env.CUSTOM_DOMAIN_TARGET_CNAME ?? "connect.tipote.com";

/**
 * Un hote CNAME est "le notre" s'il EST la cible, ou un sous-domaine
 * d'elle.
 *
 * Fonction PURE, et elle vit ici et pas dans customDomainsServer.ts
 * pour une raison qui a deja mordu : ce fichier-la porte `server-only`,
 * donc le runner de tests natif ne peut pas l'importer. Une regle qu'on
 * ne peut pas tester est une regle qui derive (cf. la section "filet de
 * tests logique" d'AGENTS.md).
 *
 * Le point dans `.${t}` n'est pas cosmetique : sans lui, un simple
 * `endsWith` accepterait `meconnect.tipote.com`, qui n'est pas a nous.
 */
export function isOurCnameTarget(
  candidate: string | null | undefined,
  target: string = DNS_TARGET_CNAME,
): boolean {
  const c = String(candidate ?? "").trim().toLowerCase().replace(/\.$/, "");
  const t = String(target ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!c || !t) return false;
  return c === t || c.endsWith(`.${t}`);
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
