// app/img/[...path]/route.ts
//
// LES IMAGES DES QUIZ, SERVIES PAR NOTRE SERVEUR.
//
// Cf. `lib/assetProxy.ts` pour le pourquoi (alerte de dépassement
// Supabase du 6 août 2026 : chaque visiteur téléchargeait les images
// directement chez Supabase).
//
// -- CE QUI FAIT TOUT LE TRAVAIL --------------------------------------
//
// L'en-tête `Cache-Control: public, max-age=31536000, immutable`. Il
// autorise Cloudflare, et le navigateur du visiteur, à garder le fichier
// sans jamais revenir nous le demander. Supabase envoie donc chaque
// image une fois par point de présence, au lieu d'une fois par visiteur.
//
// `immutable` est vrai ici parce que le chemin d'un upload contient un
// nom de fichier unique : remplacer une image écrit un nouveau chemin, et
// la base pointe alors ailleurs. Une image REMPLACÉE sous le même nom
// (`upsert: true`) resterait en cache : c'est le compromis assumé, et
// c'est pour ça que le nom porte un horodatage côté upload.

import { NextRequest, NextResponse } from "next/server";

import { PROXIED_BUCKETS, assetProxyEnabled } from "@/lib/assetProxy";

export const runtime = "nodejs";
// Un an. Le cache de Next.js s'ajoute a celui de Cloudflare : sur un
// serveur unique, c'est lui qui absorbe le gros du trafic.
export const revalidate = 31536000;

const YEAR = 31536000;

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
    upstream = await fetch(target, {
      // Le cache de Next.js : c'est lui qui evite d'aller rechercher le
      // fichier chez Supabase a chaque visiteur.
      next: { revalidate: YEAR },
    });
  } catch (err) {
    console.error("[img] amont injoignable", err);
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    // 404 chez Supabase = 404 ici : on ne fabrique pas une image vide,
    // qui masquerait un fichier supprime.
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Cache-Control": `public, max-age=${YEAR}, immutable`,
    // Cloudflare lit celui-ci en priorite quand il est present.
    "CDN-Cache-Control": `public, max-age=${YEAR}`,
    "X-Content-Type-Options": "nosniff",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(upstream.body, { status: 200, headers });
}
