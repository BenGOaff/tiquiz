// app/api/partner/grant-plus-trial/route.ts
//
// Octroi d'un mois Tiquiz Plus offert, déclenché par L'Atelier du Quiz
// (formaquiz) pour l'opération "les 20 premiers inscrits reçoivent 1 mois
// au meilleur plan". Appelé app-à-app via le secret partagé
// PARTNER_SHARED_SECRET (header x-partner-secret).
//
// RÉUTILISE la mécanique existante du trial affilié :
//   - colonnes profiles.affiliate_trial_pre_plan + affiliate_trial_expires_at
//   - cron /api/cron/affiliate-trial-expiry qui reverte automatiquement
//     au plan pré-trial (fallback free) à l'expiration.
// Aucune nouvelle mécanique de downgrade : on branche sur l'existant.
//
// Règles (décisions Béné) :
//   - Comptes déjà PREMIUM (lifetime / beta / monthly_plus / yearly_plus) :
//     on NE touche à rien et on répond granted:false / already_premium.
//     -> formaquiz ne consomme PAS de place pour eux.
//   - Comptes éligibles (aucun compte / free / monthly / yearly) :
//       * free  -> monthly_plus, pre_plan="free"  (revert => gratuit)
//       * monthly -> monthly_plus, pre_plan="monthly"
//       * yearly  -> yearly_plus,  pre_plan="yearly"
//       * pas de compte -> CRÉATION d'un compte Plus (pre_plan="free",
//         revert => gratuit) + email d'activation.
//   - Notification email best-effort expliquant quand/pourquoi le plan
//     changera.
//
// Idempotence : si un trial Plus est DÉJÀ actif sur ce compte (mêmes
// colonnes non nulles et non expirées), on ne réécrit pas les dates et on
// renvoie granted:true / already_active pour que formaquiz reste stable.
//
// Toujours renvoyer un JSON explicite. 500 uniquement sur erreur DB dure,
// pour que formaquiz puisse libérer la place réservée (compensation).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { safeEqual } from "@/lib/partner/tokens";
import { sendPlusTrialEmail } from "@/lib/email/plusTrialEmail";
import { resolveAppUrl } from "@/lib/authLinks";
import { echapperMotifLike } from "@/lib/db/motifLike";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();
const APP_URL = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
const DEFAULT_TRIAL_DAYS = 30;

// Plans qui refusent le trial (déjà Plus payant / à vie / beta).
const REFUSED_PLANS: ReadonlySet<string> = new Set([
  "monthly_plus",
  "yearly_plus",
  "lifetime",
  "beta",
]);

const PRE_PLAN_LABELS: Record<string, string> = {
  monthly: "Tiquiz mensuel",
  yearly: "Tiquiz annuel",
  free: "gratuit",
};

function trialPlusFor(currentPlan: string): "monthly_plus" | "yearly_plus" {
  return currentPlan === "yearly" ? "yearly_plus" : "monthly_plus";
}

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => (u.email ?? "").toLowerCase() === lower);
    if (found) return { id: found.id };
    if (users.length < perPage) return null;
  }
  return null;
}

