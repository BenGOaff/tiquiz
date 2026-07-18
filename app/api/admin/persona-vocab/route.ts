// app/api/admin/persona-vocab/route.ts — glossaire par persona (admin).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { GLOSSARY_TERMS, PERSONAS } from "@/lib/personas";

const personaValues = PERSONAS.map((p) => p.value) as [string, ...string[]];

const vocabShape = z.object(
  Object.fromEntries(GLOSSARY_TERMS.map((t) => [t, z.string().max(120)])),
);

const putSchema = z.object({
  persona: z.enum(personaValues),
  vocab: vocabShape,
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  const { data } = await supabaseAdmin.from("persona_vocab").select("persona, vocab");
  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("persona_vocab").upsert(
    {
      persona: parsed.data.persona,
      vocab: parsed.data.vocab,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "persona" },
  );
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
