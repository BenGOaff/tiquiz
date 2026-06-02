// lib/projects/scopeFilter.ts
//
// Helpers pour scoper les écritures au projet actif d'un user
// (chantier multiprofils Tiquiz — phase 3a).
//
// PHASE 3a : tous les INSERT (quiz, popquiz, business_events,
// user_milestones) taggent project_id = active OR default. Aucun
// changement sur les lectures — c'est la prochaine étape (phase 3b),
// derrière flag, uniquement pour users multiprofils débloqués.
//
// INVARIANT DE SÛRETÉ : ces helpers ne JETTENT JAMAIS. Si on n'arrive
// pas à résoudre un projet (cookie absent, DB indispo, user sans
// profile), on retourne null et l'insert continue avec project_id=NULL
// (colonne nullable depuis 20260603). Aucun flow existant ne casse.

import { getOrCreateDefaultProjectId, projectBelongsToUser } from "@/lib/projects/queries";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/types";

/**
 * Résout l'ID du projet à utiliser pour une INSERT côté serveur.
 *
 * Ordre :
 *  1. Cookie `tiquiz_project` si présent ET valide pour l'user.
 *  2. Sinon, projet par défaut (créé à la volée si manquant).
 *  3. En cas d'erreur quelconque → null (l'insert peut continuer
 *     avec project_id = NULL ; la lecture tolérante phase 3b
 *     ramènera ces lignes via fallback projet par défaut).
 *
 * Note : `next/headers.cookies()` lève hors d'un contexte requête
 * (cron, server action interne). On absorbe l'erreur silencieusement.
 */
export async function resolveProjectIdForInsert(
  userId: string,
): Promise<string | null> {
  if (!userId) return null;

  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const cookieValue = store.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;

    if (cookieValue) {
      const valid = await projectBelongsToUser(cookieValue, userId).catch(() => false);
      if (valid) return cookieValue;
    }
  } catch {
    // next/headers pas dispo (cron, webhook) → fallback default.
  }

  try {
    return await getOrCreateDefaultProjectId(userId);
  } catch {
    return null;
  }
}
