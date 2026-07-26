// lib/assetVersion.ts
//
// Cache-busting des assets statiques servis par chemin fixe depuis /public
// (logo + favicon de L'Atelier du Quiz). Quand Béné remplace le fichier
// (même nom) et redéploie, les navigateurs + le CDN gardent l'ancienne
// version en cache tant que l'URL ne change pas. En suffixant `?v=...`,
// on force le rechargement.
//
// POUR METTRE À JOUR UN VISUEL :
//   1. Remplace le fichier dans /public (même nom).
//   2. Incrémente ASSET_VERSION ci-dessous (ex: "2026-07-17" -> "2026-07-18").
//   3. Redéploie. En standalone (output: "standalone"), vérifie bien que
//      ton process de deploy RECOPIE le dossier /public dans le build
//      standalone (Next ne le fait PAS tout seul), sinon le nouveau fichier
//      n'arrive jamais sur le serveur.

export const ASSET_VERSION = "2026-07-19-newlogo";

export const LOGO_SRC = `/quizing.png?v=${ASSET_VERSION}`;
export const FAVICON_SRC = `/favicon.ico?v=${ASSET_VERSION}`;

/** Suffixe un chemin d'asset public avec la version courante. */
export function versioned(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${ASSET_VERSION}`;
}
