// lib/sales/salesHosts.ts
//
// LE DOMAINE PUBLIC DE LA PAGE DE VENTE.
//
// Chantier du 20 août : `tiquiz.fr` sert la page de vente et le bon de
// commande, à la place de Systeme.io.
//
// -- CE QUE CE FICHIER DÉCIDE, ET POURQUOI IL EST SEUL À LE FAIRE ------
//
// Trois endroits ont besoin de la même réponse, et si l'un d'eux
// répondait autrement on aurait soit une page en chantier publiée par
// accident, soit une page de vente en 404 le jour du lancement :
//
//   1. le middleware, qui laisse passer l'hôte et réécrit `/` ;
//   2. la route de la page de vente, qui décide d'ouvrir sans clé ;
//   3. le bon de commande, qui décide la même chose.
//
// -- LA PORTE S'OUVRE PAR L'HÔTE, PLUS PAR LA CLÉ ---------------------
//
// Tant que rien n'était annoncé, `?k=` était la seule entrée. Un domaine
// public change la question : sur `tiquiz.fr`, la page DOIT être
// ouverte, sinon le domaine ne sert à rien. Sur `quiz.tipote.com`, elle
// reste fermée, parce que c'est l'app et pas la vitrine.
//
// Un `Host` peut être falsifié en tapant le serveur en direct. Ça
// n'ouvre rien de sensible : ces pages sont publiques par destination,
// c'est justement ce qu'on est en train de décider. La clé, elle, reste
// la seule entrée tant que le domaine n'est pas branché.

/** Les domaines qui servent une page de vente, et laquelle. */
export const SALES_HOSTS: Readonly<Record<string, string>> = {
  "tiquiz.fr": "tiquiz",
  "www.tiquiz.fr": "tiquiz",
};

/**
 * L'ADRESSE CANONIQUE D'UNE PAGE DE VENTE, UNE FOIS SON DOMAINE EN LIGNE.
 *
 * Tant que la page n'était qu'un aperçu derrière `?k=`, sa canonique
 * devait désigner l'originale sur Systeme.io : deux copies de la même
 * page se seraient fait concurrence sur les mêmes mots.
 *
 * Le jour où le domaine devient public, la réponse s'inverse. Laisser la
 * canonique sur `tipote.fr` reviendrait à dire à Google "la vraie page
 * est ailleurs", donc à acheter un domaine qui ne pourra jamais remonter.
 * Béné, 19 août : "il faudra aussi optimiser le référencement à chaque
 * étape pour que ces pages rankent correctement."
 *
 * Sans `www` : c'est l'adresse qu'on communique, et une seule des deux
 * formes doit être canonique.
 */
export const PUBLIC_SALES_CANONICAL: Readonly<Record<string, string>> = {
  tiquiz: "https://tiquiz.fr/",
};

/** L'adresse canonique publique de cette page, ou `null` si elle n'en a pas encore. */
export function publicSalesCanonical(slug: string | null | undefined): string | null {
  const propre = String(slug ?? "").trim().toLowerCase();
  return PUBLIC_SALES_CANONICAL[propre] ?? null;
}

/** Le slug de page de vente servi par cet hôte, ou `null`. */
export function salesSlugForHost(host: string | null | undefined): string | null {
  const h = String(host ?? "").trim().toLowerCase().split(":")[0];
  return SALES_HOSTS[h] ?? null;
}

/** Cet hôte est-il un domaine de vente public ? */
export function isPublicSalesHost(host: string | null | undefined): boolean {
  return salesSlugForHost(host) !== null;
}

/**
 * SUR QUEL DOMAINE RAMENER L'ACHETEUR APRÈS SON PAIEMENT.
 *
 * Trouvé le 20 août, avant que ça ne coûte une vente. L'URL de retour
 * était construite depuis `APP_URL`, donc `quiz.tipote.com`. Un
 * acheteur venu de `tiquiz.fr` n'a AUCUNE clé dans son URL
 * (c'est tout l'intérêt du domaine public) : il serait renvoyé sur un
 * domaine où la porte est fermée, et il aurait vu une page 404 juste
 * après avoir payé.
 *
 * La règle est donc : **on ramène l'acheteur là où il a acheté.** C'est
 * aussi ce qu'il attend, et c'est ce que son navigateur affichera dans
 * la barre d'adresse pendant tout le parcours.
 *
 * `origin` n'est utilisé QUE s'il fait partie de nos domaines de vente :
 * un `Host` falsifié ne peut donc pas détourner le retour de paiement
 * vers un site tiers. Partout ailleurs, on garde le domaine canonique.
 */
export function checkoutReturnBase(
  origin: string | null | undefined,
  canonique: string,
): string {
  const propre = String(origin ?? "").trim().replace(/\/$/, "");
  if (!propre) return canonique;
  let host: string | null = null;
  try {
    host = new URL(propre).host;
  } catch {
    return canonique;
  }
  return isPublicSalesHost(host) ? propre : canonique;
}
