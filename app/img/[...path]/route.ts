// app/img/[...path]/route.ts
//
// LES IMAGES DES QUIZ, SERVIES PAR NOTRE SERVEUR.
//
// Cf. `lib/assetProxy.ts` pour le pourquoi (alerte de dépassement
// Supabase du 6 août 2026 : chaque visiteur téléchargeait les images
// directement chez Supabase).
//
// -- CE QUE CETTE ROUTE FAIT, DANS L'ORDRE ----------------------------
//
// 1. cache disque : si on a déjà servi ce fichier, on le rend, et
//    Supabase n'est pas sollicité DU TOUT ;
// 2. sinon on télécharge l'original chez Supabase, UNE fois ;
// 3. on l'allège (`lib/images/transform.ts`, bornes partagées avec la
//    compression à l'envoi) ;
// 4. on garde le résultat pour les suivants.
//
// C'est le point 1 qui fait tomber la facture, et le point 3 qui fait
// tomber le temps de chargement chez le visiteur. Mesure du 6 août sur
// le quiz `clients-perdus` : 19 images, 30 Mo, dont une seule image de
// réponse à 1,8 Mo en 1536 x 1024 affichée dans une carte de 300 points.
//
// -- LA FRAÎCHEUR EST EXACTEMENT CELLE D'AUJOURD'HUI ------------------
//
// Béné, 6 août 2026 : "est-ce qu'on est sûrs et certains que les users ne
// verront pas la différence ? J'ai des pubs qui tournent dessus, il ne
// faut absolument rien casser."
//
// Ma première version posait `max-age=31536000, immutable`. C'était FAUX
// à l'époque : le logo se téléversait sur un chemin STABLE, donc une
// créatrice qui le changeait écrivait au même endroit, et `immutable`
// aurait gelé l'ancien pendant un an. Le logo est depuis horodaté comme
// tous les autres envois, mais on garde `max-age=3600` : c'est la durée
// que Supabase applique déjà, donc la fraîcheur vue par le visiteur est
// identique à aujourd'hui, à la seconde près.
//
// Le `stale-while-revalidate` fait le travail d'économie sans toucher à
// la fraîcheur : le cache peut servir sa copie pendant qu'il en récupère
// une neuve en arrière-plan.

import { NextRequest, NextResponse } from "next/server";

import { PROXIED_BUCKETS, assetProxyEnabled } from "@/lib/assetProxy";
import { kindForPath } from "@/lib/images/budgets";
import { readCached, shrinkImage, variantFor, writeCached } from "@/lib/images/transform";

export const runtime = "nodejs";

/** La durée que Supabase applique déjà. On ne change pas la fraîcheur. */
const MAX_AGE = 3600;
/** Combien de temps un cache peut servir sa copie en la rafraîchissant. */
const SWR = 86400;

function headersFor(contentType: string, source: string): Headers {
  // AUCUN `Content-Length` RECOPIÉ DE L'AMONT, et c'est délibéré.
  // `fetch` décompresse tout seul une réponse `content-encoding: gzip`
  // (Supabase le fait sur les SVG) : la longueur annoncée par l'amont
  // ne correspondrait alors plus au corps qu'on renvoie, et le
  // navigateur couperait l'image au milieu.
  return new Headers({
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${MAX_AGE}, stale-while-revalidate=${SWR}`,
    "CDN-Cache-Control": `public, max-age=${MAX_AGE}, stale-while-revalidate=${SWR}`,
    "X-Content-Type-Options": "nosniff",
    // Le format servi dépend de l'en-tête Accept du visiteur : sans ce
    // Vary, un cache partagé servirait du WebP à un client qui ne sait
    // pas le lire.
    Vary: "Accept",
    "X-Img-Source": source,
  });
}

export async function GET(
  req: NextRequest,
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

  const storagePath = segments.join("/");
  // Le dossier DANS le bucket décide de la borne : `public-assets` est
  // le bucket, `quiz-options` / `og` / `logos` est le contexte.
  const kind = kindForPath(segments.slice(1).join("/"));
  const variant = variantFor(req.headers.get("accept"));

  const cached = await readCached(storagePath, variant);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.body), {
      status: 200,
      headers: headersFor(cached.contentType, "cache"),
    });
  }

  const target = `${base}/storage/v1/object/public/${segments.map(encodeURIComponent).join("/")}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, { cache: "no-store" });
  } catch (err) {
    console.error("[img] amont injoignable", err);
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream.ok) {
    // 404 chez Supabase = 404 ici : on ne fabrique pas une image vide,
    // qui masquerait un fichier supprimé.
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const originalType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const original = Buffer.from(await upstream.arrayBuffer());

  const shrunk =
    variant === "webp" ? await shrinkImage(original, originalType, kind) : null;
  const body = shrunk?.body ?? original;
  const contentType = shrunk?.contentType ?? originalType;

  // Après la réponse, pas avant : le visiteur n'attend jamais que le
  // disque ait fini d'écrire.
  void writeCached(storagePath, variant, body, contentType);

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: headersFor(contentType, "origin"),
  });
}
