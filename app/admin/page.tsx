import Link from "next/link";
import { CalendarDays, Users, CheckCircle2 } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function count(table: string, filters?: Record<string, string>): Promise<number> {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters ?? {})) q = q.eq(k, v);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminHome() {
  const [activeStudents, publishedDays, draftDays, completions] = await Promise.all([
    count("enrollments", { status: "active" }),
    count("days", { status: "published" }),
    count("days", { status: "draft" }),
    count("progress", { status: "completed" }),
  ]);

  const stats = [
    { label: "Élèves actifs", value: activeStudents, icon: Users, href: "/admin/eleves" },
    { label: "Jours publiés", value: publishedDays, icon: CalendarDays, href: "/admin/jours" },
    { label: "Jours en brouillon", value: draftDays, icon: CalendarDays, href: "/admin/jours" },
    { label: "Jours complétés (total)", value: completions, icon: CheckCircle2, href: "/admin/eleves" },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Back-office</h1>
        <p className="text-sm text-muted-foreground">
          Crée et modifie tout le contenu, gère les accès. Aucun redéploiement nécessaire.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-shadow hover:shadow-card-hover">
                <CardContent className="flex flex-col gap-2 py-5">
                  <Icon className="size-5 text-primary" />
                  <span className="text-2xl font-bold">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
