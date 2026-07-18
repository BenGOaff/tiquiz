// app/api/admin/sio-templates/[id]/route.ts : editer / supprimer un modele.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const patchSchema = z.object({
  label: z.string().min(1).max(160).optional(),
  kind: z.enum(["sequence", "tunnel", "autre"]).optional(),
  url: z.string().url().max(2000).optional(),
  description: z.string().max(600).nullable().optional(),
  enabled: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("sio_templates")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const { id } = await params;
  const { error } = await supabaseAdmin.from("sio_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
