// lib/projects/businessProfile.ts
//
// Lecture/écriture du business_profile per-projet Tiquiz (branding +
// positionnement + pixel defaults).
//
// Alignement Tipote (Béné 2 juin 2026 — "comme sur tipote, ça doit
// être comme un compte neuf, avec ses spécificités").
//
// STRATÉGIE FAIL-OPEN :
// - readBranding() renvoie TOUJOURS un objet (vide si rien trouvé)
// - resolveBrandingForRequest() utilise business_profiles SEULEMENT
//   pour les users multiprofils débloqué ; sinon retombe sur profiles
//   (legacy path préservé, zéro régression pour free/monthly/yearly)
// - upsertBrandingForProject() crée la row si absente, MAJ sinon
//
// Les helpers ne JETTENT JAMAIS — toutes les erreurs DB sont capturées
// et loggées. En cas d'échec, on renvoie l'état "rien" (objet vide).

import { canUseMultiProjects } from "@/lib/planLimits";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import { resolveProjectIdForInsert } from "./scopeFilter";

/** Champs branding/positionnement portés par projet. */
export interface BrandingFields {
  brand_logo_url: string | null;
  brand_color_primary: string | null;
  brand_color_accent: string | null;
  brand_font: string | null;
  brand_website_url: string | null;
  saved_palettes: Array<{ id: string; name: string; colors: string[] }>;
  brand_tone: string | null;
  target_audience: string | null;
  default_meta_pixel_id: string | null;
  default_ga4_measurement_id: string | null;
  default_google_ads_conversion_id: string | null;
  default_google_ads_conversion_label: string | null;
  default_meta_capi_token: string | null;
  default_share_domain: string | null;
  share_site_name: string | null;
  // Modele de design par projet (estampille sur les nouveaux quiz).
  default_question_layout: string | null;
  default_intro_layout: string | null;
  default_button_shape: string | null;
  default_answer_layout: string | null;
  default_background_style: string | null;
  default_background_gradient: string | null;
}

export interface BusinessProfileRow extends BrandingFields {
  id: string;
  user_id: string;
  project_id: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

const BUSINESS_PROFILE_SELECT =
  "id, user_id, project_id, onboarding_completed, " +
  "brand_logo_url, brand_color_primary, brand_color_accent, brand_font, " +
  "brand_website_url, saved_palettes, brand_tone, target_audience, " +
  "default_meta_pixel_id, default_ga4_measurement_id, " +
  "default_google_ads_conversion_id, default_google_ads_conversion_label, " +
  "default_meta_capi_token, default_share_domain, share_site_name, " +
  "default_question_layout, default_intro_layout, default_button_shape, " +
  "default_answer_layout, default_background_style, default_background_gradient, " +
  "created_at, updated_at";

/**
 * Lit le business_profile pour un (user, project). Retourne null si
 * la table est absente, si rien n'existe, ou si erreur DB.
 */
export async function readBusinessProfile(
  userId: string,
  projectId: string,
): Promise<BusinessProfileRow | null> {
  if (!userId || !projectId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("business_profiles")
      .select(BUSINESS_PROFILE_SELECT)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) {
      console.error("[businessProfile] read failed", error.message);
      return null;
    }
    return (data ?? null) as BusinessProfileRow | null;
  } catch (e) {
    console.error("[businessProfile] read threw", e);
    return null;
  }
}

/**
 * Résout les champs branding à utiliser pour un user dans le contexte
 * de la requête courante.
 *
 * - Si l'user a multiprofils débloqué ET qu'un business_profile existe
 *   pour son projet actif → retourne ses valeurs
 * - Sinon → retourne null (l'appelant fait son fallback sur profiles
 *   ou sur les valeurs par défaut, comme avant)
 *
 * Cette logique garantit zéro régression pour free/monthly/yearly.
 */
export async function resolveBrandingForRequest(
  userId: string,
  email: string | null,
): Promise<BusinessProfileRow | null> {
  if (!userId) return null;

  // Gate plan : seuls les users multiprofils ont le branding per-projet.
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
    return null;
  }

  const projectId = await resolveProjectIdForInsert(userId);
  if (!projectId) return null;

  return readBusinessProfile(userId, projectId);
}

