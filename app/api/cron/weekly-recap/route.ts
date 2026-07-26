// app/api/cron/weekly-recap/route.ts
// Récap hebdomadaire doux (à déclencher le lundi matin par un cron).
// Auth : Bearer CRON_SECRET ou ?secret= (pattern Tiquiz).
// Idempotent pour la journée : digest_log empêche le double-envoi.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getWeeklyRecapRecipients } from "@/lib/digest";
import { sendEmail } from "@/lib/email/resend";
import { weeklyRecapEmail } from "@/lib/email/templates";

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

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const recipients = await getWeeklyRecapRecipients();

  let sent = 0;
  let skipped = 0;
  for (const r of recipients) {
    // Anti double-envoi du jour : on tente de poser le verrou d'abord.
    const { error: lockErr } = await supabaseAdmin
      .from("digest_log")
      .insert({ user_id: r.userId, sent_on: today, kind: "weekly_recap" });
    if (lockErr) {
      skipped += 1; // deja envoye aujourd'hui (conflit de cle) ou erreur
      continue;
    }
    const { subject, html } = weeklyRecapEmail({
      firstName: r.firstName,
      dayNumber: r.dayNumber,
      dayTitle: r.dayTitle,
      completed: r.completed,
      total: r.total,
    });
    const res = await sendEmail({ to: r.email, subject, html });
    if (res.ok) sent += 1;
    else skipped += 1;
  }

  return NextResponse.json({ ok: true, candidates: recipients.length, sent, skipped });
}
