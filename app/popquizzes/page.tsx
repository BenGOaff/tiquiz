// List page for the caller's popquizzes. Server component qui fait
// la fetch + délègue le rendu à PopquizzesClient (côté client) pour
// l'interactivité (filtres, suppression, popover embed).
//
// Béné 2026-05-04 : visuel aligné sur /quizzes (cards, thumbnails,
// icônes d'action) pour que la traversée Quizzes ↔ Popquizzes se
// sente comme une seule app.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isPaidPlan, FREE_LIMITS } from "@/lib/planLimits";
import AppShell from "@/components/AppShell";
import { PopquizzesClient, type PopquizListItem } from "./PopquizzesClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("myPopquizzes") };
}

interface VideoLite {
  source: string;
  thumbnail_url: string | null;
  status: string;
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

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("popquizzes")
      .select(
        `id, title, slug, is_published, views_count, completions_count,
         video:popquiz_videos!inner(source, thumbnail_url, status)`,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("plan").eq("user_id", user.id).maybeSingle(),
  ]);

  const popquizzes: PopquizListItem[] = (rows ?? []).map((r: any) => {
    const v = firstVideo(r.video);
    return {
      id: String(r.id),
      title: String(r.title ?? ""),
      slug: typeof r.slug === "string" ? r.slug : null,
      is_published: r.is_published === true,
      views_count: Number(r.views_count ?? 0),
      completions_count: Number(r.completions_count ?? 0),
      thumbnail_url: v?.thumbnail_url ?? null,
      source: v?.source ?? "?",
    };
  });

  const isPaid = isPaidPlan((profile as { plan?: string | null } | null)?.plan);
  const tHeader = await getTranslations("metadata.pages");

  return (
    <AppShell userEmail={user.email ?? ""} headerTitle={tHeader("myPopquizzesShort")}>
      <PopquizzesClient
        popquizzes={popquizzes}
        isPaid={isPaid}
        maxFree={FREE_LIMITS.maxPopquizzes}
      />
    </AppShell>
  );
}
