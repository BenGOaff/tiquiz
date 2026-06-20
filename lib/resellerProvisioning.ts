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

import { cancelPaypalSubscription } from "@/lib/paypalRest";
import {
  isResellerAllowedPlan,
  logResellerAction,
  type ResellerRow,
} from "@/lib/reseller";
import { sendResellerAccessEmail } from "@/lib/resellerEmail";
import { loadResellerPaymentSecrets } from "@/lib/resellerPayments";
import { cancelStripeSubscription } from "@/lib/stripeRest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PaymentProvider = "stripe" | "paypal";

/**
 * Annule l'ancien abonnement d'un client chez le provider du revendeur,
 * quand il change de formule (anti double-prelevement). Best-effort : un
 * echec d'annulation ne bloque jamais l'ouverture du nouvel acces.
 */
async function cancelPreviousSubscription(args: {
  resellerId: string;
  provider: string | null;
  subscriptionId: string | null;
}): Promise<boolean> {
  if (!args.provider || !args.subscriptionId) return false;
  try {
    const secrets = await loadResellerPaymentSecrets(args.resellerId);
    if (args.provider === "stripe" && secrets.stripeKey) {
      return await cancelStripeSubscription(secrets.stripeKey, args.subscriptionId);
    }
    if (args.provider === "paypal" && secrets.paypalClientId && secrets.paypalSecret) {
      return await cancelPaypalSubscription({
        clientId: secrets.paypalClientId,
        secret: secrets.paypalSecret,
        env: secrets.paypalEnv,
        subscriptionId: args.subscriptionId,
      });
    }
    return false;
  } catch (e) {
    console.error("[resellerProvisioning] cancelPrevious failed", (e as Error).message);
    return false;
  }
}

/** Identité minimale du revendeur pour provisionner + envoyer l'email
 * d'accès personnalisé (name + support_email, cf. lib/resellerEmail). */
export type ProvisionReseller = Pick<ResellerRow, "id" | "name"> & {
  support_email?: string | null;
};

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

/**
 * Active (ou met à jour) le compte d'un client du revendeur sur le plan
 * donné. Crée le compte + envoie le magic link si l'email est nouveau.
 */
