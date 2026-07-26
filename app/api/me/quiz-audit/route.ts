// app/api/me/quiz-audit/route.ts
// Chantier C : Quiz Doctor. Lit la structure du quiz Tiquiz de l'eleve
// (via la connexion partenaire) et renvoie la checklist de corrections.
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { getTiquizConnection, fetchQuizAudit } from "@/lib/integrations/tiquiz";
import { auditQuiz, type QuizAudit } from "@/lib/quizDoctor";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });

  const connection = await getTiquizConnection(viewer.userId);
  if (!connection) {
    return NextResponse.json({ ok: true, connected: false, quizzes: [] });
  }

  const structs = await fetchQuizAudit(viewer.userId);
  if (structs === null) {
    return NextResponse.json({ ok: true, connected: true, error: true, quizzes: [] });
  }

  const quizzes: QuizAudit[] = structs.map((s) => ({
    title: s.title,
    status: s.status,
    issues: auditQuiz(s),
  }));

  return NextResponse.json({ ok: true, connected: true, quizzes });
}
