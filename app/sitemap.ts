// app/sitemap.ts
//
// Sitemap dynamique HOST-AWARE.
//
// Deux cas, dispatch sur l'en-tête `x-tiquiz-custom-host` que le
// middleware pose quand la requête vient d'un domaine personnalisé
// d'un user :
//
//   1. tiquiz.com (host principal) → sitemap global : pages statiques
//      + tous les quiz publiés sur la plateforme (cap 10000).
//
//   2. quiz.adelinecirade.com (custom domain user) → sitemap ne listant
//      QUE les quiz de CE user, avec des URLs en bare-slug
//      (https://quiz.adelinecirade.com/<slug>) — c'est l'URL que voit
//      le visiteur sur ce host, donc l'URL qu'on veut indexer Google.
//      Chaque user peut ainsi soumettre son propre sitemap dans sa
//      Google Search Console et indexer ses créations.
//
// `revalidate = 3600` → régen 1h. Sans ça les nouveaux quiz publiés
// attendent le prochain deploy pour être indexables.

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";
const PUBLIC_ROUTES = [
  "",
  "/login",
  "/signup",
  "/privacy",
  "/legal",
  "/terms",
  "/terms-of-use",
  "/cookies",
  "/affiliate",
];

export const revalidate = 3600; // 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const customHost = h.get(CUSTOM_HOST_HEADER);

  // ─── Cas custom domain : sitemap user-scoped ─────────────────────
  if (customHost) {
    return buildCustomDomainSitemap(customHost.toLowerCase().trim());
  }

  // ─── Cas host principal (tiquiz.com) : sitemap global ────────────
  return buildMainHostSitemap();
}

async function buildCustomDomainSitemap(host: string): Promise<MetadataRoute.Sitemap> {
  // Lookup user owner of the custom domain
  const { data: cd } = await supabaseAdmin
    .from("custom_domains")
    .select("user_id")
    .ilike("hostname", host)
    .eq("status", "verified")
    .maybeSingle();
  const userId = (cd as { user_id?: string } | null)?.user_id;
  if (!userId) return [];

  const base = `https://${host}`;
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
  ];

  // Quizzes — exclus si seo_noindex=true (toggle "masquer aux moteurs"
  // côté éditeur).
  try {
    const { data } = await supabaseAdmin
      .from("quizzes")
      .select("id, slug, updated_at, seo_noindex")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("seo_noindex", false)
      .order("updated_at", { ascending: false })
      .limit(10000);
    for (const q of (data ?? []) as Array<{ id: string; slug: string | null; updated_at: string }>) {
      entries.push({
        url: q.slug ? `${base}/${q.slug}` : `${base}/q/${q.id}`,
        lastModified: new Date(q.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
    }
  } catch (err) {
    console.warn("[sitemap/custom-domain] quizzes fetch error", err);
  }

  // Popquizzes — exclus si seo_noindex=true.
  try {
    const { data } = await supabaseAdmin
      .from("popquizzes")
      .select("id, slug, updated_at, seo_noindex")
      .eq("user_id", userId)
      .eq("is_published", true)
      .eq("seo_noindex", false)
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const p of (data ?? []) as Array<{ id: string; slug: string | null; updated_at: string }>) {
      entries.push({
        url: p.slug ? `${base}/${p.slug}` : `${base}/p/${p.id}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("[sitemap/custom-domain] popquizzes fetch error", err);
  }

  return entries;
}

async function buildMainHostSitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://tiquiz.com").replace(/\/$/, "");

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => {
    const url = `${base}${route || "/"}`;
    const languages: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
      languages[locale] = url;
    }
    languages["x-default"] = url;
    return {
      url,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.6,
      alternates: { languages },
    };
  });

  const entries: MetadataRoute.Sitemap = [...staticEntries];

  try {
    const { data } = await supabaseAdmin
      .from("quizzes")
      .select("id, slug, updated_at, seo_noindex")
      .eq("status", "active")
      .eq("seo_noindex", false)
      .order("updated_at", { ascending: false })
      .limit(10000);
    for (const q of (data ?? []) as Array<{ id: string; slug: string | null; updated_at: string }>) {
      entries.push({
        url: `${base}/q/${q.slug || q.id}`,
        lastModified: new Date(q.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
    }
  } catch (err) {
    console.warn("[sitemap/main] quizzes fetch error", err);
  }

  try {
    const { data } = await supabaseAdmin
      .from("popquizzes")
      .select("id, slug, updated_at, seo_noindex")
      .eq("is_published", true)
      .eq("seo_noindex", false)
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const p of (data ?? []) as Array<{ id: string; slug: string | null; updated_at: string }>) {
      entries.push({
        url: `${base}/p/${p.slug || p.id}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("[sitemap/main] popquizzes fetch error", err);
  }

  return entries;
}
