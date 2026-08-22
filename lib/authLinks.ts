// lib/authLinks.ts
//
// Les liens envoyés par email doivent pointer sur NOTRE domaine, toujours.
//
// DRAME VÉRONIQUE (2 août 2026) : "je demande un nouveau mot de passe,
// je clique sur le bouton, et j'arrive sur `localhost n'autorise pas la
// connexion`. Bref, je tourne en rond." Elle n'a ni proxy ni pare-feu :
// le lien lui demandait vraiment d'ouvrir un serveur qui tourne sur SON
// ordinateur, et qui n'existe pas.
//
// Pourquoi : le lien de `generateLink` passe d'abord par Supabase
// (`/auth/v1/verify?...&redirect_to=...`). Supabase ne redirige vers
// `redirect_to` que si l'URL est dans sa liste blanche ; sinon il
// retombe sur le "Site URL" du projet. Un "Site URL" resté sur
// `http://localhost:3000` (la valeur par défaut d'un projet Supabase)
// envoie donc TOUS les utilisateurs sur leur propre machine.
//
// RÈGLE : on n'envoie jamais le lien Supabase. On envoie le NÔTRE,
// construit avec le `hashed_token`, et notre page /auth/callback consomme
// le jeton elle-même (verifyOtp). Plus aucune liste blanche, plus aucun
// "Site URL" entre l'utilisateur et son compte.

// DRAME BÉNÉ (22 août 2026), et il est PIRE que celui de Véronique.
//
// "Je suis là : https://quiz.tipote.com/auth/forgot-password. Je reçois
// le bon email mais il me renvoie sur Tipote putain !!"
//
// Le lien portait `https://app.tipote.com/auth/callback?token_hash=...`.
// Elle ne pouvait donc PAS se connecter, et ses utilisatrices non plus.
//
// La cause : `NEXT_PUBLIC_APP_URL` vaut `https://app.tipote.com` sur le
// serveur Tiquiz. La correction du 2 août ne refusait que les adresses
// LOCALES : une adresse parfaitement valide, mais qui désigne UNE AUTRE
// APP, traversait tout. **On avait validé la FORME, jamais l'IDENTITÉ.**
// C'est exactement la leçon du `??` : il ne protège que du manquant,
// jamais du faux.
//
// RÈGLE : le domaine où l'utilisatrice est EN TRAIN de naviguer gagne
// sur toute variable d'environnement. Une variable ne peut plus que
// confirmer, jamais contredire. Et une variable qui nomme une autre app
// est IGNORÉE, pas honorée.

/** Domaine de secours si rien d'exploitable n'est disponible. */
export const CANONICAL_APP_URL = "https://quiz.tipote.com";

/**
 * Les domaines où CETTE app sert ses pages de compte.
 *
 * Volontairement PLUS COURT que `OWN_HOSTS` (lib/customDomains.ts), qui
 * contient `app.tipote.com`, `n8n.tipote.com` et les sous-domaines de
 * service : ils partagent le même serveur mais ne servent pas Tiquiz.
 * Un lien de connexion qui pointerait sur l'un d'eux est un cul-de-sac.
 *
 * À garder en phase avec les vhosts du Caddyfile.
 */
export const APP_AUTH_HOSTS: ReadonlySet<string> = new Set([
  "quiz.tipote.com",
  "tiquiz.fr",
  "www.tiquiz.fr",
]);

/** Cette adresse désigne-t-elle bien NOTRE app ? */
export function isAppOrigin(raw: string | null | undefined): boolean {
  const propre = (raw ?? "").trim();
  if (!isUsableOrigin(propre)) return false;
  try {
    return APP_AUTH_HOSTS.has(new URL(propre).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isUsableOrigin(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  // Une adresse locale dans un email est une impasse pour celui qui le
  // reçoit : son navigateur cherchera un serveur sur SA machine.
  // `new URL("http://[::1]:3000").hostname` vaut "[::1]", crochets
  // compris : sans les retirer, l'IPv6 locale passait au travers.
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h.endsWith(".local")) return false;
  if (/^127\./.test(h)) return false;
  return true;
}

/**
 * URL publique, pour tout ce qui sort de l'app : liens d'email, retours
 * de paiement, adresses dans le sitemap.
 *
 * `fallback` = le domaine canonique du contexte (l'app, ou le site
 * vitrine). Le reste de la logique est commun : une adresse locale n'est
 * JAMAIS une réponse valable, quelle que soit sa provenance.
 */
export function resolvePublicUrl(
  envUrl: string | null | undefined,
  fallback: string,
  requestOrigin?: string | null,
): string {
  const trimmedEnv = (envUrl ?? "").trim().replace(/\/$/, "");
  if (isUsableOrigin(trimmedEnv)) return trimmedEnv;
  const trimmedReq = (requestOrigin ?? "").trim().replace(/\/$/, "");
  if (isUsableOrigin(trimmedReq)) return trimmedReq;
  return fallback.replace(/\/$/, "");
}

/**
 * URL de NOTRE app pour un lien envoyé par email.
 *
 * Ordre, et il n'est pas négociable :
 *
 * 1. **l'origine de la requête**, si elle désigne notre app. C'est le
 *    domaine où l'utilisatrice est en train de naviguer : c'est la seule
 *    source qui ne peut pas se tromper ;
 * 2. la variable d'environnement, **uniquement si elle désigne notre
 *    app**. Elle ne peut donc que confirmer ;
 * 3. le domaine canonique.
 *
 * Une variable qui nomme une autre app (`app.tipote.com` sur le serveur
 * Tiquiz, le 22 août) est ignorée au lieu d'être suivie. Un `.env` mal
 * renseigné ne peut plus empêcher personne de se connecter.
 */
export function resolveAppUrl(
  envUrl: string | null | undefined,
  requestOrigin?: string | null,
): string {
  const origine = (requestOrigin ?? "").trim().replace(/\/$/, "");
  if (isAppOrigin(origine)) return origine;

  const env = (envUrl ?? "").trim().replace(/\/$/, "");
  if (isAppOrigin(env)) return env;

  return CANONICAL_APP_URL;
}

export type AuthLinkType = "recovery" | "magiclink" | "invite" | "signup";

/**
 * Lien à mettre dans l'email : notre page de callback, avec le jeton.
 * `/auth/callback` sait déjà consommer un `token_hash` (verifyOtp) et
 * enchaîner sur le bon écran selon le type.
 */
export function buildAuthCallbackUrl(
  appUrl: string,
  params: { tokenHash: string; type: AuthLinkType },
): string {
  const base = appUrl.replace(/\/$/, "");
  const qs = new URLSearchParams({
    token_hash: params.tokenHash,
    type: params.type,
  });
  return `${base}/auth/callback?${qs.toString()}`;
}
