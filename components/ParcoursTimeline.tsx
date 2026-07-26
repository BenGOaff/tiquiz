// components/ParcoursTimeline.tsx — timeline verticale du parcours.
// Momentum honnete : etat de chaque jour + date de validation des jours finis
// (progress.completed_at, stocke mais jamais montre jusqu'ici). Reutilise le
// langage visuel des cartes (indigo primary, vert succes). Server component.
import Link from "next/link";
import { CheckCircle2, Lock, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayWithProgress } from "@/lib/types";

/** "12 juillet" a partir d'un ISO. Rend null si la date est absente/invalide. */
function frenchDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(d);
}

export function ParcoursTimeline({ parcours }: { parcours: DayWithProgress[] }) {
  if (parcours.length === 0) return null;

  return (
    <ol className="flex flex-col">
      {parcours.map((d, i) => {
        const done = d.progress === "completed";
        const current = d.progress === "in_progress";
        const locked = d.progress === "locked";
        const isLast = i === parcours.length - 1;
        const prev = i > 0 ? parcours[i - 1] : null;
        const validatedOn = done ? frenchDate(d.completed_at) : null;

        const node = (
          <span
            className={cn(
              "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-4 ring-surface",
              done && "bg-success text-success-foreground",
              current && "bg-primary text-primary-foreground",
              locked && "bg-muted text-muted-foreground",
            )}
          >
            {done ? (
              <CheckCircle2 className="size-5" />
            ) : locked ? (
              <Lock className="size-4" />
            ) : (
              `J${d.day_number}`
            )}
          </span>
        );

        const body = (
          <div
            className={cn(
              "flex flex-1 flex-col gap-0.5 rounded-xl border px-4 py-3 transition-all",
              current && "border-primary/50 bg-primary/5 ring-1 ring-primary/40",
              done && "border-success/30",
              locked && "border-border opacity-70",
              !locked && "group-hover:border-primary/50 group-hover:shadow-card-hover",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Jour {d.day_number}
              </span>
              {done && validatedOn && (
                <span className="text-xs font-medium text-success">
                  Validé le {validatedOn}
                </span>
              )}
              {done && !validatedOn && (
                <span className="text-xs font-medium text-success">Validé</span>
              )}
              {current && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" />
                  À reprendre
                </span>
              )}
            </div>
            <p className="font-display font-semibold leading-snug">{d.title}</p>
            {locked ? (
              <span className="text-sm text-muted-foreground">
                {prev
                  ? `Se débloque en finissant le Jour ${prev.day_number}`
                  : "Bientôt disponible"}
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary">
                {done ? "Revoir" : current ? "Reprendre" : "Ouvrir"}
                <Play className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>
        );

        return (
          <li key={d.id} className="relative flex gap-4 pb-4 last:pb-0">
            {/* Ligne verticale de liaison entre les noeuds. */}
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[17px] top-9 h-[calc(100%-1rem)] w-0.5",
                  done ? "bg-success/40" : "bg-border",
                )}
              />
            )}
            {locked ? (
              <>
                {node}
                <div className="flex-1">{body}</div>
              </>
            ) : (
              <Link href={`/jour/${d.day_number}`} className="group flex flex-1 gap-4">
                {node}
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
