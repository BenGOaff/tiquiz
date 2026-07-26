// app/api/admin/video/[id]/ready/route.ts
// Marque une vidéo comme prête une fois l'upload tus terminé (appelé par
// l'admin depuis le client, onSuccess de l'upload). Pas de transcodage :
// on lit le fichier source directement via URL signée.
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
  const { error } = await supabaseAdmin
    .from("quizing_videos")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
