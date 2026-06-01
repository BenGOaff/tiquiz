// app/api/dashboard/wall-of-wins/route.ts (Tiquiz)
//
// GET ?period=month|30d|90d → payload Wall of Wins de l'user connecté.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  getWallOfWinsPayload,
  resolveWindowForPeriod,
  type WallOfWinsPeriod,
} from "@/lib/wallOfWins/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID: readonly WallOfWinsPeriod[] = ["month", "30d", "90d"];

function parsePeriod(raw: string | null): WallOfWinsPeriod {
  if (!raw) return "month";
  return (VALID as readonly string[]).includes(raw)
    ? (raw as WallOfWinsPeriod)
    : "month";
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));
  const { since, until } = resolveWindowForPeriod(period);

  try {
    const payload = await getWallOfWinsPayload({ userId: user.id, since, until });
    return NextResponse.json({ ok: true, period, ...payload });
  } catch (err) {
    console.error("[wall-of-wins] failed", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
