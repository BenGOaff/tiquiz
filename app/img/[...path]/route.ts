// app/img/[...path]/route.ts
//
// LES IMAGES DES QUIZ, SERVIES PAR NOTRE SERVEUR.
//
// Cf. `lib/assetProxy.ts` pour le pourquoi (alerte de dépassement
// Supabase du 6 août 2026 : chaque visiteur téléchargeait les images
// directement chez Supabase).
//
// -- LA FRAÎCHEUR EST EXACTEMENT CELLE D'AUJOURD'HUI ------------------
//
// Béné, 6 août 2026 : "est-ce qu'on est sûrs et certains que les users ne
// verront pas la différence ? J'ai des pubs qui tournent dessus, il ne
// faut absolument rien casser."
//
// Ma première version posait `max-age=31536000, immutable`. C'était FAUX,
// et ça aurait produit un bug visible : le logo se téléverse sur un
// chemin STABLE (`logos/<user>/logo.png`, en `upsert`), donc une
// créatrice qui change son logo écrit au même endroit. Avec `immutable`,
// les visiteurs et Cloudflare auraient gardé l'ancien pendant un an.
// "J'ai changé mon logo et il ne change pas" serait remonté dans la
// semaine.
//
// Supabase sert ces objets avec `max-age=3600` (son défaut, aucun
// `cacheControl` n'est posé à l'upload). On reprend donc la MÊME durée :
// la fraîcheur vue par le visiteur est identique à aujourd'hui, à la
// seconde près.
//
// Le `stale-while-revalidate` fait le travail d'économie sans toucher à
// la fraîcheur : le cache peut servir sa copie pendant qu'il en récupère
// une neuve en arrière-plan. Supabase reçoit donc environ une requête par
// heure et par fichier, au lieu d'une par visiteur. Sur un quiz à 1000
// visites par jour, c'est 24 téléchargements au lieu de 1000.

import { NextRequest, NextResponse } from "next/server";

import { PROXIED_BUCKETS, assetProxyEnabled } from "@/lib/assetProxy";

export const runtime = "nodejs";

/** La durée que Supabase applique déjà. On ne change pas la fraîcheur. */
const MAX_AGE = 3600;
/** Combien de temps un cache peut servir sa copie en la rafraîchissant. */
const SWR = 86400;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!assetProxyEnabled(process.env.ASSET_PROXY)) {
    // Coupe-circuit : on ne sert plus rien ici, et les adresses d'origine
    // (intactes en base) reprennent la main au prochain rendu.
    return new NextResponse(null, { status: 404 });
  }

  const { path } = await ctx.params;
  const segments = (path ?? []).filter((s) => s && s !== "." && s !== "..");
  if (segments.length < 2 || !PROXIED_BUCKETS.includes(segments[0])) {
    return new NextResponse(null, { status: 404 });
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return new NextResponse(null, { status: 404 });

  const target = `${base}/storage/v1/object/public/${segments.map(encodeURIComponent).join("/")}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, { next: { revalidate: MAX_AGE } });
  } catch (err) {
    console.error("[img] amont injoignable", err);
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    // 404 chez Supabase = 404 ici : on ne fabrique pas une image vide,
    // qui masquerait un fichier supprimé.
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  // AUCUN `Content-Length` RECOPIÉ, et c'est délibéré. `fetch` décompresse
  // tout seul une réponse `content-encoding: gzip` (Supabase le fait sur
  // les SVG) : la longueur annoncée par l'amont ne correspondrait alors
  // plus au corps qu'on renvoie, et le navigateur couperait l'image au
  // milieu. Sans cet en-tête, la réponse part en morceaux, ce qui marche
  // dans tous les cas.
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Cache-Control": `public, max-age=${MAX_AGE}, stale-while-revalidate=${SWR}`,
    "CDN-Cache-Control": `public, max-age=${MAX_AGE}, stale-while-revalidate=${SWR}`,
    "X-Content-Type-Options": "nosniff",
  });

  return new NextResponse(upstream.body, { status: 200, headers });
}
