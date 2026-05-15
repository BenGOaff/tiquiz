// app/q/[quizId]/page.tsx
// Public quiz page (no auth required).
// The "[quizId]" URL segment accepts either the quiz UUID or a custom slug.
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PublicQuizClient from "@/components/quiz/PublicQuizClient";
import { stripHtml } from "@/lib/richText";

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

    // Description OG : le titre ET l'introduction sont éditables en
    // rich-text → on strip avant de truncate (sinon les 160 premiers
    // chars de l'intro peuvent être bourrés de balises HTML brutes ou
    // d'entités `&nbsp;` qui apparaissent en clair dans l'aperçu de
    // partage iMessage / WhatsApp). Cf. rapport Adeline (16 mai 2026).
    const ogDescRaw = stripHtml(data.og_description);
    const introPlain = stripHtml(data.introduction);
    const rawDesc = ogDescRaw || introPlain.slice(0, 160);
    const description = rawDesc.trim() || undefined;
    const plainTitle = stripHtml(data.title);

    return {
      title: `${plainTitle} – Tiquiz`,
      description,
      openGraph: {
        title: plainTitle,
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
