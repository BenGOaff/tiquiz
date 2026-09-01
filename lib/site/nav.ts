// lib/site/nav.ts
//
// LA NAVIGATION DU SITE PUBLIC, DÉCIDÉE À UN SEUL ENDROIT.
//
// Béné, 30 août 2026 : "il faut construire toutes les autres pages de
// mon site tiquiz.fr pour tout basculer de systeme io vers notre
// domaine [...] il doit être facile à naviguer, fournir les bons liens,
// un menu, un footer etc... un truc professionnel quoi."
//
// -- POURQUOI CES TABLES SONT DES DONNÉES, ET PAS DU JSX ---------------
//
// Un menu recopié dans l'en-tête et dans le pied de page finit toujours
// par diverger : on ajoute une page, on l'oublie dans l'un des deux, et
// personne ne le voit avant qu'un visiteur ne cherche une page qui
// n'est nulle part. C'est la mécanique des deux listes qui divergent,
// déjà payée quatre fois dans ce dépôt (les réseaux de partage,
// l'affichage du score, l'alignement du sous-titre, la disposition des
// réponses).
//
// Les liens vivent donc ici, en données pures, et un test EXIGE que
// toute page publique du site soit atteignable depuis le pied de page.
//
// -- LES ADRESSES LÉGALES FRANÇAISES ----------------------------------
//
// Les documents existent déjà, en 5 langues, servis par `/terms`,
// `/terms-of-use`, `/privacy`, `/cookies`, `/legal` et `/affiliate`.
// Ce qui manquait, ce sont les adresses que Béné communiquait chez
// Systeme.io (`/cgv`, `/cgu`, `/mentions-legales`...). On ne DÉPLACE
// rien : déplacer casserait les liens déjà posés dans l'app, dans les
// emails et dans les quiz publiés. On ajoute des adresses françaises
// qui REDIRIGENT, et le document reste à une seule adresse canonique,
// donc une seule page à faire remonter.

import { AFFILIATE_DASHBOARD_URL, ATELIER_SALES_URL } from "@/lib/affiliateUrls";
import { ADRESSES_LEGALES_FR } from "@/lib/site/adressesLegales";

/** Un lien du site public. */
export interface LienSite {
  /** Le chemin, ou une adresse complète pour ce qui sort du site. */
  href: string;
  /** Ce que le visiteur lit. */
  libelle: string;
}

/** Une colonne du pied de page. */
export interface ColonnePied {
  titre: string;
  liens: LienSite[];
}

/**
 * LE MENU, ET IL RESTE COURT.
 *
 * Cinq entrées au plus : au delà, un menu ne se lit plus, il se
 * parcourt. Tout le reste vit dans le pied de page, qui est fait pour
 * ça. L'entrée "Tarifs" mène à la page de vente, qui les porte : une
 * page de tarifs séparée dirait la même chose deux fois, et les deux
 * finiraient par se contredire au premier changement de prix.
 */
export const MENU: readonly LienSite[] = [
  { href: "/blog", libelle: "Blog" },
  // L'ATELIER EST DANS LE MENU (Béné, 30 août 2026) : "le blog tiquiz.fr
  // = le blog de l'atelier ET de tiquiz, on centralise tout dessus."
  // Ce domaine porte donc les deux marques, et quelqu'un qui arrive par
  // un article sur les quiz doit pouvoir trouver la formation sans
  // savoir qu'elle vit sur un autre domaine.
  { href: ATELIER_SALES_URL, libelle: "L'Atelier du Quiz" },
  { href: "/affiliation", libelle: "Affiliation" },
  { href: "/a-propos", libelle: "À propos" },
  { href: "/support", libelle: "Aide" },
] as const;

/** L'appel à l'action de l'en-tête. Il mène là où on vend. */
export const CTA_MENU: LienSite = { href: "/", libelle: "Découvrir Tiquiz" };

// Ré-exportée telle quelle : la table vit dans un module SANS import,
// parce que `next.config.ts` la lit et ne résout pas l'alias `@/`.
// Voir l'en-tête de `lib/site/adressesLegales.ts`.
export { ADRESSES_LEGALES_FR };


