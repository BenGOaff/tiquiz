// app/quiz/[quizId]/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import QuizEditShell from "./QuizEditShell";

export const metadata = { title: "Modifier le quiz – Tiquiz" };

type Props = { params: Promise<{ quizId: string }> };

export default async function QuizDetailPage({ params }: Props) {
  const { quizId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <QuizEditShell quizId={quizId} userEmail={user.email ?? ""} />;
}
