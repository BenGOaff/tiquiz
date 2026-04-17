// app/q/[quizId]/page.tsx
// Public quiz page (no auth required).
// The "[quizId]" URL segment accepts either the quiz UUID or a custom slug.
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PublicQuizClient from "@/components/quiz/PublicQuizClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quizId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchQuizMeta(slugOrId: string) {
  if (UUID_RE.test(slugOrId)) {
    const { data } = await supabaseAdmin
      .from("quizzes")
      .select("title, introduction, og_image_url, og_description")
      .eq("id", slugOrId)
      .eq("status", "active")
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabaseAdmin
    .from("quizzes")
    .select("title, introduction, og_image_url, og_description")
    .ilike("slug", slugOrId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quizId } = await params;
  try {
    const data = await fetchQuizMeta(quizId);
    if (!data) return { title: "Quiz – Tiquiz" };

    const description = (data.og_description?.trim() || data.introduction?.slice(0, 160))?.trim() || undefined;

    return {
      title: `${data.title} – Tiquiz`,
      description,
      openGraph: {
        title: data.title,
        description,
        ...(data.og_image_url ? { images: [{ url: data.og_image_url }] } : {}),
      },
    };
  } catch {
    return { title: "Quiz – Tiquiz" };
  }
}

export default async function PublicQuizPage({ params }: Props) {
  const { quizId } = await params;
  return <PublicQuizClient quizId={quizId} />;
}
