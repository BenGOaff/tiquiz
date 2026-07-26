// app/api/me/feedback/route.ts
// L'élève signale un blocage (ou une idée). On collecte pour améliorer le
// contenu / le process. Écrit sur sa propre ligne (RLS).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const schema = z.object({
  dayNumber: z.number().int().nullable().optional(),
  message: z.string().min(2).max(2000),
  kind: z.enum(["blocage", "idee", "autre"]).default("blocage"),
});

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    day_number: parsed.data.dayNumber ?? null,
    kind: parsed.data.kind,
    message: parsed.data.message.trim(),
  });
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
