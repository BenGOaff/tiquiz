// List page for the caller's popquizzes. Mirrors /quizzes — wrapped
// dans AppShell pour que la sidebar reste visible et que la mise en
// page soit cohérente avec le reste de l'app (Gwenn 2026-05-04 :
// "on GARDE une cohérence dans les apps, même mise en page").

import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Video } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Mes Popquiz – Tiquiz" };

interface VideoLite {
  source: string;
  thumbnail_url: string | null;
  status: string;
}

interface PopquizListRow {
  id: string;
  title: string;
  is_published: boolean;
  views_count: number | null;
  completions_count: number | null;
  video: VideoLite | VideoLite[] | null;
}

function firstVideo(
  v: VideoLite | VideoLite[] | null | undefined,
): VideoLite | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default async function PopquizzesListPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("popquizzes")
    .select(
      `id, title, is_published, views_count, completions_count,
       video:popquiz_videos!inner(source, thumbnail_url, status)`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const popquizzes = (data ?? []) as unknown as PopquizListRow[];

  return (
    <AppShell userEmail={user.email ?? ""} headerTitle="Mes Popquiz">
      {/* Bannière gradient — même pattern visuel que /quizzes pour
          conserver une cohérence de UX entre les listes. */}
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Video className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">Mes Popquiz</h2>
          <p className="text-sm text-white/70">
            Quiz qui se déclenchent dans une vidéo.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="secondary">
            <Link href="/popquiz/new">
              <Sparkles className="h-4 w-4 mr-2" />
              Nouveau Popquiz
            </Link>
          </Button>
        </div>
      </div>

      {popquizzes.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <p className="text-muted-foreground">Aucun popquiz pour l'instant.</p>
          <Button asChild>
            <Link href="/popquiz/new">Créer le premier</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {popquizzes.map((p) => {
            const v = firstVideo(p.video);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <div className="size-12 rounded bg-muted flex items-center justify-center text-[10px] uppercase text-muted-foreground shrink-0">
                  {v?.source ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.is_published ? "Publié" : "Brouillon"}
                    {" · "}
                    {p.views_count ?? 0} vues ·{" "}
                    {p.completions_count ?? 0} terminés
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/popquiz/${p.id}`}>Modifier</Link>
                </Button>
                {p.is_published ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/p/${p.id}`} target="_blank">
                      Voir
                    </Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
