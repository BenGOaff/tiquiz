// app/api/cron/affiliate-trial-expiry/route.ts (Tiquiz)
//
// Cron quotidien qui révoque les trials Tiquiz Plus 1 mois donnés via
// le dashboard affilié Tipote.
//
// Mécanique :
//   - Le dashboard Tipote a écrit (via service-role cross-app) sur
//     Tiquiz : profiles.plan = monthly_plus (ou yearly_plus),
//     profiles.affiliate_trial_pre_plan = ancien plan,
//     profiles.affiliate_trial_expires_at = +30j.
//   - Ce cron parcourt les profiles dont affiliate_trial_expires_at est
//     dans le passé, remet plan = affiliate_trial_pre_plan, et clear
//     les 2 colonnes.
//
// À programmer quotidien (≈09:00) sur le scheduler Tiquiz.
// Auth : Bearer CRON_SECRET (pattern habituel).
//
// Ligne crontab à coller (`crontab -e` sur le VPS, sous user `tipote`) :
//   0 9 * * * cd /home/tipote/tiquiz-app && set -a; . .env; set +a; curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://quiz.tipote.com/api/cron/affiliate-trial-expiry >> /tmp/affiliate-trial-expiry.log 2>&1
//
// Vérif que c'est bien planifié : `crontab -l | grep affiliate-trial-expiry`

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

function authOk(req: NextRequest): boolean {
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

type ExpiringProfile = {
  user_id: string;
  email: string | null;
  plan: string | null;
  affiliate_trial_pre_plan: string | null;
  affiliate_trial_expires_at: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { data: expired, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, plan, affiliate_trial_pre_plan, affiliate_trial_expires_at")
    .not("affiliate_trial_expires_at", "is", null)
    .lt("affiliate_trial_expires_at", now.toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let reverted = 0;
  let errors = 0;
  for (const p of (expired ?? []) as ExpiringProfile[]) {
    // Si pre_plan est NULL (ne devrait pas arriver), on retombe sur free
    // pour être safe — pas de panique en prod.
    const target = p.affiliate_trial_pre_plan ?? "free";
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: target,
        affiliate_trial_pre_plan: null,
        affiliate_trial_expires_at: null,
        updated_at: now.toISOString(),
      })
      .eq("user_id", p.user_id);
    if (updErr) {
      console.error(
        `[cron/affiliate-trial-expiry] revert failed for ${p.email ?? p.user_id}:`,
        updErr.message,
      );
      errors += 1;
      continue;
    }
    reverted += 1;
  }

  return NextResponse.json({
    ok: true,
    reverted,
    errors,
    ran_at: now.toISOString(),
  });
}
