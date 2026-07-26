import {
  Rocket,
  Plug,
  Trophy,
  Users,
  GraduationCap,
  Compass,
  Sprout,
  Flame,
  TrendingUp,
  Lock,
} from "lucide-react";
import { BADGES, type BadgeDef } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const ICONS: Record<BadgeDef["icon"], typeof Rocket> = {
  rocket: Rocket,
  plug: Plug,
  trophy: Trophy,
  users: Users,
  graduation: GraduationCap,
  compass: Compass,
  sprout: Sprout,
  flame: Flame,
  trending: TrendingUp,
};

/**
 * Grille de badges (jalons). Les badges merites sont colores, les autres
 * grises avec leur description en objectif a atteindre. Composant pur,
 * utilisable cote serveur.
 */
export function BadgeGrid({ earnedCodes }: { earnedCodes: string[] }) {
  const earned = new Set(earnedCodes);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGES.map((b) => {
        const got = earned.has(b.code);
        const Icon = ICONS[b.icon];
        return (
          <div
            key={b.code}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors",
              got ? "border-primary/40 bg-surface-soft" : "border-dashed border-border opacity-70",
            )}
          >
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                got ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {got ? <Icon className="size-6" /> : <Lock className="size-5" />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-sm font-semibold", !got && "text-muted-foreground")}>
                {b.label}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">{b.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