type ProfileRow = {
  user_id: string;
  email: string | null;
  plan: string | null;
  affiliate_trial_pre_plan: string | null;
  affiliate_trial_expires_at: string | null;
  affiliate_trial_pending_days: number | null;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!SHARED || !safeEqual(req.headers.get("x-partner-secret") ?? "", SHARED)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    days?: unknown;
    source?: unknown;
    funnel?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "no_email" }, { status: 400 });
  }
  const days =
    typeof body.days === "number" && body.days > 0 && body.days <= 366
      ? Math.floor(body.days)
      : DEFAULT_TRIAL_DAYS;
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 64) : "atelier_plus_trial";

  const now = new Date();
  // DEMARRAGE DIFFERE : on ne pose PAS de date de fin ici. Le compte a rebours
  // ne demarrera qu'a la CREATION du premier quiz/sondage (cf. POST /api/quiz,
  // startPendingAtelierTrial). On memorise seulement le nombre de jours a poser
  // ce jour-la (affiliate_trial_pending_days).
  // Libellé de durée pour l'email (ex: "2 mois", "60 jours").
  const durationLabel = days % 30 === 0 ? `${days / 30} mois` : `${days} jours`;

  // ── 1. Lire le profile existant (par email, case-insensitive) ──
  const { data: existing, error: readErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, plan, affiliate_trial_pre_plan, affiliate_trial_expires_at, affiliate_trial_pending_days")
    .ilike("email", echapperMotifLike(email))
    .maybeSingle();
  if (readErr) {
    console.error("[grant-plus-trial] read error:", readErr.message);
    return NextResponse.json({ ok: false, reason: "read_error" }, { status: 500 });
  }
  const profile = existing as ProfileRow | null;
  const currentPlan = (profile?.plan ?? "free").toLowerCase().trim();

  // ── 2. Déjà premium -> pas de place consommée ──
  if (REFUSED_PLANS.has(currentPlan)) {
    return NextResponse.json({
      ok: true,
      granted: false,
      reason: "already_premium",
      current_plan: currentPlan,
    });
  }

  // ── 3. Trial déjà actif OU déjà en attente sur ce compte -> idempotent ──
  // "En attente" = octroyé mais pas encore démarré (pending_days posé,
  // expires_at NULL). Dans les deux cas on ne réécrit rien.
  const isPlusPlan = profile?.plan === "monthly_plus" || profile?.plan === "yearly_plus";
  const trialLive =
    !!profile?.affiliate_trial_expires_at &&
    new Date(profile.affiliate_trial_expires_at) > now;
  const trialPending =
    typeof profile?.affiliate_trial_pending_days === "number" &&
    profile.affiliate_trial_pending_days > 0;
  if (isPlusPlan && (trialLive || trialPending)) {
    return NextResponse.json({
      ok: true,
      granted: true,
      reason: trialPending ? "already_pending" : "already_active",
      granted_plan: profile!.plan,
      pre_plan: profile!.affiliate_trial_pre_plan,
      expires_at: profile!.affiliate_trial_expires_at,
      pending_days: profile!.affiliate_trial_pending_days,
      created: false,
    });
  }

  const trialPlan = trialPlusFor(currentPlan);

  // ── 4a. Compte EXISTANT : upgrade + mémoire du plan d'avant ──
  if (profile?.user_id) {
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: trialPlan,
        affiliate_trial_pre_plan: currentPlan,
        // Démarrage différé : jours en attente, pas de date de fin encore.
        affiliate_trial_pending_days: days,
        affiliate_trial_expires_at: null,
        updated_at: now.toISOString(),
      })
      .eq("user_id", profile.user_id);
    if (updErr) {
      console.error("[grant-plus-trial] update error:", updErr.message);
      return NextResponse.json({ ok: false, reason: "update_error" }, { status: 500 });
    }

    // Notification best-effort (lien magique d'entrée directe).
    let actionLink: string | null = null;
    try {
      const { data } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${APP_URL}/auth/callback` },
      });
      actionLink = data?.properties?.action_link ?? null;
    } catch {
      /* best-effort */
    }
    void sendPlusTrialEmail({
      email,
      expiresAt: null,
      startsOnFirstLogin: true,
      createdAccount: false,
      prePlanLabel: PRE_PLAN_LABELS[currentPlan] ?? null,
      actionLink,
      durationLabel,
      days,
    });

    return NextResponse.json({
      ok: true,
      granted: true,
      reason: "upgraded",
      granted_plan: trialPlan,
      pre_plan: currentPlan,
      expires_at: null,
      pending_days: days,
      created: false,
      source,
    });
  }

  // ── 4b. Aucun compte : CRÉATION d'un compte Plus (revert => gratuit) ──
  // On tente d'abord de retrouver un user auth sans profile (bord rare).
  let userId: string | null = null;
  let createdAccount = false;
  let actionLink: string | null = null;

  try {
    const found = await findUserByEmail(email);
    if (found) {
      userId = found.id;
      // user auth existe mais pas de profile : on génère un lien magique.
      const { data } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${APP_URL}/auth/callback` },
      });
      actionLink = data?.properties?.action_link ?? null;
    } else {
      // Invitation : crée le compte ET renvoie le lien, sans email Supabase
      // (c'est notre email brandé qui part).
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo: `${APP_URL}/auth/callback` },
      });
      if (error || !data?.user) {
        console.error("[grant-plus-trial] invite failed:", error?.message);
        return NextResponse.json({ ok: false, reason: "invite_failed" }, { status: 500 });
      }
      userId = data.user.id;
      createdAccount = true;
      actionLink = data.properties?.action_link ?? null;
    }
  } catch (e) {
    console.error("[grant-plus-trial] auth error:", (e as Error).message);
    return NextResponse.json({ ok: false, reason: "auth_error" }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "no_user" }, { status: 500 });
  }

  // Profile Plus avec pre_plan="free". Démarrage différé : revert en gratuit
  // à J+days A COMPTER DE LA PREMIERE CONNEXION (pending_days), pas maintenant.
  const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      email,
      plan: "monthly_plus",
      affiliate_trial_pre_plan: "free",
      affiliate_trial_pending_days: days,
      affiliate_trial_expires_at: null,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsertErr) {
    console.error("[grant-plus-trial] profile upsert error:", upsertErr.message);
    return NextResponse.json({ ok: false, reason: "profile_upsert_error" }, { status: 500 });
  }

  void sendPlusTrialEmail({
    email,
    expiresAt: null,
    startsOnFirstLogin: true,
    createdAccount,
    prePlanLabel: "gratuit",
    actionLink,
    durationLabel,
    days,
  });

  return NextResponse.json({
    ok: true,
    granted: true,
    reason: createdAccount ? "created" : "upgraded_orphan",
    granted_plan: "monthly_plus",
    pre_plan: "free",
    expires_at: null,
    pending_days: days,
    created: createdAccount,
    source,
  });
}
