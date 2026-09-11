// lib/affiliate/posterTipote.ts
//
// L'APPEL VERS LE REGISTRE D'AFFILIÉS DE TIPOTE, ET RIEN D'AUTRE.
//
// Un seul endroit sait construire l'adresse et poser le secret : le
// webhook (à la vente) et le rejeu (plus tard) envoient EXACTEMENT le
// même appel. Deux constructions d'adresse finiraient par diverger, et
// un rejeu qui frappe une autre porte que l'appel d'origine ne
// rattraperait rien.
//
// Il ne DÉCIDE rien : ce qu'un échec veut dire vit dans
// `filetCommission.ts` (pur), ce qu'on en fait dans `ownerSale.ts` et
// `filetCommissionStore.ts`.

import "server-only";

import type { ActionCommission } from "./filetCommission";

const ENDPOINT_PAR_DEFAUT = "https://app.tipote.com/api/affiliate/attribute-sale";

/** L'adresse de chaque action, dérivée d'UNE variable. */
export function endpointTipote(action: ActionCommission): string {
  const attribuer = process.env.TIPOTE_AFFILIATE_ENDPOINT?.trim() || ENDPOINT_PAR_DEFAUT;
  return action === "attribuer" ? attribuer : attribuer.replace(/\/attribute-sale$/, "/cancel-sale");
}

export type ReponseTipote =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; statut: number | null; detail: string };

/**
 * Poste un corps vers Tipote. Ne jette JAMAIS : un échec est une
 * réponse, avec son statut HTTP quand il y en a un, `null` quand c'est
 * le réseau qui a lâché. `secret` absent est un échec sans statut, et
 * il se dit : sans lui, aucune vente ne paie personne.
 */
export async function posterVersTipote(action: ActionCommission, corps: unknown): Promise<ReponseTipote> {
  const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
  if (!secret) return { ok: false, statut: null, detail: "AFFILIATE_INTERNAL_SECRET absente du serveur Tiquiz" };
  try {
    const res = await fetch(endpointTipote(action), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      // UN APPEL SANS DÉLAI MAXIMUM BLOQUE LE WEBHOOK QUI L'APPELLE
      // (audit du 24 août). La commission peut attendre, l'accès du
      // client non : et depuis le 11 septembre, attendre ne perd rien.
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify(corps),
    });
    if (!res.ok) {
      const texte = await res.text().catch(() => "");
      return { ok: false, statut: res.status, detail: texte.slice(0, 200) };
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: true, json };
  } catch (e) {
    return { ok: false, statut: null, detail: e instanceof Error ? e.message : String(e) };
  }
}
