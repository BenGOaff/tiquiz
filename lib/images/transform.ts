// lib/images/transform.ts
//
// L'ALLÈGEMENT DES IMAGES DÉJÀ EN LIGNE, au moment où on les sert.
//
// La compression à l'envoi (`lib/images/compress.ts`) règle l'avenir.
// Elle ne peut rien pour les images déjà téléversées, et c'est là que
// vivent les quiz sur lesquels tournent des publicités aujourd'hui.
// Comme ces images passent désormais par notre serveur (cf.
// `lib/assetProxy.ts`), on les allège au passage.
//
// Les bornes viennent de `lib/images/budgets.ts`, les MÊMES que pour
// l'envoi : une image compressée hier et une image d'avant-hier sortent
// donc identiques.
//
// -- LE FICHIER D'ORIGINE N'EST JAMAIS TOUCHÉ -------------------------
//
// On ne réécrit rien chez Supabase, on ne modifie aucune adresse en
// base. La transformation vit uniquement dans le cache disque de notre
// serveur. Éteindre `ASSET_PROXY` remet tout comme avant, à la seconde,
// sans rien à défaire.
//
// -- ET LE CACHE DISQUE RÈGLE L'AUTRE MOITIÉ DU PROBLÈME --------------
//
// Une fois le fichier en cache, Supabase n'est PLUS SOLLICITÉ DU TOUT
// pour cette image. Pas une fois par heure : plus du tout. C'est ce qui
// fait tomber le "cached egress" à presque rien, et ça vaut aussi pour
// les images qu'on décide de ne pas transformer.
//
// -- FAIL-OPEN, COMME PARTOUT -----------------------------------------
//
// sharp absent, image illisible, format inattendu, disque plein : on
// rend l'original tel quel. Une image lourde vaut toujours mieux qu'une
// image manquante, surtout sur un quiz qui reçoit du trafic payant.

import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  MAX_EDGE,
  WEBP_QUALITY,
  type ImageKind,
  keepEncoded,
  passThrough,
  targetSize,
} from "./budgets";

/** Au dessus, on ne met pas en cache : c'est un fichier qui n'a rien à faire là. */
const MAX_CACHEABLE_BYTES = 12 * 1024 * 1024;

/**
 * Où les fichiers servis sont gardés.
 *
 * Sous `tmpdir` par défaut, donc hors de `.next` : un `npm run build`
 * ne le vide pas, et un cache vidé se re-remplit tout seul au premier
 * visiteur. `IMG_CACHE_DIR` permet de le déplacer sans toucher au code.
 */
function cacheDir(): string {
  const custom = String(process.env.IMG_CACHE_DIR ?? "").trim();
  return custom || join(tmpdir(), "tiquiz-img-cache");
}

/** Un nom de fichier stable pour (chemin + variante). Deux niveaux pour ne pas faire un dossier de 100 000 entrées. */
function cacheKey(path: string, variant: string): { dir: string; file: string } {
  const h = createHash("sha1").update(`${variant}:${path}`).digest("hex");
  return { dir: join(cacheDir(), h.slice(0, 2)), file: `${h.slice(2)}.bin` };
}

export interface ServedImage {
  body: Buffer;
  contentType: string;
  /** D'où ça vient, pour les en-têtes de diagnostic. */
  source: "cache" | "origin";
}

/** Lit le cache. `null` quand il n'y a rien, ou que la lecture échoue. */
export async function readCached(
  path: string,
  variant: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const { dir, file } = cacheKey(path, variant);
    const [body, meta] = await Promise.all([
      readFile(join(dir, file)),
      readFile(join(dir, `${file}.type`), "utf8"),
    ]);
    if (!body.length) return null;
    return { body, contentType: meta.trim() || "application/octet-stream" };
  } catch {
    return null;
  }
}

/**
 * Écrit dans le cache, sans jamais faire échouer la requête en cours.
 *
 * Passage par un fichier temporaire puis `rename` : sur un serveur qui
 * sert plusieurs visiteurs à la fois, deux écritures simultanées du
 * même fichier produiraient sinon une image tronquée, servie telle
 * quelle pendant des heures. Le `rename` est atomique.
 */
export async function writeCached(
  path: string,
  variant: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (body.length > MAX_CACHEABLE_BYTES) return;
  try {
    const { dir, file } = cacheKey(path, variant);
    await mkdir(dir, { recursive: true });
    const tmp = join(dir, `${file}.${process.pid}.${body.length}.tmp`);
    await writeFile(tmp, body);
    await rename(tmp, join(dir, file));
    await writeFile(join(dir, `${file}.type`), contentType);
  } catch (err) {
    console.error("[img] cache non écrit", err);
  }
}

/**
 * La variante demandée par ce visiteur.
 *
 * Un navigateur qui n'annonce pas WebP (très rare aujourd'hui, mais un
 * robot d'aperçu de réseau social peut être dans ce cas) reçoit
 * l'original. On ne lui sert JAMAIS un format qu'il ne sait pas lire :
 * une vignette cassée dans un partage Facebook coûterait plus cher que
 * les octets économisés.
 */
export function variantFor(accept: string | null): "webp" | "raw" {
  return String(accept ?? "").includes("image/webp") ? "webp" : "raw";
}

/**
 * Allège une image. `null` = il n'y a rien à faire, servez l'original.
 *
 * Ne lève jamais.
 */
export async function shrinkImage(
  input: Buffer,
  contentType: string,
  kind: ImageKind,
): Promise<{ body: Buffer; contentType: string } | null> {
  if (passThrough(contentType)) return null;
  try {
    // Import dynamique : si sharp venait à manquer (installation
    // partielle, plateforme sans binaire), la route continue de servir
    // les images d'origine au lieu de tomber en panne.
    const sharp = (await import("sharp")).default;

    const image = sharp(input, { failOn: "none" });
    const meta = await image.metadata();
    // Une image animée (WebP ou PNG animé) perdrait son animation.
    if ((meta.pages ?? 1) > 1) return null;

    const size = targetSize(meta.width ?? 0, meta.height ?? 0, MAX_EDGE[kind]);
    let pipeline = image;
    if (size) {
      pipeline = pipeline.resize(size.width, size.height, {
        fit: "inside",
        withoutEnlargement: true,
        // Lanczos3, le rééchantillonnage par défaut de sharp : c'est
        // celui qui garde les détails fins sans halo.
        kernel: "lanczos3",
      });
    }

    const body = await pipeline
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    if (!keepEncoded(input.length, body.length)) return null;
    return { body, contentType: "image/webp" };
  } catch (err) {
    console.error("[img] transformation impossible, original servi", err);
    return null;
  }
}
