// app/api/plus-trial/status/route.ts
// Décompte public de l'opération "20 premiers = 1 mois Tiquiz Plus offert".
// Consommé par le widget embarqué sur les pages Systeme.io (bon de
// commande). CORS ouvert (lecture seule, aucune donnée sensible).
//
// GET /api/plus-trial/status?funnel=bene  -> { funnel, cap, granted, remaining }
import { NextRequest, NextResponse } from "next/server";
import { getPlusTrialStatus } from "@/lib/plusTrial/grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Le décompte peut être légèrement caché pour tenir la charge des pages
  // de vente sans marteler la DB. 15s reste "temps réel" à l'oeil.
  "Cache-Control": "public, max-age=15, s-maxage=15",
};

export async function GET(req: NextRequest) {
  const funnel = (req.nextUrl.searchParams.get("funnel") ?? "bene").trim() || "bene";
  const status = await getPlusTrialStatus(funnel);
  return NextResponse.json({ ok: true, ...status }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
