// lib/admin/affiliateSources.ts
//
// LES COMMISSIONS VIVENT DANS DEUX BASES. ON VA LIRE LES DEUX.
//
// Celles de Tiquiz sont chez Tipote (`affiliate_commissions` sur son
// Supabase, la source de vérité du tableau de bord des affiliées).
// Celles de l'Atelier sont chez l'Atelier. Aucune des deux n'est ici.
//
// -- FAIL-OPEN, MAIS JAMAIS EN SILENCE ---------------------------------
//
// Si une des deux ne répond pas, l'écran s'affiche quand même, ET il le
// dit. La règle du 8 juin : on n'affiche pas un total dont le
// dénominateur ment. "Tu dois 240 €" alors qu'une moitié manque est pire
// que pas de chiffre, parce que ça a l'air juste et qu'on le provisionne.
//
// -- LE SECRET EXISTE DÉJÀ ---------------------------------------------
//
// `PARTNER_SHARED_SECRET`, posé sur les trois serveurs. En créer un
// deuxième donnerait une variable de plus à poser partout, donc une
// occasion de plus de l'oublier sur un seul : c'est le drame du 19 août.

import type { CommissionRow, CommissionSource } from "./affiliatePayouts";
import { ATELIER_BASE_URL } from "@/lib/partner/atelierUrl";

/** Où vit chaque moitié. Écrit une seule fois. */
const ORIGINES: Readonly<Record<CommissionSource, string>> = {
  tiquiz: "https://app.tipote.com",
  atelier: ATELIER_BASE_URL,
};

export type SourceReason = "not_configured" | "forbidden" | "unreachable" | "read_failed";

export interface SourceState {
  reachable: boolean;
  reason?: SourceReason;
  /** Vrai quand la base a plus de lignes qu'on n'en a lues. */
  truncated?: boolean;
}

export interface AffiliateSourcesResult {
  rows: CommissionRow[];
  sources: Record<CommissionSource, SourceState>;
}

function texte(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/** Lit UNE source. Ne jette jamais : rend ses lignes, ou dit pourquoi non. */
async function lireUne(
  source: CommissionSource,
  secret: string,
): Promise<{ rows: CommissionRow[]; state: SourceState }> {
  try {
    const res = await fetch(`${ORIGINES[source]}/api/partner/affiliate-payouts`, {
      headers: { "x-partner-secret": secret },
      cache: "no-store",
    });
    if (res.status === 401) {
      // Les serveurs n'ont pas le meme secret. Erreur de configuration,
      // pas panne : on la nomme, parce que la correction n'est pas la meme.
      console.error(`[admin/affilies] secret refuse par ${source} : les .env divergent.`);
      return { rows: [], state: { reachable: false, reason: "forbidden" } };
    }
    if (!res.ok) {
      console.error(`[admin/affilies] ${source} a repondu ${res.status}`);
      return { rows: [], state: { reachable: false, reason: "read_failed" } };
    }

    const json = (await res.json()) as { ok?: boolean; rows?: unknown[]; truncated?: boolean };
    if (!json.ok) return { rows: [], state: { reachable: false, reason: "read_failed" } };

    const rows: CommissionRow[] = [];
    for (const brut of json.rows ?? []) {
      const r = (brut ?? {}) as Record<string, unknown>;
      const sa = String(r.sa ?? "").trim();
      if (!sa) continue;
      rows.push({
        // On impose la source NOUS, on ne la croit pas sur parole : c'est
        // elle qui dit a l'ecran de quel programme on parle.
        source,
        sa,
        name: texte(r.name),
        email: texte(r.email)?.toLowerCase() ?? null,
        productName: texte(r.productName),
        saleCents: Number(r.saleCents) || 0,
        commissionCents: Number(r.commissionCents) || 0,
        status: texte(r.status) ?? "pending",
        saleAt: texte(r.saleAt),
        paidAt: texte(r.paidAt),
        refundedAt: texte(r.refundedAt),
      });
    }
    return { rows, state: { reachable: true, truncated: Boolean(json.truncated) } };
  } catch (e) {
    console.error(
      `[admin/affilies] ${source} injoignable : ${e instanceof Error ? e.message : String(e)}`,
    );
    return { rows: [], state: { reachable: false, reason: "unreachable" } };
  }
}

/**
 * Lit les deux sources EN PARALLÈLE. Ne jette jamais.
 *
 * En série, une source lente retarderait l'autre pour rien : ce sont
 * deux serveurs différents qui ne s'attendent pas.
 */
export async function fetchAffiliateCommissions(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AffiliateSourcesResult> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) {
    console.warn(
      "[admin/affilies] PARTNER_SHARED_SECRET absent : aucune commission ne sera affichee.",
    );
    const manquant: SourceState = { reachable: false, reason: "not_configured" };
    return { rows: [], sources: { tiquiz: manquant, atelier: manquant } };
  }

  const [tiquiz, atelier] = await Promise.all([
    lireUne("tiquiz", secret),
    lireUne("atelier", secret),
  ]);

  return {
    rows: [...tiquiz.rows, ...atelier.rows],
    sources: { tiquiz: tiquiz.state, atelier: atelier.state },
  };
}
