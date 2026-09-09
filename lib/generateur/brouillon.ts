// lib/generateur/brouillon.ts
//
// LE QUIZ GARDÉ 7 JOURS DANS LE NAVIGATEUR (Béné, 9 septembre 2026)
//
// « Aujourd'hui, quelqu'un qui génère un quiz et ferme l'onglet est
// perdu pour toujours. »
//
// Mesuré avant d'écrire : c'était vrai, et à un cheveu près.
// `EmbedPreviewClient` ÉCRIT déjà le jeton de session dans
// `localStorage` (clé `tiquiz_embed_session`), mais personne ne le
// relit sur le générateur : seul `EmbedAutoClaim`, sur le tableau de
// bord, s'en sert après une inscription. Le quiz, lui, est toujours en
// base (aucun cron ne purge `embed_quiz_sessions`). Il ne manquait donc
// que la porte de retour.
//
// ── ON GARDE L'ADRESSE DU QUIZ, PAS LE QUIZ ──────────────────────────
//
// Le brouillon porte le JETON, pas le contenu. Recopier le quiz dans le
// navigateur donnerait deux versions de la même chose : celle du
// serveur, que l'éditeur modifie à chaque frappe, et une photo prise au
// moment de la génération. La photo gagnerait à la réouverture et
// effacerait tout ce qui a été corrigé depuis.
//
// ── ET LA DÉCISION EST PURE ──────────────────────────────────────────
//
// `lireBrouillon` prend la chaîne et l'heure, pas `window` ni
// `Date.now()` : un test qui dépend de l'horloge clignote. Les accès au
// navigateur sont trois lignes plus bas, chacune dans un try/catch (en
// navigation privée, `localStorage` LÈVE, et ça ne doit rien casser).

/** Sa clé, ses mots. */
export const CLE_BROUILLON = "tiquiz.brouillon";

/** La clé historique du jeton, écrite depuis toujours et lue par le tableau de bord. */
export const CLE_JETON = "tiquiz_embed_session";

/** Sa fenêtre. */
export const FENETRE_JOURS = 7;
const FENETRE_MS = FENETRE_JOURS * 24 * 60 * 60 * 1000;

/** Le bandeau de sortie ne s'affiche qu'une fois par session. */
export const CLE_SORTIE_VUE = "tiquiz.brouillon.sortie";

export type Brouillon = {
  /** Le jeton de session : l'adresse du quiz, côté serveur. */
  jeton: string;
  /** Le sujet, pour que le bandeau dise DE QUEL quiz il parle. */
  titre: string | null;
  /** Quand il a été écrit. */
  le: number;
};

const titreNettoye = (v: unknown): string | null => {
  const t = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return t.length > 0 ? t : null;
};

/**
 * CE QUE LE BROUILLON DIT, ET RIEN DE PLUS.
 *
 * Rend `null` dans tous les cas où il n'y a rien à rouvrir : absent,
 * illisible, sans jeton, ou plus vieux que la fenêtre. Elle ne LÈVE
 * jamais : une valeur abîmée en `localStorage` ne doit pas coûter la
 * page du générateur.
 *
 * UN HORODATAGE DANS LE FUTUR NE PÉRIME RIEN. Une horloge qui recule
 * (un changement d'heure, une machine remise à l'heure) mettrait sinon
 * un brouillon parfaitement vivant à la poubelle, et personne ne
 * saurait pourquoi. Perdre le travail de quelqu'un coûte plus cher que
 * de garder un brouillon un jour de trop.
 */
export function lireBrouillon(
  brut: string | null | undefined,
  maintenant: number,
  fenetreMs: number = FENETRE_MS,
): Brouillon | null {
  if (!brut) return null;
  let objet: unknown;
  try {
    objet = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!objet || typeof objet !== "object") return null;
  const o = objet as Record<string, unknown>;
  const jeton = String(o.jeton ?? "").trim();
  if (!jeton) return null;
  const le = Number(o.le);
  if (!Number.isFinite(le) || le <= 0) return null;
  const age = maintenant - le;
  if (age > fenetreMs) return null;
  return { jeton, titre: titreNettoye(o.titre), le };
}

/** Ce qu'on écrit. Le tour complet passe par `lireBrouillon`. */
export function ecrireBrouillon(b: { jeton: string; titre?: string | null; le: number }): string {
  return JSON.stringify({ jeton: b.jeton, titre: titreNettoye(b.titre), le: b.le });
}

// ── LES TROIS LIGNES QUI TOUCHENT LE NAVIGATEUR ──────────────────────
//
// Chacune dans un try/catch : en navigation privée l'accès lève, et un
// brouillon perdu ne doit jamais coûter l'écran.

export function chargerBrouillon(maintenant: number = Date.now()): Brouillon | null {
  try {
    return lireBrouillon(localStorage.getItem(CLE_BROUILLON), maintenant);
  } catch {
    return null;
  }
}

export function enregistrerBrouillon(b: { jeton: string; titre?: string | null }): void {
  try {
    localStorage.setItem(CLE_BROUILLON, ecrireBrouillon({ ...b, le: Date.now() }));
  } catch {
    /* navigation privée */
  }
}

export function oublierBrouillon(): void {
  try {
    localStorage.removeItem(CLE_BROUILLON);
  } catch {
    /* navigation privée */
  }
}

/**
 * LA LIGNE DE SORTIE NE S'AFFICHE QU'UNE FOIS PAR SESSION.
 *
 * `sessionStorage` et pas `localStorage` : c'est « une fois par
 * session », donc l'oubli à la fermeture de l'onglet est exactement le
 * comportement voulu, pas un effet de bord.
 *
 * Un accès qui lève rend `true` (déjà vue) : le repli SÛR est de ne
 * rien afficher. Une ligne qui se réaffiche à chaque mouvement de
 * souris serait pire que pas de ligne du tout.
 */
export function ligneDeSortieDejaVue(): boolean {
  try {
    return sessionStorage.getItem(CLE_SORTIE_VUE) === "1";
  } catch {
    return true;
  }
}

export function marquerLigneDeSortieVue(): void {
  try {
    sessionStorage.setItem(CLE_SORTIE_VUE, "1");
  } catch {
    /* navigation privée */
  }
}

/**
 * LA SOURIS SORT-ELLE PAR LE HAUT ?
 *
 * Pure, elle prend les deux nombres. Sa consigne dit « par le haut de la
 * fenêtre » : sortir par le bas, c'est la barre des tâches ; par le
 * côté, c'est un deuxième écran. Seul le haut désigne la barre
 * d'adresse et l'onglet qu'on ferme.
 */
export function sortieParLeHaut(a: { clientY: number; relatedTarget: unknown }): boolean {
  // `relatedTarget` non nul veut dire que la souris est passée sur un
  // autre élément de la page : elle n'a pas quitté la fenêtre.
  if (a.relatedTarget) return false;
  return a.clientY <= 0;
}
