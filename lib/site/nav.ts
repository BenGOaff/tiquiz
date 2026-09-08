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
import { SLUGS_FONCTIONNALITES } from "@/lib/site/fonctionnalites";
import {
  CHEMINS_HORS_REECRITURE,
  cheminPourLangue,
  LANGUE_SANS_PREFIXE,
  type LanguePublique,
} from "@/lib/site/langues";
import { languesDePage, PAGES_PUBLIQUES } from "@/lib/site/pagesPubliques";

/** Un lien du site public. */
export interface LienSite {
  /** Le chemin, ou une adresse complète pour ce qui sort du site. */
  href: string;
  /** Ce que le visiteur lit. */
  libelle: string;
  /**
   * CE QU'IL LIT EN ANGLAIS, et SEULEMENT si la destination existe dans
   * cette langue. Absent = le libellé reste français, ce qui est
   * honnête : le lien mène à une page française et il le dit.
   *
   * `libellePourLangue` le vérifie de toute façon contre la source de
   * disponibilité, donc poser un `en` par erreur sur une page qui n'a
   * pas de version anglaise ne promet rien de faux.
   */
  en?: string;
}

/** Une colonne du pied de page. */
export interface ColonnePied {
  titre: string;
  /**
   * Le titre de colonne se traduit SANS CONDITION, lui : ce n'est pas un
   * lien, il ne promet aucune destination. C'est juste le mot qui dit ce
   * qu'il y a dessous.
   */
  titreEn: string;
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
  { href: "/fonctionnalites", libelle: "Fonctionnalités", en: "Features" },
  { href: "/tarifs", libelle: "Tarifs", en: "Pricing" },
  { href: "/blog", libelle: "Blog", en: "Blog" },
  // L'ATELIER EST DANS LE MENU (Béné, 30 août 2026) : "le blog tiquiz.fr
  // = le blog de l'atelier ET de tiquiz, on centralise tout dessus."
  // Ce domaine porte donc les deux marques, et quelqu'un qui arrive par
  // un article sur les quiz doit pouvoir trouver la formation sans
  // savoir qu'elle vit sur un autre domaine.
  { href: ATELIER_SALES_URL, libelle: "L'Atelier du Quiz" },
  { href: "/affiliation", libelle: "Affiliation", en: "Affiliate" },
  { href: "/a-propos", libelle: "À propos", en: "About" },
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
export const CTA_MENU: LienSite = {
  href: "/signup",
  libelle: "Créer un compte gratuit",
  en: "Create a free account",
};

/**
 * LE LIEN DE CONNEXION, ICI ET PLUS DANS LE JSX.
 *
 * Il était écrit en dur dans `SiteHeader`, donc il échappait à la table
 * qui décide des libellés : sur une page anglaise, tout le menu pouvait
 * passer en anglais et ce bouton là serait resté français, sans que
 * rien ne le dise. Un lien du chrome vit dans la table, sinon il finit
 * par diverger (c'est la raison d'être de ce fichier).
 */
export const LIEN_CONNEXION: LienSite = {
  href: "/login",
  libelle: "Se connecter",
  en: "Sign in",
};

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
    titreEn: "Tiquiz",
    liens: [
      // DEUX LIENS POUR UNE SEULE PAGE, ET BÉNÉ L'A RELEVÉ le
      // 6 septembre : "« Ce que fait Tiquiz » et « Toutes les
      // fonctionnalités » sont deux liens pour la même page. Garde
      // /fonctionnalites et supprime l'autre." Le premier menait à `/`,
      // qui est la page où on est déjà en lisant le pied.
      { href: "/fonctionnalites", libelle: "Ce que fait Tiquiz", en: "What Tiquiz does" },
      { href: "/generateur-de-quiz", libelle: "Générateur de quiz", en: "Quiz generator" },
      // ET LE TARIF MÈNE À LA PAGE DE TARIFS, plus au bon de commande
      // mensuel : envoyer quelqu'un payer avant qu'il ait vu les trois
      // paliers, c'est lui faire choisir sans les avoir comparés.
      { href: "/tarifs", libelle: "Tarifs et abonnement", en: "Pricing and plans" },
      { href: ATELIER_SALES_URL, libelle: "L'Atelier du Quiz" },
      { href: "/blog", libelle: "Le blog", en: "The blog" },
      { href: "/newsletter", libelle: "La newsletter" },
    ],
  },
  {
    titre: "Gagner avec Tiquiz",
    titreEn: "Earn with Tiquiz",
    liens: [
      { href: "/affiliation", libelle: "Programme d'affiliation", en: "Affiliate programme" },
      { href: "/affiliation-atelier", libelle: "Affiliation Atelier du Quiz", en: "L'Atelier affiliate programme" },
      { href: AFFILIATE_DASHBOARD_URL, libelle: "Espace affilié" },
    ],
  },
  {
    titre: "Intégrations",
    titreEn: "Integrations",
    liens: [
      { href: "/integrations", libelle: "Tous les outils", en: "All the tools" },
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
    titreEn: "Help",
    liens: [
      { href: "/support", libelle: "Centre d'aide et contact", en: "Help centre and contact" },
      { href: "/login", libelle: "Se connecter", en: "Sign in" },
      { href: "/signup", libelle: "Créer un compte gratuit", en: "Create a free account" },
    ],
  },
  {
    titre: "Le cadre",
    titreEn: "The legal bit",
    liens: [
      { href: "/mentions-legales", libelle: "Mentions légales", en: "Legal notice" },
      { href: "/cgv", libelle: "CGV", en: "Terms of sale" },
      { href: "/cgu", libelle: "CGU", en: "Terms of use" },
      { href: "/politique-de-confidentialite", libelle: "Confidentialité", en: "Privacy" },
      { href: "/politique-de-cookies", libelle: "Cookies", en: "Cookies" },
      { href: "/conditions-generales-affiliation", libelle: "Conditions d'affiliation", en: "Affiliate terms" },
    ],
  },
] as const;

