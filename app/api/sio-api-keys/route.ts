// app/api/sio-api-keys/route.ts
// GET  — list the current user's Systeme.io API keys (masked, no ciphertext)
// POST — register a new key after live-validating it against the SIO API.
//
// Validation rationale: a wrong API key is the #1 source of "my leads
// aren't syncing" support tickets. We hit GET /tags?limit=1 before
// persisting, so a 401/403 surfaces immediately as an error instead of
// hiding inside async lead-sync failures days later.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { createKey, listKeys } from "@/lib/sio/keysRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const keys = await listKeys(user.id);
    return NextResponse.json({ ok: true, keys });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 80);
    const apiKey = String(body?.apiKey ?? "").trim();

    if (!name) return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });
    if (!apiKey) return NextResponse.json({ ok: false, error: "KEY_REQUIRED" }, { status: 400 });

    // Live-validate against Systeme.io. /tags is cheap, paginated, and
    // returns 401 on a bad key — perfect canary endpoint.
    const validate = await sioUserRequest(apiKey, "/tags?limit=1");
    if (!validate.ok) {
      const status = validate.status === 401 || validate.status === 403 ? "INVALID_KEY" : "VALIDATION_FAILED";
      return NextResponse.json(
        { ok: false, error: status, details: validate.error ?? null },
        { status: 400 },
      );
    }

    try {
      const created = await createKey(user.id, name, apiKey, "validated");
      return NextResponse.json({ ok: true, key: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate|unique/i.test(msg)) {
        return NextResponse.json({ ok: false, error: "NAME_TAKEN" }, { status: 409 });
      }
      throw e;
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
