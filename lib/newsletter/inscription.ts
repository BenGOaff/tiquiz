// lib/newsletter/inscription.ts
//
// L'INSCRIPTION À LA NEWSLETTER, LA PARTIE QUI DÉCIDE.
//
// Béné, 30 août 2026 : "envoyer les contacts vers systeme io avec tag
// déjà existant et règle aussi".
//
// -- LE TAG A ÉTÉ LU DANS SON COMPTE, PAS INVENTÉ ----------------------
//
// Relevé le 30 août 2026 par l'API de Systeme.io : le tag s'appelle
// `newsletter` (créé le 30 juillet 2022), et une règle active pose ce
// tag quand quelqu'un s'inscrit à son formulaire. Rien ne se déclenche
// DEPUIS le tag : c'est donc un segment de diffusion, pas un
// interrupteur de séquence.
//
// Conséquence directe sur ce que notre formulaire doit faire : créer le
// contact ET poser ce tag reproduit exactement l'état d'un inscrit
// venu de son formulaire. Un tag inventé aurait mis ces gens dans un
// segment que ses newsletters n'adressent pas, et personne ne l'aurait
// vu avant qu'un inscrit ne se plaigne de ne rien recevoir.
//
// **On ne CRÉE jamais le tag s'il a disparu.** Un tag créé par nous avec
// une faute se retrouverait en double dans sa liste (règle du 22 août).
//
// Ce module ne lit aucune variable d'environnement et n'importe rien de
// serveur : c'est ce qui le rend testable, et c'est là que vivent les
// décisions.

/** Le nom du tag, tel qu'il existe déjà dans son compte Systeme.io. */
export const TAG_NEWSLETTER = "newsletter";

/** Ce qu'on répond au visiteur. Le serveur rend la RAISON, jamais la phrase. */
export type RaisonRefus =
  | "email_invalide"
  | "email_manquant"
  | "trop_de_demandes"
  | "consentement_manquant"
  | "indisponible";

export type Verdict =
  | { ok: true; email: string; prenom: string | null }
  | { ok: false; raison: RaisonRefus };

/**
 * Une adresse est-elle plausible ?
 *
 * On ne cherche pas à valider une adresse au sens de la norme, ce qui
 * est un piège connu : on refuse ce qui ne PEUT pas être une adresse, et
 * on laisse passer le reste. Un formulaire trop strict refuse de vraies
 * adresses, et c'est une inscrite perdue pour rien.
 */
export function emailPlausible(brut: string): boolean {
  const e = brut.trim();
  if (e.length < 6 || e.length > 254) return false;
  if (/\s/.test(e)) return false;
  const parts = e.split("@");
  if (parts.length !== 2) return false;
  const [local, domaine] = parts;
  if (!local || !domaine) return false;
  if (!domaine.includes(".")) return false;
  if (domaine.startsWith(".") || domaine.endsWith(".")) return false;
  if (domaine.includes("..")) return false;
  return true;
}

/** L'adresse, nettoyée : espaces retirés, casse du domaine normalisée. */
export function normaliserEmail(brut: string): string {
  const e = String(brut ?? "").trim();
  const at = e.lastIndexOf("@");
  if (at === -1) return e.toLowerCase();
  // La partie locale est SENSIBLE À LA CASSE selon la norme. On ne la
  // touche pas : `Jean.Dupont@` et `jean.dupont@` peuvent être deux
  // boîtes différentes ailleurs que chez Gmail, et les confondre
  // enverrait la newsletter à quelqu'un qui ne l'a pas demandée.
  return e.slice(0, at) + "@" + e.slice(at + 1).toLowerCase();
}

/** Le prénom, borné et nettoyé, ou `null`. */
export function normaliserPrenom(brut: unknown): string | null {
  const p = String(brut ?? "").trim().replace(/\s+/g, " ");
  if (!p) return null;
  return p.slice(0, 60);
}

/**
 * LE VERDICT, À PARTIR DU SEUL CORPS DE LA DEMANDE.
 *
 * Le consentement est OBLIGATOIRE et vérifié ici, pas dans le
 * composant : une case cochée côté navigateur ne prouve rien, et
 * inscrire quelqu'un à une liste de diffusion sans son accord explicite
 * n'est pas une facilité, c'est une infraction.
 */
export function jugerInscription(corps: unknown): Verdict {
  const c = (corps ?? {}) as Record<string, unknown>;
  const brut = String(c.email ?? "").trim();
  if (!brut) return { ok: false, raison: "email_manquant" };
  const email = normaliserEmail(brut);
  if (!emailPlausible(email)) return { ok: false, raison: "email_invalide" };
  if (c.consentement !== true) return { ok: false, raison: "consentement_manquant" };
  return { ok: true, email, prenom: normaliserPrenom(c.prenom) };
}
