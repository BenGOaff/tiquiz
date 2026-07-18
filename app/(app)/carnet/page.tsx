import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Compass, Gift, ArrowRight } from "lucide-react";
import { getViewer } from "@/lib/parcours";
import { getCarnet } from "@/lib/carnet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoAccess } from "@/components/NoAccess";
import {
  ACTIVITY_OPTIONS,
  MATURITY_OPTIONS,
  MONETIZATION_OPTIONS,
  ADS_OPTIONS,
  labelOf,
} from "@/lib/businessProfile";

export const dynamic = "force-dynamic";

export default async function CarnetPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const carnet = await getCarnet(viewer.userId);
  const profile = viewer.profile;
  const firstName = profile?.full_name?.split(" ")[0] ?? null;
  const hasCompass = Boolean(
    profile?.niche ||
      profile?.activity_type ||
      profile?.maturity ||
      profile?.monetization ||
      profile?.ads_budget,
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <BookOpen className="size-7 text-primary" />
          {firstName ? `Le carnet de ${firstName}` : "Ton carnet de bord"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Toutes tes réponses, rassemblées. C'est la matière de ton projet : ton quiz s'écrit ici,
          réponse après réponse.
        </p>
      </header>

      {/* Ma boussole : le diagnostic d'entree */}
      {hasCompass && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Compass className="size-4 text-primary" />
              Ma boussole
            </span>
            <div className="grid gap-3 sm:grid-cols-3">
              {profile?.niche && <Field label="Ma niche" value={profile.niche} />}
              {profile?.activity_type && (
                <Field label="Mon activité" value={labelOf(ACTIVITY_OPTIONS, profile.activity_type)} />
              )}
              {profile?.maturity && (
                <Field label="Où j'en suis" value={labelOf(MATURITY_OPTIONS, profile.maturity)} />
              )}
              {profile?.monetization && (
                <Field label="Ma monétisation" value={labelOf(MONETIZATION_OPTIONS, profile.monetization)} />
              )}
              {profile?.ads_budget && (
                <Field label="Budget pub" value={labelOf(ADS_OPTIONS, profile.ads_budget)} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {carnet.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-soft text-primary">
              <BookOpen className="size-6" />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Ton carnet est encore vierge. Réponds aux quiz du parcours et tes réponses
              viendront le remplir au fil des jours.
            </p>
            <Button asChild>
              <Link href="/dashboard">
                Commencer le parcours
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        carnet.map((day) => (
          <Card key={`${day.isBonus ? "b" : "j"}-${day.dayNumber}`}>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {day.isBonus ? "Bonus" : `Jour ${day.dayNumber}`}
                </span>
                {day.isBonus && (
                  <Badge variant="secondary">
                    <Gift className="size-3" />
                    Bonus
                  </Badge>
                )}
                <h2 className="font-display font-semibold">{day.title}</h2>
              </div>
              <dl className="flex flex-col gap-4">
                {day.entries.map((e) => (
                  <div key={e.questionId} className="flex flex-col gap-1">
                    <dt className="text-sm font-medium text-muted-foreground">{e.prompt}</dt>
                    <dd className="whitespace-pre-wrap rounded-lg bg-surface-soft px-3 py-2 text-sm">
                      {e.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-surface-soft px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
