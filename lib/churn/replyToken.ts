// lib/churn/replyToken.ts
//
// LE LIEN DE RÉPONSE, ET POURQUOI IL EST SIGNÉ.
//
// L'email de départ contient un lien vers une page où la personne écrit
// pourquoi elle est partie. Cette page écrit dans `subscription_churn`,
// et elle est PUBLIQUE : la personne n'est plus abonnée, elle peut même
// ne plus avoir de compte.
//
// -- LE PIÈGE ÉVIDENT, ET IL EST GRAVE ---------------------------------
//
// Si le lien portait l'identifiant de la ligne en clair
// (`/depart/8f3c-...`), n'importe qui pourrait écrire dans le départ de
// n'importe qui. Les identifiants sont des UUID, donc pas devinables un
// par un, mais un identifiant n'est pas un secret : il traverse des
// journaux, des historiques de navigation, des captures d'écran.
//
// **Une URL qui autorise une écriture doit être SIGNÉE.** C'est la même
// mécanique que les webhooks qu'on reçoit (Stripe signe son corps, on
// vérifie), appliquée dans l'autre sens.
//
// -- AUCUNE VARIABLE DE PLUS À POSER -----------------------------------
//
// La clé est DÉRIVÉE d'un secret déjà présent sur le serveur, avec un
// séparateur de domaine. Une dérivation HMAC est à sens unique : le
// jeton ne dit rien du secret dont il vient, et une clé dérivée pour
// "churn-reply" ne peut pas servir ailleurs.
//
// C'est délibéré, et pas de la paresse : chaque nouvelle variable
// d'environnement est une variable de plus à poser sur DEUX serveurs,
// donc une occasion de plus de l'oublier sur un seul. C'est exactement
// ce qui a coûté une matinée le 19 août.
//
// -- L'ABSENCE FERME ---------------------------------------------------
//
// Sans secret utilisable, on ne fabrique AUCUN jeton et on n'en accepte
// aucun. Un lien non signé ne doit jamais être un repli : ce serait une
// porte ouverte le jour où une variable disparaît.

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Le séparateur de domaine.
 *
 * Il porte une VERSION : le jour où on change le format, les anciens
 * jetons cessent d'être valides au lieu d'être mal interprétés.
 */
const DOMAINE = "churn-reply/v1";

function base64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/** La clé de signature, dérivée et donc jamais le secret lui même. */
function cle(secret: string): Buffer {
  return createHmac("sha256", secret).update(DOMAINE).digest();
}

/**
 * Le secret à utiliser, ou `null` s'il n'y en a pas d'utilisable.
 *
 * `CHURN_TOKEN_SECRET` d'abord si un jour on veut le séparer, sinon
 * `CRON_SECRET`, qui est déjà posé pour les tâches planifiées. Un secret
 * trop court ferme : une valeur posée à moitié ne doit pas signer des
 * liens qui autorisent une écriture.
 */
export function readChurnSecret(env: Record<string, string | undefined>): string | null {
  for (const v of [env.CHURN_TOKEN_SECRET, env.CRON_SECRET]) {
    const s = String(v ?? "").trim();
    if (s.length >= 16) return s;
  }
  return null;
}

/** Le jeton pour cette ligne de départ, ou `null` sans secret. */
export function signChurnToken(id: string, secret: string | null): string | null {
  const propre = String(id ?? "").trim();
  if (!propre || !secret) return null;
  const sig = createHmac("sha256", cle(secret)).update(`${DOMAINE}:${propre}`).digest();
  return `${base64url(Buffer.from(propre, "utf8"))}.${base64url(sig)}`;
}

/**
 * L'identifiant porté par ce jeton, ou `null` si la signature ne colle
 * pas.
 *
 * Comparaison à durée constante : une signature ne se devine pas à la
 * montre. C'est la même précaution que sur les webhooks entrants.
 */
export function readChurnToken(token: string | null | undefined, secret: string | null): string | null {
  const brut = String(token ?? "").trim();
  if (!brut || !secret) return null;

  const morceaux = brut.split(".");
  if (morceaux.length !== 2) return null;

  let id = "";
  try {
    id = deBase64url(morceaux[0]).toString("utf8");
  } catch {
    return null;
  }
  if (!id) return null;

  const attendue = createHmac("sha256", cle(secret)).update(`${DOMAINE}:${id}`).digest();
  let recue: Buffer;
  try {
    recue = deBase64url(morceaux[1]);
  } catch {
    return null;
  }
  if (recue.length !== attendue.length) return null;
  if (!timingSafeEqual(recue, attendue)) return null;

  return id;
}
