// lib/integrations/adaptateurs/gohighlevel.ts
//
// PARLER À GOHIGHLEVEL (LeadConnector), ET RIEN D'AUTRE.
//
// Ce module ne lit ni la base ni l'environnement : il prend un jeton et
// un sous-compte, il rend un résultat. Les décisions (vers où, faut-il
// alerter) vivent dans `lib/integrations/decision.ts`.
//
// -- CE QUI A ÉTÉ MESURÉ, PAS SUPPOSÉ (14 septembre 2026) -------------
//
// `POST /contacts/upsert` sans en-tête `Version` répond
// `{"statusCode":401,"message":"version header was not found."}`, et
// avec `Version: 2021-07-28` (ou `v3`, les deux passent) répond
// `Invalid Private Integration token` sur un jeton bidon. L'en-tête est
// donc obligatoire, et un 401 sur un jeton faux est bien un 401 : c'est
// ce que `classerEchecEnvoi` lit comme "déconnecté".
//
// -- LE PIÈGE DE L'UPSERT : `tags` ÉCRASE --------------------------------
//
// Leur documentation le dit en toutes lettres : le champ `tags` de
// l'upsert "overwrites all existing tags". Un lead qui refait un
// deuxième quiz PERDRAIT les tags du premier, et les automatisations
// bâties dessus avec. On n'envoie donc JAMAIS `tags` dans l'upsert : le
// contact est créé ou retrouvé d'abord, puis les tags sont AJOUTÉS par
// `POST /contacts/{id}/tags`, qui n'enlève rien. Le test l'exige.
//
// -- LES CHAMPS PERSONNALISÉS SONT BEST-EFFORT -------------------------
//
// Le titre du profil part dans un champ personnalisé `tiquiz_resultat`,
// comme chez Systeme.io (`tiquiz_result`), et depuis le 16 septembre
// 2026 les champs personnalisés du formulaire partent avec lui, chacun
// dans un champ qui porte son libellé. Ces champs sont CRÉÉS quand ils
// manquent (`POST /locations/{id}/customFields`), après avoir LISTÉ ceux
// du sous-compte : leur API dérive `fieldKey` du nom, donc un champ se
// retrouve par son nom, jamais par un slug qu'on choisirait. Le plan
// (quoi écrire, quoi créer) est PUR : `planifierChampsGhl`.
//
// Tout ça part dans des appels À PART, après les tags, et un échec ne
// fait que journaliser : on ne laisse pas un champ de confort faire
// échouer la pose des tags. Lister et créer des champs demande les
// scopes `locations/customFields.readonly` et `.write` : sans eux, le
// listage répond 401 ou 403, ce qui n'est PAS une déconnexion (le
// contact et les tags viennent de passer), et on retombe sur l'écriture
// par clé d'avant, en nommant le scope manquant dans le journal.

import type { ChargeLead, ResultatEnvoi } from "@/lib/integrations/charge";
import {
  planifierChampsGhl,
  type ChampGhlExistant,
  type ChampGhlVoulu,
} from "@/lib/integrations/champsContact";

export const GHL_BASE = "https://services.leadconnectorhq.com";
export const GHL_VERSION = "2021-07-28";
/** La clé du champ personnalisé qui reçoit le titre du profil. */
export const GHL_CHAMP_RESULTAT = "tiquiz_resultat";

export interface CompteGhl {
  token: string;
  locationId: string;
}

export interface ReponseGhl<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  erreur?: string;
}

