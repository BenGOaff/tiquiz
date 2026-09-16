// lib/integrations/adaptateurs/systemeio.ts
//
// PARLER À SYSTEME.IO POUR UN LEAD, ET RIEN D'AUTRE.
//
// Ces fonctions vivaient DANS `app/api/quiz/[quizId]/public/route.ts`
// (14 septembre 2026), mêlées à deux cents lignes de capture. Elles
// sont déplacées TELLES QUELLES : même ordre d'appels, mêmes replis
// (le pays retiré si le contact est refusé, le tag recherché puis créé
// puis recherché encore sur un 422). Ce qui change, c'est qu'un
// deuxième outil peut maintenant vivre à côté sans recopier la route.
//
// Une SEULE chose est ajoutée : un 401 ou un 403 de Systeme.io LÈVE
// (`ErreurAuthSio`) au lieu de rendre `null`. Avant, une clé révoquée
// se lisait "contact impossible", donc personne ne prévenait la
// créatrice, et ses leads n'arrivaient nulle part pendant des semaines.
// C'est le "déconnecté" que `classerEchecEnvoi` attend.

import type { ChargeLead, ResultatEnvoi } from "@/lib/integrations/charge";
import type { ChampContactPerso } from "@/lib/integrations/champsContact";

const SIO_BASE = "https://api.systeme.io/api";

/**
 * Le préfixe des slugs de champs personnalisés chez Systeme.io
 * (`tiquiz_cf_xxxxxx`), passé à `champsContactPersonnalises`. Tipote
 * écrit `tipote`, comme pour `tiquiz_result` / `tipote_quiz_result`.
 */
export const SIO_PREFIXE_CHAMP = "tiquiz";

export class ErreurAuthSio extends Error {
  status: number;
  constructor(status: number) {
    super(`Systeme.io a refuse la cle (${status})`);
    this.status = status;
  }
}

export async function sioFetch(
  apiKey: string,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }
  const res = await fetch(`${SIO_BASE}${path}`, { method, headers, body: payload });
  if (res.status === 401 || res.status === 403) throw new ErreurAuthSio(res.status);
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export async function ensureSioTag(apiKey: string, tagName: string): Promise<number | null> {
  const search = await sioFetch(apiKey, `/tags?query=${encodeURIComponent(tagName)}&limit=100`);
  if (search.ok && Array.isArray((search.data as Record<string, unknown>)?.items)) {
    const items = (search.data as Record<string, unknown[]>).items as Record<string, unknown>[];
    const match = items.find((t) => String(t.name).toLowerCase() === tagName.toLowerCase());
    if (match?.id) return Number(match.id);
  }
  const create = await sioFetch(apiKey, "/tags", { method: "POST", body: { name: tagName } });
  if (create.ok && (create.data as Record<string, unknown>)?.id) return Number((create.data as Record<string, unknown>).id);
  if (create.status === 422) {
    const retry = await sioFetch(apiKey, `/tags?query=${encodeURIComponent(tagName)}&limit=100`);
    if (retry.ok && Array.isArray((retry.data as Record<string, unknown>)?.items)) {
      const items = (retry.data as Record<string, unknown[]>).items as Record<string, unknown>[];
      const match = items.find((t) => String(t.name).toLowerCase() === tagName.toLowerCase());
      if (match?.id) return Number(match.id);
    }
  }
  return null;
}

export interface ChampsContactSio {
  firstName?: string;
  surname?: string;
  phoneNumber?: string;
  country?: string;
}

function buildSioFields(fields: ChampsContactSio | undefined, includeCountry: boolean): { slug: string; value: string }[] {
  if (!fields) return [];
  const out: { slug: string; value: string }[] = [];
  if (fields.firstName) out.push({ slug: "first_name", value: fields.firstName });
  if (fields.surname) out.push({ slug: "surname", value: fields.surname });
  if (fields.phoneNumber) out.push({ slug: "phone_number", value: fields.phoneNumber });
  if (includeCountry && fields.country) out.push({ slug: "country", value: fields.country });
  return out;
}

