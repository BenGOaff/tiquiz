// lib/projects/scopeFilter.ts
//
// Helpers pour scoper les écritures ET lectures au projet actif d'un
// user (chantier multiprofils Tiquiz).
//
// PHASE 3a (livré) : tous les INSERT (quiz, popquiz, business_events,
// user_milestones) taggent project_id = active OR default.
//
// PHASE 3b (ICI) : les LECTURES sont filtrées par project_id UNIQUEMENT
// pour les users avec multiprofils débloqué (canUseMultiProjects).
// Effet : "nouveau projet = compte neuf" — stats à zéro, quiz à zéro,
// leads à zéro pour un nouveau projet (Béné 2 juin 2026).
//
// SÉCURITÉ POUR LES USERS ACTUELS :
// - free / monthly / yearly → getActiveProjectScope retourne null
//   → aucun filtre appliqué, comportement identique à avant
// - beta / lifetime / monthly_plus / yearly_plus → filtre actif
//   sur le projet actif
//
// INVARIANT DE SÛRETÉ : ces helpers ne JETTENT JAMAIS. Si on n'arrive
// pas à résoudre un projet (cookie absent, DB indispo, user sans
// profile), on retourne null et le flow continue sans filtre (= comme
// avant). Aucun flow existant ne casse.

import { canUseMultiProjects } from "@/lib/planLimits";
import { getOrCreateDefaultProjectId, projectBelongsToUser } from "@/lib/projects/queries";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

/**
 * Résout le project_id à utiliser pour FILTRER les LECTURES (phase 3b).
 *
 * Retourne :
 *  - `null` si le user n'a PAS multiprofils débloqué → on ne filtre PAS
 *    (les routes voient toutes les rows du user, comme avant)
 *  - le project_id actif si multiprofils débloqué → les routes
 *    appliquent `.eq("project_id", scope)` pour isoler le projet
 *
 * "Multiprofils débloqué" = isPremiumPlan() (beta, lifetime,
 * monthly_plus, yearly_plus) OU dans l'allowlist env. Cf. canUseMultiProjects.
 *
 * Cette logique conditionnelle garantit que les users actuels (free,
 * monthly, yearly) n'ont AUCUN changement de comportement, donc aucun
 * risque de casser leurs quiz / leads / stats existants.
 */
export async function getActiveProjectScope(
  userId: string,
  email: string | null,
): Promise<string | null> {
  if (!userId) return null;

  // Gate plan : seuls les users multiprofils ont le filtre actif.
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    const plan = (profile as { plan?: string | null } | null)?.plan ?? null;
    const eligible = canUseMultiProjects(plan, { userId, email });
    if (!eligible) return null;
  } catch {
    // Fail-open : si on n'arrive pas à lire le plan, on ne filtre pas
    // (= comportement actuel, sûr).
    return null;
  }

  // User multiprofils : on résout son projet actif (cookie ou default).
  return await resolveProjectIdForInsert(userId);
}
