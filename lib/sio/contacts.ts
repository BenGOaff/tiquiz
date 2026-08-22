// lib/sio/contacts.ts
//
// LIRE LES CONTACTS DE SYSTEME.IO SANS SUPPOSER LEUR FORME.
//
// Béné, 22 août : "QUELLE clé il te manque et pour quoi ? On en a déjà
// créé et connecté... en plus j'ai moi même ma clé connectée en tant
// qu'user : on peut l'utiliser en tant qu'admin aussi ?"
//
// Oui, et j'avais tort de demander autre chose : la clé vit déjà dans
// `sio_api_keys`, chiffrée, et `resolveApiKey` la rend. Aucune variable
// à poser sur le serveur.
//
// -- ON NE DEVINE PAS LA FORME DU PAYLOAD ------------------------------
//
// Le drame Ivan (7 août) tient en une phrase : "raisonner sur la forme
// SUPPOSÉE d'un payload au lieu de la regarder". Je n'ai pas vu de
// contact renvoyé par leur API, donc je ne sais pas où sont les tags :
// `tags`, `contactTags`, une liste de chaînes ou d'objets `{name}`.
//
// D'où la forme de ce module : il essaie les formes plausibles, et
// surtout il DIT quand il n'a rien trouvé. Une liste vide silencieuse se
// lirait "aucun écart, tout va bien" alors qu'elle voudrait dire "je
// n'ai pas su lire". C'est exactement l'écran qui a l'air de marcher.

import { comparerTagEtPlan, type EcartTag } from "./tags";

/** Un contact, réduit à ce dont on a besoin. */
export interface SioContact {
  email: string;
  tags: string[];
}

function texte(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * Les noms de tags d'un contact, quelle que soit la forme reçue.
 *
 * Rend `null` (et pas `[]`) quand aucun champ de tags n'existe : c'est
 * la différence entre "ce contact n'a pas de tag" et "je ne sais pas
 * lire ce contact", et tout le module repose dessus.
 */
export function readContactTags(item: unknown): string[] | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const brut = o.tags ?? o.contactTags ?? o.contact_tags;
  if (!Array.isArray(brut)) return null;

  const noms: string[] = [];
  for (const t of brut) {
    const nom =
      texte(t) ??
      (t && typeof t === "object"
        ? texte((t as Record<string, unknown>).name) ??
          texte((t as Record<string, unknown>).tag) ??
          texte((t as Record<string, unknown>).title)
        : null);
    if (nom) noms.push(nom.toLowerCase());
  }
  return noms;
}

/** L'adresse d'un contact, quelle que soit la forme reçue. */
export function readContactEmail(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const e = texte(o.email) ?? texte(o.contactEmail);
  return e ? e.toLowerCase() : null;
}

/**
 * Ce qu'on a réussi à lire, et ce qu'on n'a pas réussi.
 *
 * `contactsIllisibles` n'est pas de la décoration : si l'API répond mais
 * qu'on ne sait pas où sont les tags, l'audit doit le DIRE au lieu de
 * rendre zéro écart.
 */
export interface LectureContacts {
  contacts: SioContact[];
  /** Des contacts reçus dont on n'a pas su lire les tags. */
  illisibles: number;
}

export function lireContacts(items: readonly unknown[]): LectureContacts {
  const contacts: SioContact[] = [];
  let illisibles = 0;
  for (const item of items) {
    const email = readContactEmail(item);
    const tags = readContactTags(item);
    if (!email) continue;
    if (tags == null) {
      illisibles += 1;
      continue;
    }
    contacts.push({ email, tags });
  }
  return { contacts, illisibles };
}

/** Une personne à confronter, réduite à ce qui compte. */
export interface PersonnePourAudit {
  email: string;
  plan: string | null;
}

export interface EcartTrouve {
  email: string;
  ecart: EcartTag;
  /** Les tags Tiquiz portés chez Systeme.io, pour que la ligne se lise. */
  tags: string[];
  planChezNous: string | null;
}

export interface AuditTags {
  ecarts: EcartTrouve[];
  /** Combien de personnes ont vraiment été comparées. */
  compares: number;
  /** Des comptes chez nous introuvables chez Systeme.io. */
  absentsDeSio: number;
  illisibles: number;
}

/**
 * L'AUDIT : qui n'a pas ce qu'il a payé, et qui garde ce qu'il ne paie
 * plus.
 *
 * C'est le contrôle qui aurait rattrapé Ivan le jour même : il portait
 * `tiquiz-mensuel` chez Systeme.io et `free` chez nous, pendant qu'on
 * attendait qu'il écrive.
 *
 * On part de NOS comptes, pas de ses contacts : sa liste Systeme.io
 * porte des années de contacts venus de tous ses produits, et la moitié
 * n'a jamais entendu parler de Tiquiz. Les confronter tous produirait un
 * écran de bruit.
 */
export function auditerTags(
  personnes: readonly PersonnePourAudit[],
  lecture: LectureContacts,
): AuditTags {
  const parEmail = new Map(lecture.contacts.map((c) => [c.email, c]));
  const ecarts: EcartTrouve[] = [];
  let compares = 0;
  let absentsDeSio = 0;

  for (const p of personnes) {
    const email = String(p.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const contact = parEmail.get(email);
    if (!contact) {
      absentsDeSio += 1;
      continue;
    }
    compares += 1;
    const ecart = comparerTagEtPlan({ tags: contact.tags, planChezNous: p.plan });
    if (ecart) {
      ecarts.push({
        email,
        ecart,
        tags: contact.tags.filter((t) => t.startsWith("tiquiz-")),
        planChezNous: p.plan,
      });
    }
  }

  // Le plus urgent en haut : quelqu'un qui a payé et n'a pas ses accès.
  const ordre: EcartTag[] = ["acces-manquant", "palier-different", "tag-manquant"];
  ecarts.sort((a, b) => ordre.indexOf(a.ecart) - ordre.indexOf(b.ecart));

  return { ecarts, compares, absentsDeSio, illisibles: lecture.illisibles };
}
