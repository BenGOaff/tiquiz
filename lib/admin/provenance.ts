// lib/admin/provenance.ts
//
// D'OÙ VIENT CETTE PERSONNE.
//
// Béné, 22 août : "Retrouver toutes ses infos (...) savoir d'où il
// vient, ce qu'il a comme accès ce qu'il a payé etc ?"
//
// La question a une réponse, et elle dormait dans `webhook_logs` : le
// tout premier appel reçu pour cette adresse porte l'URL du tunnel par
// lequel elle est entrée. Un optin sur `tipote.fr/part-tiquiz-gratuit`
// vient d'une affiliée ; le même sur `tipote.fr/tiquiz-gratuit` vient
// d'elle. Ce n'est pas un détail : c'est la différence entre "mon
// contenu marche" et "mes affiliées travaillent".
//
// -- CE QU'ON NE SAIT PAS, ON NE L'INVENTE PAS -------------------------
//
// `webhook_logs` ne remonte qu'au 7 août (drame Ivan). Quelqu'un entré
// avant n'a PAS de provenance chez nous, et l'écran doit dire "on ne
// sait pas" au lieu d'afficher un tiret qui se lit "venu de nulle part".

/** Une ligne de journal, réduite à ce qu'on lit ici. */
export interface LigneProvenance {
  source: string | null;
  event_type: string | null;
  payload: unknown;
  created_at: string;
}

export interface Provenance {
  /** L'URL du tunnel d'entrée, normalisée, ou `null`. */
  tunnel: string | null;
  /** Quand on l'a vue pour la première fois. */
  quand: string | null;
  /**
   * Est-elle entrée par un lien d'affiliée ?
   *
   * Les tunnels affiliés de Béné portent tous `part-` dans leur adresse
   * (`tipote.fr/part-tiquiz-gratuit`) ou finissent par `-part`. C'est SA
   * convention, relevée dans `URL_TO_PLAN`, pas une devinette.
   */
  parAffiliee: boolean;
  /** Le type d'événement d'entrée, pour que la phrase soit juste. */
  evenement: string | null;
}

const VIDE: Provenance = { tunnel: null, quand: null, parAffiliee: false, evenement: null };

function deepGet(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

function premier(payload: unknown, chemins: readonly string[]): string | null {
  for (const c of chemins) {
    const v = deepGet(payload, c);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

const EMAIL_PATHS = [
  "contact.email",
  "data.contact.email",
  "customer.email",
  "data.customer.email",
  "email",
] as const;

const URL_PATHS = [
  "funnel.url",
  "data.funnel.url",
  "funnel_step.url",
  "data.funnel_step.url",
  "order.source_url",
  "data.order.source_url",
  "source_url",
  "data.source_url",
] as const;

/** `https://www.tipote.fr/tiquiz-gratuit/` -> `tipote.fr/tiquiz-gratuit`. */
export function normaliserTunnel(url: string | null | undefined): string | null {
  if (!url) return null;
  const t = String(url).trim().toLowerCase();
  if (!t) return null;
  return (
    t
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "") || null
  );
}

/**
 * Ce tunnel appartient-il à une affiliée ?
 *
 * Convention de Béné, relevée dans `URL_TO_PLAN` : `part-tiquiz-...` ou
 * `...-plus-part`. On ne cherche pas `part` n'importe où, sinon
 * `tipote.fr/participer` deviendrait un lien affilié.
 */
export function estTunnelAffilie(tunnel: string | null): boolean {
  if (!tunnel) return false;
  return /\/part-/.test(tunnel) || /-part$/.test(tunnel);
}

/**
 * La provenance d'une adresse, lue dans le journal.
 *
 * On prend le PLUS ANCIEN événement qui la nomme : c'est son entrée. Le
 * plus récent dirait par où elle est repassée, ce qui est une autre
 * question et une réponse trompeuse (quelqu'un qui achète après six mois
 * paraîtrait "venu du bon de commande").
 */
export function readProvenance(
  lignes: readonly LigneProvenance[],
  email: string,
): Provenance {
  const cible = String(email ?? "").trim().toLowerCase();
  if (!cible) return VIDE;

  let meilleure: LigneProvenance | null = null;
  for (const l of lignes) {
    const e = premier(l.payload, EMAIL_PATHS)?.toLowerCase();
    if (e !== cible) continue;
    const t = Date.parse(l.created_at);
    if (!Number.isFinite(t)) continue;
    if (!meilleure || t < Date.parse(meilleure.created_at)) meilleure = l;
  }
  if (!meilleure) return VIDE;

  const tunnel = normaliserTunnel(premier(meilleure.payload, URL_PATHS));
  return {
    tunnel,
    quand: meilleure.created_at,
    parAffiliee: estTunnelAffilie(tunnel),
    evenement: meilleure.event_type ?? null,
  };
}
