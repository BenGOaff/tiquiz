// app/robots.ts — host-aware.
//
// Sur l'app : robots avec disallow des paths privés (dashboard,
// settings, admin, etc.) + sitemap pointant vers le même hôte.
//
// Sur un domaine de VENTE (tiquiz.fr) : tout est ouvert, et le sitemap
// comme le `host` désignent ce domaine. C'est le cas qui manquait, et
// c'est par lui qu'un domaine qui ne nous appartient pas était annoncé
// à Google (cf. lib/publicHost.ts).
//
// Sur custom domain user (quiz.adelinecirade.com…) : robots minimal —
// le middleware bloque déjà tous les paths non-publics avec 404, donc
// pas besoin de disallow. Le sitemap pointe vers le sitemap user-scoped
// servi par le même host.

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolvePublicUrl } from "@/lib/authLinks";
import { hoteCanonique } from "@/lib/publicHost";
import { SALES_HOSTS } from "@/lib/sales/salesHosts";

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

  const host = (h.get("host") ?? "").toLowerCase().trim().replace(/:\d+$/, "");
  const estVente = Object.prototype.hasOwnProperty.call(SALES_HOSTS, host);
  const base = resolvePublicUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    hoteCanonique({ host }),
  );

  // Sur un domaine de vente il n'y a QUE la page de vente et le bon de
  // commande : les chemins de l'app n'y sont pas servis (le portier
  // répond 404). Y recopier la liste de disallow ferait croire à Google
  // qu'ils existent.
  if (estVente) {
    return {
      rules: [{ userAgent: "*", allow: "/" }],
      sitemap: `${base}/sitemap.xml`,
      host: base,
    };
  }

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
