// app/favicon.ico/route.ts
//
// Route handler dynamique qui sert le favicon adapté au Host de la requête.
// Indispensable parce que :
//   - Sur un domaine custom (Gwenn etc.), on doit servir SON favicon, pas
//     celui de Tiquiz par défaut.
//   - L'approche metadata + <link rel="icon"> ne suffit pas : Firefox a
//     un algorithme d'élection différent de Chrome (priorité aux <link>
//     avec attribut `sizes` explicite), et les caches favicons des
//     navigateurs sont agressifs.
//   - En servant directement à l'URL `/favicon.ico` selon le Host, on
//     contourne toute la mécanique d'élection. Quel que soit le `<link>`
//     que Firefox/Chrome choisit, ils finissent toujours par fetch
//     `/favicon.ico` (fallback automatique) → notre handler retourne le
//     bon fichier.
//
// Sécurité : le handler vérifie que le domaine custom est `verified` avant
// de servir son favicon. Un domaine non-vérifié tombe sur le favicon
// Tiquiz par défaut.
//
// Cf. CLAUDE_PITFALLS.md section O.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnHost, normaliseHost } from "@/lib/customDomains";

export const runtime = "nodejs";
// `force-dynamic` parce que le résultat dépend du Host de la requête.
// Sinon Next.js cacherait la première réponse pour tout le monde.
export const dynamic = "force-dynamic";

// Cache court côté CDN/proxy pour absorber les refresh agressifs des
// navigateurs sans hammer notre DB. 5 min = trade-off raisonnable :
// si l'user change son favicon, max 5 min d'attente pour les visiteurs.
const CACHE_HEADER = "public, max-age=300, s-maxage=300";

// Le favicon Tiquiz par défaut. On lit `favicon-tiquiz.png` (pas
// `favicon.ico` qui était resté le triangle noir Next.js par défaut).
// Les navigateurs acceptent un PNG servi pour /favicon.ico tant que
// le Content-Type est correct.
async function readDefaultFavicon(): Promise<{ buf: Buffer; contentType: string }> {
  const buf = await readFile(join(process.cwd(), "public", "favicon-tiquiz.png"));
  return { buf, contentType: "image/png" };
}

export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const host = normaliseHost(h.get("x-forwarded-host") ?? h.get("host"));

  // Domaine propre Tiquiz / localhost / preview → favicon par défaut.
  if (!host || isOwnHost(host)) {
    const { buf, contentType } = await readDefaultFavicon();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_HEADER,
      },
    });
  }

  // Domaine custom : on cherche un favicon dédié.
  const { data } = await supabaseAdmin
    .from("custom_domains")
    .select("favicon_url")
    .ilike("hostname", host)
    .eq("status", "verified")
    .maybeSingle();

  const faviconUrl = (data as { favicon_url?: string | null } | null)?.favicon_url ?? null;

  if (faviconUrl) {
    try {
      const upstream = await fetch(faviconUrl, {
        // Pas de cache fetch — on a déjà notre cache HTTP via CACHE_HEADER.
        cache: "no-store",
      });
      if (upstream.ok) {
        const buf = await upstream.arrayBuffer();
        const contentType = upstream.headers.get("Content-Type") ?? "image/png";
        return new NextResponse(buf, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": CACHE_HEADER,
          },
        });
      }
    } catch {
      // Réseau down côté Supabase storage → fallback favicon Tiquiz.
    }
  }

  // Pas de favicon custom configuré, ou fetch échoué → défaut.
  const { buf, contentType } = await readDefaultFavicon();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": CACHE_HEADER,
    },
  });
}
