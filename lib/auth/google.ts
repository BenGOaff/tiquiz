// lib/auth/google.ts
//
// LA CONNEXION GOOGLE, ET CE QU'ELLE NE DOIT RIEN FAIRE PERDRE.
//
// Béné, 2 septembre 2026 : "on pourra bosser sur l'optin et login via
// Google ?" puis "sans rien casser ni perdre de ce qui existe, je ne
// veux pas de mauvaise surprise."
//
// ── LE PIÈGE, ET IL EST ENTIER ────────────────────────────────────────
//
// `supabase.auth.signInWithOAuth` crée le compte DANS Supabase, sans
// passer par `/api/auth/signup`. Or c'est cette route, et elle seule,
// qui fait les trois choses qui comptent après une inscription :
//
//   1. `rattacherInscrit`  -> l'affiliée qui a amené la personne est
//      rattachée À VIE (règle de Béné, 26 août). Sans ça, elle a fait
//      le travail et ne touchera jamais rien sur la vente qui suivra ;
//   2. `poserTagPlan(email, "free")` -> le contact est créé chez
//      Systeme.io avec `tiquiz-free`, et c'est ce tag qui déclenche
//      la campagne (vérifié le 1er septembre). Sans lui, la personne
//      s'inscrit et ne reçoit RIEN ;
//   3. le rattachement du quiz fabriqué sur la page de vente.
//
// Un bouton Google branché naïvement aurait donc coûté, en silence, une
// commission d'affiliée, une séquence email et un quiz. C'est
// exactement la « mauvaise surprise » à ne pas fabriquer.
//
// D'où `/api/auth/accueil`, appelé APRÈS l'ouverture de session : les
// trois effets vivent au même endroit, quel que soit le chemin d'entrée.
//
// ── ET L'ALLER-RETOUR PAR GOOGLE QUITTE NOTRE DOMAINE ─────────────────
//
// Ce qui est dans l'URL ne survit pas forcément : Supabase ajoute son
// `?code=` à l'adresse de retour, et je n'ai AUCUN moyen de vérifier
// d'ici ce que leur serveur fait d'une query déjà présente. On ne
// construit pas sur une supposition : le jeton du quiz voyage dans un
// cookie PREMIÈRE PARTIE, posé avant de partir et relu au retour.
//
// Le `?ref=` affilié, lui, est déjà dans `tq_ref` depuis le middleware,
// pour un an : il survit par construction.

import { CANONICAL_APP_URL, isAppOrigin } from "@/lib/authLinks";

/** Le fournisseur, nommé une fois. */
export const FOURNISSEUR_GOOGLE = "google" as const;

/**
 * Le cookie qui porte le quiz de la démo pendant l'aller-retour.
 *
 * Il ne remplace pas `tq_session` dans l'URL : celui là sert le chemin
 * NORMAL (le formulaire), qui ne quitte jamais notre domaine. Celui ci
 * ne sert QUE la parenthèse Google, et il expire vite.
 */
export const COOKIE_REPRISE = "tq_reprise";

/** Trente minutes : le temps d'un aller-retour, pas davantage. */
export const REPRISE_MAX_AGE = 30 * 60;

/**
 * L'adresse de retour après Google.
 *
 * **On revient sur l'origine d'où l'on est parti**, quand elle est une
 * des nôtres. C'est déjà ce que fait `resolveAppUrl` pour les liens
 * d'email depuis le 2 août, et c'est ce qui rend le cookie lisible au
 * retour : partir de `tiquiz.fr` et revenir sur `quiz.tipote.com` sont
 * deux sites différents, donc le cookie posé avant de partir serait
 * perdu, et avec lui le quiz.
 *
 * Une origine qui n'est pas à nous (ou une adresse locale) retombe sur
 * le domaine canonique : un `??` protège du MANQUANT, jamais du FAUX.
 */
export function urlRetourGoogle(origine: string | null | undefined): string {
  const base = isAppOrigin(origine) ? String(origine).replace(/\/+$/, "") : CANONICAL_APP_URL;
  return `${base}/auth/callback`;
}

/**
 * La ligne de cookie à poser AVANT de partir chez Google.
 *
 * `SameSite=Lax` est le point important : le cookie n'est PAS envoyé
 * quand un autre site déclenche une requête vers nous en arrière plan,
 * mais il l'est sur une navigation de PREMIER NIVEAU, c'est à dire
 * exactement le retour de Google. Mesuré dans Chromium, pas supposé.
 *
 * `Secure` n'est posé qu'en https : en développement local, un cookie
 * `Secure` sur http est simplement ignoré par le navigateur, et le
 * jeton disparaîtrait sans que rien ne le dise.
 */
export function ligneCookieReprise(jeton: string, https: boolean): string {
  const bouts = [
    `${COOKIE_REPRISE}=${encodeURIComponent(jeton)}`,
    "path=/",
    `max-age=${REPRISE_MAX_AGE}`,
    "samesite=lax",
  ];
  if (https) bouts.push("secure");
  return bouts.join("; ");
}

/** La ligne qui EFFACE le cookie, une fois le quiz rattaché. */
export function ligneCookieRepriseEffacee(https: boolean): string {
  const bouts = [`${COOKIE_REPRISE}=`, "path=/", "max-age=0", "samesite=lax"];
  if (https) bouts.push("secure");
  return bouts.join("; ");
}

/**
 * Le tag de plan à poser après une première entrée par Google.
 *
 * **JAMAIS `free` sur un compte qui paie.** L'accueil peut se déclencher
 * sur un compte qui existait déjà (le marqueur d'accueil n'existait pas
 * avant ce chantier) : poser `tiquiz-free` sur une abonnée la sortirait
 * du seul segment qui compte pour les relances de Béné, et ça ne se
 * verrait sur aucun écran.
 *
 * `null` veut dire « on ne touche à rien », et c'est la bonne réponse
 * partout ailleurs que sur un compte gratuit.
 */
export function tagPlanPourAccueil(plan: string | null | undefined): "free" | null {
  const p = String(plan ?? "free").trim().toLowerCase();
  return p === "free" || p === "" ? "free" : null;
}