export async function ensureSioContact(
  apiKey: string,
  email: string,
  fields?: ChampsContactSio,
): Promise<number | null> {
  const search = await sioFetch(apiKey, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
  if (search.ok && Array.isArray((search.data as Record<string, unknown>)?.items)) {
    const items = (search.data as Record<string, unknown[]>).items as Record<string, unknown>[];
    if (items.length > 0 && items[0]?.id) {
      const existingId = Number(items[0].id);
      if (fields) {
        const patchFields = buildSioFields(fields, true);
        if (patchFields.length > 0) {
          const patchRes = await sioFetch(apiKey, `/contacts/${existingId}`, { method: "PATCH", body: { fields: patchFields } });
          if (!patchRes.ok && patchRes.status === 422) {
            const fallback = buildSioFields(fields, false);
            if (fallback.length > 0) await sioFetch(apiKey, `/contacts/${existingId}`, { method: "PATCH", body: { fields: fallback } });
          }
        }
      }
      return existingId;
    }
  }
  const contactBody: Record<string, unknown> = { email, locale: "fr" };
  const sioFields = buildSioFields(fields, true);
  if (sioFields.length > 0) contactBody.fields = sioFields;
  const create = await sioFetch(apiKey, "/contacts", { method: "POST", body: contactBody });
  if (create.ok && (create.data as Record<string, unknown>)?.id) return Number((create.data as Record<string, unknown>).id);
  if (create.status === 422) {
    const retrySearch = await sioFetch(apiKey, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
    if (retrySearch.ok && Array.isArray((retrySearch.data as Record<string, unknown>)?.items)) {
      const items = (retrySearch.data as Record<string, unknown[]>).items as Record<string, unknown>[];
      if (items.length > 0 && items[0]?.id) return Number(items[0].id);
    }
    if (fields?.country) {
      const fallbackFields = buildSioFields(fields, false);
      const fallbackBody: Record<string, unknown> = { email, locale: "fr", ...(fallbackFields.length ? { fields: fallbackFields } : {}) };
      const retryCreate = await sioFetch(apiKey, "/contacts", { method: "POST", body: fallbackBody });
      if (retryCreate.ok && (retryCreate.data as Record<string, unknown>)?.id) return Number((retryCreate.data as Record<string, unknown>).id);
    }
  }
  return null;
}

export async function enrichSioContact(apiKey: string, contactId: number, quizResultTitle: string) {
  try {
    await sioFetch(apiKey, `/contacts/${contactId}`, {
      method: "PATCH",
      body: { fields: [{ slug: "tiquiz_result", value: quizResultTitle }] },
    });
  } catch (e) {
    console.error("[Systeme.io enrich] Error:", e);
  }
}

// -- LES CHAMPS PERSONNALISÉS (16 septembre 2026) -----------------------
//
// Un slug INCONNU est accepté et ignoré par Systeme.io (mesuré le
// 25 août 2026) : écrire la valeur sans avoir créé le champ ne rend
// aucune erreur, et la valeur disparaît. On ASSURE donc le champ
// (`POST /contact_fields`, 422 = il existe déjà) AVANT d'écrire, et
// jamais l'inverse. Le `fieldName` est le libellé du jour : sur un champ
// qui existe déjà, un PATCH le renomme, pour que la fiche contact dise
// ce que l'éditeur dit.
//
// Le résultat est MÉMORISÉ par clé et par champ pour la vie du
// processus : un champ ne se crée qu'une fois, pas à chaque lead.

const champsAssures = new Map<string, true>();
const MAX_CHAMPS_ASSURES = 5000;

function cleMemo(apiKey: string, slug: string, fieldName: string): string {
  // Jamais la clé entière dans une structure qu'on pourrait un jour
  // journaliser : sa longueur et sa fin suffisent à distinguer deux clés.
  return `${apiKey.length}:${apiKey.slice(-8)}|${slug}|${fieldName}`;
}

/** Crée le champ de contact s'il manque, le renomme s'il existe. Ne jette que sur un refus de clé. */
export async function assurerChampContactSio(apiKey: string, slug: string, fieldName: string): Promise<boolean> {
  const memo = cleMemo(apiKey, slug, fieldName);
  if (champsAssures.has(memo)) return true;
  const create = await sioFetch(apiKey, "/contact_fields", { method: "POST", body: { fieldName, slug } });
  let assure = create.ok;
  if (!create.ok && create.status === 422) {
    // Il existe : on aligne son nom sur le libellé du jour, best-effort.
    const patch = await sioFetch(apiKey, `/contact_fields/${encodeURIComponent(slug)}`, { method: "PATCH", body: { fieldName } });
    assure = patch.ok || patch.status === 422;
  }
  if (!assure) {
    console.warn(`[Systeme.io champ] ${slug} ni cree ni retrouve (${create.status}) : la valeur ne sera pas ecrite.`);
    return false;
  }
  if (champsAssures.size >= MAX_CHAMPS_ASSURES) champsAssures.clear();
  champsAssures.set(memo, true);
  return true;
}

/**
 * Écrit les champs personnalisés du formulaire sur la fiche contact, en
 * UN seul PATCH, après avoir assuré chacun. Un champ qui n'a pu être
 * assuré est laissé de côté et dit dans le journal : les autres partent.
 */
export async function ecrireChampsPersonnalisesSio(
  apiKey: string,
  contactId: number,
  champs: readonly ChampContactPerso[],
): Promise<void> {
  const fields: { slug: string; value: string }[] = [];
  for (const c of champs) {
    if (await assurerChampContactSio(apiKey, c.slug, c.nom)) fields.push({ slug: c.slug, value: c.valeur });
  }
  if (fields.length === 0) return;
  const res = await sioFetch(apiKey, `/contacts/${contactId}`, { method: "PATCH", body: { fields } });
  if (!res.ok) console.warn(`[Systeme.io champ] ecriture refusee (${res.status}) pour ${fields.length} champ(s) personnalise(s).`);
}

export async function enrollInSioCourse(apiKey: string, courseId: string, contactId: number) {
  try {
    await sioFetch(apiKey, `/school/courses/${courseId}/enrollments`, { method: "POST", body: { contactId } });
  } catch (e) {
    console.error("[Systeme.io course enrollment] Error:", e);
  }
}

export async function addToSioCommunity(apiKey: string, communityId: string, contactId: number) {
  try {
    await sioFetch(apiKey, `/community/communities/${communityId}/memberships`, { method: "POST", body: { contactId } });
  } catch (e) {
    console.error("[Systeme.io community add] Error:", e);
  }
}

/**
 * Envoie un lead : le contact, ses tags, le titre du profil, les champs
 * personnalisés du formulaire, la formation et la communauté. C'est, dans le même ordre, ce que la route
 * de capture faisait avant le 14 septembre.
 */
export async function envoyerVersSystemeio(apiKey: string, charge: ChargeLead): Promise<ResultatEnvoi> {
  try {
    const contactId = await ensureSioContact(apiKey, charge.email, {
      firstName: charge.prenom || undefined,
      surname: charge.nom || undefined,
      phoneNumber: charge.telephone || undefined,
      country: charge.pays || undefined,
    });
    if (!contactId) return { ok: false, status: 422, tagsPoses: [], erreur: "contact impossible" };

    const tagsPoses: string[] = [];
    for (const tagName of charge.tags) {
      try {
        const tagId = await ensureSioTag(apiKey, tagName);
        if (!tagId) continue;
        await sioFetch(apiKey, `/contacts/${contactId}/tags`, { method: "POST", body: { tagId } });
        tagsPoses.push(tagName);
      } catch (e) {
        if (e instanceof ErreurAuthSio) throw e;
        console.error("[Systeme.io tag apply] Error:", e);
      }
    }

    if (charge.profilTitre) await enrichSioContact(apiKey, contactId, charge.profilTitre);
    if (charge.champs && charge.champs.length > 0) {
      try {
        await ecrireChampsPersonnalisesSio(apiKey, contactId, charge.champs);
      } catch (e) {
        if (e instanceof ErreurAuthSio) throw e;
        console.error("[Systeme.io champ] Error:", e);
      }
    }
    if (charge.courseId) await enrollInSioCourse(apiKey, charge.courseId, contactId);
    if (charge.communityId) await addToSioCommunity(apiKey, charge.communityId, contactId);

    return { ok: true, status: 200, contactId: String(contactId), tagsPoses };
  } catch (e) {
    if (e instanceof ErreurAuthSio) {
      return { ok: false, status: e.status, tagsPoses: [], erreur: e.message };
    }
    return { ok: false, status: 0, tagsPoses: [], erreur: e instanceof Error ? e.message : String(e) };
  }
}
