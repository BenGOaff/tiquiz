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

/**
 * Attribue un code public à tous ceux qui n'en ont pas.
 *
 * Une action explicite, jamais un effet de bord de l'affichage : une
 * page qui dit regarder ne doit pas écrire, sinon un rafraîchissement
 * devient une écriture et personne ne sait plus d'où vient quoi.
 */
export async function attribuerCodesManquants(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ ok: boolean; attribues: number; echecs: string[]; raison?: string }> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) return { ok: false, attribues: 0, echecs: [], raison: "not_configured" };

  try {
    const res = await fetch(`${origine(env)}/api/partner/affilies/codes`, {
      method: "POST",
      headers: { "x-partner-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      attribues?: number;
      echecs?: string[];
      reason?: string;
    } | null;
    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        attribues: 0,
        echecs: [],
        raison: json?.reason ?? (res.status === 404 ? "pas-deploye" : `http_${res.status}`),
      };
    }
    return { ok: true, attribues: json.attribues ?? 0, echecs: json.echecs ?? [] };
  } catch (e) {
    console.error(
      `[pilotage/affilies] codes : ${e instanceof Error ? e.message : String(e)}`,
    );
    return { ok: false, attribues: 0, echecs: [], raison: "unreachable" };
  }
}

// ── LA FICHE D'UN AFFILIÉ ────────────────────────────────────────────

export interface AchatFilleul {
  produit: string | null;
  commissionCents: number;
  devise: string;
  etat: "versee" | "a-verser" | "sous-garantie" | "annulee";
  le: string;
}

export interface Filleul {
  email: string;
  arriveLe: string | null;
  achats: AchatFilleul[];
  gagneCents: number;
}

/** Ce qu'il gagne aujourd'hui, et ce qui l'attend à la marche suivante. */
export interface RecompenseAffiliee {
  choix: "commissions" | "abonnement";
  tauxPct: number;
  /** Un accord négocié, qui passe devant le barème. */
  tauxNegocie: boolean;
  remisePct: number;
  prochaineMarcheManque: number | null;
  prochaineMarcheValeur: number | null;
}

/** Où part son argent. L'IBAN n'est là QUE sous forme de masque. */
export interface VersementAffiliee {
  methode: "paypal" | "virement" | null;
  /** A-t-il CHOISI, ou est-ce déduit d'une ligne historique ? */
  explicite: boolean;
  paypalEmail: string | null;
  ibanMasque: string | null;
  titulaire: string | null;
  mandatAccepteLe: string | null;
  manques: string[];
}

export interface FactureAffiliee {
  numero: string;
  genre: string;
  periode: string;
  htCents: number;
  ttcCents: number;
  currency: string;
  emiseLe: string | null;
  versee: boolean;
}

/** Les quatre poches, qui ne se recouvrent pas. */
export interface ArgentAffiliee {
  aVenirCents: number;
  sousGarantieCents: number;
  aVerserCents: number;
  verseCents: number;
  annuleCents: number;
  autresDevises: number;
}

export interface FicheAffilieDistante {
  affilie: {
    sa: string;
    email: string;
    display_name: string | null;
    status: string | null;
    ref: string | null;
    created_at: string | null;
    alias: string[];
  };
  filleuls: Filleul[];
  /** Ceux qui ont acheté au moins une fois, annulations comprises. */
  acheteurs: number;
  /**
   * CEUX QUI COMPTENT POUR LE PALIER, et eux seuls (Béné, 31 août) :
   * "client payant = augmente le %, client gratuit = aucun impact".
   * Optionnel comme le reste : voir plus bas.
   */
  payants?: number;
  // TOUT CE QUI SUIT EST OPTIONNEL, ET CE N'EST PAS DU CONFORT.
  //
  // Le centre de pilotage et le registre sont DEUX serveurs, déployés
  // séparément. Entre les deux déploiements, l'un répond sans ces
  // champs : les rendre obligatoires ferait planter la fiche entière
  // pendant ce temps là, sur un écran qui marchait très bien avant.
  recompense?: RecompenseAffiliee;
  versement?: VersementAffiliee;
  factures?: FactureAffiliee[];
  argent?: ArgentAffiliee;
}

/**
 * La fiche d'un affilié, ou `null` avec sa raison.
 *
 * `null` et "introuvable" ne sont pas la même chose : l'un veut dire
 * que la liaison a échoué, l'autre que cet identifiant n'existe pas.
 * Les confondre enverrait chercher au mauvais endroit.
 */
