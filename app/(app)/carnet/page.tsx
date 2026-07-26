import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Compass, ArrowRight } from "lucide-react";
import { getViewer } from "@/lib/parcours";
import { getCarnetSynthesis } from "@/lib/carnet";
import { CarnetChantier } from "@/components/carnet/CarnetChantier";
import { Card, CardContent } from "@/components/ui/card";
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

  const synthesis = await getCarnetSynthesis(viewer.userId);
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

      {synthesis.sections.length === 0 && !synthesis.hasAnything ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-soft text-primary">
              <BookOpen className="size-6" />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Ton carnet est encore vierge. Réponds aux quiz du parcours et ton quiz
              commencera à s'écrire ici, réponse après réponse.
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
        <CarnetChantier synthesis={synthesis} />
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
