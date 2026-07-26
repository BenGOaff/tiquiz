// app/api/me/tiquiz-quizzes/route.ts
// Liste des projets + quiz du compte Tiquiz de l'élève, pour le sélecteur du
// panel Tiquiz (choisir quel projet/quiz afficher). Renvoie aussi la
// sélection mémorisée courante.
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/parcours";
import { getTiquizConnection, fetchTiquizQuizList } from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  if (!viewer.enrolled) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });

  const connection = await getTiquizConnection(viewer.userId);
  if (!connection) return NextResponse.json({ ok: true, connected: false, projects: [], quizzes: [] });

  const list = await fetchTiquizQuizList(viewer.userId);
  if (!list) {
    return NextResponse.json({ ok: true, connected: true, error: true, projects: [], quizzes: [] });
  }
  return NextResponse.json({
    ok: true,
    connected: true,
    projects: list.projects,
    quizzes: list.quizzes,
    selectedScope: connection.selected_scope ?? "",
  });
}
