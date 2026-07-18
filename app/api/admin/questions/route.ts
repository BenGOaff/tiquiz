// app/api/admin/questions/route.ts — créer une question dans un jour.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({
  day_id: z.string().uuid(),
  // Règle d'or : jamais de QCM trivia. Types autorisés uniquement.
  type: z.enum(["action", "decision", "self_eval", "recall"]),
  prompt: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { day_id, type, prompt } = parsed.data;

  // sort_order = (max du jour) + 1.
  const { data: maxRow } = await supabaseAdmin
    .from("questions")
    .select("sort_order")
    .eq("day_id", day_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("questions")
    .insert({ day_id, type, prompt, sort_order: nextOrder, options: [] })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
