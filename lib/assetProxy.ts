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
// Supabase envoie alors chaque fichier une fois PAR HEURE vers notre
// serveur, au lieu d'une fois par visiteur, et Cloudflare fait le même
// travail à l'échelle de ses points de présence.
//
// La fraîcheur vue par le visiteur ne change PAS : Supabase sert déjà ces
// objets avec `max-age=3600`, et la route reprend exactement cette durée
// (cf. l'en-tête de app/img/[...path]/route.ts, où la première version
// posait un an et aurait figé les logos remplacés).
//
// -- CE QU'ON NE FAIT PAS -------------------------------------------
//
// On ne touche PAS aux adresses déjà écrites en base. La réécriture se
// fait à la LECTURE, sur le contenu renvoyé au visiteur : les quiz déjà
// publiés en profitent immédiatement, sans migration, et couper le
// dispositif ne casse rien puisque les adresses d'origine sont intactes.
//
// -- IL NE S'ALLUME QUE QUAND ELLE LE DÉCIDE -------------------------
//
// Béné, 6 août 2026 : "est-ce qu'on est sûrs et certains que les users ne
// verront pas la différence ? J'ai des pubs qui tournent dessus, il ne
// faut absolument rien casser, jamais, pour les quiz existants."
//
// La seule façon honnête de répondre "certains" est de rendre le
// DÉPLOIEMENT sans effet : `ASSET_PROXY` absent = rien ne change, les
// adresses partent chez Supabase comme avant, le code dort. Elle allume
// avec `ASSET_PROXY=on` dans le `.env` plus un `pm2 restart`, vérifie un
// quiz, et éteint de la même façon en dix secondes si quoi que ce soit
// cloche. Aucun redéploiement, aucun retour en arrière de code.
//
// Un défaut allumé aurait été plus efficace et moins sûr. Avec des
// publicités en cours, ce n'est pas le bon arbitrage.

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

/**
 * Le dispositif est-il actif ?
 *
 * ÉTEINT PAR DÉFAUT. Il faut `ASSET_PROXY=on` (ou `1`, ou `true`) pour
 * l'allumer : tout le reste, y compris la variable absente, laisse les
 * images partir chez Supabase exactement comme avant.
 */
export function assetProxyEnabled(env: string | undefined | null): boolean {
  const v = String(env ?? "").trim().toLowerCase();
  return v === "on" || v === "1" || v === "true";
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
  if (!path || path.includes("..") || path.startsWith("/")) return null;

  // UNE ADRESSE AVEC UNE QUERY N'EST PAS REÉCRITE. Elle ne devrait pas
  // exister aujourd'hui (`getPublicUrl` n'en produit pas, et les
  // transformations d'image sont indisponibles sur le plan gratuit),
  // mais si une créatrice colle un jour une adresse `...jpg?width=800`,
  // la reécrire perdrait le paramètre en silence. On la laisse partir
  // chez Supabase telle quelle : moins d'économie, zéro risque.
  if (path.includes("?") || path.includes("#")) return null;

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