export async function lireFicheAffiliee(
  sa: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ fiche: FicheAffilieDistante | null; raison?: string }> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) return { fiche: null, raison: "not_configured" };

  try {
    const res = await fetch(`${origine(env)}/api/partner/affilies/${encodeURIComponent(sa)}`, {
      headers: { "x-partner-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (res.status === 404) {
      const j = (await res.json().catch(() => null)) as { reason?: string } | null;
      return { fiche: null, raison: j?.reason === "introuvable" ? "introuvable" : "pas-deploye" };
    }
    if (!res.ok) return { fiche: null, raison: `http_${res.status}` };
    const j = (await res.json()) as { ok?: boolean } & FicheAffilieDistante;
    if (!j?.ok) return { fiche: null, raison: "read_failed" };
    return {
      fiche: {
        affilie: j.affilie,
        filleuls: j.filleuls ?? [],
        acheteurs: j.acheteurs ?? 0,
        payants: j.payants,
        recompense: j.recompense,
        versement: j.versement,
        factures: j.factures ?? [],
        argent: j.argent,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[pilotage/affilies] fiche injoignable : ${message}`);
    return { fiche: null, raison: /abort|timeout/i.test(message) ? "trop-lent" : "unreachable" };
  }
}

// ── CE QUE L'AFFILIATION COÛTE SUR UNE PÉRIODE ───────────────────────

import type { CoutAffiliation } from "@/lib/pilotage/business";
import { COUT_INCONNU } from "@/lib/pilotage/business";

/**
 * Ce qui sort en commissions sur cette période.
 *
 * Une liaison muette rend `null`, jamais un coût de zéro : "je n'ai pas
 * pu lire" et "l'affiliation n'a rien coûté" sont deux réponses
 * différentes, et la seconde ferait afficher une marge fausse.
 */
export async function lireCoutAffiliation(
  bornes: { debut: string | null; fin: string | null },
  env: NodeJS.ProcessEnv = process.env,
): Promise<CoutAffiliation | null> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) return null;

  const q = new URLSearchParams();
  if (bornes.debut) q.set("debut", bornes.debut);
  if (bornes.fin) q.set("fin", bornes.fin);

  try {
    const res = await fetch(
      `${origine(env)}/api/partner/commissions-periode${q.toString() ? `?${q}` : ""}`,
      {
        headers: { "x-partner-secret": secret },
        cache: "no-store",
        signal: AbortSignal.timeout(DELAI_MS),
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean } & Record<string, number | boolean>;
    if (!j?.ok) return null;
    return {
      ...COUT_INCONNU,
      duesCents: Number(j.dues) || 0,
      sousGarantieCents: Number(j.sousGarantie) || 0,
      verseesCents: Number(j.versees) || 0,
      annuleesCents: Number(j.annulees) || 0,
      autresDevises: Number(j.autresDevises) || 0,
      tronque: Boolean(j.tronque),
    };
  } catch (e) {
    console.error(
      `[pilotage/affilies] cout injoignable : ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

// ── QUI A UN COMPTE TIPOTE ───────────────────────────────────────────
//
// Béné, 29 août : "de QUOI il est client ? Tiquiz ? Atelier ? Tipote ?"
//
// La console lit la base de Tiquiz. Sans cet appel, la pastille Tipote
// serait affichée à partir de rien, donc fausse : une pastille qu'on ne
// peut pas prouver est pire qu'une pastille absente.

export type ComptesTipote =
  | { ok: true; comptes: Record<string, string>; tronque: boolean }
  // MUET N'EST PAS VIDE. Rendre `{}` ferait disparaître la pastille de
  // tout le monde et se lirait "personne n'est client Tipote", ce qui
  // est une affirmation qu'on ne peut pas soutenir.
  | { ok: false; raison: string };

export async function lireComptesTipote(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ComptesTipote> {
  const secret = String(env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) return { ok: false, raison: "not_configured" };

  try {
    const res = await fetch(`${origine(env)}/api/partner/comptes`, {
      headers: { "x-partner-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (res.status === 403 || res.status === 401) return { ok: false, raison: "forbidden" };
    if (res.status === 503) return { ok: false, raison: "not_configured" };
    if (res.status === 404) return { ok: false, raison: "pas-deploye" };
    if (!res.ok) return { ok: false, raison: "read_failed" };

    const json = (await res.json()) as {
      ok?: boolean;
      comptes?: Record<string, string>;
      tronque?: boolean;
    };
    if (!json?.ok) return { ok: false, raison: "read_failed" };
    return { ok: true, comptes: json.comptes ?? {}, tronque: Boolean(json.tronque) };
  } catch (e) {
    const trop = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, raison: trop ? "trop-lent" : "unreachable" };
  }
}
