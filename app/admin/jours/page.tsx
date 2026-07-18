import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DaysManager, type AdminDayRow } from "@/components/admin/DaysManager";

export const dynamic = "force-dynamic";

export default async function AdminJoursPage() {
  const { data } = await supabaseAdmin
    .from("days")
    .select("id, day_number, title, subtitle, status, sort_order, is_bonus")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Les jours du parcours</h1>
        <p className="text-sm text-muted-foreground">
          Crée, ordonne et publie les jours. Chaque jour porte sa vidéo, son contenu, ses
          ressources et son quiz.
        </p>
      </header>
      <DaysManager initialDays={(data ?? []) as AdminDayRow[]} />
    </div>
  );
}
