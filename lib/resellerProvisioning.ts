// lib/resellerProvisioning.ts
//
// Cœur du provisioning AUTOMATIQUE des clients d'un revendeur (phase 3).
// Utilisé par le webhook entrant générique (/api/reseller-webhook/[token])
// et réutilisable par tout futur canal (checkout intégré, API...).
//
// Règles non négociables (cf. CLAUDE_PITFALLS section revendeur) :
// - Anti-captation : un email qui correspond à un compte Tiquiz HORS du
//   portefeuille du revendeur n'est JAMAIS touché. Refus loggé.
// - Toutes les transitions de plan passent par plan_change_log.
// - Toutes les actions sont tracées dans reseller_actions.
// - Idempotent : rejouer le même event ne change rien (même plan = noop).

import {
  isResellerAllowedPlan,
  logResellerAction,
  type ResellerRow,
} from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();

export interface ProvisionResult {
  ok: boolean;
  outcome:
    | "created"
    | "plan_updated"
    | "noop"
    | "downgraded"
    | "rejected_email_taken"
    | "rejected_invalid_plan"
    | "unknown_client"
    | "error";
  userId?: string;
  oldPlan?: string | null;
  newPlan?: string;
}

async function sendAccessEmail(email: string): Promise<boolean> {
  const { createClient } = await import("@supabase/supabase-js");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback`, shouldCreateUser: false },
  });
  return !error;
}

/**
 * Active (ou met à jour) le compte d'un client du revendeur sur le plan
 * donné. Crée le compte + envoie le magic link si l'email est nouveau.
 */
export async function activateResellerClient(args: {
  reseller: Pick<ResellerRow, "id">;
  email: string;
  plan: string;
  source: string; // ex. "webhook:sio", "webhook:stripe" — pour l'audit
}): Promise<ProvisionResult> {
  const email = args.email.trim().toLowerCase();
  const { plan, source } = args;

  if (!isResellerAllowedPlan(plan)) {
    return { ok: false, outcome: "rejected_invalid_plan" };
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id,plan,reseller_id")
      .eq("email", email)
      .maybeSingle();

    // Anti-captation : compte existant hors portefeuille → refus.
    if (existing && existing.reseller_id !== args.reseller.id) {
      await logResellerAction({
        resellerId: args.reseller.id,
        actorUserId: null,
        targetEmail: email,
        action: "webhook_rejected_email_taken",
        meta: { source, plan },
      });
      return { ok: false, outcome: "rejected_email_taken" };
    }

    if (existing) {
      const oldPlan = String(existing.plan ?? "free");
      if (oldPlan === plan) {
        return { ok: true, outcome: "noop", userId: existing.user_id, oldPlan, newPlan: plan };
      }
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("user_id", existing.user_id);
      if (updErr) throw updErr;

      await supabaseAdmin.from("plan_change_log").insert({
        actor_user_id: null,
        target_user_id: existing.user_id,
        target_email: email,
        old_plan: oldPlan,
        new_plan: plan,
        reason: `reseller_${source}:${args.reseller.id}`,
      });
      await logResellerAction({
        resellerId: args.reseller.id,
        actorUserId: null,
        targetUserId: existing.user_id,
        targetEmail: email,
        action: "webhook_plan_change",
        meta: { source, old_plan: oldPlan, new_plan: plan },
      });
      return {
        ok: true,
        outcome: "plan_updated",
        userId: existing.user_id,
        oldPlan,
        newPlan: plan,
      };
    }

    // Nouveau client : création auth + profil + magic link.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    let userId: string;
    if (created?.user) {
      userId = created.user.id;
    } else if (createErr?.message?.includes("already been registered")) {
      // Compte auth sans ligne profiles : même règle anti-captation,
      // on ne s'approprie pas un compte qu'on ne connaît pas.
      await logResellerAction({
        resellerId: args.reseller.id,
        actorUserId: null,
        targetEmail: email,
        action: "webhook_rejected_email_taken",
        meta: { source, plan, reason: "auth_exists_no_profile" },
      });
      return { ok: false, outcome: "rejected_email_taken" };
    } else {
      throw createErr ?? new Error("createUser failed");
    }

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
      { user_id: userId, email, plan, reseller_id: args.reseller.id },
      { onConflict: "user_id" },
    );
    if (upsertErr) throw upsertErr;

    await supabaseAdmin.from("plan_change_log").insert({
      actor_user_id: null,
      target_user_id: userId,
      target_email: email,
      old_plan: null,
      new_plan: plan,
      reason: `reseller_${source}:${args.reseller.id}`,
    });

    const sent = await sendAccessEmail(email);

    await logResellerAction({
      resellerId: args.reseller.id,
      actorUserId: null,
      targetUserId: userId,
      targetEmail: email,
      action: "webhook_create_client",
      meta: { source, plan, access_sent: sent },
    });

    return { ok: true, outcome: "created", userId, newPlan: plan };
  } catch (e) {
    console.error("[resellerProvisioning] activate failed", (e as Error).message);
    return { ok: false, outcome: "error" };
  }
}

/**
 * Annulation / désabonnement : repasse le client en plan free.
 * Le compte et ses contenus sont conservés (jamais de suppression auto).
 */
export async function cancelResellerClient(args: {
  reseller: Pick<ResellerRow, "id">;
  email: string;
  source: string;
}): Promise<ProvisionResult> {
  const email = args.email.trim().toLowerCase();

  try {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id,plan,reseller_id")
      .eq("email", email)
      .maybeSingle();

    if (!existing || existing.reseller_id !== args.reseller.id) {
      // Inconnu ou hors portefeuille : on ne touche à rien.
      return { ok: true, outcome: "unknown_client" };
    }

    const oldPlan = String(existing.plan ?? "free");
    if (oldPlan === "free") {
      return { ok: true, outcome: "noop", userId: existing.user_id, oldPlan };
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ plan: "free", updated_at: new Date().toISOString() })
      .eq("user_id", existing.user_id);
    if (updErr) throw updErr;

    await supabaseAdmin.from("plan_change_log").insert({
      actor_user_id: null,
      target_user_id: existing.user_id,
      target_email: email,
      old_plan: oldPlan,
      new_plan: "free",
      reason: `reseller_${args.source}:${args.reseller.id}`,
    });
    await logResellerAction({
      resellerId: args.reseller.id,
      actorUserId: null,
      targetUserId: existing.user_id,
      targetEmail: email,
      action: "webhook_cancel",
      meta: { source: args.source, old_plan: oldPlan },
    });

    return { ok: true, outcome: "downgraded", userId: existing.user_id, oldPlan, newPlan: "free" };
  } catch (e) {
    console.error("[resellerProvisioning] cancel failed", (e as Error).message);
    return { ok: false, outcome: "error" };
  }
}
