// app/api/cron/sio-reconcile/route.ts
//
// Daily reconciliation between Tiquiz `profiles.plan` and Systeme.io's
// view of each user's subscriptions. Catches the "lost webhook" failure
// mode: SIO fired SALE_NEW or SALE_CANCELED but our endpoint never got
// it (network blip, deploy mid-flight, …). Without this cron, that user
// stays misclassified — paying for access they don't have, or keeping
// access they no longer pay for.
//
// SAFETY: this cron NEVER auto-fixes plans. Auto-flipping a creator's
// plan from a remote system is too dangerous (a stale SIO state, a
// manually-granted plan, or a beta override would all be wiped). We
// LOG discrepancies and return them so Ben can review + act manually.
//
// Schedule via Vercel cron in vercel.json:
//   { "crons": [{ "path": "/api/cron/sio-reconcile", "schedule": "0 3 * * *" }] }

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { findContactByEmail, listSubscriptionsForContact } from "@/lib/systemeIoClient";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

// Plans that are NOT subscription-managed by SIO. Beta is granted manually
// for lifetime access, lifetime is the one-time-fee tier — both must be
// excluded from reconciliation or every run would flag them as drift.
const LIFETIME_PLANS: ReadonlySet<string> = new Set(["beta", "lifetime"]);

// Soft self-throttle so we don't burn through the SIO API quota in one
// burst. A few hundred ms per call is plenty for a daily run.
const PER_CALL_DELAY_MS = 150;

function authOk(req: NextRequest): boolean {
  // Vercel cron sends a Bearer token; an admin can also hit the route
  // manually with ?secret=<x> for ad-hoc reconciliation.
  if (!CRON_SECRET) return false;
  const expected = Buffer.from(CRON_SECRET);
  const tryEqual = (received: string | null | undefined) => {
    if (!received) return false;
    const a = Buffer.from(received);
    if (a.length !== expected.length) return false;
    return timingSafeEqual(a, expected);
  };
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return tryEqual(auth.slice(7));
  return tryEqual(req.nextUrl.searchParams.get("secret"));
}

type Discrepancy = {
  user_id: string;
  email: string;
  local_plan: string;
  sio_status: "no_contact" | "no_active_subscription" | "active_but_local_free" | "api_error";
  detail?: string;
};

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const discrepancies: Discrepancy[] = [];

  // Step 1: paid users locally — should each have an active SIO sub.
  const { data: paidRows, error: paidErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, plan")
    .not("plan", "is", null)
    .neq("plan", "free");

  if (paidErr) {
    return NextResponse.json({ ok: false, error: paidErr.message }, { status: 500 });
  }

  let checkedPaid = 0;
  for (const row of paidRows ?? []) {
    const email = String((row as { email?: string | null }).email ?? "").trim().toLowerCase();
    const plan = String((row as { plan?: string | null }).plan ?? "").toLowerCase();
    const userId = String((row as { user_id?: string }).user_id ?? "");
    if (!email || !userId) continue;

    // Skip lifetime cohorts — they're SUPPOSED to have no active SIO sub.
    if (LIFETIME_PLANS.has(plan)) continue;

    checkedPaid++;
    try {
      const contact = await findContactByEmail(email);
      if (!contact) {
        discrepancies.push({ user_id: userId, email, local_plan: plan, sio_status: "no_contact" });
        await sleep(PER_CALL_DELAY_MS);
        continue;
      }
      const subs = await listSubscriptionsForContact(contact.id);
      const hasActive = subs.some((s) => {
        const status = String(s.status ?? "").toLowerCase();
        return status === "active" || status === "trialing";
      });
      if (!hasActive) {
        discrepancies.push({ user_id: userId, email, local_plan: plan, sio_status: "no_active_subscription" });
      }
    } catch (e) {
      discrepancies.push({
        user_id: userId,
        email,
        local_plan: plan,
        sio_status: "api_error",
        detail: e instanceof Error ? e.message.slice(0, 200) : "unknown",
      });
    }
    await sleep(PER_CALL_DELAY_MS);
  }

  // Step 2: free users locally — quick spot-check of recent ones to
  // catch a missed NEW_SALE webhook. We bound this to the most-recent
  // 100 free users updated in the last 7 days to keep the runtime
  // predictable; a complete sweep would explode for high-volume accounts.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: freeRows } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, plan, updated_at")
    .or("plan.eq.free,plan.is.null")
    .gte("updated_at", sevenDaysAgo)
    .order("updated_at", { ascending: false })
    .limit(100);

  let checkedFree = 0;
  for (const row of freeRows ?? []) {
    const email = String((row as { email?: string | null }).email ?? "").trim().toLowerCase();
    const userId = String((row as { user_id?: string }).user_id ?? "");
    if (!email || !userId) continue;

    checkedFree++;
    try {
      const contact = await findContactByEmail(email);
      if (!contact) continue;
      const subs = await listSubscriptionsForContact(contact.id);
      const hasActive = subs.some((s) => {
        const status = String(s.status ?? "").toLowerCase();
        return status === "active" || status === "trialing";
      });
      if (hasActive) {
        discrepancies.push({
          user_id: userId,
          email,
          local_plan: "free",
          sio_status: "active_but_local_free",
        });
      }
    } catch {
      // Silent on free-side check — not blocking.
    }
    await sleep(PER_CALL_DELAY_MS);
  }

  // Best-effort audit log so historical drift is browsable.
  try {
    await supabaseAdmin.from("webhook_logs").insert({
      source: "cron_reconcile",
      event_type: "sio_reconcile",
      payload: {
        checked_paid: checkedPaid,
        checked_free_recent: checkedFree,
        discrepancy_count: discrepancies.length,
        discrepancies: discrepancies.slice(0, 100),
      },
      status: discrepancies.length > 0 ? "drift_detected" : "in_sync",
      received_at: new Date().toISOString(),
    } as any);
  } catch {
    // table may not have these columns yet on older deploys
  }

  return NextResponse.json({
    ok: true,
    checked_paid: checkedPaid,
    checked_free_recent: checkedFree,
    discrepancies: discrepancies.length,
    duration_ms: Date.now() - startedAt,
    details: discrepancies.slice(0, 100),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
