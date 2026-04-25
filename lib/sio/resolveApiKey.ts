// lib/sio/resolveApiKey.ts
// Resolves which Systeme.io API key to use for a given operation.
//
// CASCADE — first non-null wins:
//   1. explicit keyId (e.g. quiz.sio_api_key_id, or ?keyId=… from editor)
//   2. user's default key in sio_api_keys (is_default=true)
//   3. any key the user has (oldest first)
//   4. legacy profiles.sio_user_api_key (plaintext) — backwards compat
//   5. null (no key configured)
//
// Step 4 is critical: it lets users who never opened the new Settings UI
// keep syncing leads on their existing live quizzes. As soon as they
// open Settings (or hit POST /api/sio-api-keys), keysRepo.ensureLegacyMigrated
// moves the legacy value into the new table and clears the column, after
// which step 4 stops contributing.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptApiKey } from "@/lib/sio/keyCrypto";

export interface ResolvedKey {
  apiKey: string;
  keyId: string | null;       // null if it came from the legacy profile column
  source: "explicit" | "default" | "any" | "legacy";
}

export async function resolveApiKey(
  userId: string,
  opts: { explicitKeyId?: string | null } = {},
): Promise<ResolvedKey | null> {
  const explicit = opts.explicitKeyId?.trim();

  // 1. explicit
  if (explicit) {
    const { data } = await supabaseAdmin
      .from("sio_api_keys")
      .select("id, api_key_encrypted")
      .eq("user_id", userId)
      .eq("id", explicit)
      .maybeSingle();
    const env = (data as { api_key_encrypted?: string } | null)?.api_key_encrypted;
    if (env) {
      try {
        return { apiKey: decryptApiKey(env), keyId: explicit, source: "explicit" };
      } catch {
        // Fall through to next strategies if the explicit key is corrupted.
      }
    }
  }

  // 2. default
  {
    const { data } = await supabaseAdmin
      .from("sio_api_keys")
      .select("id, api_key_encrypted")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();
    const row = data as { id?: string; api_key_encrypted?: string } | null;
    if (row?.api_key_encrypted) {
      try {
        return { apiKey: decryptApiKey(row.api_key_encrypted), keyId: row.id ?? null, source: "default" };
      } catch { /* fall through */ }
    }
  }

  // 3. any
  {
    const { data } = await supabaseAdmin
      .from("sio_api_keys")
      .select("id, api_key_encrypted")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const row = data as { id?: string; api_key_encrypted?: string } | null;
    if (row?.api_key_encrypted) {
      try {
        return { apiKey: decryptApiKey(row.api_key_encrypted), keyId: row.id ?? null, source: "any" };
      } catch { /* fall through */ }
    }
  }

  // 4. legacy plaintext
  {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("sio_user_api_key")
      .eq("user_id", userId)
      .maybeSingle();
    const legacy = String((data as { sio_user_api_key?: string } | null)?.sio_user_api_key ?? "").trim();
    if (legacy) {
      return { apiKey: legacy, keyId: null, source: "legacy" };
    }
  }

  return null;
}
