// lib/projects/types.ts
//
// Types partagés pour le multiprofils Tiquiz (phase 2 du chantier
// multiprofils, cf. roadmap + pitfall CLAUDE_PITFALLS.md).

export interface Project {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

/** Nom de cookie pour stocker l'ID du projet actif côté client. */
export const ACTIVE_PROJECT_COOKIE = "tiquiz_project";

/** TTL du cookie projet actif : 30 jours. */
export const ACTIVE_PROJECT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
