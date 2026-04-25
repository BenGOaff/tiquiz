// lib/sio/keysRepo.ts
// Repository layer for sio_api_keys. All reads/writes go through here so
// the encryption boundary stays in one place and the rest of the app
// never touches ciphertext or the master key directly.
//
// Also owns the lazy-migration of legacy profiles.sio_user_api_key into
// sio_api_keys. Triggered on every read and write so that no matter
// which entry point a user hits first, their old key is moved into the
// new table (encrypted) and marked is_default=true exactly once.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptApiKey, decryptApiKey, lastFour } from "@/lib/sio/keyCrypto";

export interface SioApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  api_key_encrypted: string;
  api_key_last4: string | null;
  is_default: boolean;
  last_validated_at: string | null;
  validation_status: string | null;
  created_at: string;
  updated_at: string;
}

// Public-safe shape returned to the browser. Never includes plaintext
// or ciphertext — only metadata + last4 preview.
export interface SioApiKeyPublic {
  id: string;
  name: string;
  is_default: boolean;
  last4: string | null;
  last_validated_at: string | null;
  validation_status: string | null;
  created_at: string;
}

export function toPublic(row: SioApiKeyRow): SioApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    is_default: row.is_default,
    last4: row.api_key_last4,
    last_validated_at: row.last_validated_at,
    validation_status: row.validation_status,
    created_at: row.created_at,
  };
}

// Migrate profiles.sio_user_api_key (legacy plaintext) into sio_api_keys
// the first time we see a user. Idempotent: bails as soon as any row
// already exists for this user. After migrating we clear the legacy
// column so the resolver no longer falls back to it for this user.
export async function ensureLegacyMigrated(userId: string): Promise<void> {
  const { count } = await supabaseAdmin
    .from("sio_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("sio_user_api_key, sio_api_key_name")
    .eq("user_id", userId)
    .maybeSingle();

  const legacyKey = String((profile as Record<string, unknown> | null)?.sio_user_api_key ?? "").trim();
  if (!legacyKey) return;

  const legacyName =
    String((profile as Record<string, unknown> | null)?.sio_api_key_name ?? "").trim() ||
    "Ma clé Systeme.io";

  // Race-safe: another concurrent call may have inserted in the meantime.
  // The unique constraint on (user_id, name) and the partial index on
  // (user_id) WHERE is_default=true will reject duplicates; we swallow.
  const { error: insErr } = await supabaseAdmin.from("sio_api_keys").insert({
    user_id: userId,
    name: legacyName,
    api_key_encrypted: encryptApiKey(legacyKey),
    api_key_last4: lastFour(legacyKey),
    is_default: true,
    validation_status: "legacy_migrated",
  });

  if (insErr && !/duplicate|conflict|unique/i.test(insErr.message)) {
    throw insErr;
  }

  // Clear the legacy column so we stop falling back to it for this user.
  await supabaseAdmin
    .from("profiles")
    .update({ sio_user_api_key: null, sio_api_key_name: null })
    .eq("user_id", userId);
}

export async function listKeys(userId: string): Promise<SioApiKeyPublic[]> {
  await ensureLegacyMigrated(userId);
  const { data } = await supabaseAdmin
    .from("sio_api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  return ((data ?? []) as SioApiKeyRow[]).map(toPublic);
}

export async function getDecryptedKey(
  userId: string,
  keyId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("sio_api_keys")
    .select("api_key_encrypted")
    .eq("user_id", userId)
    .eq("id", keyId)
    .maybeSingle();
  const env = (data as { api_key_encrypted?: string } | null)?.api_key_encrypted;
  if (!env) return null;
  try {
    return decryptApiKey(env);
  } catch {
    return null;
  }
}

export async function createKey(
  userId: string,
  name: string,
  plaintext: string,
  validationStatus: "validated" | "not_validated" = "validated",
): Promise<SioApiKeyPublic> {
  await ensureLegacyMigrated(userId);

  // First key the user creates becomes the default automatically. Without
  // this the cascade would have nothing to fall back to and existing
  // quizzes would suddenly stop syncing.
  const { count } = await supabaseAdmin
    .from("sio_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const isDefault = (count ?? 0) === 0;

  const { data, error } = await supabaseAdmin
    .from("sio_api_keys")
    .insert({
      user_id: userId,
      name: name.trim(),
      api_key_encrypted: encryptApiKey(plaintext),
      api_key_last4: lastFour(plaintext),
      is_default: isDefault,
      last_validated_at: validationStatus === "validated" ? new Date().toISOString() : null,
      validation_status: validationStatus,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toPublic(data as SioApiKeyRow);
}

export async function updateKey(
  userId: string,
  keyId: string,
  patch: { name?: string; isDefault?: boolean },
): Promise<SioApiKeyPublic | null> {
  // "Set as default" is two writes that must be atomic relative to the
  // partial unique index (user_id) WHERE is_default=true. We do them in
  // sequence: first un-default any existing default, then set this one.
  // Postgres serializes both within a single user_id partition.
  if (patch.isDefault === true) {
    await supabaseAdmin
      .from("sio_api_keys")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_default", true)
      .neq("id", keyId);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.name === "string" && patch.name.trim().length > 0) {
    updates.name = patch.name.trim();
  }
  if (typeof patch.isDefault === "boolean") {
    updates.is_default = patch.isDefault;
  }

  const { data, error } = await supabaseAdmin
    .from("sio_api_keys")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", keyId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? toPublic(data as SioApiKeyRow) : null;
}

export async function deleteKey(userId: string, keyId: string): Promise<void> {
  // If we're deleting the default, promote the next-oldest remaining key
  // to default so the user is never left with keys but no default.
  const { data: target } = await supabaseAdmin
    .from("sio_api_keys")
    .select("id, is_default")
    .eq("user_id", userId)
    .eq("id", keyId)
    .maybeSingle();

  if (!target) return;

  await supabaseAdmin
    .from("sio_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("id", keyId);

  if ((target as { is_default: boolean }).is_default) {
    const { data: next } = await supabaseAdmin
      .from("sio_api_keys")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next?.id) {
      await supabaseAdmin
        .from("sio_api_keys")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", (next as { id: string }).id);
    }
  }
}
