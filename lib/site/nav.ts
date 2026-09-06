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
import { FONCTIONNALITES } from "@/lib/site/fonctionnalites";

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
 * Béné, 6 septembre 2026 : "ajoute Fonctionnalités et Tarifs au menu
 * principal : ils manquent, alors que Blog, L'Atelier du Quiz et
 * Affiliation envoient le visiteur ailleurs avant qu'il ait compris le
 * produit."
 *
 * ELLE A RAISON, ET L'ANCIENNE JUSTIFICATION EST TOMBÉE AVEC. Cette
 * page disait qu'une page de tarifs séparée "dirait la même chose deux
 * fois" : c'était vrai tant que la page de vente PORTAIT les tarifs.
 * Depuis le 6 septembre, `/` est une landing courte et `/tarifs` est la
 * seule page qui les porte, en lisant `OWNER_CATALOG` : il n'y a plus
 * deux listes, il y en a une, et le menu doit y mener.
 *
 * Les deux entrées produit passent DEVANT les trois qui font sortir :
 * un menu se lit de gauche à droite, et Blog en tête envoie ailleurs
 * quelqu'un qui ne sait pas encore ce qu'on vend.
 */
export const MENU: readonly LienSite[] = [
  { href: "/fonctionnalites", libelle: "Fonctionnalités" },
  { href: "/tarifs", libelle: "Tarifs" },
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

/**
 * L'APPEL À L'ACTION DE L'EN-TÊTE.
 *
 * Béné, 6 septembre 2026 : "le bouton principal du header devient
 * « Créer un compte gratuit » au lieu de « Découvrir Tiquiz »."
 *
 * "Découvrir" menait à l'accueil, c'est à dire à la page où le visiteur
 * est déjà : un bouton qui ne fait rien avancer. Celui-ci nomme le
 * geste, et il mène à l'inscription.
 */
export const CTA_MENU: LienSite = { href: "/signup", libelle: "Créer un compte gratuit" };

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
      // DEUX LIENS POUR UNE SEULE PAGE, ET BÉNÉ L'A RELEVÉ le
      // 6 septembre : "« Ce que fait Tiquiz » et « Toutes les
      // fonctionnalités » sont deux liens pour la même page. Garde
      // /fonctionnalites et supprime l'autre." Le premier menait à `/`,
      // qui est la page où on est déjà en lisant le pied.
      { href: "/fonctionnalites", libelle: "Ce que fait Tiquiz" },
      // ET LE TARIF MÈNE À LA PAGE DE TARIFS, plus au bon de commande
      // mensuel : envoyer quelqu'un payer avant qu'il ait vu les trois
      // paliers, c'est lui faire choisir sans les avoir comparés.
      { href: "/tarifs", libelle: "Tarifs et abonnement" },
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
      { href: "/integrations/jotform-systeme-io", libelle: "Jotform et Systeme.io" },
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

/**
 * LES PAGES QU'UN HUB REND ATTEIGNABLES.
 *
 * Les six pages d'intégration sont listées une par une dans le pied :
 * elles sont six, et leurs mots clés valent d'être écrits en toutes
 * lettres. Les huit fonctionnalités, non : un pied de page à huit liens
 * de plus ne se lit plus, il se parcourt.
 *
 * Elles sont donc atteignables PAR LEUR HUB, qui les liste toutes, et
 * qui est lui même dans le pied. Un visiteur perdu y arrive en deux
 * clics, un robot aussi.
 *
 * LA CONDITION COMPTE : un hub absent du pied ne rend rien atteignable.
 * `cheminsDuSite` le vérifie au lieu de le supposer, sinon retirer le
 * hub du pied orphelinerait huit pages en silence.
 */
export const PAGES_PAR_HUB: readonly { hub: string; enfants: readonly string[] }[] = [
  {
    hub: "/fonctionnalites",
    enfants: FONCTIONNALITES.map((f) => `/fonctionnalites/${f.slug}`),
  },
];

/**
 * L'ACCUEIL EST ATTEIGNABLE PAR LE LOGO, ET C'EST DÉCLARÉ.
 *
 * `SiteHeader` pose un `<Link href="/">` sur le logo, sur toutes les
 * pages du site. Depuis le 6 septembre le pied ne cite plus `/` (les
 * deux liens "Ce que fait Tiquiz" et "Toutes les fonctionnalités"
 * menaient à deux pages différentes pour un seul sujet), donc sans
 * cette ligne le garde-fou d'atteignabilité déclarerait la page
 * d'accueil orpheline.
 *
 * ON LE DÉCLARE AU LIEU DE RELÂCHER LE TEST : c'est un fait de l'écran,
 * et le jour où le logo cesserait d'être un lien, cette ligne serait
 * fausse et se corrigerait ici, à un seul endroit.
 */
export const LIEN_LOGO = "/";

/** Toutes les adresses internes citées par le menu, le pied, ou un hub. */
export function cheminsDuSite(): string[] {
  const directs = [
    LIEN_LOGO,
    ...MENU.map((l) => l.href),
    CTA_MENU.href,
    ...PIED.flatMap((c) => c.liens.map((l) => l.href)),
  ];
  const parHub = PAGES_PAR_HUB.filter((h) => directs.includes(h.hub)).flatMap((h) => h.enfants);
  return [...new Set([...directs, ...parHub].filter((h) => !estLienExterne(h)))];
}
