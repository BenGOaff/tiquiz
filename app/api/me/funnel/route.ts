// app/api/me/funnel/route.ts
// Chantier B : generation du funnel done-for-you de l'eleve.
//   GET  : renvoie la campagne stockee.
//   POST : (re)genere a partir du carnet + persona.
import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { generateFunnel, getFunnelAssets } from "@/lib/generate/funnel";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  const { assets, generatedAt } = await getFunnelAssets(viewer.userId);
  return NextResponse.json({ ok: true, assets, generatedAt });
}

export async function POST(_req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });

  const assets = await generateFunnel(viewer.userId);
  if (!assets) {
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, assets });
}
