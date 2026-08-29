// lib/admin/atelier.ts
//
// TIQUIZ VA CHERCHER CE QUE L'ATELIER SAIT DE SES ÉLÈVES.
//
// Béné, 21 août : "tu peux pas centraliser ?" puis "sinon c'est tout
// sauf fiable et exhaustif". Les deux apps ont chacune leur base : un
// écran unique suppose donc que l'une lise l'autre.
//
// -- FAIL-OPEN, MAIS JAMAIS EN SILENCE ---------------------------------
//
// Si l'Atelier ne répond pas, le tableau de bord de Tiquiz doit
// s'afficher quand même : un écran vide serait une régression pour une
// panne qui ne le concerne pas. Mais il doit le DIRE, et c'est le point
// qui compte.
//
// La règle du 8 juin : on n'affiche pas un total dont le dénominateur
// ment. Un chiffre d'affaires qui perd la moitié de son contenu sans
// prévenir vaut moins que pas de chiffre du tout, parce qu'il a l'air
// juste. D'où `reachable`, que l'écran affiche en toutes lettres.
//
// -- LE SECRET EXISTE DÉJÀ ---------------------------------------------
//
// `PARTNER_SHARED_SECRET`, posé sur les deux serveurs depuis le pont
// métriques. En créer un deuxième donnerait une variable de plus à
// poser des deux côtés, donc une occasion de plus de l'oublier sur un
// seul : c'est le drame du 19 août.

import type { Sale } from "@/lib/checkout/sales";
import { ATELIER_BASE_URL } from "@/lib/partner/atelierUrl";

/** Ce que l'Atelier sait d'une personne. */
export interface AtelierPerson {
  email: string;
  name: string | null;
  /** `active` = élève inscrit. */
  status: string | null;
  tier: string | null;
  grantedAt: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
  daysDone: number;
}

export interface AtelierView {
  /** A-t-on VRAIMENT pu lire l'Atelier ? */
  reachable: boolean;
  /** Renseigné quand `reachable` est faux, pour le journal. */
  reason?:
    | "not_configured"
    | "forbidden"
    | "pas-deploye"
    | "trop-lent"
    | "unreachable"
    | "read_failed";
  people: AtelierPerson[];
  sales: Sale[];
}

const VIDE: AtelierView = { reachable: false, people: [], sales: [] };

