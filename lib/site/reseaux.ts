// lib/site/reseaux.ts
//
// LES PROFILS PUBLICS DE BÉNÉ.
//
// Relevés le 30 août 2026 dans le `sameAs` de sa propre page auteur
// (`tipote.fr/benedicte-lagardette`), pas devinés à partir de son nom.
// Un profil inventé mène à un compte qui n'est pas le sien.
//
// Ils vivent dans un module parce qu'ils servent DEUX fois sur la même
// page : les liens que le visiteur clique, et le `sameAs` des données
// structurées. C'est ce `sameAs` qui permet à un moteur de relier son
// nom à ces comptes, donc de la reconnaître comme la même personne
// partout. Deux listes écrites séparément finiraient par diverger, et
// c'est celle que personne ne voit qui prendrait du retard.

export interface Reseau {
  nom: string;
  url: string;
  /**
   * LE LIBELLÉ ANGLAIS, QUAND LE NOM N'EST PAS UN NOM PROPRE.
   *
   * "YouTube" et "LinkedIn" se disent pareil partout : leur traduire un
   * nom serait inventer une marque. "Le blog" et "Avis <domaine>", eux,
   * sont des mots à nous, et ils restaient français sur une page
   * anglaise.
   *
   * Absent = le nom ne se traduit pas, et c'est la réponse la plus
   * fréquente : `nomPourLangue` rend alors `nom` tel quel.
   */
  en?: string;
}

/** Le nom d'un profil dans la langue demandée, avec son repli. */
export function nomPourLangue(x: { nom: string; en?: string }, langue: string): string {
  return langue === "fr" || !x.en ? x.nom : x.en;
}

export const RESEAUX: readonly Reseau[] = [
  { nom: "YouTube", url: "https://www.youtube.com/@blagardette_com" },
  { nom: "LinkedIn", url: "https://www.linkedin.com/in/blagardette/" },
  { nom: "Instagram", url: "https://www.instagram.com/blagardette_com/" },
  { nom: "Facebook", url: "https://www.facebook.com/benebottet/" },
  { nom: "Pinterest", url: "https://fr.pinterest.com/blagardette_com/" },
  { nom: "Le blog", en: "Her blog", url: "https://www.blagardette.com/" },
] as const;

/**
 * LES AVIS, ET IL Y EN A DEUX.
 *
 * Sa page auteur les cite tous les deux, et c'est délibéré : ils
 * couvrent deux activités différentes. En afficher un seul laisserait
 * croire que l'autre n'existe pas.
 */
export const AVIS = [
  {
    nom: "Avis blagardette.com",
    en: "Reviews for blagardette.com",
    url: "https://fr.trustpilot.com/review/blagardette.com",
  },
  {
    nom: "Avis tipote.com",
    en: "Reviews for tipote.com",
    url: "https://fr.trustpilot.com/review/tipote.com",
  },
] as const;

/** L'autre adresse de sa page auteur, celle du blog. */
export const PAGE_AUTEUR_BLOG = "https://www.blagardette.com/benedicte-lagardette";
