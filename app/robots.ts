// app/robots.ts — host-aware.
//
// Sur tiquiz.com : robots avec disallow des paths privés (dashboard,
// settings, admin, etc.) + sitemap pointant vers tiquiz.com/sitemap.xml.
//
// Sur custom domain user (quiz.adelinecirade.com…) : robots minimal —
// le middleware bloque déjà tous les paths non-publics avec 404, donc
// pas besoin de disallow. Le sitemap pointe vers le sitemap user-scoped
// servi par le même host.

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const customHost = h.get(CUSTOM_HOST_HEADER);

  if (customHost) {
    const base = `https://${customHost.toLowerCase().trim()}`;
    return {
      rules: [{ userAgent: "*", allow: "/" }],
      sitemap: `${base}/sitemap.xml`,
      host: base,
    };
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://tiquiz.com").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/quiz/", "/quizzes", "/leads", "/stats", "/settings", "/admin", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
