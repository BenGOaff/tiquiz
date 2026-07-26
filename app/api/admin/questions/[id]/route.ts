// app/api/admin/questions/[id]/route.ts — éditer / supprimer une question.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const optionSchema = z.object({
  value: z.string().min(1).max(120),
  label: z.string().min(1).max(300),
  tag: z.string().max(120).optional(),
});

const patchSchema = z.object({
  type: z.enum(["action", "decision", "self_eval", "recall"]).optional(),
  prompt: z.string().min(1).max(500).optional(),
  help_text: z.string().max(1000).nullable().optional(),
  reveal_html: z.string().max(2000).nullable().optional(),
  options: z.array(optionSchema).optional(),
  required: z.boolean().optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("questions").update(parsed.data).eq("id", id);
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
  const { error } = await supabaseAdmin.from("questions").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
