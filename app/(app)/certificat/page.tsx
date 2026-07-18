// app/(app)/certificat/page.tsx — page de l'examen de certification.
// Accessible une fois le parcours (7 jours) termine. Si l'eleve a deja
// son certificat, on lui propose de le revoir ou de repasser l'examen.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Lock } from "lucide-react";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getPublicExam, EXAM_TOTAL, EXAM_PASS_MARK } from "@/lib/certification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NoAccess } from "@/components/NoAccess";
import { ExamRunner } from "./ExamRunner";

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

  // Examen verrouille tant que le parcours n'est pas boucle.
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
            L'examen de certification se débloque quand tu as terminé les{" "}
            {total} jours du parcours. Encore un petit effort.
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

  // Certificat deja obtenu ?
  const supabase = await getSupabaseServerClient();
  const { data: existing } = await supabase
    .from("certificates")
    .select("share_token, score, total")
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const exam = getPublicExam();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Award className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">
          Certificat de fin de formation
        </h1>
        <p className="text-sm text-muted-foreground">
          Un examen de {EXAM_TOTAL} questions pour valider tes compétences. Il
          te faut {EXAM_PASS_MARK} bonnes réponses pour décrocher ton certificat
          officiel, partageable sur tes réseaux. Tu peux le repasser autant de
          fois que tu veux.
        </p>
      </header>

      {existing?.share_token && (
        <Card className="border-success/40">
          <CardContent className="flex flex-col gap-3 py-5 text-center">
            <p className="text-sm font-medium text-success">
              Tu as déjà ton certificat ({existing.score}/{existing.total}).
            </p>
            <Button asChild variant="outline" className="mx-auto w-fit">
              <Link href={`/cert/${existing.share_token}`}>
                Revoir et partager mon certificat
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Tu peux retenter l'examen ci-dessous pour améliorer ton score.
            </p>
          </CardContent>
        </Card>
      )}

      <ExamRunner questions={exam} />
    </div>
  );
}
