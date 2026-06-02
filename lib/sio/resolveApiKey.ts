// lib/sio/resolveApiKey.ts
// Resolves which Systeme.io API key to use for a given operation.
//
// CASCADE — first non-null wins:
//   1. explicit keyId (e.g. quiz.sio_api_key_id) — lookup direct par id,
//      pas de filtre projet (préserve la compat des quizzes en ligne
//      qui pointent vers une clé spécifique, même cross-projet)
//   2. user's default key DU PROJET (is_default=true filtered by project)
//      Phase 6 multiprofils : chaque projet a SON default → un nouveau
//      quiz sur projet B utilise la clé default de B, pas celle de A
//   3. any key DU PROJET (oldest first)
//   4. legacy profiles.sio_user_api_key (plaintext) — backwards compat
//   5. null (no key configured)
//
// Note : on filtre par projet UNIQUEMENT pour les étapes 2 et 3 (lookup
// "smart default"). L'étape 1 (explicit) reste cross-projet pour ne pas
// casser les quizzes existants. Le projectId est passé depuis le quiz
// dans les contextes publics (track/lead capture) — cf. callers.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptApiKey } from "@/lib/sio/keyCrypto";

export interface ResolvedKey {
  apiKey: string;
  keyId: string | null;       // null if it came from the legacy profile column
  source: "explicit" | "default" | "any" | "legacy";
}

export interface ResolveApiKeyOpts {
  /** Si fourni, lookup direct (cross-project) — priorité maximale. */
  explicitKeyId?: string | null;
  /**
   * Si fourni, filtre les étapes "default" et "any" sur ce projet.
   * Quand absent, on ne filtre pas (= comportement legacy avant phase 6).
   * Cas d'usage typique : quiz.project_id passé depuis les routes
   * publiques (track, lead capture) pour que le sync utilise la clé
   * default du PROJET du quiz, pas celle d'un autre projet.
   */
  projectId?: string | null;
}

export async function resolveApiKey(
  userId: string,
  opts: ResolveApiKeyOpts = {},
): Promise<ResolvedKey | null> {
  const explicit = opts.explicitKeyId?.trim();
  const projectId = opts.projectId?.trim() ?? null;

  // 1. explicit — lookup direct par id (cross-project autorisé, sinon
  //    on casserait les quizzes en ligne qui pointent vers une clé
  //    "migrée" sur un autre projet).
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

  // 2. default DU PROJET (si projectId fourni — sinon any default user)
  {
    let query = supabaseAdmin
      .from("sio_api_keys")
      .select("id, api_key_encrypted")
      .eq("user_id", userId)
      .eq("is_default", true);
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query.maybeSingle();
    const row = data as { id?: string; api_key_encrypted?: string } | null;
    if (row?.api_key_encrypted) {
      try {
        return { apiKey: decryptApiKey(row.api_key_encrypted), keyId: row.id ?? null, source: "default" };
      } catch { /* fall through */ }
    }
  }

  // 3. any DU PROJET (si projectId fourni — sinon any key user)
  {
    let query = supabaseAdmin
      .from("sio_api_keys")
      .select("id, api_key_encrypted")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query.maybeSingle();
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
