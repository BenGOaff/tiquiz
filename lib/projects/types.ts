// lib/projects/types.ts
//
// Types partagés pour le multiprofils Tiquiz.
//
// Phase 2 = API CRUD + ProjectSwitcher UI (livré).
// Phase 3a = INSERT taguent project_id (livré).
// Alignement Tipote (juin 2026) = visual identity (accent_color,
// icon_emoji, use_branding_logo) + cookie name `tiquiz_active_project`
// (parité Tipote `tipote_active_project`).

export interface Project {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // Visual identity (alignement Tipote — toutes optionnelles)
  accent_color?: string | null;
  icon_emoji?: string | null;
  use_branding_logo?: boolean | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  accent_color?: string | null;
  icon_emoji?: string | null;
  use_branding_logo?: boolean | null;
}

/**
 * Nom du cookie qui stocke l'ID du projet actif.
 *
 * Aligné sur le pattern Tipote (`tipote_active_project`) — la phase 2
 * initiale utilisait `tiquiz_project` mais on renomme avant adoption
 * réelle (multiprofils Tiquiz pas encore en production effective : le
 * gate canUseMultiProjects() exige beta plan ou allowlist env).
 */
export const ACTIVE_PROJECT_COOKIE = "tiquiz_active_project";

/** TTL du cookie projet actif : 1 an (parité Tipote). */
export const ACTIVE_PROJECT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
