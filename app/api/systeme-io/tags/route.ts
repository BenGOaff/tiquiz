// app/api/systeme-io/tags/route.ts
// GET user's Systeme.io tags (paginated). Accepts ?keyId= so the quiz
// editor can preview the tags of a specific key without changing the
// user's default.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const explicitKeyId = req.nextUrl.searchParams.get("keyId");
    const resolved = await resolveApiKey(user.id, { explicitKeyId });
    if (!resolved) {
      return NextResponse.json({ ok: false, error: "NO_API_KEY", tags: [] });
    }

    const res = await sioUserRequest<{ items: { id: number; name: string }[] }>(
      resolved.apiKey,
      "/tags?limit=100",
    );
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error, tags: [] }, { status: 400 });
    }

    return NextResponse.json({ ok: true, tags: res.data?.items ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
