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

// Mapping des offer price IDs Systeme.io vers plan Tiquiz.
// Une même formule peut avoir plusieurs price IDs (un par locale / page de vente),
// tous mappés vers le même plan Tiquiz — le même webhook peut donc être réutilisé
// sur toutes les pages de vente de cette offre.
const OFFER_TO_PLAN: Record<string, TiquizPlan> = {
  // Mensuel — FR
  "offer-price-3198235": "monthly",
  "3198235": "monthly",
  // Mensuel — EN
  "offer-price-3211596": "monthly",
  "3211596": "monthly",
  // Annuel — FR
  "offer-price-3198261": "yearly",
  "3198261": "yearly",
  // Annuel — EN
  "offer-price-3211612": "yearly",
  "3211612": "yearly",
  // Beta (lifetime) — FR
  "offer-price-3198280": "lifetime",
  "3198280": "lifetime",
  // Beta (lifetime) — EN
  "offer-price-3211578": "lifetime",
  "3211578": "lifetime",
};

// Events that explicitly indicate NO payment received → never grant access.
// We match case-insensitively on the event type string so new SIO naming
// variants get caught without a code change.
const FAILURE_EVENT_RE = /FAIL|CANCEL|REFUND|CHARGEBACK|DECLIN|EXPIR|DISPUT/i;

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

    eventType = extractStr(rawBody, ["type", "event", "event_type", "eventName", "data.type"]);
    const orderId = extractStr(rawBody, ["order.id", "data.order.id", "order_id", "orderId"]);
    eventId = orderId ? `sio_order_${orderId}` : null;

    // 1. Reject failure/cancel/refund events BEFORE granting anything.
    if (eventType && FAILURE_EVENT_RE.test(eventType)) {
      console.log(`[Tiquiz webhook] Ignoring failure event type=${eventType} order=${orderId}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "failure_event" });
      return NextResponse.json({ ok: true, skipped: "failure_event", event_type: eventType });
    }

    const email = extractStr(rawBody, ["customer.email", "data.customer.email", "email"])?.toLowerCase();
    if (!email) {
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "skipped", error: "no_email" });
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    // 2. Idempotency: if SIO already delivered + we processed it, don't resend.
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
    const oldPlan = (priorProfile?.plan as TiquizPlan | undefined) ?? null;

    // 3. Resolve plan — NEVER default to lifetime on unknown offers.
    // If we can't map the offer to a known paid plan and the user isn't
    // already paying, refuse to grant access. Log it so you can see the
    // orphan in webhook_logs and fix OFFER_TO_PLAN (or the SIO config).
    let finalPlan: TiquizPlan | null = plan;
    if (!finalPlan) {
      if (oldPlan && oldPlan !== "free") {
        // Already paying — re-sending a webhook without a clear offer shouldn't
        // downgrade them. Keep their current plan.
        finalPlan = oldPlan;
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