/**
 * LE CHEMIN D'UN LIEN DU CHROME, DANS LA LANGUE DE LA PAGE SERVIE.
 *
 * -- CE QUE LA MESURE A DONNÉ (8 septembre 2026) -----------------------
 *
 * `/en/tarifs` existe, il est en anglais, il est dans le sitemap...  et
 * **AUCUN lien du site ne le cite**. Le menu d'une page anglaise
 * envoyait sur `/tarifs`, c'est à dire sur le français, sur la page qui
 * vend. Une page qu'aucun lien ne désigne n'est atteinte par personne :
 * un lecteur ne la trouve jamais, et un robot ne la découvre que par le
 * sitemap, sans un seul lien interne pour la peser.
 *
 * -- ON NE PRÉFIXE QUE CE QUI EXISTE VRAIMENT --------------------------
 *
 * Préfixer tout en `/en/` ferait huit 404 dans le menu : `/a-propos`,
 * `/integrations` et les autres n'ont pas de version anglaise. La
 * disponibilité se LIT donc, elle ne se suppose pas :
 *
 *   - `PAGES_PUBLIQUES` porte déjà les langues de chaque page, et c'est
 *     la même source que le sitemap et que les `hreflang`. Une
 *     deuxième liste écrite ici finirait par annoncer une langue que le
 *     sitemap ne déclare pas ;
 *   - `CHEMINS_HORS_REECRITURE` nomme les chemins qui ont leur PROPRE
 *     segment `/en/...` (le blog). Ce sont exactement ceux dont la
 *     route anglaise existe pour de bon.
 *
 * ET LA CORRESPONDANCE Y EST EXACTE, jamais un préfixe. `/en/blog`
 * existe ; `/en/blog/<slug francais>` n'existe PAS, parce que les slugs
 * anglais sont différents (`17-reasons...` contre
 * `17-raisons-lancer-quiz-business`) : un lien construit par préfixe
 * mènerait donc à un 404 que personne ne verrait avant de cliquer.
 * Traduire un slug n'est pas le travail de cette fonction, et c'est
 * `alternatesDeLangue` qui apparie les deux, article par article.
 *
 * Tout le reste reste FRANÇAIS, et c'est ce qui rend le lien honnête :
 * on ne promet pas de l'anglais derrière un clic qui mène au français.
 *
 * LE SENS DE L'ERREUR : un chemin oublié laisse un lien vers le
 * français, ce qui est le comportement d'aujourd'hui. Un chemin déclaré
 * à tort donne un 404 dans le menu, sur toutes les pages à la fois.
 */
export function hrefPourLangue(href: string, langue: LanguePublique): string {
  if (langue === LANGUE_SANS_PREFIXE || estLienExterne(href)) return href;
  return sertUnSegmentDeLangue(href, langue) ? cheminPourLangue(href, langue) : href;
}

/** Cette adresse a-t-elle une route `/<langue>/...` à elle ? */
function sertUnSegmentDeLangue(href: string, langue: LanguePublique): boolean {
  const page = PAGES_PUBLIQUES.find((p) => p.chemin === href);
  return page
    ? languesDePage(page).includes(langue)
    : (CHEMINS_HORS_REECRITURE as readonly string[]).includes(href);
}

