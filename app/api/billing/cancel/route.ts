// app/api/billing/cancel/route.ts
// User-initiated subscription cancellation. Two modes:
//   - WhenBillingCycleEnds (default): user keeps paid access until the next
//     billing date. SIO will fire SALE_CANCELED at that date and our webhook
//     (app/api/systeme-io/webhook/route.ts) will then flip plan → free.
//   - Now: immediate revocation. We flip plan → free here AND tell SIO to
//     cancel right away. Used for refunds-with-immediate-effect (rare).
//
// Beta + lifetime users have NO subscription to cancel — their plan is a
// one-time grant. We refuse the call defensively even if the UI hides the
// button.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  findContactByEmail,
  listSubscriptionsForContact,
  cancelSubscription,
  type SystemeIoCancelMode,
} from "@/lib/systemeIoClient";

export const dynamic = "force-dynamic";

const LIFETIME_PLANS: ReadonlySet<string> = new Set(["beta", "lifetime"]);

function parseContactId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function normalizeCancelMode(raw: unknown): SystemeIoCancelMode {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "now" || v === "immediately") return "Now";
  return "WhenBillingCycleEnds"; // safer default — keep paid access until period end
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { cancel?: string };
    const cancelMode = normalizeCancelMode(body.cancel);

    // Pull the user's profile + plan + sio_contact_id (if we cached it).
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, plan, sio_contact_id, email")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPlan = String((profile as { plan?: string | null } | null)?.plan ?? "free")
      .trim().toLowerCase();

    if (currentPlan === "free") {
      return NextResponse.json({ ok: false, error: "ALREADY_FREE", message: "Tu n'as pas d'abonnement actif." }, { status: 400 });
    }

    if (LIFETIME_PLANS.has(currentPlan)) {
      // Defensive double-shield: the UI hides the button for these plans,
      // but if a hand-crafted POST arrives we still refuse.
      return NextResponse.json(
        { ok: false, error: "LIFETIME_PLAN", message: "Ton accès est à vie — il n'y a rien à annuler." },
        { status: 400 },
      );
    }

    // 1) Resolve the SIO contact id. Try the cached value first; fall back to
    //    a lookup by email so users captured before sio_contact_id was stored
    //    can still cancel.
    let contactId = parseContactId((profile as { sio_contact_id?: unknown } | null)?.sio_contact_id);
    if (!contactId) {
      try {
        const found = await findContactByEmail(user.email);
        if (found) contactId = found.id;
      } catch (e) {
        console.error("[Tiquiz/billing/cancel] findContactByEmail failed:", e);
      }
    }

    if (!contactId) {
      return NextResponse.json(
        { ok: false, error: "NO_CONTACT", message: "Impossible de retrouver ton compte sur Systeme.io. Contacte-nous : hello@ethilife.fr." },
        { status: 404 },
      );
    }

    // 2) List subscriptions, find one that's still active.
    let subscriptionId: string | null = null;
    try {
      const subs = await listSubscriptionsForContact(contactId, { limit: 50, order: "desc" });
      const active = subs.find((s) => {
        const status = String(s.status ?? "").toLowerCase();
        return status === "active" || status === "trialing";
      });
      if (active) subscriptionId = String(active.id);
    } catch (e) {
      console.error("[Tiquiz/billing/cancel] listSubscriptions failed:", e);
      return NextResponse.json(
        { ok: false, error: "SIO_API_DOWN", message: "Systeme.io n'est pas joignable. Réessaie dans quelques minutes." },
        { status: 502 },
      );
    }

    if (!subscriptionId) {
      // No active subscription means SIO already considers the user
      // unsubscribed — just align our DB and call it a day.
      await supabaseAdmin
        .from("profiles")
        .update({ plan: "free", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      try {
        await supabaseAdmin.from("plan_change_log").insert({
          target_user_id: user.id,
          target_email: user.email,
          old_plan: currentPlan,
          new_plan: "free",
          reason: "billing_cancel:no_active_sub",
        } as any);
      } catch { /* best effort */ }
      return NextResponse.json({ ok: true, downgraded_immediately: true, reason: "no_active_subscription" });
    }

    // 3) Tell SIO to cancel.
    try {
      await cancelSubscription({ id: subscriptionId, cancel: cancelMode });
    } catch (e: any) {
      console.error("[Tiquiz/billing/cancel] cancelSubscription failed:", e);
      const status = typeof e?.status === "number" ? e.status : 502;
      return NextResponse.json(
        { ok: false, error: "SIO_CANCEL_FAILED", message: "Impossible d'annuler côté Systeme.io. Réessaie ou contacte-nous." },
        { status },
      );
    }

    // 4) Local DB update depends on mode.
    //    - Now: revoke access immediately (write plan=free + audit log).
    //    - WhenBillingCycleEnds: keep current plan; SIO webhook will downgrade
    //      at period end. We log the request so support can see the pending
    //      cancellation in audit.
    if (cancelMode === "Now") {
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .update({ plan: "free", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (upErr) {
        console.error("[Tiquiz/billing/cancel] Failed to write plan=free after immediate cancel:", upErr);
        // SIO is already cancelled — don't 500, return ok so the UI can show
        // success. The next webhook retry from SIO will reconcile.
      }
    }

    try {
      await supabaseAdmin.from("plan_change_log").insert({
        target_user_id: user.id,
        target_email: user.email,
        old_plan: currentPlan,
        new_plan: cancelMode === "Now" ? "free" : currentPlan,
        reason: `billing_cancel_requested:${cancelMode}:sub_${subscriptionId}`,
      } as any);
    } catch { /* best effort */ }

    return NextResponse.json({
      ok: true,
      cancel_mode: cancelMode,
      subscription_id: subscriptionId,
      downgraded_immediately: cancelMode === "Now",
      // For end-of-period: UI shows "you keep access until <date>" — SIO returns
      // the period end on the subscription object, but we don't echo it here
      // since the subscription-status route can pull it on demand.
    });
  } catch (e: any) {
    console.error("[Tiquiz/billing/cancel] Unexpected:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: e?.message ?? "Erreur serveur" },
      { status: 500 },
    );
  }
}
