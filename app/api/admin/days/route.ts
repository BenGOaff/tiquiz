// app/api/admin/days/route.ts — créer un jour.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const createSchema = z.object({
  day_number: z.number().int(),
  title: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { day_number, title } = parsed.data;

  // sort_order par défaut = day_number * 10 (laisse de la place pour
  // réordonner sans renuméroter).
  const { data, error } = await supabaseAdmin
    .from("days")
    .insert({
      day_number,
      title,
      slug: `jour-${day_number}`,
      status: "draft",
      sort_order: day_number * 10,
    })
    .select("id")
    .single();

  if (error) {
    const reason = error.code === "23505" ? "duplicate_day_number" : "db";
    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
