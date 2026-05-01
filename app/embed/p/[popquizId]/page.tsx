// Embed-optimised play page. Loaded inside an <iframe> on a third-
// party site (WordPress, Systeme.io…) so we keep zero chrome:
// no logo above, no footer, no padding. Just the player flush
// against the iframe edges, ready to inherit whatever 16:9 aspect
// ratio the embedding snippet sets up.
//
// The /embed/* prefix already gets `frame-ancestors *` from
// middleware, so any origin can iframe this without X-Frame-Options
// blocking. /p/[id] stays as the auth-free share link.

import { notFound } from "next/navigation";
import { fetchPublishedPopquiz } from "@/lib/popquiz/repo";
import EmbedPopquizPlayClient from "./EmbedPopquizPlayClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ popquizId: string }> };

export const metadata = { title: "Popquiz" };

export default async function EmbedPopquizPage({ params }: Props) {
  const { popquizId } = await params;
  const popquiz = await fetchPublishedPopquiz(popquizId);
  if (!popquiz) notFound();
  return <EmbedPopquizPlayClient popquiz={popquiz} />;
}
