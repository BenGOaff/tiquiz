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
import { stripHtml } from "@/lib/richText";

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
  // Tuile compacte : titre + valeur empilés, delta badge à droite. Largeur
  // naturelle (auto) → en flex-wrap, plusieurs tuiles s'alignent sans gaspiller
  // de place quand il n'y en a qu'une (cf. retour Béné 3 juin 2026 : avec
  // grid-cols-4, 75% de la card était vide quand l'utilisateur avait 1 lead).
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
      </div>
      {deltaValue && <DeltaBadge value={deltaValue} />}
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              Ce que tes quiz t&apos;ont apporté
              <span className="text-muted-foreground font-normal ml-1">
                · {PERIOD_LABELS[payload.period]}
              </span>
            </h3>
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

        {/* Stats en flex-wrap : chaque tuile prend sa largeur naturelle, pas
            d'espace vide à droite quand l'utilisateur n'a qu'1 ou 2 stats
            actives (vs grid-cols-4 qui imposait 4 colonnes mortes). */}
        <div className="flex flex-wrap gap-2">
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

        {/* Top quiz + milestones rassemblés sur UNE rangée compacte (au lieu
            de 2 box séparées qui doublaient la hauteur). Milestones en pills. */}
        {(c.topQuiz || c.milestonesUnlocked.length > 0) && (
          <div className="mt-3 pt-3 border-t border-primary/10 flex flex-wrap items-center gap-x-4 gap-y-2">
            {c.topQuiz && (
              <div className="flex items-center gap-1.5 min-w-0 text-sm">
                <span aria-hidden="true">🏆</span>
                <span className="text-xs text-muted-foreground">Top :</span>
                <span className="font-medium truncate">
                  {stripHtml(c.topQuiz.title) || c.topQuiz.title}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({NUM_FMT.format(c.topQuiz.completes)})
                </span>
              </div>
            )}
            {c.milestonesUnlocked.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {c.milestonesUnlocked.slice(0, 4).map((m) => (
                  <span
                    key={m.key}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
                  >
                    <span aria-hidden="true">{m.emoji}</span>
                    <span className="font-medium">{m.title}</span>
                  </span>
                ))}
                {c.milestonesUnlocked.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{c.milestonesUnlocked.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
