// lib/pilotage/affilies.ts
//
// LE SUIVI DES AFFILIÉS, VU DEPUIS LA CONSOLE.
//
// Le registre des affiliés vit sur l'autre base, et il y reste : le
// copier ici donnerait deux registres, donc deux réponses différentes
// le jour où l'un prend du retard. On demande, on ne duplique pas.
//
// -- UN APPEL VERS L'AUTRE APP A TOUJOURS UN DÉLAI MAXIMUM ------------
//
// Sans deadline, une panne de l'autre côté garde la requête ouverte
// jusqu'à ce que la plateforme la tue, et l'écran reste à tourner. Le
// trou avait déjà été trouvé le 24 août sur `commissionnerVente` : deux
// appels vers la même app, un seul protégé.
//
// -- ET UNE PANNE NE VIDE PAS L'ÉCRAN, ELLE SE DIT --------------------
//
// Un tableau vide se lit "je n'ai aucun affilié", ce qui est faux et
// décourageant. On rend l'état de la liaison, et l'écran l'affiche.

import "server-only";

/** Le délai au delà duquel on renonce. Assez pour une base lente. */
const DELAI_MS = 12000;

export interface LigneAffilieDistante {
  sa: string;
  ref: string | null;
  email: string;
  nom: string | null;
  statut: string;
  alias: string[];
  clics: number;
  filleuls: number;
  ventes: number;
  tauxInscription: number | null;
  tauxVente: number | null;
  verseesCents: number;
  aVerserCents: number;
  sousGarantieCents: number;
  annuleesCents: number;
  autresDevises: number;
  derniereVente: string | null;
}

export type EtatLiaison =
  | { ok: true; manque: Record<string, boolean> }
  | {
      ok: false;
      // TROIS CAUSES, TROIS MESSAGES. Un seul texte pour "pas
      // configuré", "pas déployé" et "injoignable" oblige à deviner
      // laquelle, et c'est exactement le 404 muet du 19 août.
      raison: "not_configured" | "forbidden" | "pas-deploye" | "trop-lent" | "unreachable" | "read_failed";
      /** Le code HTTP reçu, quand il y en a eu un. */
      statut?: number;
    };

export interface AffiliesDistants {
  lignes: LigneAffilieDistante[];
  /** Adresse du client -> prénom de l'affilié qui l'a amené. */
  attributions: Record<string, string>;
  etat: EtatLiaison;
}

function origine(env: NodeJS.ProcessEnv): string {
  // Jamais une adresse locale : un `??` ne protège que de la variable
  // absente, jamais de la variable fausse (drame Véronique, 2 août).
  const brut = String(env.TIPOTE_BASE_URL ?? "").trim();
  if (/^https:\/\//i.test(brut) && !/localhost|127\.|::1|\.local/i.test(brut)) {
    return brut.replace(/\/+$/, "");
  }
  return "https://app.tipote.com";
}

export async function lireAffiliesDistants(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AffiliesDistants> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) {
    console.warn("[pilotage/affilies] PARTNER_SHARED_SECRET absent : aucun affilie affiche.");
    return { lignes: [], attributions: {}, etat: { ok: false, raison: "not_configured" } };
  }

  try {
    const res = await fetch(`${origine(env)}/api/partner/affilies`, {
      headers: { "x-partner-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(DELAI_MS),
    });

    if (res.status === 403 || res.status === 401) {
      // Les deux serveurs n'ont pas le même secret. C'est une erreur de
      // configuration, pas une panne : on la nomme, parce que la
      // correction n'est pas la même.
      console.error("[pilotage/affilies] secret refuse : les .env divergent.");
      return { lignes: [], attributions: {}, etat: { ok: false, raison: "forbidden" } };
    }
    if (res.status === 503) {
      return { lignes: [], attributions: {}, etat: { ok: false, raison: "not_configured" } };
    }
    if (res.status === 404) {
      // La porte n'existe pas encore SUR CE SERVEUR : la mise à jour de
      // l'espace affilié n'est pas déployée. C'est une attente, pas une
      // panne, et les deux ne se corrigent pas pareil.
      console.error("[pilotage/affilies] 404 : la route partenaire n'est pas deployee.");
      return { lignes: [], attributions: {}, etat: { ok: false, raison: "pas-deploye", statut: 404 } };
    }
    if (!res.ok) {
      console.error(`[pilotage/affilies] reponse ${res.status}`);
      return { lignes: [], attributions: {}, etat: { ok: false, raison: "read_failed", statut: res.status } };
    }

    const json = (await res.json()) as {
      ok?: boolean;
      lignes?: LigneAffilieDistante[];
      attributions?: Record<string, string>;
      manque?: Record<string, boolean>;
    };
    if (!json.ok) return { lignes: [], attributions: {}, etat: { ok: false, raison: "read_failed" } };

    return {
      lignes: Array.isArray(json.lignes) ? json.lignes : [],
      attributions: json.attributions ?? {},
      etat: { ok: true, manque: json.manque ?? {} },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[pilotage/affilies] injoignable : ${message}`);
    // Un abandon sur délai n'est pas une panne de réseau : l'un se
    // corrige en allégeant la requête, l'autre en regardant le serveur.
    const tropLent = /abort|timeout|timed out/i.test(message);
    return {
      lignes: [],
      attributions: {},
      etat: { ok: false, raison: tropLent ? "trop-lent" : "unreachable" },
    };
  }
}
