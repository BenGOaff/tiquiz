// lib/projects/ensureDefaultProject.ts
//
// Auto-create a default project for users who don't have one yet +
// backfill défensif des lignes orphelines (project_id = NULL) lors
// de chaque appel. Port direct du pattern Tipote ("même emplacement,
// même design" — Béné 2 juin 2026).
//
// Pourquoi ce backfill défensif : la migration 20260603 a déjà
// backfillé toutes les lignes existantes, MAIS toute insertion qui
// passerait à côté du tag project_id (bug futur, route oubliée,
// import de données externes) crée une orpheline. À chaque appel,
// on rattrape ces orphelines au passage. Idempotent et silencieux.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/types";
import { cookies } from "next/headers";

/**
 * S'assure que l'user a un projet par défaut. Si oui, renvoie son id
 * (et backfill ses orphelines au passage). Si non, en crée un.
 *
 * Retourne null en cas d'erreur (helper fail-open : ne JAMAIS jeter).
 */
export async function ensureDefaultProject(userId: string): Promise<string | null> {
  try {
    // Check if user already has any project
    const { data: existing } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      // Projet existe — on backfill quand même les orphelines éventuelles
      await backfillOrphanData(userId, existing.id);
      return existing.id;
    }

    // No project found: create a default one
    const { data: created, error } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: userId,
        name: "Mon espace",
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !created?.id) return null;

    const projectId = created.id;

    // Backfill TOUTES les orphelines de cet user
    await backfillOrphanData(userId, projectId);

    // Set le cookie projet actif (best-effort en contexte server)
    try {
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 an
        sameSite: "lax",
      });
    } catch {
      // read-only context — ignore
    }

    return projectId;
  } catch {
    return null;
  }
}

/**
 * Backfill toutes les lignes orphelines (project_id = NULL) d'un user
 * vers son projet par défaut. Garantit qu'un user existant qui crée
 * un 2e projet ne voit pas sa data « disparaître » (toute la data
 * legacy reste rattachée au projet par défaut).
 *
 * Tables backfillées = celles qui ont une colonne project_id depuis
 * la migration 20260603_multiprofils_foundation. Si une nouvelle
 * table récupère project_id, l'ajouter ici.
 */
async function backfillOrphanData(userId: string, projectId: string) {
  const tables = [
    "quizzes",
    "popquizzes",
    "business_events",
    "user_milestones",
  ];

  await Promise.all(
    tables.map(async (table) => {
      try {
        await supabaseAdmin
          .from(table)
          .update({ project_id: projectId })
          .eq("user_id", userId)
          .is("project_id", null);
      } catch {
        // ignore — la table n'a peut-être pas de data pour cet user,
        // ou la colonne project_id manque encore (déploiement partiel)
      }
    }),
  );
}
