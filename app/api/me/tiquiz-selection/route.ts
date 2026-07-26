// app/api/me/tiquiz-selection/route.ts
// Mémorise la sélection projet/quiz de l'élève pour le panel Tiquiz.
// Valeurs acceptées : "" (tout), "project:<id>", "quiz:<id>". La resync des
// métriques (syncMetrics) et le Quiz Doctor liront ensuite cette sélection.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/parcours";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const schema = z.object({
  scope: z.string().max(120).regex(/^$|^(project|quiz):[a-zA-Z0-9-]+$/, "bad_scope"),
});

export async function PATCH(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("tiquiz_connections")
    .update({ selected_scope: parsed.data.scope || null })
    .eq("user_id", viewer.userId);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  return NextResponse.json({ ok: true, scope: parsed.data.scope });
}