function texte(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * Lit l'Atelier. Ne jette JAMAIS.
 *
 * Une panne de l'Atelier ne doit pas faire tomber le tableau de bord de
 * Tiquiz : elle doit le rendre incomplet ET visible.
 */
/**
 * Ce qu'on accepte d'attendre de l'Atelier.
 *
 * Douze secondes : la meme valeur que l'espace affilie. Au dela, on rend
 * `reachable: false` avec sa raison, et l'ecran le DIT. Une liaison
 * lente ne doit pas faire attendre tout le tableau de bord.
 */
const DELAI_MS = 12000;

export async function fetchAtelier(env: NodeJS.ProcessEnv = process.env): Promise<AtelierView> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) {
    console.warn(
      "[admin/atelier] PARTNER_SHARED_SECRET absent : l'Atelier ne sera pas dans le tableau de bord.",
    );
    return { ...VIDE, reason: "not_configured" };
  }

  try {
    const res = await fetch(`${ATELIER_BASE_URL}/api/partner/pilotage`, {
      headers: { "x-partner-secret": secret },
      cache: "no-store",
      // UN DÉLAI MAXIMUM, comme tout appel vers une autre app. Sans lui,
      // une panne de l'Atelier garde la requête ouverte jusqu'à ce que
      // la plateforme la tue, et TOUT le tableau de bord attend avec
      // elle. C'est le trou n°5 de l'audit du 24 août, jamais rebouché
      // ici : `lireAffiliesDistants` avait le sien, celui-ci non.
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (res.status === 401) {
      // Les deux serveurs n'ont pas le meme secret. C'est une erreur de
      // configuration, pas une panne : on la nomme.
      console.error("[admin/atelier] secret refuse par l'Atelier : les deux .env divergent.");
      return { ...VIDE, reason: "forbidden" };
    }
    if (res.status === 404) {
      // La porte n'existe pas encore SUR CE SERVEUR : la mise a jour de
      // l'Atelier n'est pas deployee. C'est une attente, pas une panne,
      // et les deux ne se corrigent pas au meme endroit.
      console.error("[admin/atelier] 404 : la route partenaire n'est pas deployee.");
      return { ...VIDE, reason: "pas-deploye" };
    }
    if (!res.ok) {
      console.error(`[admin/atelier] l'Atelier a repondu ${res.status}`);
      return { ...VIDE, reason: "read_failed" };
    }

    const json = (await res.json()) as {
      ok?: boolean;
      people?: unknown[];
      sales?: unknown[];
    };
    if (!json.ok) return { ...VIDE, reason: "read_failed" };

    const people: AtelierPerson[] = [];
    for (const brut of json.people ?? []) {
      const p = (brut ?? {}) as Record<string, unknown>;
      const email = String(p.email ?? "").trim().toLowerCase();
      if (!email) continue;
      people.push({
        email,
        name: texte(p.name),
        status: texte(p.status),
        tier: texte(p.tier),
        grantedAt: texte(p.grantedAt),
        createdAt: texte(p.createdAt),
        lastSignIn: texte(p.lastSignIn),
        daysDone: Number(p.daysDone) || 0,
      });
    }

    // Les ventes arrivent deja pliees par `buildSales` cote Atelier. On
    // les marque par leur PRODUIT pour que le tableau "quels plans sont
    // vendus" distingue l'Atelier des abonnements Tiquiz.
    const sales: Sale[] = [];
    for (const brut of json.sales ?? []) {
      const v = (brut ?? {}) as Record<string, unknown>;
      const ref = String(v.ref ?? "").trim();
      if (!ref) continue;
      const provider = v.provider === "paypal" ? "paypal" : "stripe";
      sales.push({
        // Le prefixe evite qu'une reference de l'Atelier se confonde
        // avec une des notres dans une cle de deduplication.
        ref: `atelier:${ref}`,
        provider,
        email: texte(v.email)?.toLowerCase() ?? null,
        name: texte(v.name),
        productId: texte(v.productId) ? `atelier-${texte(v.productId)}` : "atelier",
        amountCents: Number(v.amountCents) || 0,
        // L'Atelier encaisse par Stripe ou PayPal : ses ventes portent
        // la somme reellement prise, comme les notres.
        amountSource: "payload",
        currency: texte(v.currency) ?? "eur",
        paidAt: texte(v.paidAt) ?? new Date(0).toISOString(),
        refundedAt: texte(v.refundedAt),
      });
    }

    return { reachable: true, people, sales };
  } catch (e) {
    // "Trop lent" et "injoignable" ne se corrigent pas au meme endroit :
    // l'un est une app qui rame, l'autre une app qui ne repond plus.
    const trop = e instanceof Error && e.name === "TimeoutError";
    console.error(
      `[admin/atelier] ${trop ? "trop lent" : "injoignable"} : ${e instanceof Error ? e.message : String(e)}`,
    );
    return { ...VIDE, reason: trop ? "trop-lent" : "unreachable" };
  }
}

/**
 * LES VENTES DE L'ATELIER NE SE REMBOURSENT PAS DEPUIS TIQUIZ.
 *
 * Elles sont encaissées sur le compte Stripe de Béné, mais c'est
 * l'Atelier qui a la route de remboursement, et c'est lui qui sait
 * couper l'accès et envoyer l'email de départ. Rembourser d'ici
 * reprendrait l'argent SANS retirer l'accès ni prévenir l'élève : la
 * moitié d'une décision, et on sait où ça mène dans ce dépôt.
 */
export function isAtelierSale(ref: string | null | undefined): boolean {
  return String(ref ?? "").startsWith("atelier:");
}
