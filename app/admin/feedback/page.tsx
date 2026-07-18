import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface DayRow {
  id: string;
  day_number: number;
  title: string;
  is_bonus: boolean;
}
interface FeedbackRow {
  day_number: number | null;
  kind: string;
  message: string;
  created_at: string;
}

export default async function AdminFeedbackPage() {
  const [{ count: enrolled }, { data: daysData }, { data: feedback }] = await Promise.all([
    supabaseAdmin.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin
      .from("days")
      .select("id, day_number, title, is_bonus")
      .eq("status", "published")
      .eq("is_bonus", false)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("feedback")
      .select("day_number, kind, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const days = (daysData ?? []) as DayRow[];
  const totalEnrolled = enrolled ?? 0;

  // Completions par jour (ou ca decroche).
  const counts = await Promise.all(
    days.map(async (d) => {
      const { count } = await supabaseAdmin
        .from("progress")
        .select("*", { count: "exact", head: true })
        .eq("day_id", d.id)
        .eq("status", "completed");
      return { day: d, completed: count ?? 0 };
    }),
  );

  const fb = (feedback ?? []) as FeedbackRow[];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Retours & décrochage</h1>
        <p className="text-sm text-muted-foreground">
          Où les élèves décrochent, et pourquoi. Sert à corriger le contenu et le process pour que
          chaque cohorte réussisse mieux.
        </p>
      </header>

      {/* Decrochage par jour */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Complétions par jour ({totalEnrolled} élève(s) actif(s))
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            {counts.length === 0 && (
              <p className="text-sm text-muted-foreground">Pas encore de jour publié.</p>
            )}
            {counts.map(({ day, completed }) => {
              const pct = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0;
              return (
                <div key={day.id} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                    Jour {day.day_number}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                    {completed} ({pct}%)
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Blocages remontes */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ce que les élèves disent
        </h2>
        {fb.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun retour pour l'instant.
            </CardContent>
          </Card>
        ) : (
          fb.map((f, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-1.5 py-4">
                <div className="flex items-center gap-2">
                  {f.day_number !== null && <Badge variant="secondary">Jour {f.day_number}</Badge>}
                  <Badge variant="muted">{f.kind}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{f.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