/**
 * Crée (ou MAJ) le business_profile d'un (user, project) avec un patch
 * partiel. Idempotent grâce à l'UNIQUE(user_id, project_id).
 *
 * NB : valider les hex colors / formats côté appelant — ce helper ne
 * fait que valider les types.
 */
export async function upsertBrandingForProject(
  userId: string,
  projectId: string,
  patch: Partial<BrandingFields> & { onboarding_completed?: boolean },
): Promise<{ ok: boolean; error?: string; row?: BusinessProfileRow }> {
  if (!userId || !projectId) {
    return { ok: false, error: "missing_user_or_project" };
  }

  // 1. UPDATE en premier (cas le plus fréquent : la row existe déjà
  //    grâce au backfill ou à la création de projet).
  const updatePayload: Record<string, unknown> = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("business_profiles")
      .update(updatePayload)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .select(BUSINESS_PROFILE_SELECT)
      .maybeSingle();

    if (updErr) {
      return { ok: false, error: updErr.message };
    }
    if (updated) return { ok: true, row: updated as unknown as BusinessProfileRow };

    // 2. Aucune row n'existait — INSERT. Idempotent via l'UNIQUE.
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("business_profiles")
      .insert({ user_id: userId, project_id: projectId, ...patch })
      .select(BUSINESS_PROFILE_SELECT)
      .maybeSingle();

    if (insErr) {
      // 23505 = un autre process a créé la row entre UPDATE et INSERT
      // → on relit pour donner la version courante.
      if (insErr.code === "23505") {
        const row = await readBusinessProfile(userId, projectId);
        return row ? { ok: true, row } : { ok: false, error: insErr.message };
      }
      return { ok: false, error: insErr.message };
    }
    return { ok: true, row: inserted as unknown as BusinessProfileRow };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown_error",
    };
  }
}

// Liste des clés branding/positionnement qu'on merge. Centralisée ici
// pour que les call-sites (overlay GET /profile, merge owner branding
// pour viewer public, etc.) restent cohérents.
export const PROJECT_BRANDING_KEYS: readonly (keyof BrandingFields)[] = [
  "brand_logo_url",
  "brand_color_primary",
  "brand_color_accent",
  "brand_font",
  "brand_website_url",
  "saved_palettes",
  "brand_tone",
  "target_audience",
  "default_meta_pixel_id",
  "default_ga4_measurement_id",
  "default_google_ads_conversion_id",
  "default_google_ads_conversion_label",
  "default_meta_capi_token",
  "default_share_domain",
  "share_site_name",
] as const;

/**
 * Lit le plan de l'owner d'un quiz (cache court possible plus tard).
 * Utilisé pour gater le merge per-projet : seuls les users multiprofils
 * voient l'isolation effective ; les non-multiprofils gardent le
 * comportement legacy = lecture profile globale.
 */
async function isOwnerMultiprofils(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, email")
      .eq("user_id", userId)
      .maybeSingle();
    const plan = (profile as { plan?: string | null } | null)?.plan ?? null;
    const email = (profile as { email?: string | null } | null)?.email ?? null;
    return canUseMultiProjects(plan, { userId, email });
  } catch {
    return false;
  }
}

/**
 * Merge le business_profile (owner, project) PAR DESSUS un fallback
 * record (typiquement la row profiles de l'owner). Utilisé par le
 * VIEWER PUBLIC + popquiz + IA générative (generate, idea-chat, brand-kit).
 *
 * SÉMANTIQUE PRUDENTE — FILET DE SÉCURITÉ POUR LES QUIZ EN LIGNE :
 * - Override NON-NULL seulement → si business_profile.brand_logo_url
 *   est null, on garde le profile.brand_logo_url global. Évite qu'un
 *   projet secondaire sans logo affiche un quiz "moche" (sans logo)
 *   alors que l'user avait un logo configuré globalement.
 *
 * - "Compte neuf strict" (override total) est appliqué UNIQUEMENT
 *   côté Settings UI (via GET /api/profile) pour que l'user voie ses
 *   champs vides à customiser pour projet B. Mais le viewer public
 *   préserve un branding fonctionnel jusqu'à la customisation.
 *
 * TRIPLE SAFETY (garantit zéro coupure des quiz en ligne) :
 *   1. projectId null/undefined → fallback inchangé
 *   2. owner non multiprofils → fallback inchangé (gate plan)
 *   3. business_profile absent OU erreur DB → fallback inchangé
 */
