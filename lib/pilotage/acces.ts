// lib/pilotage/acces.ts
//
// QUI A LE DROIT D'OUVRIR LE CENTRE DE PILOTAGE (Béné, 29 août 2026).
//
// "Personne d'autre que moi ne doit jamais accéder à cette page. Je
// voudrais pas qu'un petit malin trouve une porte dérobée."
//
// -- CE QUI NE MARCHAIT PAS, ET C'EST LE MÊME PIÈGE QUE L'ESPACE
//    AFFILIÉ DE TIPOTE -----------------------------------------------
//
// 1. `/pilotage` n'était pas dans `PROTECTED_PREFIXES`. Le bloc
//    d'authentification du middleware ne s'exécutait donc JAMAIS pour
//    lui, et la ligne `pathname.startsWith("/pilotage")` écrite à
//    l'intérieur était du code mort. La page restait fermée par la
//    garde du layout, mais la "double garde" annoncée n'existait pas.
//
// 2. Sur `pilotage.tipote.com`, un test sur le PATHNAME ne peut de
//    toute façon pas marcher. La doc de cette version de Next est
//    formelle sur l'ordre : le middleware s'exécute à l'étape 3, les
//    rewrites `beforeFiles` de `next.config.ts` à l'étape 4. Le
//    middleware voit donc `/clients`, jamais `/pilotage/clients`.
//    C'est exactement le drame de Gwenn du 8 juin côté Tipote :
//    **pour gater un sous-domaine, on détecte le HOST, pas le
//    pathname.**
//
// PUR : ni requête ni base, donc testable. Un gate enfermé dans le
// middleware est un gate que personne ne peut vérifier.

/** Le sous-domaine du centre de pilotage. Écrit UNE fois. */
export const HOTE_PILOTAGE = "pilotage.tipote.com";

/** Le host de la requête, ramené à un nom comparable. */
export function normaliserHote(host: string | null | undefined): string {
  return String(host ?? "")
    .trim()
    .toLowerCase()
    .split(",")[0] // un proxy mal configuré peut en empiler plusieurs
    .trim()
    .replace(/:\d+$/, ""); // le port ne fait pas partie de l'identité
}

/** Sommes nous sur le sous-domaine dédié ? */
export function estHotePilotage(host: string | null | undefined): boolean {
  return normaliserHote(host) === HOTE_PILOTAGE;
}

/**
 * CE QUI DOIT RESTER OUVERT SUR LE SOUS-DOMAINE.
 *
 * Sans ces exceptions, la redirection vers `/login` mènerait à une page
 * qui redirige vers `/login`, donc à une boucle : impossible de se
 * connecter sur ce domaine. `/api` est exclu parce que chaque route y
 * porte DÉJÀ sa propre garde `isAdminEmail` (vérifié route par route),
 * et parce que la connexion elle même passe par `/api/auth`.
 */
const OUVERTS_SUR_LE_SOUS_DOMAINE = [
  "/login",
  "/auth",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

/**
 * Cette requête exige-t-elle un compte ADMIN ?
 *
 * Les deux moitiés comptent :
 * - par le chemin, pour `quiz.tipote.com/pilotage` et `/admin` ;
 * - par le HOST, pour `pilotage.tipote.com`, où le middleware voit le
 *   chemin AVANT le rewrite et ne verra donc jamais `/pilotage`.
 *
 * En oublier une laisse une porte ouverte, et c'est précisément la
 * question posée.
 */
export function exigeAdmin(host: string | null | undefined, pathname: string): boolean {
  const p = String(pathname ?? "");
  if (p === "/admin" || p.startsWith("/admin/")) return true;
  if (p === "/pilotage" || p.startsWith("/pilotage/")) return true;

  if (!estHotePilotage(host)) return false;
  // Sur le sous-domaine, TOUT exige un compte admin, sauf ce qui sert à
  // s'y connecter. C'est le sens inverse d'une liste d'autorisations :
  // un écran ajouté demain est protégé d'office.
  return !OUVERTS_SUR_LE_SOUS_DOMAINE.some((o) => p === o || p.startsWith(`${o}/`));
}
