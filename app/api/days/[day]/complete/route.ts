// app/api/days/[day]/complete/route.ts
// Valide le jour : vérifie que les questions obligatoires ont une
// réponse, puis pose le statut "completed" (ce qui débloque le jour
// suivant côté lib/parcours). Déblocage sur complétion, jamais sur
// score (cf. cahier des charges).
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDaysWithProgress, snapshotFromDays } from "@/lib/parcours";
import { earnedBadgeCodes, badgeByCode } from "@/lib/gamification";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ day: string }> },
) {
  const { day } = await params;
  const dayNumber = Number.parseInt(day, 10);
  if (!Number.isFinite(dayNumber)) {
    return NextResponse.json({ ok: false, reason: "bad_day" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  // Integrite : on resout le jour via la progression pour verifier qu'il est
  // publie ET debloque pour cet eleve. Empeche de valider un jour hors
  // sequence (ou non publie) par appel API direct.
  const daysProgress = await getDaysWithProgress(user.id);
  const target = daysProgress.find((d) => d.day_number === dayNumber);
  if (!target) return NextResponse.json({ ok: false, reason: "no_day" }, { status: 404 });
  if (!target.unlocked) {
    return NextResponse.json({ ok: false, reason: "locked" }, { status: 403 });
  }
  const dayId = target.id;

  // Questions obligatoires de ce jour.
  const { data: requiredQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("day_id", dayId)
    .eq("required", true);

  const requiredIds = (requiredQuestions ?? []).map((q) => q.id as string);

  if (requiredIds.length > 0) {
    const { data: answered } = await supabase
      .from("answers")
      .select("question_id, value_text, value_choice")
      .eq("user_id", user.id)
      .eq("day_id", dayId)
      .in("question_id", requiredIds);

    const answeredOk = new Set(
      (answered ?? [])
        .filter(
          (a) =>
            (a.value_text && String(a.value_text).trim() !== "") ||
            (a.value_choice && String(a.value_choice).trim() !== ""),
        )
        .map((a) => a.question_id as string),
    );

    const missing = requiredIds.some((id) => !answeredOk.has(id));
    if (missing) {
      return NextResponse.json({ ok: false, reason: "incomplete" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("progress").upsert(
    {
      user_id: user.id,
      day_id: dayId,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });
  }

  // ── Badges : on attribue les jalons nouvellement merites ──
  // L'ecriture passe par la service_role (RLS badges = lecture seule pour
  // l'eleve). Un echec ici ne doit pas casser la validation du jour.
  const newBadges: { code: string; label: string }[] = [];
  try {
    const days = await getDaysWithProgress(user.id);
    const earned = earnedBadgeCodes(snapshotFromDays(days));

    const { data: existing } = await supabaseAdmin
      .from("badges")
      .select("code")
      .eq("user_id", user.id);
    const have = new Set((existing ?? []).map((b) => b.code as string));

    const toInsert = earned.filter((code) => !have.has(code));
    if (toInsert.length > 0) {
      await supabaseAdmin
        .from("badges")
        .upsert(
          toInsert.map((code) => ({ user_id: user.id, code })),
          { onConflict: "user_id,code", ignoreDuplicates: true },
        );
      for (const code of toInsert) {
        const def = badgeByCode(code);
        if (def) newBadges.push({ code, label: def.label });
      }
    }
  } catch {
    // silencieux : la validation du jour reste acquise.
  }

  return NextResponse.json({ ok: true, newBadges });
}
