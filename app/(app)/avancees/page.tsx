import { redirect } from "next/navigation";
import { Trophy, Medal } from "lucide-react";
import { getViewer, getDaysWithProgress, snapshotFromDays } from "@/lib/parcours";
import { earnedBadgeCodes, BADGES } from "@/lib/gamification";
import { ensureAutoConnect, getTiquizConnection } from "@/lib/integrations/tiquiz";
import { computeTiquizInsights } from "@/lib/insights/tiquizInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BadgeGrid } from "@/components/BadgeGrid";
import { TiquizPanel } from "@/components/TiquizPanel";
import { TiquizInsights } from "@/components/TiquizInsights";
import { QuizDoctor } from "@/components/QuizDoctor";
import { NoAccess } from "@/components/NoAccess";

export const dynamic = "force-dynamic";

export default async function AvanceesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  // Auto-connexion Tiquiz si meme email (et pas d'opt-out manuel).
  await ensureAutoConnect(
    viewer.userId,
    viewer.email,
    viewer.profile?.tiquiz_autolink_optout ?? false,
  );

  const days = await getDaysWithProgress(viewer.userId);
  const connection = await getTiquizConnection(viewer.userId);
  const tiquizMetrics = connection?.metrics ?? null;

  const parcours = days.filter((d) => !d.is_bonus);
  const completed = parcours.filter((d) => d.progress === "completed").length;
  const total = parcours.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const earnedCodes = earnedBadgeCodes(
    snapshotFromDays(days),
    tiquizMetrics ? { leads: tiquizMetrics.leads } : undefined,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tes avancées</h1>
        <p className="text-sm text-muted-foreground">
          Ta progression, tes badges et tes vrais résultats Tiquiz, au même endroit.
        </p>
      </header>

      {/* Progression du parcours */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Trophy className="size-4 text-primary" />
              Progression du parcours
            </span>
            <span className="text-muted-foreground">
              {completed} / {total} jours
            </span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      {/* Resultats reels Tiquiz (connexion 1-clic + deconnexion) */}
      <TiquizPanel
        connected={Boolean(connection)}
        metrics={tiquizMetrics}
        lastSyncedAt={connection?.last_synced_at ?? null}
        connectedEmail={connection?.tiquiz_email ?? null}
      />

      {/* Coach proactif : recommandations issues des vrais chiffres */}
      {connection && <TiquizInsights insights={computeTiquizInsights(tiquizMetrics)} />}

      {/* Quiz Doctor : audit de la structure du quiz (réglages) */}
      <QuizDoctor connected={Boolean(connection)} />

      {/* Badges */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Medal className="size-4" />
          Tes badges
          <span className="font-normal normal-case tracking-normal text-muted-foreground">
            {earnedCodes.length} / {BADGES.length}
          </span>
        </h2>
        <BadgeGrid earnedCodes={earnedCodes} />
      </section>
    </div>
  );
}
