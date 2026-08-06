// lib/assetProxy.ts
//
// LES IMAGES PASSENT PAR NOTRE DOMAINE, PLUS PAR CELUI DE SUPABASE.
//
// -- POURQUOI (Béné, 6 août 2026) -------------------------------------
//
// Supabase a envoyé une alerte de dépassement sur le plan gratuit :
// 6,68 Go de "cached egress" consommés sur les 5 Go inclus, dont un pic
// de 1,7 Go en une seule journée le 21 juillet.
//
// La cause est dans le code, et elle est structurelle. Les images sont
// stockées dans le bucket `public-assets`, et `getPublicUrl()` écrit une
// adresse `https://<projet>.supabase.co/...` DIRECTEMENT en base. Le
// viewer public les affiche avec de simples `<img>` (aucun `next/image`,
// aucun `remotePatterns`). Donc CHAQUE visiteur de CHAQUE quiz télécharge
// les images depuis Supabase : notre serveur ne les voit jamais, et rien
// ne les met en cache entre les deux.
//
// Autrement dit, la facture grandit avec le trafic des créatrices, ce qui
// est exactement l'inverse de ce qu'on veut : leur succès ne doit pas
// devenir notre dette.
//
// -- CE QU'ON FAIT --------------------------------------------------
//
// On sert les mêmes fichiers depuis NOTRE domaine (`/img/<chemin>`).
// Supabase envoie alors chaque fichier UNE fois vers notre serveur, qui
// le renvoie ensuite autant de fois qu'il y a de visiteurs, avec un cache
// d'un an. Devant, Cloudflare fait le même travail à l'échelle de ses
// points de présence.
//
// -- CE QU'ON NE FAIT PAS -------------------------------------------
//
// On ne touche PAS aux adresses déjà écrites en base. La réécriture se
// fait à la LECTURE, sur le contenu renvoyé au visiteur : les quiz déjà
// publiés en profitent immédiatement, sans migration, et couper le
// dispositif ne casse rien puisque les adresses d'origine sont intactes.
//
// -- LE COUPE-CIRCUIT -----------------------------------------------
//
// `ASSET_PROXY=off` dans le `.env` désactive tout, sans redéploiement :
// un `pm2 restart` suffit. Ce n'est pas de la prudence excessive, c'est
// la seule façon de rétablir en deux minutes si un cas non prévu casse
// l'affichage d'un quiz en ligne un samedi.

/** Le chemin public d'un objet Supabase Storage. */
const PUBLIC_OBJECT = "/storage/v1/object/public/";

/**
 * Les seuls buckets qu'on accepte de servir.
 *
 * Liste FERMÉE, et c'est volontaire : un proxy qui accepte n'importe quel
 * chemin devient un relais ouvert vers tout ce que le projet héberge.
 * `public-assets` est déjà public par construction, donc le proxy ne
 * révèle rien qui ne l'était pas.
 */
export const PROXIED_BUCKETS = ["public-assets"];

/** Le dispositif est-il actif ? Coupé par `ASSET_PROXY=off`. */
export function assetProxyEnabled(env: string | undefined | null): boolean {
  return String(env ?? "").trim().toLowerCase() !== "off";
}

/**
 * Le chemin `<bucket>/<fichier>` d'une adresse Supabase Storage publique.
 *
 * `null` dès que ce n'est pas une de nos images : une adresse externe
 * (Unsplash, le site de la créatrice), un objet privé, un bucket qu'on ne
 * sert pas. On ne réécrit que ce qu'on est sûr de savoir servir.
 */
export function storageAssetPath(url: string, supabaseUrl: string): string | null {
  const raw = String(url ?? "").trim();
  const base = String(supabaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw || !base) return null;

  const prefix = `${base}${PUBLIC_OBJECT}`;
  if (!raw.startsWith(prefix)) return null;

  const path = raw.slice(prefix.length);
  // Pas de remontée de dossier, pas de chemin vide, pas de query : ce
  // qui suit part dans une URL vers Supabase, donc rien d'inattendu.
  if (!path || path.includes("..") || path.startsWith("/")) return null;

  const bucket = path.split("/")[0];
  if (!PROXIED_BUCKETS.includes(bucket)) return null;
  return path;
}

/**
 * L'adresse à servir au visiteur.
 *
 * Renvoie l'adresse d'origine telle quelle quand elle ne nous concerne
 * pas : appelée sur n'importe quoi, cette fonction ne casse rien.
 */
export function toProxiedAssetUrl(
  url: string,
  supabaseUrl: string,
  enabled = true,
): string {
  if (!enabled) return url;
  const path = storageAssetPath(url, supabaseUrl);
  return path ? `/img/${path}` : url;
}

/**
 * La MÊME réécriture, partout dans une réponse, en une seule passe.
 *
 * Une liste blanche de champs (`bonus_image_url`, `brand_logo_url`,
 * `split_image_url`...) oublierait la prochaine colonne d'image ajoutée,
 * et l'oubli ne se verrait que sur la facture du mois suivant. On marche
 * donc TOUTE la structure et on réécrit ce qui EST une adresse de notre
 * Storage, quel que soit le nom du champ. C'est la même mécanique que
 * `applyFrenchTypographyDeep` : la forme de la valeur décide, pas son nom.
 */
export function proxyAssetsDeep<T>(payload: T, supabaseUrl: string, enabled = true): T {
  if (!enabled) return payload;
  return walk(payload, supabaseUrl) as T;
}

function walk(value: unknown, base: string): unknown {
  if (typeof value === "string") return toProxiedAssetUrl(value, base);
  if (Array.isArray(value)) return value.map((v) => walk(v, base));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, base);
    }
    return out;
  }
  return value;
}
