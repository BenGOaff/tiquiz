// app/api/popquiz/route.ts
// CRUD entry point for popquizzes.
//   GET  — list current user's popquizzes (lightweight)
//   POST — atomic create: video row + popquiz row + cues
//
// Cue quiz_ids are validated against the caller's owned quizzes so
// nobody can attach someone else's quiz to their own popquiz.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { parseVideoUrl } from "@/lib/popquiz";

export const dynamic = "force-dynamic";

interface CueInput {
  quiz_id: string;
  timestamp_ms: number;
  behavior: "block" | "optional";
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("popquizzes")
    .select(
      `id, title, description, locale, is_published, views_count, completions_count, created_at,
       video:popquiz_videos!inner(source, thumbnail_url, duration_ms, status)`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, popquizzes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  const url = String(body.url ?? "").trim();
  const parsed = parseVideoUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid or unsupported video URL" },
      { status: 400 },
    );
  }

  const rawCues = Array.isArray(body.cues) ? body.cues : [];
  const cues: CueInput[] = [];
  for (const c of rawCues) {
    if (!c || typeof c !== "object") continue;
    const cue = c as Record<string, unknown>;
    const quiz_id = String(cue.quiz_id ?? "");
    const timestamp_ms = Number(cue.timestamp_ms);
    if (!quiz_id || !Number.isFinite(timestamp_ms) || timestamp_ms < 0) continue;
    cues.push({
      quiz_id,
      timestamp_ms: Math.floor(timestamp_ms),
      behavior: cue.behavior === "optional" ? "optional" : "block",
    });
  }

  // Cross-check ownership of every linked quiz. The DB's FK only
  // checks existence, not ownership — we don't want users grafting
  // someone else's quiz onto their popquiz.
  if (cues.length > 0) {
    const ids = Array.from(new Set(cues.map((c) => c.quiz_id)));
    const { data: ownedQuizzes } = await supabase
      .from("quizzes")
      .select("id")
      .eq("user_id", user.id)
      .in("id", ids);
    const owned = new Set((ownedQuizzes ?? []).map((q) => q.id));
    const missing = ids.filter((id) => !owned.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Quiz introuvable ou non possédé : ${missing.join(", ")}`,
        },
        { status: 400 },
      );
    }
  }

  // 1) Video. External providers (YouTube/Vimeo/URL direct) play
  // back without transcoding so we mark them ready immediately.
  // Uploads will arrive with status='pending' and the worker flips
  // them to 'ready' once HLS is built.
  const { data: video, error: videoError } = await supabase
    .from("popquiz_videos")
    .insert({
      user_id: user.id,
      source: parsed.source,
      external_url: parsed.normalizedUrl,
      external_id: parsed.externalId,
      status: parsed.source === "upload" ? "pending" : "ready",
    })
    .select("id")
    .single();

  if (videoError || !video) {
    return NextResponse.json(
      { ok: false, error: videoError?.message ?? "Failed to create video" },
      { status: 400 },
    );
  }

  // 2) Popquiz row.
  const { data: popquiz, error: popquizError } = await supabase
    .from("popquizzes")
    .insert({
      user_id: user.id,
      video_id: video.id,
      title,
      description: body.description ? String(body.description) : null,
      locale: typeof body.locale === "string" ? body.locale : "fr",
      is_published: body.is_published === true,
    })
    .select("id")
    .single();

  if (popquizError || !popquiz) {
    // Roll back the video row so we don't leave orphans.
    await supabase.from("popquiz_videos").delete().eq("id", video.id);
    return NextResponse.json(
      { ok: false, error: popquizError?.message ?? "Failed to create popquiz" },
      { status: 400 },
    );
  }

  // 3) Cues.
  if (cues.length > 0) {
    const { error: cuesError } = await supabase.from("popquiz_cues").insert(
      cues.map((c, i) => ({
        popquiz_id: popquiz.id,
        quiz_id: c.quiz_id,
        timestamp_ms: c.timestamp_ms,
        behavior: c.behavior,
        display_order: i,
      })),
    );
    if (cuesError) {
      // Cascade rollback. Delete popquiz → cascades cues; then video.
      await supabase.from("popquizzes").delete().eq("id", popquiz.id);
      await supabase.from("popquiz_videos").delete().eq("id", video.id);
      return NextResponse.json(
        { ok: false, error: cuesError.message },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ ok: true, popquizId: popquiz.id });
}
