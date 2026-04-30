// lib/systemeIoClient.ts
// Platform-level Systeme.io API client for Tiquiz — used for back-office
// actions like cancelling a creator's subscription. The key here is the
// PLATFORM key (Ben's account that owns the offers), not the per-user
// API key used in `lib/sio/userApiClient.ts` for tagging contacts.
//
// PORTED FROM tipote-app/lib/systemeIoClient.ts. Keep both copies in sync
// when SIO changes their API surface.

const API_BASE = (process.env.SYSTEME_IO_API_BASE ?? "https://api.systeme.io/api").replace(/\/+$/, "");

/**
 * Lazy API key resolution: we don't want to crash the entire app at boot
 * if the env var isn't configured yet. The cancel/list routes will return
 * a clean 503 instead. Same shape as the Tipote helper.
 */
function requireApiKey(): string {
  const key = process.env.SYSTEME_IO_API_KEY?.trim();
  if (!key) {
    throw new Error("SYSTEME_IO_API_KEY is not set — billing actions disabled.");
  }
  return key;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined | null>): string {
  const full = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const url = new URL(full);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      const s = String(v);
      if (s.trim() === "") continue;
      url.searchParams.set(k, s);
    }
  }
  return url.toString();
}

async function sioRequest<T>(
  path: string,
  options: { method?: string; query?: Record<string, string | number | undefined | null>; body?: unknown } = {},
): Promise<T> {
  const apiKey = requireApiKey();
  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(options.body);
  }
  const res = await fetch(url, { method: options.method ?? "GET", headers, body: payload });
  const text = await res.text();

  if (!res.ok) {
    let parsed: unknown;
    try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
    console.error("[SIO API]", res.status, res.statusText, "for", url, parsed);
    const err = new Error(`Systeme.io API error ${res.status}: ${res.statusText}`);
    (err as any).status = res.status;
    (err as any).url = url;
    (err as any).responseBody = parsed;
    throw err;
  }
  if (!text) return undefined as unknown as T;
  try { return JSON.parse(text) as T; } catch (e) {
    console.error("[SIO API] JSON parse failed for", url, "raw:", text);
    throw e;
  }
}

// ── Types ─────────────────────────────────────────────────────────

export type SystemeIoCancelMode = "Now" | "WhenBillingCycleEnds";

export interface SystemeIoSubscription {
  id: string | number;
  status?: string;
  cancelAt?: string | null;
  currentPeriodEnd?: string | null;
  [k: string]: any;
}

interface SioCollection<T> { items?: T[]; hasMore?: boolean; [k: string]: any }

function normalizeCollection<T>(raw: SioCollection<T> | T[] | any): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && Array.isArray(raw.items)) return raw.items as T[];
  return [];
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Find a contact by email. Returns null if not found.
 */
export async function findContactByEmail(email: string): Promise<{ id: number } | null> {
  const lower = email.trim().toLowerCase();
  if (!lower) return null;
  const raw = await sioRequest<SioCollection<{ id: number; email: string }>>(`/contacts`, {
    query: { email: lower, limit: 10 },
  });
  const items = normalizeCollection<{ id: number; email: string }>(raw);
  const exact = items.find((c) => String(c.email ?? "").toLowerCase() === lower);
  return exact ? { id: Number(exact.id) } : null;
}

/**
 * List subscriptions for a contact. Most-recent first.
 */
export async function listSubscriptionsForContact(
  contactId: number,
  options: { limit?: number; order?: "asc" | "desc" } = {},
): Promise<SystemeIoSubscription[]> {
  if (!Number.isFinite(contactId) || contactId < 1) {
    throw new Error(`Invalid Systeme.io contact id: ${contactId}`);
  }
  const limit = Math.max(10, Math.min(100, Math.floor(options.limit ?? 50)));
  const raw = await sioRequest<SioCollection<SystemeIoSubscription>>(`/payment/subscriptions`, {
    query: { contact: contactId, limit, order: options.order ?? "desc" },
  });
  return normalizeCollection<SystemeIoSubscription>(raw);
}

/**
 * Cancel a subscription. `WhenBillingCycleEnds` keeps access until the
 * paid period ends (recommended); `Now` revokes immediately.
 *
 * POST /payment/subscriptions/{id}/cancel  body: { cancel: <mode> }
 */
export async function cancelSubscription(params: {
  id: string | number;
  cancel: SystemeIoCancelMode;
}): Promise<void> {
  const { id, cancel } = params;
  if (!id) throw new Error("Missing subscription id for cancellation");
  if (cancel !== "Now" && cancel !== "WhenBillingCycleEnds") {
    throw new Error(`Invalid cancel mode: ${cancel}`);
  }
  await sioRequest<void>(`/payment/subscriptions/${encodeURIComponent(String(id))}/cancel`, {
    method: "POST",
    body: { cancel },
  });
}
