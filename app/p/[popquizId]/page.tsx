// Public play page — no auth required. Loads a published popquiz
// via the service-role client (bypasses RLS), 404s otherwise.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublishedPopquiz } from "@/lib/popquiz/repo";
import PopquizPlayClient from "./PopquizPlayClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ popquizId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { popquizId } = await params;
  const popquiz = await fetchPublishedPopquiz(popquizId);
  if (!popquiz) return { title: "Popquiz" };
  return {
    title: `${popquiz.title} – Popquiz`,
    description: popquiz.description ?? undefined,
    openGraph: {
      title: popquiz.title,
      description: popquiz.description ?? undefined,
      ...(popquiz.video.thumbnailUrl
        ? { images: [{ url: popquiz.video.thumbnailUrl }] }
        : {}),
    },
  };
}

export default async function PublicPopquizPage({ params }: Props) {
  const { popquizId } = await params;
  const popquiz = await fetchPublishedPopquiz(popquizId);
  if (!popquiz) notFound();
  return <PopquizPlayClient popquiz={popquiz} />;
}
