// app/api/admin/sio-templates/route.ts : modeles Systeme.io (admin).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const createSchema = z.object({
  label: z.string().min(1).max(160),
  kind: z.enum(["sequence", "tunnel", "autre"]).default("autre"),
  url: z.string().url().max(2000),
  description: z.string().max(600).nullable().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const { data } = await supabaseAdmin
    .from("sio_templates")
    .select("id, label, kind, url, description, enabled, sort_order")
    .order("sort_order", { ascending: true });
  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });

  const { data: maxRow } = await supabaseAdmin
    .from("sio_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((maxRow?.sort_order as number) ?? 0) + 10;

  const { data, error } = await supabaseAdmin
    .from("sio_templates")
    .insert({ ...parsed.data, description: parsed.data.description ?? null, sort_order })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