export async function mergeOwnerBranding<T extends Record<string, unknown>>(
  fallback: T,
  ownerUserId: string,
  projectId: string | null | undefined,
): Promise<T> {
  if (!ownerUserId) return fallback;
  try {
    const eligible = await isOwnerMultiprofils(ownerUserId);
    if (!eligible) return fallback; // gate plan : préserve les non-multiprofils

    // Drame Christelle 8 juin 2026 : les couleurs de branding ne
    // remontaient pas au public viewer. Cause probable : quiz cree
    // avant le wire du project_id, donc quiz.project_id = NULL alors
    // que l'user a configure son branding dans le business_profile de
    // son projet actif. Avant ce fix, on retournait directement
    // fallback (= profiles, souvent vide pour les multiprofils car ils
    // ecrivent sur business_profile). Maintenant : si projectId est
    // null, on cherche le projet PAR DEFAUT de l'user et on prend son
    // business_profile en backup. Garantit "1 utilisateur 1 branding"
    // meme sur les quiz orphelins.
    let resolvedProjectId = projectId?.trim() || null;
    if (!resolvedProjectId) {
      try {
        const { data } = await supabaseAdmin
          .from("projects")
          .select("id")
          .eq("user_id", ownerUserId)
          .eq("is_default", true)
          .maybeSingle();
        resolvedProjectId = (data as { id?: string } | null)?.id ?? null;
      } catch {
        // Best effort : si projects table indispo, on retombe sur fallback.
      }
    }
    if (!resolvedProjectId) return fallback;

    const bp = await readBusinessProfile(ownerUserId, resolvedProjectId);
    if (!bp) return fallback;

    // Override NON-NULL : on prend business_profile en priorité, mais
    // on garde le fallback profile pour les champs vides (filet).
    const merged: Record<string, unknown> = { ...fallback };
    for (const key of PROJECT_BRANDING_KEYS) {
      const v = (bp as unknown as Record<string, unknown>)[key];
      if (v !== null && v !== undefined) merged[key] = v;
    }
    return merged as T;
  } catch {
    // Fail-open : on retourne le fallback inchangé. Le viewer public
    // continue d'afficher le branding défaut global de l'owner. JAMAIS
    // de coupure des quiz en ligne.
    return fallback;
  }
}

/**
 * Crée un business_profile VIDE pour un projet secondaire.
 *
 * Sémantique Béné (2 juin 2026, clarification) : un projet secondaire
 * = nouveau compte = profil VIDE. Il a la même STRUCTURE de réglages
 * (mêmes champs disponibles : branding, positionnement, pixel defaults)
 * que le projet par défaut, mais avec des VALEURS vides à remplir.
 *
 * L'user verra dans Settings tous les champs vides et les remplira
 * comme s'il configurait un compte neuf — sans hériter du logo, des
 * couleurs ou de l'audience cible du projet principal.
 *
 * Best-effort : si l'INSERT échoue (table absente, erreur DB), on log
 * et on continue. Le projet est utilisable même sans business_profile
 * (resolveBrandingForRequest retombe sur null → fallback profile).
 */
export async function createEmptyBusinessProfileForProject(
  userId: string,
  projectId: string,
): Promise<void> {
  if (!userId || !projectId) return;
  try {
    const { error } = await supabaseAdmin
      .from("business_profiles")
      .insert({
        user_id: userId,
        project_id: projectId,
        onboarding_completed: false,
      });
    if (error && error.code !== "23505") {
      console.error("[businessProfile] empty insert failed", error.message);
    }
  } catch (e) {
    console.error("[businessProfile] empty insert threw", e);
  }
}