export async function activateResellerClient(args: {
  reseller: ProvisionReseller;
  email: string;
  plan: string;
  source: string; // ex. "webhook", "panel" — pour l'audit
  /** user id du revendeur quand l'action vient de son panel, null pour
   * les actions automatiques (webhook). */
  actorUserId?: string | null;
  /** Provider + id de l'abonnement qui ouvre cet acces (checkout payant).
   * Permet d'annuler l'ancien abo au changement de formule et de tracer
   * l'abo courant (annulation subscription-aware). null pour l'essai
   * gratuit ou une action manuelle. */
  provider?: PaymentProvider | null;
  subscriptionId?: string | null;
}): Promise<ProvisionResult> {
  const email = args.email.trim().toLowerCase();
  const { plan, source } = args;
  const provider = args.provider ?? null;
  const subscriptionId = args.subscriptionId ?? null;

  if (!isResellerAllowedPlan(plan)) {
    return { ok: false, outcome: "rejected_invalid_plan" };
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id,plan,reseller_id,reseller_sub_provider,reseller_sub_id")
      .eq("email", email)
      .maybeSingle();

    // Anti-captation : compte existant hors portefeuille → refus.
    if (existing && existing.reseller_id !== args.reseller.id) {
      await logResellerAction({
        resellerId: args.reseller.id,
        actorUserId: args.actorUserId ?? null,
        targetEmail: email,
        action: "provision_rejected_email_taken",
        meta: { source, plan },
      });
      return { ok: false, outcome: "rejected_email_taken" };
    }

    if (existing) {
      const oldPlan = String(existing.plan ?? "free");
      const oldProvider = existing.reseller_sub_provider ?? null;
      const oldSubId = existing.reseller_sub_id ?? null;
      // Nouvel abonnement qui remplace l'ancien (changement de formule ou
      // re-souscription) : on annule l'ancien pour eviter le double-
      // prelevement. Si c'est le MEME abo (rejeu de webhook), on ne touche
      // a rien.
      const isNewSubscription =
        Boolean(subscriptionId) && oldSubId !== null && oldSubId !== subscriptionId;
      if (isNewSubscription) {
        const canceled = await cancelPreviousSubscription({
          resellerId: args.reseller.id,
          provider: oldProvider,
          subscriptionId: oldSubId,
        });
        await logResellerAction({
          resellerId: args.reseller.id,
          actorUserId: args.actorUserId ?? null,
          targetUserId: existing.user_id,
          targetEmail: email,
          action: "provision_cancel_previous_sub",
          meta: { source, old_provider: oldProvider, old_sub: oldSubId, canceled },
        });
      }

      // Rien ne change : meme plan ET (pas de nouvel abo OU meme abo).
      if (oldPlan === plan && !isNewSubscription) {
        return { ok: true, outcome: "noop", userId: existing.user_id, oldPlan, newPlan: plan };
      }

      const update: Record<string, unknown> = { plan, updated_at: new Date().toISOString() };
      if (subscriptionId) {
        update.reseller_sub_provider = provider;
        update.reseller_sub_id = subscriptionId;
      }
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update(update)
        .eq("user_id", existing.user_id);
      if (updErr) throw updErr;

      if (oldPlan !== plan) {
        await supabaseAdmin.from("plan_change_log").insert({
          actor_user_id: args.actorUserId ?? null,
          target_user_id: existing.user_id,
          target_email: email,
          old_plan: oldPlan,
          new_plan: plan,
          reason: `reseller_${source}:${args.reseller.id}`,
        });
      }
      await logResellerAction({
        resellerId: args.reseller.id,
        actorUserId: args.actorUserId ?? null,
        targetUserId: existing.user_id,
        targetEmail: email,
        action: "provision_plan_change",
        meta: { source, old_plan: oldPlan, new_plan: plan, provider, sub: subscriptionId },
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
        actorUserId: args.actorUserId ?? null,
        targetEmail: email,
        action: "provision_rejected_email_taken",
        meta: { source, plan, reason: "auth_exists_no_profile" },
      });
      return { ok: false, outcome: "rejected_email_taken" };
    } else {
      throw createErr ?? new Error("createUser failed");
    }

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        email,
        plan,
        reseller_id: args.reseller.id,
        reseller_sub_provider: subscriptionId ? provider : null,
        reseller_sub_id: subscriptionId ?? null,
      },
      { onConflict: "user_id" },
    );
    if (upsertErr) throw upsertErr;

    await supabaseAdmin.from("plan_change_log").insert({
      actor_user_id: args.actorUserId ?? null,
      target_user_id: userId,
      target_email: email,
      old_plan: null,
      new_plan: plan,
      reason: `reseller_${source}:${args.reseller.id}`,
    });

    const sent = await sendResellerAccessEmail({ reseller: args.reseller, email });

    await logResellerAction({
      resellerId: args.reseller.id,
      actorUserId: args.actorUserId ?? null,
      targetUserId: userId,
      targetEmail: email,
      action: "provision_create_client",
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
  reseller: ProvisionReseller;
  email: string;
  source: string;
  actorUserId?: string | null;
  /** Id de l'abonnement annule (fourni par le webhook). On ne repasse en
   * free QUE si c'est bien l'abo COURANT du client : annuler un ancien abo
   * deja remplace (ex. apres un upgrade) ne doit pas couper l'acces. */
  subscriptionId?: string | null;
}): Promise<ProvisionResult> {
  const email = args.email.trim().toLowerCase();
  const subscriptionId = args.subscriptionId ?? null;

  try {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id,plan,reseller_id,reseller_sub_id")
      .eq("email", email)
      .maybeSingle();

    if (!existing || existing.reseller_id !== args.reseller.id) {
      // Inconnu ou hors portefeuille : on ne touche à rien.
      return { ok: true, outcome: "unknown_client" };
    }

    // Annulation subscription-aware : si l'event annule un abo qui n'est
    // PAS l'abo courant du client (abo deja remplace lors d'un upgrade),
    // on ignore. On ne coupe l'acces que pour l'abo en cours.
    if (
      subscriptionId &&
      existing.reseller_sub_id &&
      existing.reseller_sub_id !== subscriptionId
    ) {
      await logResellerAction({
        resellerId: args.reseller.id,
        actorUserId: args.actorUserId ?? null,
        targetUserId: existing.user_id,
        targetEmail: email,
        action: "provision_cancel_stale_ignored",
        meta: { source: args.source, canceled_sub: subscriptionId, current_sub: existing.reseller_sub_id },
      });
      return { ok: true, outcome: "noop", userId: existing.user_id };
    }

    const oldPlan = String(existing.plan ?? "free");
    if (oldPlan === "free") {
      return { ok: true, outcome: "noop", userId: existing.user_id, oldPlan };
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: "free",
        reseller_sub_provider: null,
        reseller_sub_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", existing.user_id);
    if (updErr) throw updErr;

    await supabaseAdmin.from("plan_change_log").insert({
      actor_user_id: args.actorUserId ?? null,
      target_user_id: existing.user_id,
      target_email: email,
      old_plan: oldPlan,
      new_plan: "free",
      reason: `reseller_${args.source}:${args.reseller.id}`,
    });
    await logResellerAction({
      resellerId: args.reseller.id,
      actorUserId: args.actorUserId ?? null,
      targetUserId: existing.user_id,
      targetEmail: email,
      action: "provision_cancel",
      meta: { source: args.source, old_plan: oldPlan },
    });

    return { ok: true, outcome: "downgraded", userId: existing.user_id, oldPlan, newPlan: "free" };
  } catch (e) {
    console.error("[resellerProvisioning] cancel failed", (e as Error).message);
    return { ok: false, outcome: "error" };
  }
}
