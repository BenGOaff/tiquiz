import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [{ count: enrolled }, { data: daysData }, { data: allDaysData }, { data: feedback }] =
    await Promise.all([
      supabaseAdmin.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin
        .from("days")
        .select("id, day_number, title, is_bonus")
        .eq("status", "published")
        .eq("is_bonus", false)
        .order("sort_order", { ascending: true }),
      // Tous les jours publiés (bonus inclus) : pour résoudre le lien d'édition
      // de n'importe quel jour cité dans un retour.
      supabaseAdmin
        .from("days")
        .select("id, day_number, title, is_bonus")
        .eq("status", "published"),
      supabaseAdmin
        .from("feedback")
        .select("day_number, kind, message, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const days = (daysData ?? []) as DayRow[];
  const totalEnrolled = enrolled ?? 0;

  // day_number -> jour (id + titre), pour cabler les boutons "Éditer le Jour N".
  const dayByNumber = new Map<number, DayRow>();
  for (const d of (allDaysData ?? []) as DayRow[]) dayByNumber.set(d.day_number, d);

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

  // Blocages récurrents par jour : on classe les jours par nombre de retours,
  // pour attaquer en priorité le contenu qui coince le plus. Boucle "améliorer
  // cohorte après cohorte" rendue actionnable (un clic vers l'édition du jour).
  const feedbackByDay = new Map<number, number>();
  for (const f of fb) {
    if (f.day_number == null) continue;
    feedbackByDay.set(f.day_number, (feedbackByDay.get(f.day_number) ?? 0) + 1);
  }
  const recurring = [...feedbackByDay.entries()]
    .map(([dayNumber, count]) => ({ dayNumber, count, day: dayByNumber.get(dayNumber) ?? null }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Retours & décrochage</h1>
        <p className="text-sm text-muted-foreground">
          Où les élèves décrochent, et pourquoi. Sert à corriger le contenu et le process pour que
          chaque cohorte réussisse mieux.
        </p>
      </header>

      {/* À corriger en priorité : les jours qui font le plus remonter de retours. */}
      {recurring.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            À corriger en priorité
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-border py-2">
              {recurring.map(({ dayNumber, count, day }) => (
                <div key={dayNumber} className="flex items-center gap-3 py-2.5">
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {day ? `Jour ${dayNumber} : ${day.title}` : `Jour ${dayNumber}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count} retour{count > 1 ? "s" : ""} d'élève{count > 1 ? "s" : ""}
                    </span>
                  </div>
                  {day && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/jours/${day.id}`}>
                        <Pencil />
                        Éditer ce jour
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

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
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                    {completed} ({pct}%)
                  </span>
                  <Link
                    href={`/admin/jours/${day.id}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    title={`Éditer le Jour ${day.day_number}`}
                  >
                    <Pencil className="size-3.5" />
                    Éditer
                  </Link>
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
          fb.map((f, i) => {
            const day = f.day_number != null ? dayByNumber.get(f.day_number) ?? null : null;
            return (
              <Card key={i}>
                <CardContent className="flex flex-col gap-1.5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {f.day_number !== null && <Badge variant="secondary">Jour {f.day_number}</Badge>}
                    <Badge variant="muted">{f.kind}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    {day && (
                      <Link
                        href={`/admin/jours/${day.id}`}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        title={`Éditer le Jour ${f.day_number}`}
                      >
                        <Pencil className="size-3.5" />
                        Éditer ce jour
                      </Link>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{f.message}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
