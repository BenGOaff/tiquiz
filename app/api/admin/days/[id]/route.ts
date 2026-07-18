// app/api/admin/days/[id]/route.ts — éditer / supprimer un jour.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resourceSchema = z.object({
  label: z.string().max(200),
  url: z.string().max(2000),
  type: z.string().max(40).optional(),
});

const patchSchema = z.object({
  day_number: z.number().int().optional(),
  slug: z.string().max(120).nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).nullable().optional(),
  intro_html: z.string().max(50000).nullable().optional(),
  pepite_html: z.string().max(20000).nullable().optional(),
  video_url: z.string().max(2000).nullable().optional(),
  video_id: z.string().uuid().nullable().optional(),
  video_title: z.string().max(200).nullable().optional(),
  video2_url: z.string().max(2000).nullable().optional(),
  video2_id: z.string().uuid().nullable().optional(),
  video2_title: z.string().max(200).nullable().optional(),
  videos: z
    .array(
      z.object({
        title: z.string().max(200),
        url: z.string().max(2000).nullable(),
        video_id: z.string().uuid().nullable(),
      }),
    )
    .max(30)
    .optional(),
  resources: z.array(resourceSchema).optional(),
  result_html: z.string().max(50000).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  sort_order: z.number().int().optional(),
  is_bonus: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("days")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    const reason = error.code === "23505" ? "duplicate" : "db";
    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("days").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
