// lib/sioTemplates.ts : modeles Systeme.io a importer (lecture serveur).
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import type { SioTemplate } from "@/lib/types";

/** Modeles actives, visibles par l'eleve (RLS : enrolle + enabled). */
export async function getEnabledSioTemplates(): Promise<SioTemplate[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("sio_templates")
    .select("id, label, kind, url, description, enabled, sort_order")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as SioTemplate[];
}
