// app/api/days/[day]/answer/route.ts
// Enregistre (upsert) la réponse d'un élève à une question du jour.
// La RLS garantit qu'un élève n'écrit que ses propres réponses.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getDaysWithProgress } from "@/lib/parcours";

const bodySchema = z.object({
  questionId: z.string().uuid(),
  value_text: z.string().max(5000).nullable().optional(),
  value_choice: z.string().max(500).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ day: string }> },
) {
  const { day } = await params;
  const dayNumber = Number.parseInt(day, 10);
  if (!Number.isFinite(dayNumber)) {
    return NextResponse.json({ ok: false, reason: "bad_day" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { questionId, value_text, value_choice } = parsed.data;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  // Integrite : on resout le jour via la progression pour verifier qu'il est
  // publie ET debloque pour cet eleve. Empeche d'ecrire une reponse sur un
  // jour hors sequence (ou non publie) par appel API direct.
  const daysProgress = await getDaysWithProgress(user.id);
  const target = daysProgress.find((d) => d.day_number === dayNumber);
  if (!target) return NextResponse.json({ ok: false, reason: "no_day" }, { status: 404 });
  if (!target.unlocked) {
    return NextResponse.json({ ok: false, reason: "locked" }, { status: 403 });
  }
  const dayId = target.id;

  // Vérifie que la question appartient bien à ce jour.
  const { data: question } = await supabase
    .from("questions")
    .select("id, day_id")
    .eq("id", questionId)
    .eq("day_id", dayId)
    .maybeSingle();
  if (!question) {
    return NextResponse.json({ ok: false, reason: "no_question" }, { status: 404 });
  }

  const { error } = await supabase.from("answers").upsert(
    {
      user_id: user.id,
      day_id: dayId,
      question_id: questionId,
      value_text: value_text ?? null,
      value_choice: value_choice ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
