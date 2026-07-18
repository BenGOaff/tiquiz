import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, Play, Sparkles, Gift, Trophy, Award } from "lucide-react";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/NoAccess";
import { cn } from "@/lib/utils";
import type { DayWithProgress } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;
  if (!viewer.profile?.diagnostic_completed_at) redirect("/diagnostic");

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

      {/* Barre de progression du parcours */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
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
                  Passe ton certificat de fin de formation
                </p>
                <p className="text-sm text-muted-foreground">
                  Valide tes compétences et décroche ton certificat officiel, à
                  partager sur tes réseaux.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Commencer
                <Play className="size-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Section parcours : cartes facon "jeu de cartes" */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Le parcours
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {parcours.map((d, i) => (
            <DayCard key={d.id} day={d} prev={i > 0 ? parcours[i - 1] : null} />
          ))}
          {parcours.length === 0 && (
            <Card className="sm:col-span-3">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Le parcours arrive très vite.
              </CardContent>
            </Card>
          )}
        </div>
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

/** Carte de jour facon carte a jouer : badge de niveau, etat colore, CTA. */
function DayCard({ day: d, prev }: { day: DayWithProgress; prev: DayWithProgress | null }) {
  const locked = d.progress === "locked";
  const done = d.progress === "completed";
  const current = d.progress === "in_progress";

  const inner = (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all",
        locked && "border-border opacity-70 grayscale",
        done && "border-success/40",
        current && "border-primary/60 shadow-card-hover ring-2 ring-primary",
        !locked && !current && "border-border",
        !locked && "hover:-translate-y-0.5 hover:shadow-card-hover",
      )}
    >
      {/* Bandeau haut colore selon l'etat */}
      <div
        className={cn(
          "h-1.5 w-full",
          done && "bg-success",
          current && "bg-primary",
          locked && "bg-muted",
          !done && !current && !locked && "bg-primary/30",
        )}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          {/* Pastille de niveau */}
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-sm",
              done && "bg-success text-success-foreground",
              current && "bg-primary text-primary-foreground",
              locked && "bg-muted text-muted-foreground",
              !done && !current && !locked && "bg-primary/10 text-primary",
            )}
          >
            {done ? (
              <CheckCircle2 className="size-6" />
            ) : locked ? (
              <Lock className="size-5" />
            ) : (
              `J${d.day_number}`
            )}
          </div>
          {done && <Badge variant="success">Terminé</Badge>}
          {current && <Badge>À faire</Badge>}
          {locked && <Badge variant="muted">Verrouillé</Badge>}
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Jour {d.day_number}
          </span>
          <p className="font-display font-semibold leading-snug">{d.title}</p>
          {d.subtitle && <p className="text-sm text-muted-foreground">{d.subtitle}</p>}
        </div>

        {/* Pied : appel a l'action ou indice de deblocage */}
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {locked ? (
            <span className="text-muted-foreground">
              {prev ? `Se débloque en finissant J${prev.day_number}` : "Bientôt disponible"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary">
              {done ? "Revoir" : current ? "Commencer" : "Ouvrir"}
              <Play className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return locked ? (
    <div aria-disabled className="cursor-not-allowed">
      {inner}
    </div>
  ) : (
    <Link href={`/jour/${d.day_number}`} className="block h-full">
      {inner}
    </Link>
  );
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