export async function ghlRequete<T = unknown>(
  token: string,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<ReponseGhl<T>> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }
  try {
    const res = await fetch(`${GHL_BASE}${path}`, {
      method,
      headers,
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let data: T | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = null;
    }
    const message =
      data && typeof data === "object" && "message" in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).message)
        : text.slice(0, 200);
    return { ok: res.ok, status: res.status, data, erreur: res.ok ? undefined : message };
  } catch (e) {
    return { ok: false, status: 0, data: null, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Le jeton et le sous-compte répondent-ils ? Un contact au plus, en
 * lecture : c'est le droit le plus bas qu'un jeton pour ce chantier
 * doit avoir, et ça ne crée rien chez le client.
 */
export async function validerCompteGhl(compte: CompteGhl): Promise<{ ok: boolean; status: number; erreur?: string }> {
  const r = await ghlRequete(
    compte.token,
    `/contacts/?locationId=${encodeURIComponent(compte.locationId)}&limit=1`,
  );
  return { ok: r.ok, status: r.status, erreur: r.erreur };
}

export interface SousCompteGhl {
  id: string;
  name: string;
}

/**
 * Les sous-comptes d'une agence, pour en connecter plusieurs d'un coup.
 * Leur API pagine par `skip` ; on s'arrête à 500 pour ne jamais boucler
 * sur une réponse qui renverrait toujours la même page.
 */
export async function listerSousComptesGhl(
  token: string,
  companyId: string,
): Promise<{ ok: boolean; status: number; sousComptes: SousCompteGhl[]; erreur?: string }> {
  const sousComptes: SousCompteGhl[] = [];
  const limite = 100;
  for (let skip = 0; skip < 500; skip += limite) {
    const r = await ghlRequete<{ locations?: Array<{ id?: string; name?: string }> }>(
      token,
      `/locations/search?companyId=${encodeURIComponent(companyId)}&limit=${limite}&skip=${skip}`,
    );
    if (!r.ok) return { ok: false, status: r.status, sousComptes, erreur: r.erreur };
    const page = Array.isArray(r.data?.locations) ? r.data!.locations! : [];
    for (const l of page) {
      const id = String(l.id ?? "").trim();
      if (id) sousComptes.push({ id, name: String(l.name ?? "").trim() || id });
    }
    if (page.length < limite) break;
  }
  return { ok: true, status: 200, sousComptes };
}

/** Les tags déjà présents dans le sous-compte, pour le sélecteur de l'éditeur. */
export async function listerTagsGhl(
  compte: CompteGhl,
): Promise<{ ok: boolean; status: number; tags: string[]; erreur?: string }> {
  const r = await ghlRequete<{ tags?: Array<{ name?: string }> }>(
    compte.token,
    `/locations/${encodeURIComponent(compte.locationId)}/tags`,
  );
  if (!r.ok) return { ok: false, status: r.status, tags: [], erreur: r.erreur };
  const tags = (Array.isArray(r.data?.tags) ? r.data!.tags! : [])
    .map((t) => String(t.name ?? "").trim())
    .filter(Boolean);
  return { ok: true, status: r.status, tags };
}

function corpsUpsert(compte: CompteGhl, charge: ChargeLead, complet: boolean): Record<string, unknown> {
  const corps: Record<string, unknown> = {
    locationId: compte.locationId,
    email: charge.email,
    source: charge.source || "Tiquiz",
  };
  if (charge.prenom) corps.firstName = charge.prenom;
  if (charge.nom) corps.lastName = charge.nom;
  // Le téléphone et le pays sont VALIDÉS par leur API (format E.164,
  // code pays à deux lettres) : une valeur libre saisie par un visiteur
  // peut faire refuser l'upsert ENTIER. On les tente une fois, et on
  // recommence sans eux : un contact sans téléphone vaut mieux qu'un
  // lead qui n'arrive jamais.
  if (complet && charge.telephone) corps.phone = charge.telephone;
  if (complet && charge.pays) corps.country = charge.pays;
  return corps;
}

/**
 * Envoie un lead : le contact (créé ou retrouvé), puis ses tags, puis le
 * titre du profil et les champs personnalisés du formulaire. Ne jette
 * jamais.
 */
export async function envoyerVersGhl(compte: CompteGhl, charge: ChargeLead): Promise<ResultatEnvoi> {
  type Upsert = { contact?: { id?: string }; new?: boolean };
  let up = await ghlRequete<Upsert>(compte.token, "/contacts/upsert", {
    method: "POST",
    body: corpsUpsert(compte, charge, true),
  });
  if (!up.ok && (up.status === 400 || up.status === 422) && (charge.telephone || charge.pays)) {
    up = await ghlRequete<Upsert>(compte.token, "/contacts/upsert", {
      method: "POST",
      body: corpsUpsert(compte, charge, false),
    });
  }
  if (!up.ok) {
    return { ok: false, status: up.status, tagsPoses: [], erreur: up.erreur ?? `upsert ${up.status}` };
  }
  const contactId = String(up.data?.contact?.id ?? "").trim();
  if (!contactId) {
    return { ok: false, status: up.status, tagsPoses: [], erreur: "upsert sans identifiant de contact" };
  }

  let tagsPoses: string[] = [];
  if (charge.tags.length > 0) {
    const t = await ghlRequete(compte.token, `/contacts/${encodeURIComponent(contactId)}/tags`, {
      method: "POST",
      body: { tags: [...charge.tags] },
    });
    if (!t.ok) {
      return { ok: false, status: t.status, contactId, tagsPoses: [], erreur: t.erreur ?? `tags ${t.status}` };
    }
    tagsPoses = [...charge.tags];
  }

  const voulus: ChampGhlVoulu[] = [];
  if (charge.profilTitre) voulus.push({ cle: GHL_CHAMP_RESULTAT, nom: GHL_CHAMP_RESULTAT, valeur: charge.profilTitre });
  for (const c of charge.champs ?? []) voulus.push({ nom: c.nom, valeur: c.valeur });
  if (voulus.length > 0) await ecrireChampsGhl(compte, contactId, voulus);

  return { ok: true, status: up.status, contactId, tagsPoses };
}

/** Les champs personnalisés de contact du sous-compte. */
export async function listerChampsGhl(
  compte: CompteGhl,
): Promise<{ ok: boolean; status: number; champs: ChampGhlExistant[]; erreur?: string }> {
  const r = await ghlRequete<{ customFields?: Array<{ id?: string; name?: string; fieldKey?: string | null }> }>(
    compte.token,
    `/locations/${encodeURIComponent(compte.locationId)}/customFields?model=contact`,
  );
  if (!r.ok) return { ok: false, status: r.status, champs: [], erreur: r.erreur };
  const champs = (Array.isArray(r.data?.customFields) ? r.data!.customFields! : [])
    .map((c) => ({ id: String(c.id ?? "").trim(), name: String(c.name ?? "").trim(), fieldKey: c.fieldKey ?? null }))
    .filter((c) => c.id && c.name);
  return { ok: true, status: r.status, champs };
}

/** Crée un champ de contact TEXTE qui porte ce nom. Rend `null` sur un refus. */
export async function creerChampGhl(compte: CompteGhl, nom: string): Promise<ChampGhlExistant | null> {
  const r = await ghlRequete<{ customField?: { id?: string; name?: string; fieldKey?: string | null } }>(
    compte.token,
    `/locations/${encodeURIComponent(compte.locationId)}/customFields`,
    { method: "POST", body: { name: nom, dataType: "TEXT", model: "contact" } },
  );
  const id = String(r.data?.customField?.id ?? "").trim();
  if (!r.ok || !id) {
    console.warn(`[gohighlevel] le champ "${nom}" n'a pas pu etre cree (${r.status}) : ${r.erreur ?? ""}`);
    return null;
  }
  return { id, name: String(r.data?.customField?.name ?? nom), fieldKey: r.data?.customField?.fieldKey ?? null };
}

/**
 * Écrit des valeurs de champs personnalisés sur un contact : on liste les
 * champs du sous-compte, on crée ceux qui manquent, on écrit par
 * identifiant. Ne jette jamais, ne rend rien : le lead est déjà passé.
 */
export async function ecrireChampsGhl(compte: CompteGhl, contactId: string, voulus: readonly ChampGhlVoulu[]): Promise<void> {
  const liste = await listerChampsGhl(compte);
  if (!liste.ok) {
    // Sans le droit de lire les champs, on écrit ce qu'on peut par CLÉ
    // (le profil), et on nomme ce qui manque : ce n'est pas une panne,
    // c'est un scope à ajouter dans l'app puis une reconnexion.
    const parCle = voulus.filter((v) => v.cle).map((v) => ({ key: String(v.cle), field_value: v.valeur }));
    if (parCle.length > 0) {
      const c = await ghlRequete(compte.token, `/contacts/${encodeURIComponent(contactId)}`, {
        method: "PUT",
        body: { customFields: parCle },
      });
      if (!c.ok) console.warn(`[gohighlevel] le champ ${GHL_CHAMP_RESULTAT} n'a pas ete ecrit (${c.status}).`);
    }
    console.warn(
      `[gohighlevel] impossible de lister les champs personnalises (${liste.status}) : ` +
        `il manque probablement les scopes locations/customFields.readonly et .write, a ajouter dans l'app puis reconnecter. ` +
        `${voulus.length - parCle.length} champ(s) du formulaire non ecrit(s).`,
    );
    return;
  }

  const existants = [...liste.champs];
  for (const aCreer of planifierChampsGhl(existants, voulus).aCreer) {
    const cree = await creerChampGhl(compte, aCreer.nom);
    if (cree) existants.push(cree);
  }
  const plan = planifierChampsGhl(existants, voulus);
  if (plan.aEcrire.length === 0) return;
  const c = await ghlRequete(compte.token, `/contacts/${encodeURIComponent(contactId)}`, {
    method: "PUT",
    body: { customFields: plan.aEcrire.map((e) => ({ id: e.id, field_value: e.valeur })) },
  });
  if (!c.ok) console.warn(`[gohighlevel] ${plan.aEcrire.length} champ(s) personnalise(s) non ecrit(s) (${c.status}) : ${c.erreur ?? ""}`);
}

/** Pose un seul tag sur un contact retrouvé par email (le tag de partage). */
export async function poserTagGhl(compte: CompteGhl, email: string, tag: string): Promise<ResultatEnvoi> {
  return envoyerVersGhl(compte, { email, tags: [tag] });
}
