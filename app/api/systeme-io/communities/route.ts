// app/api/systeme-io/communities/route.ts
// GET user's Systeme.io communities
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sioUserRequest } from "@/lib/sio/userApiClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("sio_user_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    const apiKey = String((profile as Record<string, unknown>)?.sio_user_api_key ?? "").trim();
    if (!apiKey) return NextResponse.json({ ok: true, communities: [] });

    const res = await sioUserRequest<{ items: { id: number; name: string }[] }>(apiKey, "/community/communities?limit=100");
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });

    return NextResponse.json({ ok: true, communities: res.data?.items ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
