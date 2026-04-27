// app/quiz/[quizId]/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import QuizEditShell from "./QuizEditShell";
import SurveyEditShell from "./SurveyEditShell";

export const metadata = { title: "Modifier le projet – Tiquiz" };

type Props = { params: Promise<{ quizId: string }> };

export default async function QuizDetailPage({ params }: Props) {
  const { quizId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The same /quiz/[id] route serves both quizzes and surveys (they share the
  // `quizzes` table). We branch server-side on `mode` so the client bundles
  // stay separated — survey UX has no result profiles, no virality / bonus,
  // and a Tendances analytics tab that the quiz editor doesn't need.
  const { data: row } = await supabase
    .from("quizzes")
    .select("mode")
    .eq("id", quizId)
    .eq("user_id", user.id)
    .maybeSingle();

  const mode = (row as { mode?: string } | null)?.mode;
  if (mode === "survey") {
    return <SurveyEditShell quizId={quizId} userEmail={user.email ?? ""} />;
  }
  return <QuizEditShell quizId={quizId} userEmail={user.email ?? ""} />;
}
