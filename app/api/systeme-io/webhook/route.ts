// app/api/systeme-io/webhook/route.ts
// Webhook Systeme.io pour Tiquiz — crée/upgrade les users après achat.
//
// SIO fires the SAME URL for successful sales, failed payments, cancellations
// and refunds. We only grant access on confirmed-payment events and we must
// be idempotent because SIO retries aggressively on any non-2xx response.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

// Plans Tiquiz DB: free | monthly | yearly | lifetime
type TiquizPlan = "free" | "monthly" | "yearly" | "lifetime";

// Mapping des offer price IDs Systeme.io vers plan Tiquiz
const OFFER_TO_PLAN: Record<string, TiquizPlan> = {
  // Mensuel
  "offer-price-3198235": "monthly",
  "3198235": "monthly",
  // Annuel
  "offer-price-3198261": "yearly",
  "3198261": "yearly",
  // Beta (lifetime)
  "offer-price-3198280": "lifetime",
  "3198280": "lifetime",
};

// Plans Tiquiz refuses to downgrade automatically. `beta` is granted manually
// by Ben for lifetime access; `lifetime` is the paid one-time tier. Both must
// survive any webhook event — if Ben needs to revoke one, he does it via the
// admin endpoint, not via SIO. SIO can NEVER bring these accounts back to
// `free`.
const LIFETIME_PLANS: ReadonlySet<string> = new Set(["beta", "lifetime"]);

// Events that confirm the end of a paid subscription — we downgrade the
// affected user's plan back to `free` (UNLESS they're on lifetime/beta).
// SIO documents `SALE_CANCELED`; the rest of the regex is defensive against
// future variants and against partner integrations that re-emit different
// strings (REFUND_*, *_EXPIRED, etc.).
const TERMINAL_EVENT_RE = /CANCEL|REFUND|EXPIR|CHARGEBACK/i;

// Events that signal a transient payment problem (failed retry, declined,
// in dispute). DO NOT downgrade — the next retry might succeed and SIO
// will fire a definitive CANCEL/REFUND later if the situation doesn't
// improve. Treating these as "no-op" prevents flapping users from being
// downgraded mid-retry-cycle.
const TRANSIENT_FAILURE_RE = /FAIL|DECLIN|DISPUT/i;

function inferPlan(offerId: string): TiquizPlan | null {
  if (!offerId) return null;
  const id = String(offerId).trim().toLowerCase();
  if (id in OFFER_TO_PLAN) return OFFER_TO_PLAN[id];
  if (`offer-price-${id}` in OFFER_TO_PLAN) return OFFER_TO_PLAN[`offer-price-${id}`];
  const num = id.match(/(\d{5,})/);
  if (num) {
    if (num[1] in OFFER_TO_PLAN) return OFFER_TO_PLAN[num[1]];
    if (`offer-price-${num[1]}` in OFFER_TO_PLAN) return OFFER_TO_PLAN[`offer-price-${num[1]}`];
  }
  return null;
}

function deepGet(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function extractStr(body: any, paths: string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

// Paginated lookup: SIO already has >1k customers and listUsers caps at
// 1000 per page, so we can't rely on a single call. Walks pages until it
// finds the match or exhausts the list.
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = ((data as any)?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === lower);
    if (found) return { id: found.id };
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) return null; // 50k users hard-stop, well beyond current scale
  }
}

async function logWebhook(row: {
  event_id: string | null;
  event_type: string | null;
  payload: any;
  status: string;
  error?: string | null;
}) {
  try {
    await supabaseAdmin.from("webhook_logs").insert({
      source: "systeme_io",
      event_id: row.event_id,
      event_type: row.event_type,
      payload: row.payload,
      status: row.status,
      error: row.error ?? null,
      received_at: new Date().toISOString(),
    } as any);
  } catch {
    // table may not exist or columns missing on old deploys — don't block the flow
  }
}

