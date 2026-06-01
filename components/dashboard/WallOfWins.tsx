"use client";

// components/dashboard/WallOfWins.tsx (Tiquiz)
//
// Carte "Ce que tes quiz t'ont apporté" en haut du dashboard. Port
// adapté de Tipote : pas de CA/ventes, focus métriques quiz (leads,
// vues, complétions, partages) + top quiz + milestones.
//
// RÈGLE BÉNÉ : si hasResults=false → rend null (carte invisible).
// Couleur d'accent = primary (turquoise Tiquiz) via les tokens du
// design system.

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

type Period = "month" | "30d" | "90d";

interface Stats {
  leadsCaptured: number;
  quizViews: number;
  quizCompletes: number;
  quizShares: number;
  topQuiz: { id: string; title: string; completes: number } | null;
  milestonesUnlocked: Array<{ key: string; emoji: string; title: string; unlockedAt: string }>;
}

interface Resp {
  ok: boolean;
  period: Period;
  hasResults: boolean;
  current: Stats;
  previous: Stats;
}

const PERIOD_LABELS: Record<Period, string> = {
  month: "Ce mois",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
};

const NUM_FMT = new Intl.NumberFormat("fr-FR");

function delta(current: number, previous: number): {
  label: string;
  direction: "up" | "down" | "flat";
} {
  if (previous === 0 && current === 0) return { label: "—", direction: "flat" };
  if (previous === 0) return { label: "Nouveau", direction: "up" };
  const diff = current - previous;
  if (diff === 0) return { label: "= préc.", direction: "flat" };
  const pct = Math.round((diff / previous) * 100);
  return { label: `${diff > 0 ? "+" : ""}${pct} %`, direction: diff > 0 ? "up" : "down" };
}

function DeltaBadge({ value }: { value: ReturnType<typeof delta> }) {
  const Icon =
    value.direction === "up" ? TrendingUp : value.direction === "down" ? TrendingDown : Minus;
  const colorClass =
    value.direction === "up"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30"
      : value.direction === "down"
        ? "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30"
        : "text-muted-foreground bg-muted/40";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {value.label}
    </span>
  );
}

function StatTile({
  label,
  value,
  deltaValue,
}: {
  label: string;
  value: string;
  deltaValue?: ReturnType<typeof delta>;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground mt-0.5 leading-tight">{value}</p>
      {deltaValue && (
        <div className="mt-1">
          <DeltaBadge value={deltaValue} />
        </div>
      )}
    </div>
  );
}

export function WallOfWins() {
  const [period, setPeriod] = useState<Period>("month");
  const [payload, setPayload] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/wall-of-wins?period=${period}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((data: Resp) => {
        if (!cancelled) setPayload(data?.ok ? data : null);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const deltas = useMemo(() => {
    if (!payload?.current || !payload?.previous) return null;
    return {
      leads: delta(payload.current.leadsCaptured, payload.previous.leadsCaptured),
      views: delta(payload.current.quizViews, payload.previous.quizViews),
      completes: delta(payload.current.quizCompletes, payload.previous.quizCompletes),
      shares: delta(payload.current.quizShares, payload.previous.quizShares),
    };
  }, [payload]);

  if (loading) return null;
  if (!payload?.ok || !payload.hasResults) return null;

  const c = payload.current;
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Ce que tes quiz t&apos;ont apporté
              </h3>
              <p className="text-xs text-muted-foreground">{PERIOD_LABELS[payload.period]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Button
                key={p}
                variant={p === period ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {c.leadsCaptured > 0 && (
            <StatTile label="Leads" value={NUM_FMT.format(c.leadsCaptured)} deltaValue={deltas?.leads} />
          )}
          {c.quizViews > 0 && (
            <StatTile label="Vues" value={NUM_FMT.format(c.quizViews)} deltaValue={deltas?.views} />
          )}
          {c.quizCompletes > 0 && (
            <StatTile label="Quiz finis" value={NUM_FMT.format(c.quizCompletes)} deltaValue={deltas?.completes} />
          )}
          {c.quizShares > 0 && (
            <StatTile label="Partages" value={NUM_FMT.format(c.quizShares)} deltaValue={deltas?.shares} />
          )}
        </div>

        {(c.topQuiz || c.milestonesUnlocked.length > 0) && (
          <div className="mt-4 pt-4 border-t border-primary/10 grid md:grid-cols-2 gap-3">
            {c.topQuiz && (
              <div className="flex items-center gap-3 rounded-lg bg-background/80 border border-border/50 px-3 py-2">
                <span className="text-base">🏆</span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Top quiz de la période
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">{c.topQuiz.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {NUM_FMT.format(c.topQuiz.completes)} complétions
                  </p>
                </div>
              </div>
            )}
            {c.milestonesUnlocked.length > 0 && (
              <div className="rounded-lg bg-background/80 border border-border/50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Milestones débloqués
                </p>
                <ul className="mt-1 space-y-0.5">
                  {c.milestonesUnlocked.slice(0, 3).map((m) => (
                    <li key={m.key} className="text-sm text-foreground flex items-center gap-1.5">
                      <span>{m.emoji}</span>
                      <span className="truncate">{m.title}</span>
                    </li>
                  ))}
                  {c.milestonesUnlocked.length > 3 && (
                    <li className="text-xs text-muted-foreground pt-0.5">
                      + {c.milestonesUnlocked.length - 3} de plus
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
