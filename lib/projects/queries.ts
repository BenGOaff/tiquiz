// lib/projects/queries.ts
//
// Helpers DB pour le multiprofils Tiquiz. Aucun de ces helpers n'est
// appelé par les routes existantes de quiz/popquiz/etc. tant que la
// phase 3 (filtrage actif) n'est pas livrée — la phase 2 expose juste
// l'API CRUD et le ProjectSwitcher UI.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Project, ProjectSummary } from "@/lib/projects/types";
import { isValidAccentColor, isValidEmoji } from "@/lib/projects/visualIdentity";

const PROJECT_SUMMARY_SELECT =
  "id, name, is_default, created_at, accent_color, icon_emoji, use_branding_logo";

/**
 * Liste tous les projets d'un user, projet par défaut en tête.
 * Utilisé par `<ProjectSwitcher />` et par l'endpoint GET /api/projects.
 */
export async function listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
  if (!userId) return [];
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(PROJECT_SUMMARY_SELECT)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[projects] listProjectsForUser failed", error.message);
    return [];
  }
  return (data ?? []) as ProjectSummary[];
}

/**
 * Récupère l'ID du projet par défaut d'un user. Si aucun (cas
 * théoriquement impossible après le backfill 20260603_multiprofils_foundation
 * mais on prévoit le cas), on en crée un à la volée pour éviter un état
 * incohérent.
 */
export async function getOrCreateDefaultProjectId(userId: string): Promise<string | null> {
  if (!userId) return null;

  const { data: existing } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // Fallback : crée le projet par défaut maintenant. Idempotent grâce
  // à l'UNIQUE INDEX uq_projects_user_default — si une race condition
  // a déjà créé le projet entre-temps, on retombe sur le SELECT.
  const { data: created, error } = await supabaseAdmin
    .from("projects")
    .insert({ user_id: userId, name: "Mon espace", is_default: true })
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = unique violation → un autre process l'a créé, refetch
    if (error.code === "23505") {
      const { data: re } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("user_id", userId)
        .eq("is_default", true)
        .maybeSingle();
      return (re?.id as string) ?? null;
    }
    console.error("[projects] getOrCreateDefaultProjectId failed", error.message);
    return null;
  }
  return (created?.id as string) ?? null;
}

/**
 * Vérifie qu'un projet appartient bien à un user. Utilisé avant toute
 * opération qui modifie un projet ou bascule l'utilisateur dessus.
 */
export async function projectBelongsToUser(
  projectId: string,
  userId: string,
): Promise<boolean> {
  if (!projectId || !userId) return false;
  const { data } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * Crée un projet pour un user. Ne touche pas à is_default (un projet
 * supplémentaire n'est jamais le projet par défaut — sauf si l'user
 * veut explicitement le promouvoir, à voir en V2).
 */
export async function createProject(
  userId: string,
  name: string,
): Promise<Project | { error: string }> {
  if (!userId) return { error: "missing_user" };
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) return { error: "name_required" };

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({ user_id: userId, name: cleanName, is_default: false })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "insert_failed" };
  }
  return data as Project;
}

/**
 * Renomme un projet. Ownership check via projectBelongsToUser au
 * call-site (les helpers ne font pas l'auth ici).
 */
export async function renameProject(
  projectId: string,
  newName: string,
): Promise<{ ok: boolean; error?: string }> {
  const cleanName = newName.trim().slice(0, 80);
  if (!cleanName) return { ok: false, error: "name_required" };
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ name: cleanName, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Update arbitraire du nom + visual identity d'un projet (alignement
 * Tipote — accent_color, icon_emoji, use_branding_logo). Tous les
 * champs sont optionnels — l'appelant peut update 1 seul ou les 4.
 * Valide accent_color / icon_emoji contre la palette TS pour éviter
 * une valeur custom qui passerait à travers la CHECK constraint.
 */
export interface UpdateProjectPatch {
  name?: string;
  accent_color?: string | null;
  icon_emoji?: string | null;
  use_branding_logo?: boolean;
}

export async function updateProject(
  projectId: string,
  patch: UpdateProjectPatch,
): Promise<{ ok: boolean; error?: string; project?: Project }> {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.name !== undefined) {
    const cleanName = patch.name.trim().slice(0, 80);
    if (!cleanName) return { ok: false, error: "name_required" };
    update.name = cleanName;
  }

  if (patch.accent_color !== undefined) {
    if (patch.accent_color !== null && !isValidAccentColor(patch.accent_color)) {
      return { ok: false, error: "invalid_accent_color" };
    }
    update.accent_color = patch.accent_color;
  }

  if (patch.icon_emoji !== undefined) {
    if (patch.icon_emoji !== null && !isValidEmoji(patch.icon_emoji)) {
      return { ok: false, error: "invalid_icon_emoji" };
    }
    update.icon_emoji = patch.icon_emoji;
  }

  if (patch.use_branding_logo !== undefined) {
    update.use_branding_logo = patch.use_branding_logo;
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(update)
    .eq("id", projectId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, project: (data ?? undefined) as Project | undefined };
}

/**
 * Supprime un projet. Ne supprime JAMAIS le projet par défaut (sinon
 * orphelinage massif). Si l'user veut "supprimer son seul projet",
 * il doit en créer un autre d'abord et le promouvoir is_default.
 *
 * Note : les FK des autres tables (quizzes, popquizzes, business_events,
 * user_milestones) sont en ON DELETE SET NULL → les ressources du projet
 * supprimé deviennent orphelines (project_id NULL) et restent lisibles
 * via le fallback projet par défaut quand la phase 3 sera active.
 */
export async function deleteProject(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: target } = await supabaseAdmin
    .from("projects")
    .select("is_default")
    .eq("id", projectId)
    .maybeSingle();
  if (!target) return { ok: false, error: "not_found" };
  if ((target as { is_default?: boolean }).is_default) {
    return { ok: false, error: "cannot_delete_default" };
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
