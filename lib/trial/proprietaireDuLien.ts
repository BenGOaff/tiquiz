// lib/trial/proprietaireDuLien.ts
//
// À QUI APPARTIENT CE LIEN D'AFFILIATION ?
//
// La table `affiliates` vit chez TIPOTE : c'est la source de vérité du
// tableau de bord des affiliées. Tiquiz, qui traite l'inscription, doit
// donc poser la question pour pouvoir refuser quelqu'un qui s'inscrit
// par son PROPRE lien. Copier la table ici donnerait deux registres,
// donc deux réponses différentes le jour où l'un prend du retard.
//
// -- CE QU'ON FAIT QUAND ON NE SAIT PAS --------------------------------
//
// Si Tipote ne répond pas, on ne sait ni qui est l'affiliée, ni si elle
// est active. On rend `inconnu`, et l'appelant N'OFFRE RIEN : offrir un
// mois au nom d'une affiliée qu'on n'a pas pu vérifier, c'est ouvrir la
// porte au premier identifiant inventé. Un cadeau manqué se rattrape,
// une fraude non.

import { prenomPublic } from "@/lib/affiliate/nomPublic";

const TIPOTE_PAR_DEFAUT = "https://app.tipote.com";

export interface ProprietaireDuLien {
  /** On a pu poser la question ET obtenir une réponse. */
  connu: boolean;
  existe: boolean;
  actif: boolean;
  email: string | null;
  /**
   * Son PRÉNOM, pour la nommer sur la page d'inscription (Béné, 27 août
   * 2026 : "Jocelyne te propose de tester Tiquiz gratuitement").
   *
   * Tipote ne le renvoie que si elle est ACTIVE, et jamais le nom
   * complet. `null` est un cas normal, pas une panne : l'écran dit
   * alors "un partenaire Tiquiz", ce qui est vrai et ne trahit
   * personne.
   */
  nomPublic: string | null;
}

const INCONNU: ProprietaireDuLien = {
  connu: false,
  existe: false,
  actif: false,
  email: null,
  nomPublic: null,
};

/** L'app qui porte le registre. Validée, jamais locale (drame Véronique). */
export function tipoteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const brut = String(env.TIPOTE_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https:\/\/[^/]+$/.test(brut) && !/localhost|127\.|::1|\.local/.test(brut)) return brut;
  return TIPOTE_PAR_DEFAUT;
}

/**
 * L'affiliée derrière un CODE PUBLIC (`?ref=jocelyne`).
 *
 * Le paramètre s'appelle `ref` et pas `sa` depuis le 24 août 2026 : nos
 * liens ne portent plus l'identifiant Systeme.io (Béné : "je ne veux
 * surtout pas de sa dans les nouveaux liens"). Tipote traduit le code
 * en affiliée contre sa table, y compris les ANCIENS codes d'une
 * affiliée qui a changé le sien.
 */
export async function proprietaireDuLien(ref: string): Promise<ProprietaireDuLien> {
  const secret = (process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!secret || !ref) return INCONNU;
  try {
    const res = await fetch(`${tipoteBaseUrl()}/api/affiliate/proprietaire`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      body: JSON.stringify({ ref }),
      // Une inscription attend derrière : on ne la fait pas patienter
      // pendant que l'autre app redémarre.
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return INCONNU;
    const j = (await res.json()) as {
      ok?: boolean;
      existe?: boolean;
      actif?: boolean;
      email?: string | null;
      nomPublic?: string | null;
    };
    if (!j.ok) return INCONNU;
    return {
      connu: true,
      existe: !!j.existe,
      actif: !!j.actif,
      email: j.email ?? null,
      // Repassé par la MÊME règle qu'à l'émission : ce mot va dans une
      // page publique, et la moitié d'une règle n'est pas une règle.
      nomPublic: prenomPublic(j.nomPublic),
    };
  } catch {
    return INCONNU;
  }
}
