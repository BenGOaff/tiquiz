// lib/projects/upsertByProject.ts
//
// Safe upsert qui respecte l'isolation multi-projets. Port direct du
// pattern Tipote (Béné 2 juin 2026 — "même emplacement, même design").
//
// Le problème : plusieurs tables Tiquiz ont (ou auront) un
// UNIQUE(user_id) hérité d'avant le multiprofils. Faire
// `upsert({ ... }, { onConflict: "user_id" })` revient à écraser la
// row du projet A quand on insère pour le projet B. Très dangereux.
//
// Ce helper remplace upsert par :
//   1. UPDATE ... WHERE user_id = ? AND project_id = ?
//   2. Si 0 row matchée → INSERT (avec project_id)
//
// Pour les users legacy sans project_id, le premier UPDATE retombe
// sur l'INSERT, ce qui est correct (crée une row proprement scopée).

import type { SupabaseClient } from "@supabase/supabase-js";

interface UpsertByProjectOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any;
  table: string;
  userId: string;
  projectId: string | null;
  /** Data à écrire (NE PAS inclure user_id / project_id — ajoutés auto). */
  data: Record<string, unknown>;
  /** Colonnes à retourner via .select(). Default "id". */
  select?: string;
}

interface UpsertResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
}

export async function upsertByProject({
  supabase,
  table,
  userId,
  projectId,
  data,
  select = "id",
}: UpsertByProjectOptions): Promise<UpsertResult> {
  // Safety : si projectId est falsy ET que l'user a plusieurs rows,
  // on restreint aux rows project_id NULL pour éviter d'écraser
  // celles d'un autre projet.
  let updQuery = supabase
    .from(table)
    .update(data)
    .eq("user_id", userId);
  if (projectId) {
    updQuery = updQuery.eq("project_id", projectId);
  } else {
    updQuery = updQuery.is("project_id", null);
  }
  const upd = await updQuery.select(select);

  if (!upd.error && Array.isArray(upd.data) && upd.data.length > 0) {
    return { data: upd.data.length === 1 ? upd.data[0] : upd.data, error: null };
  }

  // No row matched — INSERT
  const insertRow: Record<string, unknown> = {
    user_id: userId,
    ...(projectId ? { project_id: projectId } : {}),
    ...data,
  };
  const ins = await supabase.from(table).insert(insertRow).select(select);
  if (!ins.error && Array.isArray(ins.data) && ins.data.length > 0) {
    return { data: ins.data.length === 1 ? ins.data[0] : ins.data, error: null };
  }

  return { data: ins.data ?? null, error: ins.error ?? upd.error ?? null };
}
