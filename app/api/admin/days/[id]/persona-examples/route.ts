// app/api/admin/days/[id]/persona-examples/route.ts
// Encarts d'exemples par persona pour un jour (admin).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PERSONAS } from "@/lib/personas";

const personaValues = PERSONAS.map((p) => p.value) as [string, ...string[]];

const putSchema = z.object({
  persona: z.enum(personaValues),
  examples_html: z.string().max(20000).nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("day_persona_examples")
    .select("persona, examples_html")
    .eq("day_id", id);
  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const { id } = await params;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("day_persona_examples").upsert(
    {
      day_id: id,
      persona: parsed.data.persona,
      examples_html: parsed.data.examples_html,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day_id,persona" },
  );
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
