// app/api/admin/coach/knowledge/route.ts — créer un document de connaissance.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100000).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { data: maxRow } = await supabaseAdmin
    .from("coach_knowledge")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("coach_knowledge")
    .insert({ title: parsed.data.title, content: parsed.data.content ?? "", sort_order: nextOrder })
    .select("id")
    .single();
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
