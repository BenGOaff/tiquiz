// app/api/cron/backfill-milestones/route.ts (Tiquiz)
//
// CRON ONE-SHOT — à run UNE FOIS après déploiement de la phase 1
// milestones. Port adapté de Tipote (sans project_id).
//
// Tiquiz a des mois d'historique (quiz_leads, quiz_events, quizzes).
// Sans backfill, un user actif verrait first_lead + leads_10 + leads_100
// popper d'un coup au prochain event. Ce cron insère silencieusement
// (seen_at = now()) les paliers déjà franchis → pas de toast à tort.
//
// Idempotent (UNIQUE constraint user_milestones). Re-jouable après
// ajout de milestones au catalog.
//
// Auth : Bearer CRON_SECRET ou ?secret= (pattern Tiquiz, cf.
// sio-reconcile). À lancer :
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//     https://quiz.tipote.com/api/cron/backfill-milestones

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { countOutcomes } from "@/lib/businessOutcomes";
import {
  MILESTONE_CATALOG,
  type MilestoneDefinition,
} from "@/lib/milestones/catalog";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { BusinessEventKind } from "@/lib/businessEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

interface BackfillResult {
  userId: string;
  inserted: number;
  skipped: number;
  error?: string;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Tous les users avec un profil. ⚠️ Tiquiz : profiles.id est la PK
  // propre de la table, profiles.user_id est l'auth user id (FK vers
  // auth.users) — c'est CE dernier qui matche quizzes.user_id. Ne PAS
  // confondre avec Tipote où profiles.id = auth user id.
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: BackfillResult[] = [];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const profile of ((profiles ?? []) as Array<{ user_id: string }>)) {
    if (!profile.user_id) continue;
    try {
      const r = await backfillForUser(profile.user_id);
      results.push(r);
      totalInserted += r.inserted;
      totalSkipped += r.skipped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ userId: profile.user_id, inserted: 0, skipped: 0, error: message });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    totalInserted,
    totalSkipped,
    results: results.slice(0, 100),
  });
}

async function backfillForUser(userId: string): Promise<BackfillResult> {
  const byKind = new Map<BusinessEventKind, MilestoneDefinition[]>();
  for (const m of MILESTONE_CATALOG) {
    const arr = byKind.get(m.trigger.kind) ?? [];
    arr.push(m);
    byKind.set(m.trigger.kind, arr);
  }

  const allKeys = MILESTONE_CATALOG.map((m) => m.key);
  const { data: existingRows } = await supabaseAdmin
    .from("user_milestones")
    .select("milestone_key")
    .eq("user_id", userId)
    .in("milestone_key", allKeys);
  const existingKeys = new Set(
    ((existingRows ?? []) as Array<{ milestone_key: string }>).map((r) => r.milestone_key),
  );

  const rowsToInsert: Array<{
    user_id: string;
    milestone_key: string;
    payload: Record<string, unknown>;
    seen_at: string;
  }> = [];
  let skipped = 0;
  const now = new Date().toISOString();

  for (const [kind, milestones] of byKind.entries()) {
    const totalCount = await countOutcomes(userId, kind);
    if (totalCount === 0) continue;

    for (const milestone of milestones.sort(
      (a, b) => a.trigger.threshold - b.trigger.threshold,
    )) {
      if (existingKeys.has(milestone.key)) {
        skipped += 1;
        continue;
      }
      if (totalCount < milestone.trigger.threshold) break;
      rowsToInsert.push({
        user_id: userId,
        milestone_key: milestone.key,
        payload: {
          count: totalCount,
          emoji: milestone.emoji,
          title: milestone.title,
          backfilled: true,
        },
        seen_at: now,
      });
    }
  }

  if (rowsToInsert.length === 0) {
    return { userId, inserted: 0, skipped };
  }

  const { error } = await supabaseAdmin.from("user_milestones").insert(rowsToInsert);
  if (error) {
    return { userId, inserted: 0, skipped, error: error.message };
  }
  return { userId, inserted: rowsToInsert.length, skipped };
}
