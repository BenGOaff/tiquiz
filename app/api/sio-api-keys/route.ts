// app/api/sio-api-keys/route.ts
// GET  — list the current user's Systeme.io API keys (masked, no ciphertext)
// POST — register a new key after live-validating it against the SIO API.
//
// Validation rationale: a wrong API key is the #1 source of "my leads
// aren't syncing" support tickets. We hit GET /tags?limit=10 before
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
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sio-api-keys GET] failed:", { err: e instanceof Error ? { message: e.message, stack: e.stack } : String(e) });
    // Same SERVER_MISCONFIGURED contract as POST: surface the missing
    // SIO_KEY_ENCRYPTION_KEY env explicitly so the dashboard shows
    // an actionable message instead of a bare 500. Triggered when
    // ensureLegacyMigrated has to decrypt/encrypt a row but the
    // master key is missing.
    if (/SIO_KEY_ENCRYPTION_KEY/i.test(msg)) {
      return NextResponse.json(
        { ok: false, error: "SERVER_MISCONFIGURED", details: "Encryption key missing on server." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, error: msg || "Unknown error" },
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
    //
    // limit=10 (NOT 1) — Systeme.io tightened the /tags validator at
    // some point and now rejects anything < 10 with a 422 "This value
    // should be between 10 and 100" (caught in production logs on
    // 2026-04-29). 10 is the smallest accepted value, still cheap.
    let validate;
    try {
      validate = await sioUserRequest(apiKey, "/tags?limit=10");
    } catch (validateErr) {
      // sioUserRequest catches its own fetch errors so a throw here is
      // truly exceptional (e.g. invalid URL construction). Log loudly
      // so it shows up in production logs with enough context for triage.
      console.error("[sio-api-keys POST] sioUserRequest threw:", {
        userId: user.id,
        keyName: name,
        keyLast4: apiKey.slice(-4),
        err: validateErr instanceof Error ? { message: validateErr.message, stack: validateErr.stack } : String(validateErr),
      });
      return NextResponse.json(
        { ok: false, error: "VALIDATION_FAILED", reason: "validate_throw" },
        { status: 502 },
      );
    }

    if (!validate.ok) {
      // Log the real upstream status + error snippet so support can
      // tell apart a bad key (401/403) from rate-limit (429), SIO
      // outage (5xx), or network issue (status=0). The key itself is
      // never logged — only its last 4 chars.
      console.warn("[sio-api-keys POST] Systeme.io validation failed:", {
        userId: user.id,
        keyName: name,
        keyLast4: apiKey.slice(-4),
        upstreamStatus: validate.status,
        upstreamError: (validate.error ?? "").slice(0, 200),
      });
      const errCode = validate.status === 401 || validate.status === 403
        ? "INVALID_KEY"
        : validate.status === 429
          ? "RATE_LIMITED"
          : validate.status >= 500
            ? "SIO_DOWN"
            : validate.status === 0
              ? "NETWORK_ERROR"
              : "VALIDATION_FAILED";
      return NextResponse.json(
        {
          ok: false,
          error: errCode,
          // Echo the upstream status so the UI can render an actionable
          // hint ("Systeme.io rate-limited, retry in 1 min" rather than
          // the generic "validation failed").
          upstream_status: validate.status,
          details: (validate.error ?? "").slice(0, 200) || null,
        },
        { status: 400 },
      );
    }

    try {
      const created = await createKey(user.id, name, apiKey, "validated");
      return NextResponse.json({ ok: true, key: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[sio-api-keys POST] createKey failed:", {
        userId: user.id,
        keyName: name,
        keyLast4: apiKey.slice(-4),
        err: e instanceof Error ? { message: e.message, stack: e.stack } : String(e),
      });
      if (/duplicate|unique/i.test(msg)) {
        return NextResponse.json({ ok: false, error: "NAME_TAKEN" }, { status: 409 });
      }
      // SIO_KEY_ENCRYPTION_KEY missing/wrong-size → encryptApiKey throws
      // with that exact substring. Surface it as its own code so support
      // can fix the env without digging through stack traces.
      if (/SIO_KEY_ENCRYPTION_KEY/i.test(msg)) {
        return NextResponse.json(
          { ok: false, error: "SERVER_MISCONFIGURED", details: "Encryption key missing on server." },
          { status: 500 },
        );
      }
      throw e;
    }
  } catch (e) {
    console.error("[sio-api-keys POST] uncaught error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
