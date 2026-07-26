// app/api/admin/days/[id]/duplicate/route.ts — dupliquer un jour (+ ses
// questions). Le doublon est créé en brouillon, avec un day_number libre.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { id } = await params;

  const { data: src } = await supabaseAdmin.from("days").select("*").eq("id", id).maybeSingle();
  if (!src) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  // Trouve un day_number libre (max + 1).
  const { data: maxRow } = await supabaseAdmin
    .from("days")
    .select("day_number")
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const newNumber = (maxRow?.day_number ?? 0) + 1;

  const { data: copy, error } = await supabaseAdmin
    .from("days")
    .insert({
      day_number: newNumber,
      slug: `jour-${newNumber}`,
      title: `${src.title} (copie)`,
      subtitle: src.subtitle,
      intro_html: src.intro_html,
      video_url: src.video_url,
      video_title: src.video_title,
      video2_url: src.video2_url,
      video2_title: src.video2_title,
      // Copie les vidéos par URL (pas les uploads : video_id est propre à
      // l'original). Un upload à re-lier manuellement sur la copie.
      videos: Array.isArray(src.videos)
        ? (src.videos as Array<{ title?: string; url?: string | null; video_id?: string | null }>).map((v) => ({
            title: v.title ?? "",
            url: v.url ?? null,
            video_id: null,
          }))
        : [],
      resources: src.resources,
      result_html: src.result_html,
      status: "draft",
      sort_order: newNumber * 10,
    })
    .select("id")
    .single();

  if (error || !copy) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  // Copie les questions.
  const { data: questions } = await supabaseAdmin
    .from("questions")
    .select("type, prompt, help_text, options, required, sort_order")
    .eq("day_id", id);

  if (questions && questions.length > 0) {
    await supabaseAdmin
      .from("questions")
      .insert(questions.map((q) => ({ ...q, day_id: copy.id })));
  }

  return NextResponse.json({ ok: true, id: copy.id });
}