/**
 * LES PAGES DE L'APP, QUI PARLENT DÉJÀ SEPT LANGUES SANS PRÉFIXE.
 *
 * `/login`, `/signup`, `/support` et les documents légaux ne vivent pas
 * sous `/en/...` : ils sont servis par l'app, qui résout la langue au
 * cookie, à l'en-tête `Accept-Language`, puis au domaine
 * (`i18n/request.ts`). MESURÉ le 8 septembre, pas supposé :
 * `/signup` avec `Accept-Language: en` rend `lang="en"` et
 * « Create an account ».
 *
 * `/support` n'a pas pu être mesuré de la même façon dans ce conteneur
 * (il importe `supabaseAdmin`, qui LÈVE au chargement sans variables
 * d'environnement, donc il y répond 500 : c'est le piège du 30 août,
 * pas un défaut de cette page). Ce qui EST vérifié : il rend son écran
 * par `getTranslations("supportForm")`, et ce namespace porte ses
 * 16 clés en français comme en anglais.
 *
 * Leur libellé peut donc s'écrire en anglais sans rien promettre de
 * faux, alors que leur ADRESSE ne doit surtout pas être préfixée : il
 * n'existe aucun `/en/signup`, et le lien ferait un 404 dans le menu.
 *
 * C'est la seule liste écrite à la main de ce fichier, et c'est pour ça
 * qu'elle porte sa raison : sans elle, le prochain passage la prendrait
 * pour un oubli et préfixerait ces chemins.
 */
const APP_MULTILANGUE: readonly string[] = ["/login", "/signup", "/support"];

/**
 * LE LIBELLÉ D'UN LIEN, DANS LA LANGUE DE LA PAGE SERVIE.
 *
 * -- CE QUE LA MESURE A DONNÉ (8 septembre 2026) -----------------------
 *
 * `/en/generateur-de-quiz` rend son contenu en anglais, et son menu
 * affichait « Fonctionnalités · Tarifs · Blog · Se connecter · Créer un
 * compte gratuit ». Pareil sur les quatre articles anglais du blog,
 * c'est à dire sur les pages où atterrissent exactement les lecteurs
 * qu'on veut récupérer de `tipote.blog`. C'est le reproche du client
 * anglophone du 7 septembre ("some parts of the quiz UI were in
 * French"), transposé au site public.
 *
 * -- ON NE TRADUIT QUE CE QUI MÈNE VRAIMENT À DE L'ANGLAIS -------------
 *
 * Traduire les huit entrées d'un coup promettrait de l'anglais derrière
 * chaque clic : au 8 septembre, toutes les pages du menu sont
 * traduites SAUF `/newsletter`, et annoncer une langue qu'une page n'a
 * pas est un mensonge, pas une commodité.
 *
 * Un libellé resté français est donc une INFORMATION : il dit que la
 * page derrière est française. Et la disponibilité se lit aux MÊMES
 * sources que la destination, jamais à une deuxième liste.
 *
 * LE SENS DE L'ERREUR : un `en` oublié laisse un libellé français, ce
 * qui est le comportement d'hier. Un `en` posé sur une page qui n'a pas
 * la langue est refusé ici, donc il ne peut pas mentir.
 */
export function libellePourLangue(lien: LienSite, langue: LanguePublique): string {
  if (langue === LANGUE_SANS_PREFIXE || !lien.en) return lien.libelle;
  const servi =
    sertUnSegmentDeLangue(lien.href, langue) ||
    APP_MULTILANGUE.includes(lien.href) ||
    Object.prototype.hasOwnProperty.call(ADRESSES_LEGALES_FR, lien.href);
  return servi ? lien.en : lien.libelle;
}

/** Le titre d'une colonne du pied, qui ne promet aucune destination. */
export function titrePourLangue(colonne: ColonnePied, langue: LanguePublique): string {
  return langue === LANGUE_SANS_PREFIXE ? colonne.titre : colonne.titreEn;
}

/**
 * CE QUE LE CHROME DIT ET QUI N'EST PAS UN LIEN.
 *
 * Les libellés d'accessibilité en font partie, et ce ne sont pas des
 * détails : un lecteur d'écran anglophone entendait « Navigation
 * principale » et « Ouvrir le menu ». Un texte qu'on n'affiche pas
 * reste un texte que quelqu'un lit.
 */
export const CHROME_SITE: Readonly<
  Record<
    LanguePublique,
    {
      accueil: string;
      navigation: string;
      ouvrirLeMenu: string;
      promesse: string;
      marques: string;
      faitEnFrance: string;
    }
  >
> = {
  fr: {
    accueil: "Tiquiz, accueil",
    navigation: "Navigation principale",
    ouvrirLeMenu: "Ouvrir le menu",
    promesse:
      "Des quiz qui captent des leads déjà qualifiés, et les taguent tout seuls dans Systeme.io.",
    marques: "Ethilife. Tiquiz et l'Atelier du Quiz sont des marques d'Ethilife.",
    faitEnFrance: "Fait en France, par une créatrice qui vend avec ses propres quiz.",
  },
  en: {
    accueil: "Tiquiz, home",
    navigation: "Main navigation",
    ouvrirLeMenu: "Open the menu",
    promesse: "Quizzes that capture qualified leads, and tag them on their own in Systeme.io.",
    marques: "Ethilife. Tiquiz and the Atelier du Quiz are Ethilife trademarks.",
    faitEnFrance: "Made in France, by someone who sells with her own quizzes.",
  },
};

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
    enfants: SLUGS_FONCTIONNALITES.map((slug) => `/fonctionnalites/${slug}`),
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
