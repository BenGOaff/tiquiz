import Link from "next/link";
import { AlertTriangle, Lightbulb, PartyPopper, Info, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TiquizInsight, InsightTone } from "@/lib/insights/tiquizInsights";

const TONE: Record<InsightTone, { wrap: string; icon: typeof Info; iconColor: string }> = {
  alerte: { wrap: "border-l-4 border-l-amber-500 bg-amber-50/60", icon: AlertTriangle, iconColor: "text-amber-600" },
  conseil: { wrap: "border-l-4 border-l-primary bg-surface-soft", icon: Lightbulb, iconColor: "text-primary" },
  bravo: { wrap: "border-l-4 border-l-success bg-success/5", icon: PartyPopper, iconColor: "text-success" },
  info: { wrap: "border-l-4 border-l-border bg-muted/40", icon: Info, iconColor: "text-muted-foreground" },
};

/**
 * Recommandations du coach issues des vrais chiffres Tiquiz. Un constat,
 * une action, et le jour a (re)voir. Rendu seulement si insights non vide
 * (compte Tiquiz connecte).
 */
export function TiquizInsights({ insights }: { insights: TiquizInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Lightbulb className="size-4" />
        Ce que ton coach te conseille (d'après tes vrais chiffres)
      </h2>
      <div className="flex flex-col gap-3">
        {insights.map((ins) => {
          const t = TONE[ins.tone];
          const Icon = t.icon;
          return (
            <Card key={ins.id} className={cn(t.wrap)}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-start gap-2">
                  <Icon className={cn("mt-0.5 size-5 shrink-0", t.iconColor)} />
                  <p className="font-medium leading-snug">{ins.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{ins.action}</p>
                {ins.dayNumber !== undefined && (
                  <Link
                    href={`/jour/${ins.dayNumber}`}
                    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Revoir le Jour {ins.dayNumber}
                    <ArrowRight className="size-4" />
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
