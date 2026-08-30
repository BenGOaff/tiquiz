// lib/blog/commentaires.ts
//
// LES COMMENTAIRES D'UN ARTICLE : CE QU'ON ACCEPTE, ET CE QU'ON REFUSE.
//
// Béné, 30 août 2026 : "y'a pas de proposition de partage de l'article,
// ni de commentaires : dommage ça aide à ranker."
//
// -- POURQUOI TOUT EST ICI, ET RIEN DANS LA ROUTE ---------------------
//
// Un formulaire public est la porte la plus exposée d'un site : c'est
// par là qu'arrivent le spam, les liens vendus et les injections. Les
// règles qui décident quoi accepter doivent donc être TESTÉES, et un
// module qui importe `supabaseAdmin` n'est importable par aucun test
// (leçon du verrou des webhooks, 24 août). Ce fichier ne connaît ni la
// base ni la requête : il reçoit un formulaire, il rend un verdict.
//
// -- LA MODÉRATION EST LE DÉFAUT, PAS UNE OPTION ----------------------
//
// Un commentaire arrive en `en_attente`. Rien n'apparaît sur le site
// avant que Béné ne l'ait vu. C'est la seule posture tenable : le
// contenu publié par des inconnus sur son domaine engage SA réputation
// et son référencement, et un lien vers un site douteux publié
// automatiquement coûte plus cher que dix jours d'attente.
//
// -- L'ADRESSE EMAIL NE SORT JAMAIS -----------------------------------
//
// Elle est demandée (facultative) pour pouvoir répondre, elle est
// stockée, et AUCUNE lecture publique ne la renvoie. C'est la règle des
// IBAN du 25 août, transposée : ce qu'un écran peut afficher, un écran
// finit par l'afficher.

export type RaisonRefus =
  | "nom-manquant"
  | "nom-trop-long"
  | "message-court"
  | "message-long"
  | "email-invalide"
  | "trop-de-liens"
  | "piege"
  | "article-inconnu";

export interface FormulaireCommentaire {
  slug: unknown;
  auteur: unknown;
  message: unknown;
  email?: unknown;
  /**
   * Le champ PIÈGE, invisible pour un humain.
   *
   * Un robot remplit tous les champs d'un formulaire ; une personne ne
   * voit même pas celui là. C'est le filtre anti-spam le moins cher qui
   * existe, et le seul qui ne demande rien au visiteur (un captcha, lui,
   * fait fuir une lectrice sur cinq et envoie ses données à un tiers).
   */
  siteWeb?: unknown;
}

export interface CommentairePropre {
  slug: string;
  auteur: string;
  message: string;
  email: string | null;
}

export const NOM_MAX = 60;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
/**
 * Au delà, ce n'est plus un avis, c'est un placement de liens.
 *
 * DEUX et pas un : ce blog parle d'outils, et quelqu'un qui raconte son
 * cas cite naturellement Systeme.io et sa propre page. Un garde-fou qui
 * refuse un commentaire légitime finit désactivé, et on se retrouve
 * alors sans garde-fou du tout.
 */
export const LIENS_MAX = 2;

export type Verdict =
  | { ok: true; valeur: CommentairePropre }
  | { ok: false; raison: RaisonRefus };

/**
 * Le verdict sur un formulaire reçu.
 *
 * `slugsConnus` est un PARAMÈTRE OBLIGATOIRE : sans lui, n'importe qui
 * pourrait écrire des commentaires sous un slug inventé, et faire
 * grossir la table sans qu'aucune page ne les montre jamais.
 */
