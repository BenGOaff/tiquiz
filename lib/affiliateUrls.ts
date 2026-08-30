// lib/affiliateUrls.ts
//
// LES ADRESSES DU PROGRAMME D'AFFILIATION, À UN SEUL ENDROIT.
//
// Béné, 6 août 2026 : "mon lien d'affiliation dans tiquiz mène sur
// l'atelier, c'est quoi la logique ??? Tous les membres de tiquiz ne
// sont pas membres de l'atelier. Tu dois mettre le lien de
// https://affiliate.tipote.com/ et sur l'accueil d'affiliate : le lien
// d'inscription pour ceux qui veulent voir l'espace affilié :
// https://www.tipote.fr/tiquiz/affiliation, comme ça ils peuvent
// s'inscrire directement."
//
// -- CE QUI CLOCHAIT ---------------------------------------------------
//
// La carte "Mon lien d'affiliation" de la sidebar Tiquiz pointait vers
// `quizing.tipote.com/affiliation`, une page qui vit À L'INTÉRIEUR de la
// formation. Le raisonnement d'origine se tenait (un élève de l'Atelier
// y a bien son espace), mais il faisait dépendre l'AFFILIATION, qui est
// ouverte à tout le monde, du fait d'avoir acheté une formation qui n'a
// rien à voir.
//
// L'espace affilié du programme, c'est `affiliate.tipote.com`. C'est là
// qu'on envoie, depuis Tiquiz, quelle que soit la situation de la
// personne. L'espace affiliation DANS l'Atelier continue d'exister et
// reste accessible depuis l'Atelier : on ne le supprime pas, on arrête
// juste d'y envoyer les gens depuis une autre app.
//
// -- ET POURQUOI UN FICHIER POUR TROIS CONSTANTES ----------------------
//
// Ces adresses étaient écrites en dur à trois endroits de Tiquiz. C'est
// le motif exact du drame de l'Atelier du 3 août : une URL écrite en dur
// à plusieurs endroits ne se corrige jamais qu'à moitié, et on l'a
// vérifié le jour même en trouvant l'aller réparé et le retour périmé.

/** Le tableau de bord affilié : ses liens, ses gains, ses paiements. */
export const AFFILIATE_DASHBOARD_URL = "https://affiliate.tipote.com";

/**
 * La page qui EXPLIQUE le programme et permet de s'y inscrire.
 *
 * C'est la porte d'entrée de quelqu'un qui n'est pas encore affilié. Le
 * tableau de bord, lui, demande un compte : y envoyer un curieux le
 * bloque sur un écran de connexion.
 *
 * RAPATRIÉE LE 30 AOÛT 2026. Elle désignait
 * `www.tipote.fr/tiquiz/affiliation`, un tunnel Systeme.io qui décrit
 * l'ANCIEN programme : identifiant `?sa=`, versement chez eux, pas de
 * mois offert. Un affilié envoyé là lisait des règles qui ne sont plus
 * celles qu'on applique.
 */
export const AFFILIATE_SIGNUP_URL = "https://tiquiz.fr/affiliation";

/**
 * La page qui explique l'affiliation de l'ATELIER, à 70 %.
 *
 * Elle est distincte parce que le programme l'est : l'Atelier tient son
 * propre registre d'affiliés et lit un identifiant différent de celui de
 * Tiquiz. Envoyer un affilié Tiquiz recommander l'Atelier avec son lien
 * Tiquiz, c'est le faire travailler pour zéro commission.
 */
export const AFFILIATE_ATELIER_URL = "https://tiquiz.fr/affiliation-atelier";

/**
 * La page de vente de l'Atelier du Quiz.
 *
 * Rien à voir avec l'affiliation : c'est la formation. Elle vit ici
 * parce que les deux cartes de la sidebar sont voisines et qu'on les
 * confondait justement.
 */
export const ATELIER_SALES_URL = "https://www.tipote.fr/atelier-du-quiz";
