import Link from "next/link";
import { redirect } from "next/navigation";
import { Play, Sparkles, Gift, Trophy, Award, ArrowRight } from "lucide-react";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/NoAccess";
import { ParcoursTimeline } from "@/components/ParcoursTimeline";
import { TiquizFocusCard } from "@/components/TiquizFocusCard";
import { ensureAutoConnect } from "@/lib/integrations/tiquiz";
import type { DayWithProgress } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;
  if (!viewer.profile?.diagnostic_completed_at) redirect("/diagnostic");

  // Auto-connexion Tiquiz si meme email (et pas d'opt-out manuel), pour que
  // la carte "Focus Tiquiz" du dashboard s'affiche connectee sans clic. Meme
  // logique que la page Avancees : idempotent, retourne tot si deja connecte.
  await ensureAutoConnect(
    viewer.userId,
    viewer.email,
    viewer.profile?.tiquiz_autolink_optout ?? false,
  );

  const days = await getDaysWithProgress(viewer.userId);
  const parcours = days.filter((d) => !d.is_bonus);
  const bonus = days.filter((d) => d.is_bonus);

  const completed = parcours.filter((d) => d.progress === "completed").length;
  const total = parcours.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const current = parcours.find((d) => d.progress !== "completed" && d.unlocked) ?? null;
  const allDone = total > 0 && completed === total;
  const firstName = viewer.profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {firstName ? `Salut ${firstName}, on continue ?` : "Ton parcours L'Atelier du Quiz"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Chaque jour : une vidéo qui enseigne, un quiz qui te fait avancer. Finis le quiz du jour
          pour débloquer le suivant.
        </p>
      </header>

      {/* Accueil en 2 colonnes : progression à gauche, quiz suivi à droite. */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Barre de progression du parcours */}
        <Card className="h-full">
          <CardContent className="flex h-full flex-col gap-3 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Trophy className="size-4 text-primary" />
                Ta progression
              </span>
              <span className="text-muted-foreground">
                {completed} / {total} jours
              </span>
            </div>
            <Progress value={pct} />
            {current && (
              <Link
                href={`/jour/${current.day_number}`}
                className="mt-1 inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Sparkles className="size-4" />
                Reprendre : {dayLabel(current)} {current.title}
              </Link>
            )}
            {allDone && (
              <p className="mt-1 text-sm font-medium text-success">
                Parcours terminé, bravo ! Les bonus t'attendent plus bas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quiz suivi par l'Atelier (sélecteur single-quiz). */}
        <TiquizFocusCard />
      </div>

      {/* Certificat : debloque une fois le parcours termine */}
      {allDone && (
        <Link href="/certificat" className="block">
          <Card className="border-primary/40 bg-gradient-to-br from-surface-soft to-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:text-left">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                <Award className="size-7" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="font-display font-semibold">
                  Récupère ton certificat de réussite
                </p>
                <p className="text-sm text-muted-foreground">
                  Tu as terminé l'Atelier : génère ton certificat officiel, à
                  télécharger et partager sur tes réseaux.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Récupérer
                <ArrowRight className="size-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Section parcours : timeline verticale avec dates de validation. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Le parcours, jour après jour
        </h2>
        {parcours.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Le parcours arrive très vite.
            </CardContent>
          </Card>
        ) : (
          <ParcoursTimeline parcours={parcours} />
        )}
      </section>

      {/* Section bonus : style distinct, toujours accessible */}
      {bonus.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Gift className="size-4" />
            Bonus, quand tu veux
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {bonus.map((d) => (
              <BonusCard key={d.id} day={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function dayLabel(d: DayWithProgress): string {
  return `J${d.day_number}`;
}

/** Carte bonus : volontairement distincte (pointilles, degrade, cadeau). */
function BonusCard({ day: d }: { day: DayWithProgress }) {
  const done = d.progress === "completed";
  return (
    <Link href={`/jour/${d.day_number}`} className="block h-full">
      <div className="group flex h-full flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-gradient-to-br from-surface-soft to-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-card-hover">
        <div className="flex items-start justify-between">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
            <Gift className="size-6" />
          </div>
          {done ? (
            <Badge variant="success">Terminé</Badge>
          ) : (
            <Badge variant="secondary">Bonus</Badge>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">
            Bonus
          </span>
          <p className="font-display font-semibold leading-snug">{d.title}</p>
          {d.subtitle && <p className="text-sm text-muted-foreground">{d.subtitle}</p>}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {done ? "Revoir" : "Découvrir"}
          <Play className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