export function jugerCommentaire(
  f: FormulaireCommentaire,
  slugsConnus: readonly string[],
): Verdict {
  // Le piège d'abord : inutile de valider le reste d'un robot.
  if (texte(f.siteWeb).length > 0) return { ok: false, raison: "piege" };

  const slug = texte(f.slug);
  if (!slugsConnus.includes(slug)) return { ok: false, raison: "article-inconnu" };

  const auteur = texte(f.auteur);
  if (auteur.length < 2) return { ok: false, raison: "nom-manquant" };
  if (auteur.length > NOM_MAX) return { ok: false, raison: "nom-trop-long" };

  const message = texte(f.message);
  if (message.length < MESSAGE_MIN) return { ok: false, raison: "message-court" };
  if (message.length > MESSAGE_MAX) return { ok: false, raison: "message-long" };
  if (compterLiens(message) > LIENS_MAX) return { ok: false, raison: "trop-de-liens" };

  const brutEmail = texte(f.email);
  if (brutEmail && !emailPlausible(brutEmail)) return { ok: false, raison: "email-invalide" };

  return {
    ok: true,
    valeur: {
      slug,
      auteur,
      message,
      email: brutEmail ? brutEmail.toLowerCase() : null,
    },
  };
}

/** Espaces normalisés, bornes retirées, jamais `undefined`. */
function texte(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Les raccourcisseurs : une adresse dont on ne peut pas voir la destination. */
const RACCOURCISSEURS =
  /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|lnkd\.in)\b/gi;

/**
 * Combien de liens un message contient.
 *
 * DEUX FAMILLES, et une seule aurait été un mauvais garde-fou :
 *
 *   - les adresses explicites (`https://...`) ;
 *   - les RACCOURCISSEURS écrits en clair (`bit.ly/xyz`), qui sont la
 *     signature du spam parce qu'ils cachent la destination.
 *
 * Ce qu'on ne compte PAS, et c'est délibéré : un nom de domaine nu comme
 * `Systeme.io` ou `involve.me`. Ce blog parle d'outils, ces noms
 * apparaissent dans toute discussion normale, et les compter refuserait
 * les commentaires les plus intéressants. Un garde-fou qui crie pour
 * rien finit désactivé (leçon du filet genre-neutre, 24 août).
 *
 * On retire les adresses déjà comptées avant de chercher les
 * raccourcisseurs : sans ça, `https://bit.ly/x` compterait deux fois.
 */
export function compterLiens(message: string): number {
  const m = String(message ?? "");
  const explicites = m.match(/https?:\/\/\S+/gi) ?? [];
  const reste = m.replace(/https?:\/\/\S+/gi, " ");
  const raccourcis = reste.match(RACCOURCISSEURS) ?? [];
  return explicites.length + raccourcis.length;
}

/**
 * Une adresse email plausible.
 *
 * On vérifie la FORME, pas l'existence. Un `??` de complaisance
 * laisserait passer n'importe quoi, et une validation trop stricte
 * refuserait des adresses valides : la seule règle qui tient est
 * "quelque chose, un arobase, un domaine avec un point".
 */
export function emailPlausible(valeur: string): boolean {
  const v = String(valeur ?? "").trim();
  return v.length <= 200 && /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Le message, prêt à être RENDU DANS DU HTML.
 *
 * Il vient d'un inconnu et il finit sur la page publique d'un article :
 * on échappe, toujours, et on ne laisse AUCUNE balise. Les retours à la
 * ligne sont conservés parce qu'ils portent le sens d'un paragraphe,
 * mais bornés à deux : trente lignes vides sont une façon de pousser le
 * commentaire suivant hors de l'écran.
 */
export function messageEnHtml(message: string): string {
  return String(message ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("<br />");
}

/** La phrase à afficher pour chaque refus, en français. */
export const PHRASE_REFUS: Record<RaisonRefus, string> = {
  "nom-manquant": "Il manque ton prénom.",
  "nom-trop-long": `Ton nom fait plus de ${NOM_MAX} caractères.`,
  "message-court": `Ton message fait moins de ${MESSAGE_MIN} caractères.`,
  "message-long": `Ton message dépasse ${MESSAGE_MAX} caractères.`,
  "email-invalide": "Cette adresse email ne ressemble pas à une adresse.",
  "trop-de-liens": "Deux liens au maximum par commentaire, sinon ça part en pub.",
  // Le robot n'a pas besoin de comprendre, et une personne ne peut pas
  // tomber dessus : le champ est invisible.
  piege: "Ce message n'a pas pu être envoyé.",
  "article-inconnu": "Cet article n'existe pas.",
};
