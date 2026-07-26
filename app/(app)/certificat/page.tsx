// app/(app)/certificat/page.tsx — le certificat de reussite de l'eleve.
// Plus d'examen : le certificat se debloque des que les 7 jours du
// parcours sont termines. Cette page sert aussi d'acces PERMANENT (on la
// retrouve depuis le compte) : l'eleve peut y revenir, changer le nom
// affiche, re-telecharger et re-partager quand il veut.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Lock } from "lucide-react";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getAppUrl } from "@/lib/appUrl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NoAccess } from "@/components/NoAccess";
import { CertificateStudio } from "./CertificateStudio";

export const dynamic = "force-dynamic";

export default async function CertificatPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const days = await getDaysWithProgress(viewer.userId);
  const parcours = days.filter((d) => !d.is_bonus);
  const completed = parcours.filter((d) => d.progress === "completed").length;
  const total = parcours.length;
  const allDone = total > 0 && completed === total;

  // Certificat verrouille tant que le parcours n'est pas boucle.
  if (!allDone) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="size-7" />
          </div>
          <h1 className="font-display text-2xl font-bold">
            Ton certificat t'attend
          </h1>
          <p className="text-sm text-muted-foreground">
            Ton certificat de réussite se débloque quand tu as terminé les{" "}
            {total} jours de l'Atelier. Encore un petit effort.
          </p>
        </header>
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Ta progression</span>
              <span className="text-muted-foreground">
                {completed} / {total} jours
              </span>
            </div>
            <Progress value={pct} />
            <Button asChild className="mt-1 w-fit">
              <Link href="/dashboard">Reprendre le parcours</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Certificat deja delivre ? On prefill le nom et le numero.
  const supabase = await getSupabaseServerClient();
  const { data: existing } = await supabase
    .from("certificates")
    .select("share_token, cert_number, full_name")
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const suggestedName =
    viewer.profile?.full_name?.trim() || viewer.email?.split("@")[0] || "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Award className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">
          Ton certificat de réussite
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu as terminé L'Atelier du Quiz. Choisis le nom à afficher, génère
          ton certificat officiel, puis télécharge-le et partage-le.
        </p>
      </header>

      <CertificateStudio
        appUrl={getAppUrl()}
        initialToken={(existing?.share_token as string) ?? null}
        initialName={(existing?.full_name as string) ?? ""}
        initialNumber={(existing?.cert_number as string) ?? null}
        suggestedName={suggestedName}
      />
    </div>
  );
}
