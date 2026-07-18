// app/api/me/funnel/intentions/route.ts
// Intentions de campagne par profil de resultat.
//   GET  : profils REELS du quiz (titre + presence d'un CTA) + intentions enregistrees.
//   POST : enregistre la map { titre profil -> intention }.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/parcours";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { fetchQuizProfiles } from "@/lib/integrations/tiquiz";
import { getFunnelIntentions } from "@/lib/generate/funnel";
import { sanitizeIntentionMap } from "@/lib/funnelIntentions";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });

  const [profiles, intentions] = await Promise.all([
    fetchQuizProfiles(viewer.userId),
    getFunnelIntentions(viewer.userId),
  ]);

  return NextResponse.json({
    ok: true,
    profiles: profiles.map((p) => ({
      title: p.title,
      hasCta: Boolean((p.ctaText && p.ctaText.trim()) || (p.ctaUrl && p.ctaUrl.trim())),
    })),
    intentions,
  });
}

const schema = z.object({ intentions: z.record(z.string(), z.string()) });

export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const intentions = sanitizeIntentionMap(parsed.data.intentions);

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("funnel_intentions").upsert(
    { user_id: viewer.userId, intentions, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  return NextResponse.json({ ok: true, intentions });
}
