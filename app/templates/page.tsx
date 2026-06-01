// app/templates/page.tsx
//
// Galerie publique des templates de quiz par métier (phase 5
// ROADMAP_RETENTION.md). Page SEO-indexable : un visiteur qui cherche
// "quiz lead magnet coach" tombe ici, prévisualise un vrai modèle, et
// crée son compte pour l'utiliser. Acquisition gratuite.
//
// Public (pas derrière le dashboard). On détecte juste si l'user est
// connecté pour adapter le CTA.

import type { Metadata } from "next";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { listTemplates } from "@/lib/templates/catalog";
import TemplatesGallery from "./TemplatesGallery";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Modèles de quiz prêts à l'emploi par métier — Tiquiz";
  const description =
    "Des quiz lead magnet déjà rédigés pour les coachs, profs de yoga, naturopathes, formateurs, photographes et plus. Choisis ton modèle, personnalise-le, capture tes leads en 5 minutes.";
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website" },
  };
}

export default async function TemplatesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <TemplatesGallery templates={listTemplates()} isLoggedIn={!!user} />
  );
}
