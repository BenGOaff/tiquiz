import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/i18n/config";

const PUBLIC_ROUTES = ["", "/login", "/signup", "/legal/terms", "/legal/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://tiquiz.com").replace(/\/$/, "");

  return PUBLIC_ROUTES.map((route) => {
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
}
