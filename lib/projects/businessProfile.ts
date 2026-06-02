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

/**
 * Crée un business_profile vide (onboarding_completed=false) pour un
 * (user, project) qui vient d'être créé. Utilisé par POST /api/projects.
 * Idempotent. Best-effort : si l'INSERT échoue, on log et on continue
 * (le helper resolveBrandingForRequest retombera sur null → l'UI fait
 * son fallback sur profiles, fonctionnel mais sans branding neuf).
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
