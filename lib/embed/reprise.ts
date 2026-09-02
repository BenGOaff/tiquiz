// lib/embed/reprise.ts
//
// LE QUIZ FABRIQUÉ SUR LA PAGE DE VENTE DOIT SE RETROUVER DANS LE COMPTE.
//
// Béné, 2 septembre 2026 : "il faut qu'ils génèrent un beau quiz, super
// pertinent, qui donne envie d'aller plus loin et qu'ils le retrouvent
// derrière, comme la plupart des saas le font : un aperçu gratuit
// alléchant qui demande de créer un compte pour continuer."
//
// ── CE QUI NE MARCHAIT PAS, ET C'EST MESURÉ ───────────────────────────
//
// Le jeton de session voyageait par DEUX chemins, et les deux fuyaient.
//
// 1. `localStorage`, écrit DANS l'iframe. Mesuré dans Chromium 141 avec
//    deux domaines distincts, comme sur la vraie page :
//
//      réglages par défaut     écrit : "abc123"        relu : "abc123"
//      cookies tiers bloqués   écrit : SecurityError   relu : null
//
//    Dès que les cookies tiers sont bloqués (le défaut de Safari et de
//    Firefox), l'iframe n'a PAS LE DROIT d'écrire. Le jeton n'est jamais
//    posé, et le `try/catch` autour avale l'erreur : personne ne le sait.
//
// 2. `?tq_session=` collé sur l'URL du bon de commande. Sauf que cette
//    URL menait chez Systeme.io, qui ne transmet pas la query (la même
//    raison qui a fait rapatrier les 8 destinations affiliées, 25 août).
//    Le jeton mourait là.
//
// Résultat : sur Safari, la personne repartait de zéro dans son compte
// alors que son quiz existait en base, complet, à côté.
//
// ── LA RÈGLE ──────────────────────────────────────────────────────────
//
// **Le jeton voyage par une NAVIGATION DE PREMIER NIVEAU sur NOTRE
// domaine, et le rattachement se fait CÔTÉ SERVEUR.** Plus aucune
// dépendance au stockage du navigateur, donc plus aucune différence
// entre Chrome, Safari et Firefox.
//
// C'est la page de vente passée chez nous qui rend ça possible : le
// bouton peut enfin viser `/signup` au lieu d'un tunnel Systeme.io.
//
// Ce module est PUR : aucune base, aucun `supabaseAdmin`. Un module qui
// importe le client d'administration est un module qu'aucun test ne peut
// charger, donc exactement là où les bugs s'installent (leçon du verrou
// des webhooks, 24 août).

/**
 * Le nom du paramètre est écrit ICI et nulle part ailleurs.
 *
 * Il était déjà connu de `EmbedAutoClaim` et du pont `bridge.js`, qui
 * l'écrivaient chacun en dur. Deux endroits qui nomment la même chose
 * finissent toujours par diverger, et celui qui se trompe est celui
 * qu'on ne relit pas.
 */
export const PARAM_REPRISE = "tq_session";

/** La forme d'un identifiant de session : un UUID, rien d'autre. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lit un jeton reçu de l'extérieur.
 *
 * ON VALIDE, ON NE FAIT PAS CONFIANCE. Cette valeur arrive d'une URL
 * publique et finit dans une requête vers la base : un `??` protège du
 * MANQUANT, jamais du FAUX (drame Véronique, 2 août). Une valeur qui
 * n'est pas un UUID ne peut désigner aucune session, donc on rend
 * `null` au lieu d'aller interroger la base avec.
 */
export function lireJetonReprise(brut: unknown): string | null {
  const v = String(brut ?? "").trim();
  return UUID.test(v) ? v.toLowerCase() : null;
}

/**
 * Où l'on envoie quelqu'un qui vient de fabriquer un quiz et veut le
 * garder : NOTRE inscription, sur le domaine où il est déjà.
 *
 * Le chemin est RELATIF exprès. La page de vente est servie sur
 * `tiquiz.fr` en public et sur le domaine de l'app quand on relit un
 * chantier avec la clé d'aperçu : une adresse absolue serait juste dans
 * un cas et fausse dans l'autre, et l'erreur ne se verrait qu'en
 * cliquant.
 */
export function urlInscriptionReprise(jeton: unknown): string {
  const valide = lireJetonReprise(jeton);
  return valide ? `/signup?${PARAM_REPRISE}=${encodeURIComponent(valide)}` : "/signup";
}

/**
 * Le cas "j'ai déjà un compte" : on ne rattache RIEN à l'inscription
 * (l'adresse existe, et personne n'a prouvé qu'elle lui appartient), on
 * l'emmène se connecter avec son jeton, et c'est le tableau de bord qui
 * rattache une fois la session ouverte.
 *
 * La connexion vise le domaine de l'APP, jamais celui de la vente : le
 * tableau de bord n'existe pas sur `tiquiz.fr`, donc y renvoyer
 * quelqu'un après sa connexion le mènerait nulle part.
 */
export function urlConnexionReprise(appUrl: string, jeton: unknown): string {
  const base = appUrl.replace(/\/+$/, "");
  const valide = lireJetonReprise(jeton);
  if (!valide) return `${base}/login`;
  const apres = `/dashboard?${PARAM_REPRISE}=${encodeURIComponent(valide)}`;
  return `${base}/login?redirect=${encodeURIComponent(apres)}`;
}

/**
 * Le `?redirect=` de la connexion est poussé tel quel par le formulaire.
 *
 * Il vient de l'URL, donc de l'extérieur. Une valeur du genre
 * `https://ailleurs.example` ou `//ailleurs.example` emmènerait la
 * personne hors de chez nous **juste après avoir tapé son mot de passe**,
 * c'est à dire à l'endroit exact où une fausse page de connexion est
 * rentable. On n'accepte donc qu'un CHEMIN interne.
 *
 * Le double slash est le cas qu'on rate toujours : `//evil.example` est
 * une URL absolue pour le navigateur, et elle commence bien par `/`.
 */
export function redirectionSure(brut: string | null | undefined): string {
  const v = String(brut ?? "").trim();
  if (!v.startsWith("/")) return "/dashboard";
  if (v.startsWith("//") || v.startsWith("/\\")) return "/dashboard";
  return v;
}

/**
 * Le jeton caché dans le `?redirect=` de la connexion.
 *
 * Quelqu'un qui avait déjà un compte arrive sur `/login` avec
 * `?redirect=/dashboard?tq_session=...` : le jeton y est, mais d'un
 * cran plus bas. Sans cette lecture, un clic sur « Continuer avec
 * Google » depuis cet écran repartirait sans lui, et le quiz serait
 * perdu au retour (l'aller-retour OAuth ne rapporte pas le `redirect`).
 */
export function jetonDansRedirection(redirect: string | null | undefined): string | null {
  const chemin = redirectionSure(redirect);
  const i = chemin.indexOf("?");
  if (i === -1) return null;
  return lireJetonReprise(new URLSearchParams(chemin.slice(i + 1)).get(PARAM_REPRISE));
}