export async function GET() {
  return NextResponse.json({ error: "POST only. URL: https://quiz.tipote.com/api/systeme-io/webhook?secret=YOUR_SECRET" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  let rawBody: any = null;
  let eventType: string | null = null;
  let eventId: string | null = null;

  try {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    try { const text = await req.text(); rawBody = JSON.parse(text); }
    catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    // SIO sends the event type both in the X-Webhook-Event header and inside
    // the body — prefer the header, fall back to body extraction so older
    // payload shapes still work.
    const headerEventType = req.headers.get("x-webhook-event");
    const bodyEventType = extractStr(rawBody, ["type", "event", "event_type", "eventName", "data.type"]);
    eventType = (headerEventType || bodyEventType || "").trim() || null;

    const orderId = extractStr(rawBody, ["order.id", "data.order.id", "order_id", "orderId"]);
    eventId = orderId ? `sio_order_${orderId}` : null;

    // 1. Idempotency FIRST — must run before any branch that mutates state
    //    (downgrade or upgrade). A retried CANCEL must not double-downgrade
    //    a user who in the meantime upgraded again from a different device.
    if (eventId) {
      const { data: dup } = await supabaseAdmin
        .from("webhook_logs")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "processed")
        .limit(1)
        .maybeSingle();
      if (dup) {
        console.log(`[Tiquiz webhook] Duplicate retry event=${eventId} — skipping`);
        return NextResponse.json({ ok: true, duplicate: true, event_id: eventId });
      }
    }

    // 2. Transient failures: log + skip. Don't grant, don't revoke. SIO will
    //    fire the definitive CANCEL/REFUND if the issue doesn't recover.
    if (eventType && TRANSIENT_FAILURE_RE.test(eventType)) {
      console.log(`[Tiquiz webhook] Ignoring transient failure type=${eventType} order=${orderId}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "transient_failure" });
      return NextResponse.json({ ok: true, skipped: "transient_failure", event_type: eventType });
    }

    // 3. Terminal events (CANCEL / REFUND / EXPIR / CHARGEBACK): downgrade
    //    the user's plan to `free` UNLESS they're on a lifetime plan
    //    (lifetime/beta). Lifetime plans are immune by design — Ben's beta
    //    cohort and one-time-fee customers keep access regardless of SIO.
    if (eventType && TERMINAL_EVENT_RE.test(eventType)) {
      const cancelEmail = extractStr(rawBody, [
        "contact.email", "data.contact.email",
        "customer.email", "data.customer.email",
        "email",
      ])?.toLowerCase();
      if (!cancelEmail) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "skipped", error: "cancel_no_email" });
        return NextResponse.json({ ok: false, skipped: "no_email" }, { status: 200 });
      }

      const found = await findUserByEmail(cancelEmail);
      if (!found) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: "cancel_unknown_user" });
        return NextResponse.json({ ok: true, skipped: "unknown_user", email: cancelEmail });
      }

      const { data: priorProfile } = await supabaseAdmin
        .from("profiles").select("plan").eq("user_id", found.id).maybeSingle();
      const oldPlan = String((priorProfile as { plan?: string | null } | null)?.plan ?? "free").trim().toLowerCase();

      if (!oldPlan || oldPlan === "free") {
        // Already free — nothing to revoke. Mark processed so retries skip.
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: "already_free" });
        return NextResponse.json({ ok: true, skipped: "already_free", email: cancelEmail });
      }

      if (LIFETIME_PLANS.has(oldPlan)) {
        // Beta + lifetime: never downgrade via webhook — these accounts have
        // been promised lifetime access and the only legitimate revocation
        // path is the admin route. Logged loudly so any unexpected hit is
        // visible in webhook_logs.
        console.warn(`[Tiquiz webhook] REFUSED downgrade for lifetime plan ${oldPlan} email=${cancelEmail} event=${eventType}`);
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `refused_lifetime:${oldPlan}` });
        return NextResponse.json({ ok: true, skipped: "lifetime_plan", plan: oldPlan, email: cancelEmail });
      }

      // monthly / yearly → free
      const { error: downErr } = await supabaseAdmin
        .from("profiles")
        .update({ plan: "free", updated_at: new Date().toISOString() })
        .eq("user_id", found.id);
      if (downErr) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: `downgrade:${downErr.message}` });
        // 500 lets SIO retry — webhook_logs row above is `error`, idempotency
        // won't short-circuit on retry.
        return NextResponse.json({ error: "Downgrade failed" }, { status: 500 });
      }

      try {
        await supabaseAdmin.from("plan_change_log").insert({
          target_user_id: found.id,
          target_email: cancelEmail,
          old_plan: oldPlan,
          new_plan: "free",
          reason: `systeme_io:${eventType}:${orderId ?? "no_order"}`,
        } as any);
      } catch {
        // best-effort audit
      }

      console.log(`[Tiquiz webhook] Downgraded ${cancelEmail} ${oldPlan} → free (${eventType})`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `downgraded_from:${oldPlan}` });
      return NextResponse.json({ ok: true, downgraded: true, email: cancelEmail, old_plan: oldPlan, new_plan: "free", event_type: eventType });
    }

    // 4. From here on we're in the NEW SALE / unknown event flow — grant access.
    const email = extractStr(rawBody, ["customer.email", "data.customer.email", "contact.email", "data.contact.email", "email"])?.toLowerCase();
    if (!email) {
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "skipped", error: "no_email" });
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    const firstName = extractStr(rawBody, ["customer.fields.first_name", "data.customer.fields.first_name", "first_name"]);
    const lastName = extractStr(rawBody, ["customer.fields.surname", "data.customer.fields.surname", "last_name"]);

    const offerId = extractStr(rawBody, [
      "pricePlan.id", "data.pricePlan.id", "data.offer_price_plan.id", "data.offer_price.id", "product_id",
    ]) ?? "";

    const plan = inferPlan(offerId);
    console.log(`[Tiquiz webhook] email=${email} type=${eventType} offerId=${offerId} plan=${plan} order=${orderId}`);

    // Create or find user
    let userId: string;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createErr?.message?.toLowerCase().includes("already been registered")) {
      const found = await findUserByEmail(email);
      if (!found) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: "user_exists_but_not_found" });
        return NextResponse.json({ error: "User exists but not found" }, { status: 500 });
      }
      userId = found.id;
    } else {
      throw createErr;
    }

    // Capture the old plan BEFORE upsert so we can audit plan transitions.
    const { data: priorProfile } = await supabaseAdmin
      .from("profiles").select("plan").eq("user_id", userId).maybeSingle();
    const oldPlanRaw = String((priorProfile as { plan?: string | null } | null)?.plan ?? "").trim().toLowerCase();
    const oldPlan = (oldPlanRaw || null) as TiquizPlan | "beta" | null;

    // Beta + lifetime are immune to webhook plan changes — they paid (or were
    // granted) lifetime access. If a SIO event somehow lands for one of them
    // (e.g. they buy a separate monthly subscription on the same email), we
    // log the attempt and keep their existing plan. The only way to remove
    // lifetime is the admin endpoint, never an automated webhook.
    if (oldPlan && LIFETIME_PLANS.has(oldPlan)) {
      console.warn(`[Tiquiz webhook] REFUSED upgrade overwrite for lifetime plan ${oldPlan} email=${email} event=${eventType}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `refused_lifetime_overwrite:${oldPlan}` });
      return NextResponse.json({ ok: true, skipped: "lifetime_plan", plan: oldPlan, email });
    }

    // 3. Resolve plan — NEVER default to lifetime on unknown offers.
    // If we can't map the offer to a known paid plan and the user isn't
    // already paying, refuse to grant access. Log it so you can see the
    // orphan in webhook_logs and fix OFFER_TO_PLAN (or the SIO config).
    let finalPlan: TiquizPlan | null = plan;
    if (!finalPlan) {
      if (oldPlan && oldPlan !== "free") {
        // Already paying — re-sending a webhook without a clear offer shouldn't
        // downgrade them. Keep their current plan.
        finalPlan = oldPlan as TiquizPlan;
        console.warn(`[Tiquiz webhook] Unknown offer ${offerId} — keeping existing paid plan ${oldPlan}`);
      } else {
        const msg = `unknown_offer:${offerId || "missing"}`;
        console.error(`[Tiquiz webhook] REFUSE grant — ${msg} email=${email}`);
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "refused", error: msg });
        return NextResponse.json({ ok: false, refused: true, reason: "unknown_offer", offer_id: offerId }, { status: 200 });
      }
    }

    // Upsert profile
    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId, email, first_name: firstName, last_name: lastName,
      plan: finalPlan, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (upsertErr) {
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: `upsert:${upsertErr.message}` });
      throw upsertErr;
    }

    // Audit: log plan transition (skip no-op re-sends of the same plan).
    if (finalPlan !== oldPlan) {
      try {
        await supabaseAdmin.from("plan_change_log").insert({
          target_user_id: userId,
          target_email: email,
          old_plan: oldPlan,
          new_plan: finalPlan,
          reason: `systeme_io:${eventType ?? "unknown"}:${offerId || "no_offer"}`,
        } as any);
      } catch {
        // table may not exist on older deploys — audit is best-effort
      }
    }

    // 4. Magic link — await + surface errors instead of swallowing them.
    // If the send fails (SMTP down, rate limit), we record it so you can
    // see the failure in webhook_logs AND return 5xx so SIO retries.
    const { error: otpErr } = await supabaseAnon.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${APP_URL}/auth/callback`, shouldCreateUser: false },
    });

    if (otpErr) {
      console.error(`[Tiquiz webhook] Magic link FAILED email=${email} err=${otpErr.message}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: `magic_link:${otpErr.message}` });
      // Return 500 so SIO retries — profile is already upserted so the
      // retry will hit the idempotency short-circuit only once the magic
      // link actually goes out (we only mark 'processed' below).
      return NextResponse.json({ ok: false, user_id: userId, plan: finalPlan, magic_link_sent: false, error: otpErr.message }, { status: 500 });
    }

    await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed" });
    return NextResponse.json({ ok: true, email, user_id: userId, plan: finalPlan, magic_link_sent: true, event_id: eventId });
  } catch (err: any) {
    console.error("[Tiquiz webhook] Error:", err);
    await logWebhook({
      event_id: eventId,
      event_type: eventType,
      payload: rawBody,
      status: "error",
      error: err?.message ? String(err.message).slice(0, 500) : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
