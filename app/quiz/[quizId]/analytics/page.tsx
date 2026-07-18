// /quiz/[quizId]/analytics
//
// Page server-side : auth + ownership uniquement. La donnée est
// chargée côté client par QuizAnalyticsClient.
//
// Historique : la version précédente faisait un fetch SSR self-hostname
// vers /api/quiz/.../analytics pour pré-renderer les charts. Le
// self-fetch est fragile (Caddy → Next loop, headers / cookies mal
// propagés, host inconnu sur certains setups) — quand il échouait
// silencieusement le `notFound()` faisait 404 sur des quiz parfaitement
// valides (Gwenn 19 mai 2026). On accepte un flash de spinner au mount
// en échange d'une fiabilité totale ; les données arrivent < 500 ms en
// pratique.

import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { QuizAnalyticsClient } from "@/components/quiz/QuizAnalyticsClient";

type RouteContext = { params: Promise<{ quizId: string }> };

export const dynamic = "force-dynamic";

export default async function QuizAnalyticsPage({ params }: RouteContext) {
  const { quizId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/");

  // Confirm ownership server-side. If the quiz isn't theirs, 404 — the
  // analytics endpoint would also refuse but this saves a roundtrip
  // and keeps unowned quizzes off the URL space.
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, hide_response_counts")
    .eq("id", quizId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!quiz) notFound();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <QuizAnalyticsClient
        quizId={quizId}
        hideCounts={(quiz as { hide_response_counts?: boolean | null }).hide_response_counts === true}
      />
    </div>
  );
}
