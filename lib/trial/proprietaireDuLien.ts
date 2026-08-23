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

const TIPOTE_PAR_DEFAUT = "https://app.tipote.com";

export interface ProprietaireDuLien {
  /** On a pu poser la question ET obtenir une réponse. */
  connu: boolean;
  existe: boolean;
  actif: boolean;
  email: string | null;
}

const INCONNU: ProprietaireDuLien = { connu: false, existe: false, actif: false, email: null };

/** L'app qui porte le registre. Validée, jamais locale (drame Véronique). */
export function tipoteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const brut = String(env.TIPOTE_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https:\/\/[^/]+$/.test(brut) && !/localhost|127\.|::1|\.local/.test(brut)) return brut;
  return TIPOTE_PAR_DEFAUT;
}

export async function proprietaireDuLien(sa: string): Promise<ProprietaireDuLien> {
  const secret = (process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!secret || !sa) return INCONNU;
  try {
    const res = await fetch(`${tipoteBaseUrl()}/api/affiliate/proprietaire`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      body: JSON.stringify({ sa }),
      // Une inscription attend derrière : on ne la fait pas patienter
      // pendant que l'autre app redémarre.
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return INCONNU;
    const j = (await res.json()) as { ok?: boolean; existe?: boolean; actif?: boolean; email?: string | null };
    if (!j.ok) return INCONNU;
    return {
      connu: true,
      existe: !!j.existe,
      actif: !!j.actif,
      email: j.email ?? null,
    };
  } catch {
    return INCONNU;
  }
}
