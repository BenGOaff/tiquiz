// lib/sales/chantier.ts
//
// UNE PAGE EN CHANTIER RESTE FERMÉE, MÊME SUR LE DOMAINE PUBLIC.
//
// Béné, 2 septembre 2026 : "je ne veux pas que tu la mettes directement
// en ligne, il faut que tu construises une version de travail en
// dupliquant la page actuelle. Elle ne doit pas être indexée ni rien, je
// veux juste voir sa version en ligne pour corriger."
//
// -- LE TROU QUE CE MODULE FERME ---------------------------------------
//
// `isSalesOpen` répond OUI à tout ce qui arrive sur un hôte de vente :
// c'est voulu, `tiquiz.fr` doit servir sa page sans clé. Mais la route
// d'aperçu sert N'IMPORTE QUEL slug de `PAGES`. Ajouter `tiquiz-v2` à
// cette table aurait donc publié le chantier sur `tiquiz.fr`, indexable,
// avec la mesure d'audience et les données de marque, c'est à dire
// exactement le contraire de ce qu'elle demande.
//
// Et ça se serait vu à quoi ? À rien. La page aurait juste été en ligne.
//
// -- LA RÈGLE ----------------------------------------------------------
//
// Un slug listé ici est un CHANTIER : il exige la clé partout, y compris
// sur le domaine public, et il n'est jamais indexable. Retirer une page
// de cette liste est le geste qui la publie, et c'est un geste explicite
// que personne ne fait par accident.
//
// L'inverse (une liste des pages publiques) serait plus dangereux : une
// page oubliée y serait fermée, donc invisible, et on ne le verrait
// qu'en perdant des ventes. Ici, un oubli laisse une page en chantier
// FERMÉE, ce qui est le sens sûr de l'erreur.

/**
 * Les pages de vente en travaux.
 *
 * `tiquiz-v2` est la version de travail de la page de vente, construite
 * par `npm run vente:v2` à partir de `content/sales/tiquiz.html`. Elle
 * n'a pas vocation à rester : le jour où Béné la valide, son contenu
 * remplace `tiquiz.html` et le slug disparaît d'ici.
 */
export const CHANTIERS: ReadonlySet<string> = new Set(["tiquiz-v2"]);

/** Cette page est-elle un chantier ? */
export function estUnChantier(slug: string | null | undefined): boolean {
  return CHANTIERS.has(String(slug ?? "").trim().toLowerCase());
}

/**
 * La page est-elle servie comme la VRAIE page (indexable, mesurée, avec
 * ses données de marque) ?
 *
 * L'hôte ET le slug sont des paramètres : ni l'un ni l'autre ne se
 * devine à l'intérieur. C'est la règle du 1er août, celle qui a évité
 * six fois qu'un écran recalcule une décision au lieu de l'appeler.
 */
export function estPagePublique(hotePublic: boolean, slug: string): boolean {
  return hotePublic && !estUnChantier(slug);
}