/**
 * LE PIED DE PAGE.
 *
 * Il porte TOUT, y compris ce que le menu ne montre pas. C'est la
 * page-plan du site, celle qu'un moteur suit pour découvrir le reste,
 * et celle qu'un visiteur perdu finit par regarder.
 *
 * Les documents légaux sont désignés par leur adresse FRANÇAISE : c'est
 * celle qu'on communique, et elle mène au même document.
 */
export const PIED: readonly ColonnePied[] = [
  {
    titre: "Tiquiz",
    liens: [
      { href: "/", libelle: "Ce que fait Tiquiz" },
      { href: "/commande/mensuel", libelle: "Tarifs et abonnement" },
      { href: ATELIER_SALES_URL, libelle: "L'Atelier du Quiz" },
      { href: "/blog", libelle: "Le blog" },
      { href: "/newsletter", libelle: "La newsletter" },
    ],
  },
  {
    titre: "Gagner avec Tiquiz",
    liens: [
      { href: "/affiliation", libelle: "Programme d'affiliation" },
      { href: "/affiliation-atelier", libelle: "Affiliation Atelier du Quiz" },
      { href: AFFILIATE_DASHBOARD_URL, libelle: "Espace affilié" },
    ],
  },
  {
    titre: "Intégrations",
    liens: [
      { href: "/integrations", libelle: "Tous les outils" },
      { href: "/integrations/zapier-systeme-io", libelle: "Zapier et Systeme.io" },
      { href: "/integrations/tally-systeme-io", libelle: "Tally et Systeme.io" },
      { href: "/integrations/typeform-systeme-io", libelle: "Typeform et Systeme.io" },
      { href: "/integrations/google-forms-systeme-io", libelle: "Google Forms et Systeme.io" },
      { href: "/integrations/interact-systeme-io", libelle: "Interact et Systeme.io" },
    ],
  },
  {
    titre: "Aide",
    liens: [
      { href: "/support", libelle: "Centre d'aide et contact" },
      { href: "/login", libelle: "Se connecter" },
      { href: "/signup", libelle: "Créer un compte gratuit" },
    ],
  },
  {
    titre: "Le cadre",
    liens: [
      { href: "/mentions-legales", libelle: "Mentions légales" },
      { href: "/cgv", libelle: "CGV" },
      { href: "/cgu", libelle: "CGU" },
      { href: "/politique-de-confidentialite", libelle: "Confidentialité" },
      { href: "/politique-de-cookies", libelle: "Cookies" },
      { href: "/conditions-generales-affiliation", libelle: "Conditions d'affiliation" },
    ],
  },
] as const;

/** Ce lien sort-il du site ? */
export function estLienExterne(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * UN LIEN LÉGAL NE FAIT JAMAIS QUITTER LA PAGE (règle Béné, 24 août).
 *
 * Le visiteur peut être au milieu d'un quiz, d'un bon de commande ou
 * d'un article : le renvoyer ailleurs dans le même onglet lui fait tout
 * recommencer. Cette fonction rend les attributs à poser, et elle est
 * la SEULE à en décider, parce qu'une règle recopiée dans chaque
 * composant finit toujours par en oublier un.
 *
 * `rel="noopener"` va avec `target="_blank"` : sans lui, la page ouverte
 * garde une poignée sur la nôtre via `window.opener`.
 */
export function attributsLien(href: string): {
  target?: "_blank";
  rel?: string;
} {
  const legal = Object.prototype.hasOwnProperty.call(ADRESSES_LEGALES_FR, href);
  if (estLienExterne(href) || legal) {
    return { target: "_blank", rel: "noopener noreferrer" };
  }
  return {};
}

/** Toutes les adresses internes citées par le menu ou le pied de page. */
export function cheminsDuSite(): string[] {
  const tout = [
    ...MENU.map((l) => l.href),
    CTA_MENU.href,
    ...PIED.flatMap((c) => c.liens.map((l) => l.href)),
  ];
  return [...new Set(tout.filter((h) => !estLienExterne(h)))];
}
