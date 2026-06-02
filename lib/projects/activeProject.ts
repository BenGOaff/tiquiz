// lib/projects/activeProject.ts
//
// Résolution du "projet actif" pour un user authentifié.
//
// Source de vérité (phase 2) : cookie HTTP-only `tiquiz_project`,
// posé par POST /api/projects/active. Si le cookie pointe sur un projet
// que l'user ne possède pas/plus (rotation, deleted), on tombe sur le
// projet par défaut. Si le cookie est absent, idem.
//
// ⚠️ Phase 2 : ces helpers existent mais ne sont pas encore branchés
// dans les routes de lecture/écriture (quizzes, popquizzes, etc.).
// Phase 3 = brancher le filtrage actif partout.

import type { SupabaseClient } from "@supabase/supabase-js";

import { getOrCreateDefaultProjectId, projectBelongsToUser } from "@/lib/projects/queries";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/types";

/**
 * Récupère l'ID du projet actif pour un user authentifié.
 *
 * Stratégie :
 *  1. Lit le cookie `tiquiz_project` côté serveur.
 *  2. Vérifie que ce projet appartient bien à l'user (sécurité).
 *  3. Si OK → retourne cet ID.
 *  4. Sinon → fallback sur le projet par défaut de l'user (créé si
 *     besoin via getOrCreateDefaultProjectId).
 *
 * Retourne null UNIQUEMENT si l'user n'a pas de profil DB (cas
 * théoriquement impossible pour un user authentifié).
 *
 * ⚠️ Le supabaseClient passé en param doit avoir accès aux cookies
 * (`getSupabaseServerClient()`) pour lire `tiquiz_project`.
 */
export async function getActiveProjectId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!userId) return null;

  // 1. Lecture cookie via les helpers Next.js
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const cookieValue = store.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;

  // 2. Validation ownership si le cookie est posé
  if (cookieValue) {
    const valid = await projectBelongsToUser(cookieValue, userId);
    if (valid) return cookieValue;
    // Le cookie pointe sur un projet qui n'existe plus ou ne nous
    // appartient pas → on l'ignore et fallback. On ne supprime pas
    // ici (pas de mutation côté GET), le prochain switch écrasera.
  }

  // 3. Fallback : projet par défaut de l'user
  return await getOrCreateDefaultProjectId(userId);
}
