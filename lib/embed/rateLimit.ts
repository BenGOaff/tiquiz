// lib/embed/rateLimit.ts
// DB-backed rate limit for the public embed (no Redis dependency).
//
// We count rows in `embed_quiz_sessions` for a given (email | ip_hash)
// in the last hour. It's a single indexed query per call — cheaper
// than a Redis round-trip on Vercel and keeps the stack lean.
//
// IMPORTANT: this is a soft shield against accidental loops + cheap
// abuse, NOT a security boundary. Real abuse (botnets cycling IPs +
// throwaway emails) is mitigated upstream by Anthropic's own quota
// and by the cost-cap env var ANTHROPIC_EMBED_DAILY_BUDGET we read in
// the generate route.

import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const HOURLY_LIMIT_PER_EMAIL = 3;
const HOURLY_LIMIT_PER_IP = 10;

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // Salt with a server-side secret so the hash can't be rainbow-tabled
  // back to a raw IP if the DB ever leaks.
  const salt = process.env.EMBED_IP_HASH_SALT ?? "tiquiz-embed-default-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function clientIp(req: Request): string | null {
  // Vercel / most reverse proxies forward the real IP here.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "email" | "ip"; retryAfterSec: number };

export async function checkRateLimit(args: {
  email: string | null;
  ipHash: string | null;
}): Promise<RateLimitResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Per-email: the strongest signal. We only have an email at the
  // publish step (post-generation), so this branch only fires there.
  if (args.email) {
    const { count: emailCount } = await supabaseAdmin
      .from("embed_quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("email", args.email)
      .gte("created_at", oneHourAgo);

    if ((emailCount ?? 0) >= HOURLY_LIMIT_PER_EMAIL) {
      return { ok: false, reason: "email", retryAfterSec: 3600 };
    }
  }

  // Per-IP: the only signal we have at /generate. Drop the ceiling
  // a bit lower than the original 10/h since it's now load-bearing
  // (email cap doesn't kick in until /save).
  if (args.ipHash) {
    const { count: ipCount } = await supabaseAdmin
      .from("embed_quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", args.ipHash)
      .gte("created_at", oneHourAgo);

    if ((ipCount ?? 0) >= HOURLY_LIMIT_PER_IP) {
      return { ok: false, reason: "ip", retryAfterSec: 3600 };
    }
  }

  return { ok: true };
}
