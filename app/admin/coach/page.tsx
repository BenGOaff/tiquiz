import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CoachManager, type KnowledgeDoc } from "@/components/admin/CoachManager";

export const dynamic = "force-dynamic";

export default async function AdminCoachPage() {
  const [{ data: settings }, { data: docs }] = await Promise.all([
    supabaseAdmin.from("coach_settings").select("instruction").eq("id", "default").maybeSingle(),
    supabaseAdmin
      .from("coach_knowledge")
      .select("id, title, content, enabled, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Le coach IA</h1>
        <p className="text-sm text-muted-foreground">
          Donne-lui ta voix et tes documents. Il répond aux élèves en s'appuyant sur le contenu
          des jours, ces documents, et l'instruction ci-dessous.
        </p>
      </header>
      <CoachManager
        initialInstruction={settings?.instruction ?? ""}
        initialDocs={(docs ?? []) as KnowledgeDoc[]}
      />
    </div>
  );
}
