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

/** Le slug de page de vente servi par cet hôte, ou `null`. */
export function salesSlugForHost(host: string | null | undefined): string | null {
  const h = String(host ?? "").trim().toLowerCase().split(":")[0];
  return SALES_HOSTS[h] ?? null;
}

/** Cet hôte est-il un domaine de vente public ? */
export function isPublicSalesHost(host: string | null | undefined): boolean {
  return salesSlugForHost(host) !== null;
}
