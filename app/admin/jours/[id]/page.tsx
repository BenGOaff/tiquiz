import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DayEditor } from "@/components/admin/DayEditor";
import { QuestionsManager } from "@/components/admin/QuestionsManager";
import { PersonaExamplesEditor } from "@/components/admin/PersonaExamplesEditor";
import { Button } from "@/components/ui/button";
import type { Day, Question } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDayEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: day }, { data: questions }] = await Promise.all([
    supabaseAdmin.from("days").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("questions")
      .select("*")
      .eq("day_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!day) notFound();

  const typedDay: Day = { ...(day as Day), resources: Array.isArray(day.resources) ? day.resources : [] };
  const typedQuestions: Question[] = ((questions ?? []) as Question[]).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? q.options : [],
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/jours"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Tous les jours
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/jour/${typedDay.day_number}`} target="_blank">
            <Eye />
            Prévisualiser
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">
          Jour {typedDay.day_number}
        </span>
        <h1 className="font-display text-2xl font-bold">{typedDay.title}</h1>
      </header>

      <DayEditor day={typedDay} />
      <PersonaExamplesEditor dayId={typedDay.id} />
      <QuestionsManager dayId={typedDay.id} initialQuestions={typedQuestions} />
    </div>
  );
}
