// app/templates/[slug]/page.tsx
//
// Page détail d'un template (phase 5 ROADMAP_RETENTION.md). SEO-indexable
// par modèle : aperçu complet du quiz (questions + résultats) + bouton
// "Utiliser ce modèle". L'aperçu EST la valeur SEO et la preuve concrète
// pour le visiteur.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getTemplateBySlug, listTemplates } from "@/lib/templates/catalog";
import TemplateDetailClient from "./TemplateDetailClient";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listTemplates().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tpl = getTemplateBySlug(slug);
  if (!tpl) return { title: "Modèle introuvable — Tiquiz" };
  const title = `${tpl.cardTitle} — Modèle de quiz ${tpl.metier} | Tiquiz`;
  const description = `${tpl.tagline} ${tpl.whoFor} Modèle prêt à l'emploi, personnalisable en quelques minutes.`;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "article" },
  };
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tpl = getTemplateBySlug(slug);
  if (!tpl) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <TemplateDetailClient template={tpl} isLoggedIn={!!user} />;
}
