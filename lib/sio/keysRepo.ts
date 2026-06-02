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
import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";

export interface SioApiKeyRow {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  api_key_encrypted: string;
  api_key_last4: string | null;
  is_default: boolean;
  last_validated_at: string | null;
  validation_status: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Résout le project_id à utiliser pour les opérations sio_api_keys.
 * Si l'appelant fournit explicitement projectId, on l'utilise. Sinon,
 * on prend le projet actif depuis le cookie (ou le défaut fallback).
 *
 * Phase 6 multiprofils : les sio_api_keys sont scopées par projet
 * (Béné 2 juin 2026 — "compte secondaire = nouvelle clé API").
 */
async function resolveScopedProjectId(
  userId: string,
  explicitProjectId?: string | null,
): Promise<string | null> {
  if (explicitProjectId) return explicitProjectId;
  return await resolveProjectIdForInsert(userId);
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
//
// La clé migrée est attachée au PROJET PAR DÉFAUT de l'user (le seul
// projet qui existe pour un user pré-multiprofils). Si on n'arrive pas
// à résoudre le défaut, on insère project_id=NULL (la clé restera
// accessible via lookup par id mais n'apparaîtra dans aucune liste
// scopée — l'user pourra la "réadopter" via une migration manuelle).
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

  // Résout le projet par défaut pour y attacher la clé migrée.
  const { data: defaultProject } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  const defaultProjectId =
    (defaultProject as { id?: string } | null)?.id ?? null;

  // Race-safe: another concurrent call may have inserted in the meantime.
  // La nouvelle UNIQUE (user_id, project_id, name) + partial index
  // (user_id, project_id) WHERE is_default rejette les doublons.
  const { error: insErr } = await supabaseAdmin.from("sio_api_keys").insert({
    user_id: userId,
    project_id: defaultProjectId,
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

/**
 * Liste les clés du PROJET ACTIF (ou projet explicite).
 * Phase 6 multiprofils : un projet secondaire démarre VIDE → l'user
 * y configure ses propres clés indépendamment du projet principal.
 *
 * Si projectId est null (cas dégradé), on liste toutes les clés
 * sans scope (= comportement legacy avant la migration 20260607).
 */
export async function listKeys(
  userId: string,
  projectId?: string | null,
): Promise<SioApiKeyPublic[]> {
  await ensureLegacyMigrated(userId);

  const scope = await resolveScopedProjectId(userId, projectId);

  let query = supabaseAdmin
    .from("sio_api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (scope) query = query.eq("project_id", scope);

  const { data } = await query;
  return ((data ?? []) as SioApiKeyRow[]).map(toPublic);
}

/**
 * Lecture par id — pas de scope projet (lookup direct cross-project
 * permis pour préserver la compat des quizzes existants qui pointent
 * vers une clé via quiz.sio_api_key_id).
 */
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

/**
 * Crée une clé dans le PROJET ACTIF (ou projet explicite).
 * "First key" devient default si l'user n'avait AUCUNE clé sur ce
 * projet (scope per-projet → chaque projet a son propre default).
 */
export async function createKey(
  userId: string,
  name: string,
  plaintext: string,
  validationStatus: "validated" | "not_validated" = "validated",
  projectId?: string | null,
): Promise<SioApiKeyPublic> {
  await ensureLegacyMigrated(userId);

  const scope = await resolveScopedProjectId(userId, projectId);

  // First key dans ce PROJET devient default automatiquement.
  let countQuery = supabaseAdmin
    .from("sio_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (scope) countQuery = countQuery.eq("project_id", scope);
  const { count } = await countQuery;
  const isDefault = (count ?? 0) === 0;

  const { data, error } = await supabaseAdmin
    .from("sio_api_keys")
    .insert({
      user_id: userId,
      project_id: scope,
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
  // Le partial unique index est maintenant (user_id, project_id) WHERE
  // is_default=true. Donc le "un-default" doit cibler le MÊME projet
  // que la clé qu'on bascule en default — sinon on n'enlève pas le
  // default du projet et l'INSERT/UPDATE est rejeté par la contrainte.
  if (patch.isDefault === true) {
    // Lit le project_id de la clé qu'on bascule en default
    const { data: target } = await supabaseAdmin
      .from("sio_api_keys")
      .select("project_id")
      .eq("user_id", userId)
      .eq("id", keyId)
      .maybeSingle();
    const targetProjectId =
      (target as { project_id?: string | null } | null)?.project_id ?? null;

    let unsetQuery = supabaseAdmin
      .from("sio_api_keys")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_default", true)
      .neq("id", keyId);
    if (targetProjectId) {
      unsetQuery = unsetQuery.eq("project_id", targetProjectId);
    } else {
      unsetQuery = unsetQuery.is("project_id", null);
    }
    await unsetQuery;
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
  // Si on supprime le default, promouvoir la suivante DU MÊME PROJET
  // (pas une clé d'un autre projet — sinon l'user verrait sa clé
  // "Workspace B" devenir default sur projet A).
  const { data: target } = await supabaseAdmin
    .from("sio_api_keys")
    .select("id, is_default, project_id")
    .eq("user_id", userId)
    .eq("id", keyId)
    .maybeSingle();

  if (!target) return;

  await supabaseAdmin
    .from("sio_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("id", keyId);

  const targetTyped = target as {
    is_default: boolean;
    project_id: string | null;
  };
  if (targetTyped.is_default) {
    let nextQuery = supabaseAdmin
      .from("sio_api_keys")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (targetTyped.project_id) {
      nextQuery = nextQuery.eq("project_id", targetTyped.project_id);
    } else {
      nextQuery = nextQuery.is("project_id", null);
    }
    const { data: next } = await nextQuery.maybeSingle();
    if (next?.id) {
      await supabaseAdmin
        .from("sio_api_keys")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", (next as { id: string }).id);
    }
  }
}
