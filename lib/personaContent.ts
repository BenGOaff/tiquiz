// lib/personaContent.ts : lecture serveur du contenu personnalise persona.
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { mergeVocab, type Persona, type Vocab } from "@/lib/personas";

/** Glossaire effectif du persona (defauts neutres + surcharge DB). */
export async function getPersonaVocab(persona: Persona): Promise<Vocab> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("persona_vocab")
    .select("vocab")
    .eq("persona", persona)
    .maybeSingle();
  return mergeVocab((data?.vocab as Partial<Vocab>) ?? null);
}

/** Encart d'exemples du jour pour ce persona, avec repli sur "autre". */
export async function getDayPersonaExample(
  dayId: string,
  persona: Persona,
): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("day_persona_examples")
    .select("persona, examples_html")
    .eq("day_id", dayId)
    .in("persona", [persona, "autre"]);
  const rows = data ?? [];
  const own = rows.find((r) => r.persona === persona)?.examples_html as string | undefined;
  if (own && own.trim()) return own;
  const fallback = rows.find((r) => r.persona === "autre")?.examples_html as string | undefined;
  return fallback && fallback.trim() ? fallback : null;
}
