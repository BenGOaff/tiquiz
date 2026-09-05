// lib/site/landing.ts
//
// LE CONTENU DE LA LANDING, EN DONNÉES, UNE LANGUE PAR ENTRÉE.
//
// Béné, 4 septembre 2026 : "propose moi une landing pour que je voie à
// quoi elle pourrait ressembler en vrai next avec la traduction".
//
// -- POURQUOI LE TEXTE VIT ICI ET PAS DANS LE JSX ---------------------
//
// C'est la seule façon d'avoir une page traduite. Les onze pages du
// site public écrivent aujourd'hui leur texte en dur, en français
// (`const TITRE = "..."` dans `a-propos/page.tsx`), et c'est exactement
// ce qui rend le chantier 4 impossible : on ne traduit pas du JSX.
//
// Le gabarit repris est celui des documents légaux, qui vivent en
// 5 langues depuis des mois (`lib/legal/privacy.ts` : un objet typé par
// langue, exporté en `Record`). On ne réinvente pas un troisième
// mécanisme.
//
// -- LES PRIX NE SONT PAS ÉCRITS ICI ----------------------------------
//
// Ils viennent de `OWNER_CATALOG`, donc de ce que le bon de commande
// encaisse vraiment. Un prix recopié dans une page de vente est un prix
// faux au premier changement de tarif, et c'est l'endroit exact où un
// lecteur le vérifie.
//
// -- CE QUE CETTE PAGE A LE DROIT D'AFFIRMER --------------------------
//
// Tout ce qui suit est vérifiable dans le code ou porte sa source :
//
//   - l'IA écrit questions, réponses et profils : la formulation reste
//     "tu relis et tu corriges", jamais "parfait du premier coup" ;
//   - Tiquiz CRÉE le tag Systeme.io quand il manque : `POST /tags` dans
//     `app/api/quiz/[quizId]/public/route.ts` ;
//   - 7 langues d'interface : `i18n/config.ts` ;
//   - 100 langues et variantes en génération : `lib/quizLanguages.ts`,
//     comptées, ni "plus de 100" ni "100 langues" ;
//   - 44,9 % : le rapport Interact, et la formulation OBLIGATOIRE est
//     "des personnes qui commencent un quiz". Ce n'est pas un taux de
//     page, et l'écrire ainsi serait faux.
//
// Aucun exemple de campagne payante : la publicité fait peur à cette
// audience, l'argument qui porte est le gratuit.

import { OWNER_CATALOG, formatOwnerPrice } from "@/lib/checkout/catalog";
import {
  AVANTAGES_COMMUNS,
  AVANTAGES_NOUVEAUX,
  AVANTAGES_PAYANTS,
  AVANTAGES_PLUS,
} from "@/lib/checkout/avantages";
import { FREE_LIMITS } from "@/lib/planLimits";

export interface Etape {
  titre: string;
  corps: string;
}

export interface Question {
  q: string;
  r: string;
}

/**
 * LA MAQUETTE DU HAUT DE PAGE, DESSINÉE EN HTML.
 *
 * Pas une capture d'écran, et c'est une décision. La seule capture que
 * l'app sait produire aujourd'hui vient de `/visual-test`, la fixture
 * des tests visuels : elle porte un bandeau "Mode aperçu" et un quiz de
 * démonstration écrit SANS ACCENTS ("Quel createur de quiz es-tu ?").
 * La poser en haut de la page de Béné mettrait du texte de test sur son
 * argument principal.
 *
 * Dessinée en HTML, la maquette est traduite avec le reste, nette à
 * toutes les densités, et elle ne pèse rien. C'est le geste de son bloc
 * `content/sales/v2/funnel-quiz.html`, qu'elle a relu trois fois.
 */
export interface Maquette {
  progression: string;
  question: string;
  reponses: readonly string[];
  /** La réponse mise en avant, par son index dans `reponses`. */
  choisie: number;
}

/** Un carreau de la grille "ton quiz vit où tu veux". */
export interface Carreau {
  titre: string;
  corps: string;
}

/** Une colonne de tarif, telle que sa page de vente la dessine. */
export interface Ruban {
  /** Le bandeau coloré posé sur le haut de la carte. */
  ruban: string;
  /** À qui ce palier s'adresse. */
  pour: string;
  /** Le libellé du bouton. "Créer mon compte gratuit" sur les trois
   *  colonnes était faux : les deux payantes mènent au bon de commande. */
  cta: string;
}


/** Un profil de la démonstration du funnel : ce qu'il lit, et son tag. */
export interface ProfilDemo {
  reponse: string;
  profil: string;
  offre: string;
  tag: string;
}

/** Une puce promesse : le bénéfice, et sa conséquence concrète. */
export interface PuceTarif {
  texte: string;
  detail?: string;
  /**
   * UNE LIMITE N'EST PAS UN AVANTAGE, ET ELLE NE PORTE PAS DE COCHE.
   *
   * Béné, 5 septembre 2026 : "les tarifs sont moches", et avant ça
   * "y'a plus de bénéfices dans le compte gratuit que le compte à
   * 17 €". La colonne gratuite listait ses trois LIMITES avec la même
   * coche bleue que les avantages des colonnes payantes : "10 réponses
   * visibles sur 30 jours glissants, les suivantes sont floutées" se
   * lisait comme une bonne nouvelle.
   *
   * `limite: true` rend une pastille neutre à la place de la coche.
   * C'est la même règle que la grille comparative, où une limite
   * chiffrée rend sa VALEUR et jamais une coche.
   */
  limite?: boolean;
}

/**
 * UNE LIGNE DE LA GRILLE COMPARATIVE.
 *
 * Béné, 5 septembre 2026 : "on n'a qu'à rajouter une grille de
 * fonctionnalités qui compare tous les plans, comme les vrais saas."
 *
 * `true` rend une coche, `false` un tiret, une CHAÎNE rend la valeur
 * ("1", "Illimité"). Les trois cas sont nécessaires : une limite
 * chiffrée n'est ni un oui ni un non, et l'écrire en coche ferait
 * croire que le gratuit est illimité.
 */
export interface LigneComparatif {
  intitule: string;
  gratuit: string | boolean;
  tiquiz: string | boolean;
  plus: string | boolean;
}

export interface GroupeComparatif {
  titre: string;
  lignes: readonly LigneComparatif[];
}

/**
 * UN TÉMOIGNAGE DE SA PAGE DE VENTE.
 *
 * Béné, 5 septembre 2026 : "6 avis trustpilot pas une preuve sociale.
 * Supprime." Elle avait raison sur les SIX, et sur le lien qui menait
 * chez Trustpilot : six avis ne pèsent rien, et en annoncer le nombre
 * souligne qu'il y en a six.
 *
 * Ceux-ci sont AUTRE CHOSE, et c'est pour ça qu'ils reviennent : ce
 * sont les quinze de SA page de vente, sous son titre à elle ("Il y a
 * un avant ... et un après Tiquiz"), avec un prénom et un métier sur
 * chacun, et AUCUN lien sortant. C'est sa page qu'on reprend, pas
 * Trustpilot qu'on ramène.
 *
 * UN TÉMOIGNAGE NE SE TRADUIT JAMAIS, ne se corrige pas, ne se
 * raccourcit pas : c'est quelqu'un qui a écrit ça. Il vit donc hors des
 * objets de langue, dans TEMOIGNAGES, et il est le même dans les sept.
 */
export interface Temoignage {
  nom: string;
  metier: string | null;
  texte: string;
  /**
   * SON PORTRAIT, LEVÉ DE SA PAGE.
   *
   * Béné, 5 septembre 2026 : "les témoignages idem tu m'as mis ça tout
   * moche alors que c'est beau sur la page d'origine."
   *
   * L'APPARIEMENT EST MESURÉ, PAS DEVINÉ : chaque portrait est lu dans
   * `content/sales/tiquiz.html` avec le nom qui le SUIT dans la même
   * carte. Les ranger dans l'ordre du tableau aurait mis la photo de
   * quelqu'un sur le témoignage d'un autre, et aucun test ne peut voir
   * ça (règle du 1er septembre : un visuel se place en le REGARDANT).
   *
   * Les trois personnes qui n'ont écrit que sur Trustpilot n'ont pas de
   * portrait sur sa page : leur carte porte l'initiale de leur prénom.
   */
  portrait?: string;
  /** D'OÙ VIENT CE TÉMOIGNAGE, QUAND CE N'EST PAS SA PAGE DE VENTE.
   *
   *  Béné, 5 septembre 2026 : "des témoignages de la page originale
   *  peuvent être remplacés par les témoignages de Trustpilot : mêmes
   *  personnes mais plus récents. Garde les autres."
   *
   *  Trois personnes de sa page ont écrit depuis sur Trustpilot (Eric
   *  Legrigeois, Monique Pulby, Gwenn) : c'est leur version RÉCENTE qui
   *  s'affiche, avec la date. Les douze autres gardent le texte de sa
   *  page. Et trois personnes n'ont écrit que sur Trustpilot : elles
   *  s'ajoutent, elles ne remplacent personne. */
  source?: string;
}

export interface ColonneTarif {
  nom: string;
  /** Le prix affiché en gros. */
  prix: string;
  /** Ce qui va juste dessous : "par mois", ou "pour commencer" sur le gratuit. */
  cadence: string;
  /** Le prix ANNUEL, brut, ou null quand la colonne n'en a pas.
   *  Jamais une phrase : c'est le gros chiffre de la carte quand
   *  l'interrupteur est sur l'année. */
  prixAn: string | null;
  /** "par an", ou null avec `prixAn`. */
  cadenceAn: string | null;
  /** Ce que CETTE colonne ajoute, en PUCES PROMESSES.
   *
   *  Béné, 5 septembre 2026 : "y'a plus de bénéfices dans le compte
   *  gratuit que le compte à 17 € tu trouves ça logique et vendeur ??
   *  Mets les bénéfices puces promesses."
   *
   *  Une puce promesse porte le bénéfice ET sa conséquence concrète.
   *  Les deux viennent de `avantages.ts` (`texte` + `detail`), jamais
   *  recopiés : le bon de commande affiche exactement les mêmes. */
  lignes: readonly PuceTarif[];
  /** "Tout le gratuit, plus :" au dessus des puces, ou null sur le gratuit.
   *
   *  L'ÉCHELLE SE DIT, elle ne se devine pas. Sans cette ligne, la
   *  colonne à 17 € a l'air de contenir DEUX choses quand le gratuit en
   *  annonce trois, alors qu'elle contient tout le gratuit sans ses
   *  limites. */
  inclus: string | null;
  /** Le libellé du bouton, et ses DEUX destinations.
   *
   *  L'interrupteur mensuel / annuel n'a aucun JavaScript, donc un lien
   *  ne peut pas changer d'adresse au clic : on rend les DEUX et
   *  `:has()` montre le bon. Sans ça, quelqu'un qui choisit l'année
   *  atterrirait sur le bon de commande du mois, et il ne le verrait
   *  qu'au moment de payer. */
  cta: string;
  lien: string;
  lienAn: string | null;
}

export interface ContenuLanding {
  /** La langue du document, pour l'attribut `lang` et l'`og:locale`. */
  langue: string;
  metaTitre: string;
  metaDescription: string;

  etiquette: string;
  /** Le titre. `motCle` est le fragment mis en couleur, il doit en être un morceau. */
  titre: string;
  motCle: string;
  accroche: string;
  ctaPrincipal: string;
  ctaSecondaire: string;
  sousCta: string;
  /** Les trois rassurances sous le bouton, avec une coche dessinée. */
  rassurances: readonly string[];
  /** Le bandeau défilant des fonctionnalités, comme sur sa page. */
  bandeau: readonly string[];
  /** LA PREUVE SOCIALE, ET C'EST UN NOMBRE D'UTILISATEURS.
   *
   *  Béné, 5 septembre 2026 : "6 avis trustpilot pas une preuve
   *  sociale. Supprime. Tu peux mettre +200 utilisateurs (c'est le vrai
   *  chiffre)." Et, sur le lien qui menait à Trustpilot : "non, on ne
   *  veut pas que les gens quittent la page ... on veut qu'ils
   *  commandent bordel !"
   *
   *  Il n'y a donc AUCUN lien sortant sur cette page : chaque lien qui
   *  part est un visiteur qui ne revient pas, et il partait juste sous
   *  le premier bouton. */
  preuve: string;
  /** À QUI ça s'adresse, dit dans le haut de page. Un visiteur doit
   *  savoir en dix secondes si la page parle de lui. */
  pourQui: string;
  /** Le bouton du champ de lien. Il affichait "Étape" : j'avais passé
   *  la mauvaise chaîne, et ça ne se voit qu'à l'écran. */
  copier: string;

  problemeTitre: string;
  /** Le fragment coloré du titre du problème. Son titre à elle, dont
   *  "un client perdu" est la moitié qui frappe. */
  problemeMotCle: string;
  problemeCorps: string[];

  chiffre: string;
  chiffreLegende: string;
  chiffreSource: string;

  maquette: Maquette;

  mecaniqueTitre: string;
  mecaniqueMotCle: string;
  /** Le mot "ÉTAPE" de la pastille. Le numéro est calculé. */
  etapeMot: string;
  etapes: Etape[];

  funnelTitre: string;
  funnelMotCle: string;
  funnelCorps: string;
  funnelProfils: readonly ProfilDemo[];
  funnelTagLegende: string;

  /** LE BÉNÉFICE, PAS LA MÉCANIQUE.
   *
   *  Le titre disait "Le tag est posé, même s'il n'existe pas encore".
   *  Béné : "oui ok c'est super, mais NON c'est pas un bénéfice qui fait
   *  vendre. Le bénéfice c'est que Systeme io est connecté nativement,
   *  pas besoin de lier zapier, make, pabbly ou autre."
   *
   *  La création du tag reste écrite : c'est vrai, c'est unique, et
   *  c'est la PREUVE de la connexion native. Ce n'est plus le titre. */
  /**
   * LES MOTS QUI DÉFILENT DANS LE TITRE, machine à écrire.
   *
   * Béné, 5 septembre 2026 : "sur ma page initiale il n'y a pas que ça
   * comme H1 [...] c'est un texte qui défile en mode machine à écrire
   * mais moderne."
   *
   * Ce sont SES cinq phrases, relevées dans `content/sales/tiquiz.html`
   * (bloc `rawhtml-125dab43`), avec son rythme : 85 ms par lettre à
   * l'écriture, 1400 ms de pause, 45 ms à l'effacement, 250 ms avant le
   * mot suivant, curseur cyan qui clignote à 0,8 s.
   *
   * `titre` reste le PREMIER de la liste : c'est lui que reçoit un
   * lecteur sans JavaScript, et c'est lui que lit un moteur.
   */
  titreDefilant: readonly string[];
  sioTitre: string;
  sioMotCle: string;
  sioCorps: string[];
  /** Le prix de l'intermédiaire qu'on évite. Il vient de
   *  `lib/site/integrations.ts`, relevé sur la page de tarifs de
   *  Zapier, jamais recopié à la main. */
  sioPrix: string;

  ouTitre: string;
  ouMotCle: string;
  ouCorps: string;
  ouCarreaux: readonly Carreau[];
  /** Les deux cartes du bas : le lien nu, et le bloc de code sombre. */
  ouLienTitre: string;
  ouLienCorps: string;
  ouCodeTitre: string;
  ouCodeCorps: string;
  ouNote: string;

  /** POURQUOI UN QUIZ, ET PAS UN EBOOK DE PLUS.
   *
   *  Béné, 5 septembre 2026 : "pourquoi tu ne reprends pas les mots, la
   *  mise en forme, le design, les animations, le rythme, les arguments
   *  de la page de vente originale ? J'ai beaucoup bossé pour cette
   *  page, pourquoi la landing devrait être aussi différente alors
   *  qu'elle a fait ses preuves ?"
   *
   *  Elle avait raison, et ce bloc est la preuve la plus nette : j'ai
   *  écrit le 5 septembre un comparatif PDF / webinaire / quiz sur cinq
   *  critères en annonçant qu'il manquait. IL NE MANQUAIT PAS. Sa
   *  section "Prends 5 ans d'avance sur tes concurrents" porte depuis le
   *  début un comparatif Tiquiz / Ebook / Formation offerte sur SEPT
   *  critères. Le sien est repris tel quel, mot pour mot.
   *
   *  AUCUN CHIFFRE DE COMPARAISON, et c'est déjà son choix à elle : ses
   *  sept lignes disent oui ou non, jamais un taux. Le 44,9 % de la
   *  carte voisine porte sa source ; je n'ai rien d'équivalent pour un
   *  ebook, donc rien n'est chiffré ici. */
  formatsLeadTitre: string;
  formatsLeadMotCle: string;
  formatsLeadFin: string;
  formatsLeadCorps: string;
  /** Les en-têtes : le critère, puis les trois colonnes. */
  /** Ses sept critères. `true` coche, `false` barre : c'est sa lecture. */
  formatsLeadNote: string;

  /** LES TROIS SECTIONS DE SA PAGE QUI N'ÉTAIENT PAS ICI.
   *
   *  Relevées en extrayant sa page en ordre de lecture : elle a dix-neuf
   *  sections, la landing en reprenait onze. Ces trois là portent trois
   *  arguments que rien d'autre ne dit, et le deuxième est celui qui
   *  vend le mieux (ce que le quiz t'apprend, en plus de l'adresse).
   *
   *  Le texte est le SIEN. On ne le réécrit pas. */
  qualifiesTitre: string;
  qualifiesMotCle: string;
  qualifiesFin: string;
  qualifiesCorps: readonly string[];
  /** Les captures de leads qui défilent, comme sur sa page. */

  offresTitre: string;
  offresMotCle: string;
  offresFin: string;
  offresIntro: string;
  offresPuces: readonly string[];
  offresConclusion: string;
  /** Le sondage dessiné : sa question, ses quatre réponses chiffrées. */

  demarqueTitre: string;
  demarqueMotCle: string;
  demarqueFin: string;
  demarqueCorps: readonly string[];

  /** POURQUOI TIQUIZ, ET PAS UN AUTRE OUTIL DE QUIZ.
   *
   *  La deuxième question. Elle était traitée en cinq morceaux répartis
   *  dans la page, donc nulle part : quelqu'un qui compare des outils
   *  n'avait aucun endroit où lire la réponse.
   *
   *  Le tableau se construit sur `OUTILS` (`lib/site/integrations.ts`),
   *  la table qui alimente déjà les six pages du hub : chaque ligne y
   *  est SOURCÉE sur la documentation de l'outil, et le lien vers le
   *  hub mène aux preuves. Réécrire ces lignes ici en ferait une
   *  deuxième liste, donc une divergence, sur l'écran où un lecteur
   *  vérifie. */
  outilsTitre: string;
  outilsMotCle: string;
  outilsCorps: string;
  outilsColonnes: readonly string[];
  /**
   * CE QUE LE TABLEAU VEUT DIRE, EN CLAIR.
   *
   * Béné, 5 septembre 2026 : "l'idée de la comparaison est bien mais
   * c'est peu compréhensible par un néophyte : c'est QUOI l'intérêt, le
   * vrai gain, l'avantage ?"
   *
   * Elle a raison : "Zapier Pro, un Zap par résultat" est un FAIT, pas
   * un argument. Quelqu'un qui n'a jamais ouvert Zapier ne peut pas
   * traduire ça en abonnement, en temps et en clics. La phrase le dit,
   * et le prix vient de `lib/site/integrations.ts`, jamais recopié.
   */
  outilsGain: string;
  outilsNote: string;
  outilsLien: string;

  /** CE QUI N'EST PAS POUR TOI, ET C'EST LE BLOC QUI REND LE RESTE
   *  CROYABLE.
   *
   *  Béné, 5 septembre 2026 : "sans bullshit". Une page qui ne dit que
   *  du bien se lit comme une page de vente ; une page qui sait dire
   *  non se lit comme quelqu'un d'honnête, et c'est sa force ("c'est
   *  pas pour toi, ça va pas t'aider").
   *
   *  Les trois refus sont VRAIS et vérifiables dans le code, ce sont
   *  les mêmes que le bloc de qualification de sa page v2 : le résultat
   *  est PRÉÉCRIT par profil (`lib/quizScoring.ts`), le parcours est
   *  LINÉAIRE, et le design suit son branding sans être libre au pixel. */
  pasPourToiTitre: string;
  pasPourToiMotCle: string;
  pasPourToiCorps: string;
  pasPourToi: readonly string[];
  pasPourToiFin: string;

  /** LA VIRALITÉ, ET C'EST UN ARGUMENT DE SA PAGE QUE J'AVAIS SAUTÉ.
   *
   *  "Pour découvrir les résultats de leur quiz, tes prospects devront
   *  d'abord le partager sur leurs réseaux, exposant ainsi ta marque à
   *  de nouvelles personnes qui leur ressemblent."
   *
   *  C'est le seul levier de la page qui ramène des visiteurs au lieu
   *  d'en convertir, et il est vrai dans le code (`virality_enabled`,
   *  le bonus de partage, les réseaux cochés). AUCUN chiffre : ceux de
   *  sa page portent sur ses propres quiz, je ne peux pas les sourcer.
   *
   *  Et la nuance de Jocelyne (4 août) est écrite dans la note : sur un
   *  sujet intime, un taux de partage bas n'est pas un défaut du quiz,
   *  et le partage se désactive. */
  viralTitre: string;
  viralMotCle: string;
  viralCorps: string[];
  viralNote: string;
  viralCta: string;

  /** LES TROIS FORMATS. Sa page les vend ensemble, la landing n'en
   *  vendait qu'un : "Tiquiz, c'est des quiz... mais aussi des sondages
   *  et des popquiz". Deux produits payés et jamais montrés. */
  formatsTitre: string;
  formatsMotCle: string;
  formatsCorps: string;
  formats: readonly Carreau[];

  /** LES DEUX MÉCANIQUES : profil, ou score. Son animation le montre. */
  modesTitre: string;
  modesMotCle: string;
  modesCorps: string;
  modesNote: string;

  /** LE BRANDING. Son animation arrivait NUE : "ton logo ta marque
   *  arrive comme un cheveu sur la soupe, sans texte ni contexte,
   *  incompréhensible". Une animation sans titre au dessus ne dit rien
   *  à quelqu'un qui la découvre. */
  brandingTitre: string;
  brandingMotCle: string;
  brandingCorps: string;
  brandingNote: string;

  /** La phrase qui introduit l'animation opt-in contre quiz. */
  animLegende: string;

  /** LE BLOC D'OBJECTIONS, à la place des avis.
   *
   *  Il remplace les six témoignages, et ce n'est pas un pis-aller :
   *  les cinq objections viennent du persona de `copywriting-claude/`
   *  ("encore un outil de plus", "je ne suis pas technique", "ça va me
   *  prendre du temps", "je ne suis pas sûr que ça marche dans mon
   *  domaine", "j'ai déjà testé plein de trucs"). Répondre à ce que le
   *  lecteur pense À CET INSTANT est ce qui débloque un achat. */
  objectionsTitre: string;
  objectionsMotCle: string;
  objections: readonly Question[];

  /** LE CTA DE FIN DE SECTION, SA SIGNATURE.
   *
   *  Relevé sur sa page : chaque section se termine par un désir à la
   *  première personne ("Je veux capturer ces emails", "Je veux vendre
   *  avec un quiz", "Je me lance gratuitement"). Ce n'est pas un
   *  libellé de bouton, c'est la phrase que le lecteur vient de se
   *  dire, et c'est ce qui fait qu'on clique au milieu d'une page.
   *
   *  Ma landing n'en avait que TROIS en tout (haut de page, tarifs,
   *  bandeau) : il fallait scroller jusqu'aux prix pour trouver un
   *  bouton. */
  /** LES BOUTONS, ET C'EST SA SIGNATURE.
   *
   *  Un bouton après chaque section, à la PREMIÈRE PERSONNE : ce n'est
   *  pas un libellé, c'est la phrase que le lecteur vient de se dire.
   *  Les onze sont relevés section par section sur sa page de vente et
   *  ne se réécrivent pas. */
  ctas: {
    probleme: string;
    viral: string;
    qualifies: string;
    offres: string;
    etapes: string;
    funnel: string;
    demarque: string;
    sio: string;
    modes: string;
    formats: string;
    branding: string;
  };
  /** La rassurance sous chaque bouton du milieu de page. Sa page pose
   *  "Pas besoin de CB - aucune obligation" sous le premier : la
   *  répéter à chaque bouton est le déclencheur de sécurité, et il ne
   *  coûte rien. */
  ctaRassurance: string;

  /** LA TRANSFORMATION, ET ELLE VIENT DE SON PERSONA.
   *
   *  "Maintenant, imaginons que tout change" ouvre la deuxième moitié
   *  de son persona (copywriting-claude/Persona tiquiz.md). Une landing
   *  qui ne décrit que le problème et l'outil saute l'étape où le
   *  lecteur se projette, et c'est celle qui fait acheter. */
  avisTitre: string;
  avisMotCle: string;
  avisCorps: string;
  apres: readonly string[];

  prixTitre: string;
  prixMotCle: string;
  prixNote: string;
  /** Les deux côtés de l'interrupteur, et la pastille d'économie. */
  prixMensuel: string;
  prixAnnuel: string;
  prixEconomie: string;
  /** Les trois rubans, "pour qui", et le libellé du bouton. */
  prixRubans: readonly Ruban[];
  prixParMois: string;
  prixParAn: string;
  gratuit: { nom: string; prix: string; rythme: string };
  /** "Tout le gratuit, plus :" et "Tout Tiquiz, plus :". */
  prixInclus: readonly string[];
  /** La grille comparative complète, comme les vrais SaaS. */
  comparatifTitre: string;
  comparatifCorps: string;
  /** Les en-têtes de colonnes, et les trois titres de groupes. */
  comparatifGroupes: readonly string[];
  /** Les quatre lignes de limites, dans l'ordre du groupe 1. */
  comparatifLimites: readonly string[];
  illimite: string;
  /** Les limites du gratuit. `{quiz}`, `{popquiz}` et `{leads}` sont remplis depuis `FREE_LIMITS`. */
  gratuitLignes: readonly string[];
  partageTitre: string;

  faqTitre: string;
  faqCorps: string;
  /** Les 16 questions viennent de SA page de vente : voir `FAQ_VENTE`. */

  /** La démo : son vrai popquiz, en iframe. */
  demoTitre: string;
  demoMotCle: string;
  demoCorps: string;
  demoLien: string;

  /** Le bandeau dégradé de fin, le seul aplat de couleur de la page. */
  bandeTitre: string;
  bandeCorps: string;
  bandeCta: string;
}

/**
 * LA FAQ DE SA PAGE DE VENTE : ELLE NE VIT PAS ICI, ET C'EST VOULU.
 *
 * Béné, 4 septembre 2026 : "et la FAQ bordel tu as déjà tout sur la page
 * de vente : pourquoi tu ne reproduis pas ??"
 *
 * Elle a raison, et il n'y avait rien à écrire : les 16 questions ET
 * leurs réponses vivent dans le `FAQPage` en données structurées de
 * `content/sales/tiquiz.html`, et le regroupement en cinq groupes dans
 * `lib/sales/faqV2.ts` depuis le 2 septembre. `npm run faq:extraire`
 * lit les deux et écrit `content/faq-vente.json`.
 *
 * CE MODULE NE LE LIT PAS, parce qu'un module qui touche au disque n'est
 * plus chargeable par le runner de tests, donc plus testé, donc
 * exactement là où les bugs s'installent (règle du 1er août). La lecture
 * vit dans `app/(site)/apercu-landing-8f2c9d41/faq.ts`, à côté de
 * `anims.tsx` qui lit déjà des fichiers.
 */
export interface GroupeQuestions {
  titre: string;
  questions: readonly Question[];
}

/**
 * LES QUINZE TÉMOIGNAGES DE SA PAGE DE VENTE.
 *
 * Relevés dans content/sales/tiquiz.html, sous son titre "Il y a un
 * avant ... et un après Tiquiz". Ils ne sont NI traduits, NI corrigés,
 * NI raccourcis : ce sont des gens qui ont écrit ça.
 *
 * ET C'EST ICI QUE SON VOCABULAIRE SE LIT. Béné, 5 septembre : "c'est
 * des entrepreneurs, des coachs, des auteurs, des affiliés, des
 * infopreneurs ... ils ne se définissent pas comme étant des
 * créateurs". Les métiers ci-dessous sont les siens, écrits par les
 * intéressés : entrepreneur, infopreneur, consultant, formatrice,
 * coach, solopreneur, thérapeute, affilié, marketeur. C'est cette
 * liste qui décide des mots de la page, pas les miens.
 */
export const TEMOIGNAGES: readonly Temoignage[] = [
  {
    nom: "Gwenn",
    portrait: "/v/tiquiz/70db92d7817f.webp",
    metier: "Solopreneur",
    texte:
      "Enfin un outil de quiz parfaitement pensé marketing, qui est directement relié à Systeme.io pour récupérer les leads et les taguer automatiquement, sans devoir passer par des outils comme Zapier ou Make. Hyper pratique et complet, avec plein de types de quiz et de sondages possibles. J'adore !",
    source: "Trustpilot, 2 septembre 2026",
  },
  {
    nom: "Adeline",
    portrait: "/v/tiquiz/85f9bbeaf5fa.webp",
    metier: "Thérapeute",
    texte:
      "Super outil ! Très simple d'utilisation, et surtout : le quiz punaise mais c'est le meilleur lead magnet aujourd'hui ! Je suis fan, voilà. Merci Béné pour ce bijou !",
  },
  {
    nom: "Eric Legrigeois",
    portrait: "/v/tiquiz/425d46aa062b.webp",
    metier: "Infopreneur",
    texte:
      "Tiquiz un outil de quiz parfaitement pensé marketing, qui est connecté à Systeme.io pour récupérer les leads et les taguer automatiquement, sans devoir passer par des outils comme Zapier ou Make. Je remercie Béné pour avoir développer Tiquiz , pour sa présence , ses retours à mes questions , sa réactivité pour faire évoluer l'outil.",
    source: "Trustpilot, 2 septembre 2026",
  },
  {
    nom: "Bernard C.",
    portrait: "/v/tiquiz/45dd58b35935.webp",
    metier: "Consultant",
    texte:
      "Tiquiz m'a vraiment aidé à clarifier mes idées pour qualifier mes prospects. Mes leads sont tagués automatiquement dans Systeme.io, un vrai gain de temps.",
  },
  {
    nom: "Monique Pulby",
    portrait: "/v/tiquiz/3c784e1f489a.webp",
    metier: "Formatrice",
    texte:
      "As-tu déjà galéré à créer un quiz, à gérer les résultats qui en découlent, à le rattacher à une campagne d'emails ? Moi oui, jusqu'à ce que je découvre Tiquiz. Il fait tout ça. Tu as seulement besoin de lui préciser à qui tu souhaites adresser le quiz, ce à quoi il doit servir et quel résultat tu aimerais obtenir. Et le tour est joué : tu obtiens un quiz qualitatif. Bref, une pépite. Je recommande à 100 %",
    source: "Trustpilot, 27 juillet 2026",
  },
  {
    nom: "Jean Bernard R.",
    portrait: "/v/tiquiz/b474dd490206.webp",
    metier: "Créateur de contenu",
    texte:
      "J'ai testé la génération de quiz et le résultat est incroyable. Les CTA personnalisés pour chaque profil fonctionnent parfaitement. Ces quiz c'est un truc de ouf !",
  },
  {
    nom: "Evelyne G.",
    portrait: "/v/tiquiz/45eea45dcb9d.webp",
    metier: "Coach",
    texte:
      "Un travail de dingue pour mettre autant de fonctionnalités dans un outil de quiz aussi simple. Tout est bien organisé, les automatisations sont top.",
  },
  {
    nom: "Alain M.",
    portrait: "/v/tiquiz/8629b749bd40.webp",
    metier: "Affilié",
    texte:
      "L'outil s'améliore tous les jours. Les quiz connectés à Systeme.io, c'est exactement ce qu'il manquait. Si j'ai des suggestions, c'est avec plaisir !",
  },
  {
    nom: "Jérémy B.",
    portrait: "/v/tiquiz/7d265fde9f4a.webp",
    metier: "Entrepreneur",
    texte:
      "Un véritable couteau suisse pour générer des leads avec des quiz. Que tu sois débutant ou non, tu automatises tout ou presque. Je recommande à 1000% !",
  },
  {
    nom: "Maulisio T.",
    portrait: "/v/tiquiz/87edd75bf22d.webp",
    metier: "Marketeur",
    texte:
      "Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller des intégrations.",
  },
  {
    nom: "Samira L.",
    portrait: "/v/tiquiz/39cddeab9489.webp",
    metier: "Entrepreneuse",
    texte:
      "J'ai testé la création de quiz pour ma future offre. Vu que j'avais déjà paramétré ma cible, le rendu est juste top. Vraiment, merci !",
  },
  {
    nom: "Fabienne G.",
    portrait: "/v/tiquiz/3089473d0b33.webp",
    metier: null,
    texte:
      "Bravo pour la création de Tiquiz, c'est une révolution ! Mes quiz convertissent enfin comme il faut et mes leads arrivent directement dans mes tunnels.",
  },
  {
    nom: "Marie Paule C.",
    portrait: "/v/tiquiz/c52457fd6112.webp",
    metier: null,
    texte:
      "Vraiment bravo et félicitations pour cet outil de quiz. Les résultats personnalisés par profil sont géniaux et la connexion Systeme.io est un vrai plus.",
  },
  {
    nom: "Thibault L.",
    portrait: "/v/tiquiz/9ed1ddc2a09f.webp",
    metier: null,
    texte:
      "Les quiz Tiquiz sont puissants et ultra simples à créer. La segmentation automatique des leads, c'est exactement ce dont j'avais besoin.",
  },
  {
    nom: "Sylvère M.",
    portrait: "/v/tiquiz/fb9aab2a3438.webp",
    metier: null,
    texte:
      "Franchement, je suis bluffé. J'ai pris le temps de créer mon premier quiz et le résultat est tout simplement topissime. Bravo !",
  },
  {
    nom: "Maurice Massolin",
    metier: null,
    texte:
      "J'utilise Tiquiz pour mon quiz de diagnostic client, connecté à System.io avec des séquences emails segmentées par profil. La connexion est propre, les tags s'appliquent automatiquement, et l'interface est suffisamment intuitive pour qu'on configure tout sans développeur. Pour quelqu'un qui opère seul et qui veut un funnel de capture qui tourne sans surveillance, Tiquiz fait exactement ce qu'il promet.",
    source: "Trustpilot, 4 septembre 2026",
  },
  {
    nom: "Christian",
    metier: null,
    texte:
      "J'ai créé mes deux premiers quizz qui ont donné des résultats que je n'aurais jamais imaginés. Ce qui est fabuleux c'est que Tiquiz comble une lacune de System.io qui ne permet pas de faire des quiz. Ca fonctionne comme un rêve.",
    source: "Trustpilot, 2 septembre 2026",
  },
  {
    nom: "Chris Lecroard",
    metier: null,
    texte:
      "Excellent logiciel la conceptrice est à l'écoute et l'ensemble est cohérent avec nos besoins et nos missions.",
    source: "Trustpilot, 2 septembre 2026",
  },
] as const;

/**
 * LES TROIS TÉMOIGNAGES DE LA PREUVE PRÉCOCE.
 *
 * Béné veut une preuve sociale "immédiatement", en haut de page. Trois
 * témoignages y tiennent, pas quinze.
 *
 * ON PREND LES TROIS PLUS COURTS, ON N'EN COUPE AUCUN. Un témoignage
 * ne se raccourcit pas : c'est quelqu'un qui a écrit ça, et en garder
 * la première phrase serait le réécrire, donc fabriquer un faux
 * témoignage. Trier par longueur choisit ceux qui tiennent DÉJÀ en
 * deux lignes.
 *
 * Le tri est STABLE (l'index départage les longueurs égales) : sans
 * ça, deux rendus du serveur pourraient ne pas donner le même trio, et
 * l'hydratation crierait.
 */
export function preuvePrecoce(
  tous: readonly Temoignage[],
  combien = 3,
): readonly Temoignage[] {
  return [...tous]
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v.texte.length - b.v.texte.length || a.i - b.i)
    .slice(0, combien)
    .map((x) => x.v);
}

/** Le popquiz de démonstration, celui qu'elle m'a donné. */
/**
 * UN BLOC DE TEXTE S'ALIGNE À GAUCHE DÈS QU'IL EST LONG.
 *
 * Béné, 5 septembre 2026, sur la section Systeme.io : "ce gros bloc de
 * texte est imbuvable [...] aligne à gauche quand il y a plus de
 * 3 lignes (règle élémentaire pour être plus facile à lire)". Et sur
 * les leads qualifiés : "aligne à gauche les longs textes pour une
 * meilleure lecture".
 *
 * ON NE COMPTE PAS LES LIGNES, PARCE QU'ON NE PEUT PAS. Le nombre de
 * lignes dépend de la césure, donc de la largeur, donc de la langue et
 * de l'appareil : mesuré le 5 septembre sur la page rendue, un
 * paragraphe de 216 caractères tenait en 3 lignes et un autre de 198 en
 * prenait 4. Une estimation "caractères divisés par 70" se trompe donc
 * dans les deux sens, et un texte centré sur cinq lignes est exactement
 * ce qu'elle refuse.
 *
 * La règle est donc SÛRE au lieu d'être précise, et le SENS de
 * l'erreur décide du seuil : aligner à gauche un paragraphe qui tenait
 * en trois lignes ne coûte rien, laisser centré un pavé de cinq lignes
 * est exactement ce qu'elle refuse. Un bloc qui porte PLUSIEURS
 * paragraphes est donc long par construction, et un paragraphe seul
 * l'est au delà de 150 caractères, c'est à dire bien AVANT les trois
 * lignes (mesuré : une ligne pleine tient 65 à 70 caractères à 17 px
 * dans 720 px, et la césure en fait perdre jusqu'à 15 %).
 *
 * Le contrôle qui compte vraiment est ailleurs, et il MESURE :
 * `tests/visual/landing-paddings.spec.ts` refuse qu'un paragraphe
 * centré dépasse trois lignes rendues, sur les trois largeurs.
 */
export const CARACTERES_BLOC_LONG = 150;

export function blocLong(paragraphes: readonly string[]): boolean {
  if (paragraphes.length > 1) return true;
  return (paragraphes[0]?.length ?? 0) > CARACTERES_BLOC_LONG;
}

export const DEMO_POPQUIZ = "https://quiz.tipote.com/embed/p/0a7d8f50-f329-48e5-b5af-36c642f00c7c";

/**
 * LES TROIS COLONNES DE TARIF, ET AUCUN TEXTE RECOPIÉ.
 *
 * Les prix viennent de `OWNER_CATALOG`, les limites du gratuit de
 * `FREE_LIMITS`, et les fonctionnalités de `lib/checkout/avantages.ts`,
 * qui est LA source depuis le 2 septembre : la grille de la page de
 * vente et le bon de commande la lisent déjà, et un test compare les
 * deux au mot près.
 *
 * Réécrire ces lignes ici ferait une troisième liste, donc une
 * troisième occasion de promettre sur la page ce que le bon de commande
 * ne promet pas. C'est le défaut le plus cher de ce dépôt, et ici il
 * vivrait sur l'écran où quelqu'un sort sa carte.
 */
/*
 * CE QUE ÇA LAISSE OUVERT, ET IL FAUT LE DIRE : `avantages.ts` n'existe
 * QU'EN FRANÇAIS. Sur `?lang=en`, la coquille de la page est traduite et
 * les lignes de fonctionnalités restent en français.
 *
 * Les traduire ici fabriquerait la deuxième liste, donc la divergence
 * qu'on vient de fermer. La traduction se fait dans `avantages.ts`, une
 * fois, quand le texte français est validé, et les trois écrans qui le
 * lisent en profitent le même jour.
 */
export function colonnesDeTarif(t: ContenuLanding): ColonneTarif[] {
  // LE PRIX EN GROS, SANS SES DEUX ZÉROS.
  //
  // Béné, 5 septembre 2026 : "les tarifs sont moches." `17,00 €` en
  // 44 px, c'est un montant de facture posé là où on lit un prix d'un
  // coup d'oeil. On retire les centimes QUAND ILS SONT NULS, et
  // seulement là : un tarif à 17,50 € doit garder ses cinquante
  // centimes, sinon la grille annoncerait moins que le bon de commande.
  //
  // On ne touche PAS à `formatCents` : le bon de commande et les
  // factures affichent un montant, pas une accroche, et ils doivent
  // garder leurs décimales.
  const prix = (id: "mensuel" | "annuel" | "mensuel-plus" | "annuel-plus") => {
    const p = OWNER_CATALOG[id];
    const brut = formatOwnerPrice(p);
    return p.amountCents % 100 === 0 ? brut.replace(/[.,]00/, "") : brut;
  };
  const puces = (as: readonly { texte: string; detail?: string }[]): PuceTarif[] =>
    as.map((a) => ({ texte: a.texte, detail: a.detail }));

  return [
    {
      nom: t.gratuit.nom,
      prix: t.gratuit.prix,
      cadence: t.gratuit.rythme,
      prixAn: null,
      cadenceAn: null,
      cta: t.prixRubans[0].cta,
      lien: "/signup",
      lienAn: null,
      inclus: null,
      // `replaceAll` ET PAS `replace` : une ligne peut nommer deux fois
      // la même limite ("1 quiz et 1 sondage"), et `replace` avec une
      // chaîne ne remplace que la PREMIÈRE. C'est sorti à l'écran, pas
      // au typecheck : le rendu affichait "1 quiz et {quiz} sondage".
      lignes: t.gratuitLignes.map((ligne) => ({
        texte: ligne
          .replaceAll("{quiz}", String(FREE_LIMITS.maxQuizzesPerMode))
          .replaceAll("{popquiz}", String(FREE_LIMITS.maxPopquizzes))
          .replaceAll("{leads}", String(FREE_LIMITS.visibleLeadsPerMonth)),
        // CE SONT DES LIMITES, PAS DES AVANTAGES : elles ne portent pas
        // la coche des colonnes payantes.
        limite: true,
      })),
    },
    {
      nom: OWNER_CATALOG["mensuel"].label.replace(/ mensuel$/i, ""),
      prix: prix("mensuel"),
      cadence: t.prixParMois,
      prixAn: prix("annuel"),
      cadenceAn: t.prixParAn,
      cta: t.prixRubans[1].cta,
      lien: "/commande/mensuel",
      lienAn: "/commande/annuel",
      inclus: t.prixInclus[0],
      lignes: puces(AVANTAGES_PAYANTS),
    },
    {
      nom: OWNER_CATALOG["mensuel-plus"].label.replace(/ mensuel Plus$/i, " PLUS"),
      prix: prix("mensuel-plus"),
      cadence: t.prixParMois,
      prixAn: prix("annuel-plus"),
      cadenceAn: t.prixParAn,
      cta: t.prixRubans[2].cta,
      lien: "/commande/mensuel-plus",
      lienAn: "/commande/annuel-plus",
      inclus: t.prixInclus[1],
      lignes: puces(AVANTAGES_PLUS),
    },
  ];
}

/**
 * LA GRILLE COMPARATIVE, LIGNE PAR LIGNE.
 *
 * Béné, 5 septembre 2026 : "on n'a qu'à rajouter une grille de
 * fonctionnalités qui compare tous les plans, comme les vrais saas."
 *
 * ELLE NE RECOPIE RIEN. Les limites viennent de `FREE_LIMITS`, les
 * lignes de `avantages.ts`. Une grille de comparaison est exactement
 * l'écran où un lecteur vérifie, donc c'est le dernier endroit où on
 * peut se permettre une deuxième liste.
 *
 * Les trois groupes disent trois choses différentes, et les mélanger
 * ferait perdre le sens : ce qui est BORNÉ sur le gratuit, ce que TOUT
 * LE MONDE a, et ce que le PLUS ajoute.
 */
export function comparatifDesPlans(t: ContenuLanding): GroupeComparatif[] {
  const ill = t.illimite;
  const [gTitre, cTitre, pTitre] = t.comparatifGroupes;
  const [lQuiz, lSondage, lPopquiz, lReponses] = t.comparatifLimites;

  return [
    {
      titre: gTitre,
      lignes: [
        { intitule: lQuiz, gratuit: String(FREE_LIMITS.maxQuizzesPerMode), tiquiz: ill, plus: ill },
        { intitule: lSondage, gratuit: String(FREE_LIMITS.maxQuizzesPerMode), tiquiz: ill, plus: ill },
        { intitule: lPopquiz, gratuit: String(FREE_LIMITS.maxPopquizzes), tiquiz: ill, plus: ill },
        {
          intitule: lReponses,
          gratuit: String(FREE_LIMITS.visibleLeadsPerMonth),
          tiquiz: ill,
          plus: ill,
        },
      ],
    },
    {
      titre: cTitre,
      lignes: [...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX].map((a) => ({
        intitule: a.texte,
        gratuit: true,
        tiquiz: true,
        plus: true,
      })),
    },
    {
      titre: pTitre,
      lignes: AVANTAGES_PLUS.map((a) => ({
        intitule: a.texte,
        gratuit: false,
        tiquiz: false,
        plus: true,
      })),
    },
  ];
}

const fr: ContenuLanding = {
  langue: "fr",
  metaTitre: "Tiquiz : le générateur de quiz connecté à Systeme.io",
  metaDescription:
    "Décris ton sujet, l'IA écrit le quiz, et chaque profil renvoie vers ton offre. Le contact arrive dans Systeme.io avec son tag, créé automatiquement s'il n'existe pas.",

  etiquette: "Générateur de quiz connecté à Systeme.io",
  titre: "Booste ton trafic",
  titreDefilant: [
    "Booste ton trafic",
    "Génère plus de leads",
    "Améliore tes offres",
    "Booste tes ventes",
    "Démarque-toi",
  ],
  motCle: "grâce aux quiz interactifs",
  accroche:
    "Crée des quiz viraux qui attirent du trafic qualifié sur tes offres et transforment tes visiteurs en clients payants, sans investir en publicité.",
  pourQui:
    "Pour les entrepreneurs, les coachs, les consultants, les formateurs, les infopreneurs et les affiliés qui ont une offre et pas assez de monde à qui la présenter.",
  ctaPrincipal: "Commencer gratuitement",
  ctaSecondaire: "Voir la démo",
  sousCta: "Aucune carte demandée. Le quiz que tu génères reste à toi.",
  rassurances: ["Connecté à Systeme.io", "Quiz illimités", "IA intégrée"],
  bandeau: [
    "Quiz IA illimités",
    "Sondages illimités",
    "Popquiz",
    "Connexion Systeme.io",
    "Capture de leads",
    "Résultats personnalisés",
    "Scoring intelligent",
    "Partage viral",
    "Tags automatiques",
    "Branding personnalisé",
    "Statistiques détaillées",
    "Intégration embed",
    "Lien partageable",
    "Nom de domaine personnalisé",
    "Design responsive",
    "7 langues",
    "Zéro code",
    "Mini-tunnels de vente",
    "Données exploitables",
  ],
  preuve: "Plus de 200 entrepreneurs utilisent déjà Tiquiz",
  copier: "Copier",

  problemeTitre: "Chaque visiteur qui repart sans te laisser son email est",
  problemeMotCle: "un client perdu",
  problemeCorps: [
    "Quand tu as la chance qu'un visiteur découvre ton contenu et le lise, mais que tu ne captures pas son email : tu ne peux plus lui parler, plus rien lui proposer.",
    "Et tes abonnés ne t'appartiennent pas : ton compte sur n'importe quel réseau social peut sauter à tout moment et tu peux tout perdre. Alors que ta liste email, elle, est à toi.",
    "Le problème c'est qu'aujourd'hui peu de visiteurs échangent leur mail contre un simple PDF (qui ne sera pas lu, de toute façon).",
    "Le quiz inverse la mécanique : ton prospect répond parce que ça parle de lui, et il laisse son email parce qu'il veut son résultat. C'est interactif au lieu d'être à sens unique.",
  ],

  animLegende: "Même effort pour attirer ton visiteur. 5x plus de données pour toi.",

  chiffre: "44,9 %",
  chiffreLegende:
    "des personnes qui commencent un quiz laissent leur email, dans la catégorie coaching et formation.",
  chiffreSource:
    "Rapport Interact sur les taux de conversion des quiz. Ce n'est pas un taux de page : c'est le taux mesuré à partir du moment où le quiz est commencé.",

  maquette: {
    progression: "Question 2 sur 6",
    question: "Combien de personnes reçoivent tes emails aujourd'hui ?",
    reponses: [
      "Personne, je démarre tout juste",
      "Quelques dizaines, surtout des proches",
      "Plusieurs centaines, ça bouge un peu",
    ],
    choisie: 1,
  },

  funnelTitre: "Un seul quiz. Et chacun repart vers",
  funnelMotCle: "l'offre qui le concerne",
  funnelCorps:
    "Tu ne diagnostiques pas pour le plaisir de diagnostiquer. Chaque résultat a son propre texte, son propre bouton et son propre tag. Trois personnes répondent au même quiz, elles ne finissent pas au même endroit.",
  funnelProfils: [
    {
      reponse: "Je démarre tout juste",
      profil: "Tu poses les bases",
      offre: "Vers ton offre d'entrée",
      tag: "profil-debutant",
    },
    {
      reponse: "Quelques dizaines de contacts",
      profil: "Tu as une liste, pas encore de rythme",
      offre: "Vers ton accompagnement",
      tag: "profil-liste-tiede",
    },
    {
      reponse: "Plusieurs centaines de contacts",
      profil: "Tu as l'audience, il manque l'offre",
      offre: "Vers ton offre haute",
      tag: "profil-audience",
    },
  ],
  funnelTagLegende:
    "Le tag part dans Systeme.io avec le contact. S'il n'existe pas encore, Tiquiz le crée.",

  mecaniqueTitre: "Comment marche",
  mecaniqueMotCle: "Tiquiz",
  etapeMot: "Étape",
  etapes: [
    {
      titre: "Crée le quiz parfait à partir d'un simple prompt",
      corps:
        "Personnalise ton quiz en un éclair à l'aide de l'intelligence artificielle de Tiquiz. Tu obtiens en quelques secondes un modèle unique que tu n'as plus qu'à customiser avec ta personnalité, ton logo, tes images, tes couleurs, ainsi que les URL de ton choix. Tu as déjà un quiz, ou tu ne veux pas utiliser l'IA ? Tu peux aussi importer un quiz existant ou le créer 100 % manuellement.",
    },
    {
      titre: "Partage ton quiz en 1 clic",
      corps:
        "Copie le lien de ton quiz et diffuse-le par email ou sur tes réseaux, avec ton nom de domaine personnalisé. Ou copie le code html et intègre-le partout où ça te semble le plus efficace : pop-up, page d'accueil, pied de page, en-tête, article de blog, appel à l'action.",
    },
    {
      titre: "Propage ta marque comme une trainée de poudre",
      corps:
        "Pour découvrir les résultats de leur quiz, tes prospects devront d'abord le partager sur leurs réseaux, exposant ainsi ta marque à de nouvelles personnes qui leur ressemblent. Résultat : ton quiz devient viral, et tu boostes ta présence en ligne sans dépenser un centime en publicité.",
    },
    {
      titre: "Capture, exporte, automatise !",
      corps:
        "Capture tes leads directement dans Tiquiz, exporte-les en 1 clic vers ton autorépondeur, puis déclenche les automatisations de ton choix.",
    },
  ],

  sioTitre: "Connexion native à Systeme.io",
  sioMotCle: "native",
  sioCorps: [
    "Les autres outils de quiz ne parlent pas à Systeme.io. Il leur faut Zapier, Make ou Pabbly au milieu : un abonnement de plus, une configuration de plus, et un endroit de plus où ça casse sans que personne ne le voie.",
    "Deux outils suffisent pour tout ton système, Tiquiz et Systeme.io. Un des deux, tu l'utilises déjà.",
  ],
  sioPrix: "Zapier commence à {prix} par mois, pour faire ce que Tiquiz fait tout seul.",

  ouTitre: "Ton quiz va",
  ouMotCle: "là où tu es déjà",
  ouCorps:
    "Pas sur notre domaine avec notre logo dessus. Sur le tien, ou posé là où ton audience passe déjà.",
  ouCarreaux: [
    {
      titre: "Dans un tunnel Systeme.io",
      corps: "Sur une page de ton tunnel, avant ou après ton formulaire.",
    },
    {
      titre: "Dans WordPress",
      corps: "Article, page, barre latérale. Aucun greffon à installer.",
    },
    {
      titre: "Sur une page de vente",
      corps: "Juste au dessus de ton bouton, pour qualifier avant de vendre.",
    },
    {
      titre: "Dans un article de blog",
      corps: "Au milieu du texte, là où le lecteur est déjà accroché.",
    },
    {
      titre: "Tout seul, sur ton domaine",
      corps: "quiz.tonsite.fr. Pas de site ? Ton quiz EST la page.",
    },
    {
      titre: "Ailleurs",
      corps: "Partout où tu peux coller un lien ou six lignes de code.",
    },
  ],
  ouLienTitre: "Soit tu partages un lien",
  ouLienCorps:
    "Tu le colles dans un email, une story, une bio, un QR code. Avec ton nom de domaine si tu en as un.",
  ouCodeTitre: "Soit tu colles six lignes",
  ouCodeCorps:
    "Tu copies le code depuis Tiquiz, tu le colles dans ta page. Le quiz s'affiche dedans, à ta place.",
  ouNote:
    "Aucune des deux ne demande de savoir coder. Copier, coller, c'est tout. Et ton visiteur ne voit que ton logo, tes couleurs et ton adresse.",

  formatsLeadTitre: "Prends",
  formatsLeadMotCle: "5 ans d'avance",
  formatsLeadFin: "sur tes concurrents",
  formatsLeadCorps:
    "Contrairement à un simple ebook ou une formation offerte, les quiz cochent toutes les cases qui te permettent d'améliorer ta présence en ligne et maximiser tes conversions.",
  formatsLeadNote:
    "Grâce aux quiz, tu te démarques de tes concurrents, tu engages ton audience de manière ludique, tu génères du trafic qualifié, et tu transformes plus facilement tes visiteurs en clients payants.",

  qualifiesTitre: "Capture des",
  qualifiesMotCle: "leads qualifiés",
  qualifiesFin: "Pas des touristes.",
  qualifiesCorps: [
    "Oublie les prospects qui s'inscrivent sur ta liste sans jamais passer à l'action.",
    "Quelqu'un qui prend le temps de répondre à un quiz est intéressé par le sujet, bien plus que celui qui télécharge un ebook et l'oublie. C'est avec ces gens là que tu veux remplir ta liste.",
  ],
  offresTitre: "Crée des",
  offresMotCle: "Offres Irrésistibles",
  offresFin: "que tes prospects vont s'arracher",
  offresIntro:
    "Lorsque tu crées un quiz, tu ne recueilles pas seulement des adresses e-mail, tu obtiens également des informations précieuses sur :",
  offresPuces: [
    "Les difficultés actuelles de ton audience",
    "Leurs désirs",
    "Leurs objectifs et aspirations",
    "Leurs préférences et leurs goûts",
    "Les problèmes non résolus qu'ils rencontrent",
    "Les solutions qu'ils ont déjà essayées",
    "Leur niveau de satisfaction avec les solutions existantes",
  ],
  offresConclusion:
    "Retrouve ces informations directement sur ton tableau de bord, afin de les analyser plus facilement et transformer ces données brutes en offres ciblées que tes prospects sont déjà prêts à t'acheter.",
  demarqueTitre: "Démarque-toi",
  demarqueMotCle: "avec du contenu frais",
  demarqueFin: "et engageant",
  demarqueCorps: [
    "Tiquiz est une manière innovante de faire participer ton audience, de la tenir engagée et d'instaurer une relation plus conviviale entre vous.",
    "Ton marketing devient un jeu captivant où tout le monde y gagne : tes prospects s'amusent en découvrant tes offres, et toi, tu vois tes conversions grimper en flèche.",
  ],

  outilsTitre: "Les autres outils de quiz s'arrêtent",
  outilsMotCle: "avant Systeme.io",
  outilsCorps:
    "Ils font tous de très bons quiz. La question n'est pas là : elle est de savoir ce qu'il faut installer entre leur formulaire et ton compte Systeme.io, et qui pose le tag une fois le lead arrivé.",
  outilsColonnes: ["", "Ce qu'il faut entre les deux", "Un tag par profil"],
  outilsGain:
    "Concrètement : ailleurs, tu paies un abonnement de plus (à partir de {prix}), tu crées chaque tag à la main dans Systeme.io, puis tu construis un scénario par profil de résultat. Avec Tiquiz, tu choisis le tag dans une liste au moment où tu écris le profil, et s'il n'existe pas encore, il est créé pour toi.",
  outilsNote: "",
  outilsLien: "Voir le détail des intégrations",

  pasPourToiTitre: "Et ce n'est pas pour toi",
  pasPourToiMotCle: "si",
  pasPourToiCorps:
    "Autant que tu le saches avant de créer ton compte plutôt qu'après.",
  pasPourToi: [
    "Tu veux un texte de résultat rédigé sur mesure pour chaque visiteur. Tiquiz attribue un profil que TU as écrit à l'avance, il ne rédige pas au cas par cas.",
    "Tu veux des parcours qui se ramifient selon les réponses. Le parcours est linéaire : tout le monde voit les mêmes questions, seul le résultat change.",
    "Tu veux poser chaque élément au pixel près. Tu règles ton logo, tes couleurs, ta police et la disposition, pas la maquette entière.",
  ],
  pasPourToiFin:
    "Si l'un des trois est indispensable chez toi, ne prends pas Tiquiz : tu perdrais ton temps et le mien.",

  viralTitre: "Booste ton trafic",
  viralMotCle: "grâce à la viralité des quiz",
  viralCorps: [
    "Pour découvrir les résultats de leur quiz, tes prospects doivent d'abord le partager sur leurs réseaux sociaux (optionnel). Et c'est là que la viralité opère !",
    "Chaque partage expose ta marque à un nouveau public, ce qui augmente le trafic vers ton site, tes réseaux, ta page de vente.",
    "Ce qui améliore ton classement dans les résultats des moteurs de recherche, ce qui augmente la visibilité de tes offres. Sans que tu doives redoubler d'efforts !",
  ],
  viralNote:
    "Le partage n'est jamais obligatoire, et tu peux le couper. Sur un sujet intime, argent, santé, famille, personne ne partage, et c'est normal : ça ne dit rien de la qualité de ton quiz.",
  viralCta: "Je veux mon quiz viral",

  formatsTitre: "Un quiz, un sondage, ou une",
  formatsMotCle: "vidéo qui pose des questions",
  formatsCorps:
    "Tiquiz vend les trois, dans le même abonnement. Trois façons de remplir ta liste selon ce que tu as déjà sous la main.",
  formats: [
    {
      titre: "Le quiz",
      corps: "Ton visiteur découvre son profil ou son score, et tu récupères son adresse plus tout ce qu'il vient de te dire sur lui.",
    },
    {
      titre: "Le sondage",
      corps: "Tu poses une question à ton audience et tu récoltes ses réponses avec ses mots à elle. C'est comme ça qu'on trouve quoi vendre.",
    },
    {
      titre: "Le Popquiz",
      corps: "Les questions s'affichent pendant ta vidéo, YouTube, Vimeo ou la tienne. Ton spectateur répond sans quitter l'écran.",
    },
  ],

  modesTitre: "Ton quiz dit qui ils sont, ou",
  modesMotCle: "où ils en sont",
  modesCorps:
    "Deux mécaniques, et c'est toi qui choisis. Le quiz par profil range chaque personne dans un type ; le quiz scoré lui donne une note et un niveau. Dans les deux cas, le tag part dans Systeme.io tout seul.",
  modesNote:
    "C'est ce qui fait qu'un quiz Tiquiz marche aussi bien pour un test de personnalité que pour un bilan de compétences ou un diagnostic de niveau.",

  brandingTitre: "Ton visiteur voit ta marque,",
  brandingMotCle: "jamais la nôtre",
  brandingCorps:
    "Ton logo, tes couleurs, ta police, ton nom de domaine. Le quiz ressemble à ton site, pas à un outil que tu as loué le mois dernier.",
  brandingNote:
    "Et l'IA écrit dans la langue de ton audience, variantes régionales comprises : un quiz en portugais du Brésil ne sort pas en portugais du Portugal.",

  objectionsTitre: "Ce que tu es",
  objectionsMotCle: "en train de te dire",
  objections: [
    {
      q: "Encore un outil de plus à apprendre.",
      r: "Tiquiz en remplace deux : ton créateur de formulaire, et l'intermédiaire qui l'envoie vers Systeme.io. Et tu ne changes rien à ce que tu utilises déjà.",
    },
    {
      q: "Je ne suis pas technique.",
      r: "Il n'y a rien à installer, rien à connecter à la main, aucune ligne de code à écrire. Tu décris ton sujet, tu relis, tu publies. Si tu sais copier un lien, tu sais mettre ton quiz en ligne.",
    },
    {
      q: "Ça va me prendre du temps.",
      r: "L'IA écrit la première version. Le temps que tu passes, c'est celui de la relecture : tu remplaces deux ou trois formulations par les tiennes. C'est du temps où tu écris ton message, pas où tu te bats avec un outil.",
    },
    {
      q: "Je ne suis pas sûr que ça marche dans mon domaine.",
      r: "Un quiz marche partout où quelqu'un se pose une question sur lui même, et c'est à peu près partout. Profil ou score, tu choisis la mécanique. Et le gratuit existe pour que tu le vérifies chez toi avant de payer quoi que ce soit.",
    },
    {
      q: "J'ai déjà testé plein de trucs sans résultat.",
      r: "Alors ne me crois pas sur parole. Crée ton quiz gratuitement, mets le en ligne, et regarde le nombre d'adresses au bout d'une semaine. C'est le seul argument qui compte, et c'est le tien.",
    },
  ],

  ctas: {
    probleme: "Je veux capturer ces emails",
    viral: "Je veux mon quiz viral",
    qualifies: "Je veux attirer des vrais clients",
    offres: "Je veux améliorer mes offres",
    etapes: "C'est parti !",
    funnel: "Je veux vendre avec un quiz",
    demarque: "Je veux me démarquer",
    sio: "Je me lance gratuitement",
    modes: "Je crée mon quiz aujourd'hui",
    formats: "J'ai besoin de ça aussi",
    branding: "Je crée mon quiz maintenant",
  },
  ctaRassurance: "Gratuit, sans carte bancaire",

  avisTitre: "Il y a un avant, et un",
  avisMotCle: "après Tiquiz",
  avisCorps:
    "Ce qui change, ce n'est pas le nombre de visiteurs. C'est que tu sais enfin qui ils sont, et que tu peux leur écrire.",
  apres: [
    "Les contacts qui arrivent sont concernés, pas curieux. Ils répondent à tes emails.",
    "Chacun est rangé dès la première seconde : tu sais quoi lui proposer, et quand.",
    "Tu arrêtes de tester au hasard. Tu vois d'où viennent tes leads et pourquoi ça marche.",
    "Et ça continue de tourner les jours où tu ne publies rien.",
  ],

  prixTitre: "Des tarifs tout en",
  prixMotCle: "douceur",
  prixNote:
    "Les prix affichés sont ceux du bon de commande, à l'euro. Tu commences gratuitement, sans carte, et tu montes de palier le jour où ton quiz te rapporte plus qu'il ne te coûte.",
  prixMensuel: "Mensuel",
  prixAnnuel: "Annuel",
  prixEconomie: "2 mois offerts",
  prixRubans: [
    { ruban: "Gratuit à vie", pour: "Pour tester et te faire un avis", cta: "Commencer gratuitement" },
    { ruban: "Tiquiz", pour: "Pour les petits besoins ponctuels", cta: "Prendre Tiquiz" },
    { ruban: "Tiquiz PLUS", pour: "Pour les agences et les freelances", cta: "Prendre Tiquiz PLUS" },
  ],
  prixParMois: "par mois",
  prixParAn: "par an",
  gratuit: { nom: "Gratuit", prix: "0 €", rythme: "pour commencer" },
  gratuitLignes: [
    "{quiz} quiz et {quiz} sondage actifs",
    "{popquiz} Popquiz",
    "{leads} réponses visibles sur 30 jours glissants, les suivantes sont capturées et floutées",
  ],
  prixInclus: ["Tout le gratuit, sans les limites :", "Tout Tiquiz, plus :"],
  comparatifTitre: "Ce que tu as dans chaque palier",
  comparatifCorps:
    "Tout ce que Tiquiz sait faire, et qui l'a dans quel palier. Rien n'est caché en bas d'une page de conditions.",
  comparatifGroupes: [
    "Ce que tu peux créer",
    "Dans tous les paliers, gratuit compris",
    "Réservé aux paliers PLUS",
  ],
  comparatifLimites: [
    "Quiz actifs",
    "Sondages actifs",
    "Popquiz (vidéos interactives)",
    "Réponses visibles sur 30 jours glissants",
  ],
  illimite: "Illimité",
  partageTitre: "Dans tous les paliers, gratuit compris",

  faqTitre: "Questions fréquentes",
  faqCorps: "Clique sur une question pour lire la réponse.",

  demoTitre: "Regarde ce que",
  demoMotCle: "ton visiteur va vivre",
  demoCorps:
    "Cette démo est elle même un Popquiz Tiquiz. Les questions s'affichent pendant la vidéo et tu y réponds : tu vis exactement ce que vivra la personne qui arrivera sur ton quiz.",
  demoLien: "Ouvrir la démo dans un nouvel onglet",


  bandeTitre: "Ta liste emails ne va pas se construire toute seule",
  bandeCorps:
    "Pendant que tu hésites, tes visiteurs quittent ton site sans laisser leur email. Un quiz change ça, et tu le crées en quelques minutes.",
  bandeCta: "Je crée mon quiz aujourd'hui",
};

const en: ContenuLanding = {
  langue: "en",
  metaTitre: "Tiquiz: the quiz builder that connects to Systeme.io",
  metaDescription:
    "Describe your topic, the AI writes the quiz, and every result profile points to the matching offer. The contact lands in Systeme.io with its tag, created for you if it does not exist yet.",

  etiquette: "Quiz builder connected to Systeme.io",
  titre: "Grow your traffic",
  titreDefilant: [
    "Grow your traffic",
    "Generate more leads",
    "Sharpen your offers",
    "Grow your sales",
    "Stand out",
  ],
  motCle: "with interactive quizzes",
  accroche:
    "Build viral quizzes that bring qualified traffic to your offers and turn your visitors into paying customers, without spending on ads.",
  pourQui:
    "For the entrepreneurs, coaches, consultants, trainers, course creators and affiliates who have an offer and not enough people to show it to.",
  ctaPrincipal: "Build my quiz for free",
  ctaSecondaire: "Create my free account",
  sousCta: "No card required. The quiz you generate stays yours.",
  rassurances: ["Free forever", "No card needed", "Connected to Systeme.io"],
  bandeau: [
    "Your own branding",
    "Your own domain",
    "Automatic Systeme.io tags",
    "Unlimited quizzes",
    "AI built in",
    "Surveys and Popquiz",
    "Responsive design",
    "100 languages",
  ],
  preuve: "More than 200 entrepreneurs already use Tiquiz",
  copier: "Copy",

  problemeTitre: "Every visitor who leaves without their email is a lost customer",
  problemeMotCle: "a lost customer",
  problemeCorps: [
    "Someone finds your content, reads it, and leaves. You cannot talk to them any more, or offer them anything. They will not come back.",
    "And your followers are not yours. Your account on any social network can vanish overnight, and your audience goes with it. Your email list is yours.",
    "The problem is that almost nobody trades their address for one more PDF today, one that will not be read anyway.",
    "A quiz flips it around. Your prospect answers because it is about them, and leaves their email because they want their result.",
  ],

  animLegende:
    "Your visitor makes the same effort either way. What you get back does not compare.",

  chiffre: "44.9%",
  chiffreLegende:
    "of people who start a quiz leave their email, in the coaching and training category.",
  chiffreSource:
    "Interact report on quiz conversion rates. This is not a page rate: it is measured from the moment the quiz is started.",

  maquette: {
    progression: "Question 2 of 6",
    question: "How many people get your emails today?",
    reponses: [
      "Nobody, I am just starting out",
      "A few dozen, mostly people I know",
      "Several hundred, it is picking up",
    ],
    choisie: 1,
  },

  funnelTitre: "One quiz. And everyone leaves towards",
  funnelMotCle: "the offer that fits them",
  funnelCorps:
    "You are not diagnosing for the fun of it. Every result has its own text, its own button and its own tag. Three people answer the same quiz, they do not end up in the same place.",
  funnelProfils: [
    {
      reponse: "I am just starting out",
      profil: "You are laying the groundwork",
      offre: "To your entry offer",
      tag: "profil-debutant",
    },
    {
      reponse: "A few dozen contacts",
      profil: "You have a list, not a rhythm yet",
      offre: "To your coaching offer",
      tag: "profil-liste-tiede",
    },
    {
      reponse: "Several hundred contacts",
      profil: "You have the audience, the offer is missing",
      offre: "To your premium offer",
      tag: "profil-audience",
    },
  ],
  funnelTagLegende:
    "The tag travels to Systeme.io with the contact. If it does not exist yet, Tiquiz creates it.",

  mecaniqueTitre: "How",
  mecaniqueMotCle: "Tiquiz",
  etapeMot: "Step",
  etapes: [
    {
      titre: "You describe your topic",
      corps:
        "Your subject, who you are talking to, what you want out of it. Three fields, not a ten minute form.",
    },
    {
      titre: "The AI writes the quiz",
      corps:
        "Questions, answers and result profiles appear in front of you. It is a solid starting point, and you fix whatever does not sound like you.",
    },
    {
      titre: "You publish",
      corps:
        "On your own domain, inside a Systeme.io page, inside WordPress, or on its own address. You choose, and the design follows your brand.",
    },
    {
      titre: "Every profile points to its offer",
      corps:
        "The result is not a dead end: it points to the offer that matches that profile, and the contact lands in Systeme.io with its tag.",
    },
  ],

  sioTitre: "Native Systeme.io connection",
  sioMotCle: "Native",
  sioCorps: [
    "Other quiz tools do not talk to Systeme.io. For a lead to land there, you need a middleman: Zapier, Make or Pabbly. One more subscription, one more setup, and one more place where things break without anyone noticing.",
    "Tiquiz writes straight into your account. The contact arrives with its tag, and if that tag does not exist yet, Tiquiz creates it. Zapier only offers tags you already created by hand: one forgotten profile means a lead arriving with nothing to recognise it by.",
    "Two tools cover the whole system, Tiquiz and Systeme.io. One of the two, you already use.",
  ],
  sioPrix: "Zapier starts at {prix} per month, to do what Tiquiz does on its own.",

  ouTitre: "Your quiz goes",
  ouMotCle: "where you already are",
  ouCorps:
    "Not on our domain with our logo on it. On yours, or dropped where your audience already goes.",
  ouCarreaux: [
    { titre: "In a Systeme.io funnel", corps: "On a funnel page, before or after your form." },
    { titre: "In WordPress", corps: "Post, page, sidebar. No plugin to install." },
    { titre: "On a sales page", corps: "Right above your button, to qualify before you sell." },
    { titre: "In a blog post", corps: "Mid-article, where the reader is already hooked." },
    { titre: "On its own domain", corps: "quiz.yoursite.com. No website? Your quiz IS the page." },
    { titre: "Anywhere else", corps: "Wherever you can paste a link or six lines of code." },
  ],
  ouLienTitre: "Either you share a link",
  ouLienCorps:
    "You paste it in an email, a story, a bio, a QR code. With your own domain name if you have one.",
  ouCodeTitre: "Or you paste six lines",
  ouCodeCorps:
    "You copy the snippet from Tiquiz and paste it into your page. The quiz shows up inside it, in your place.",
  ouNote:
    "Neither one asks you to know how to code. Copy, paste, done. And your visitor only sees your logo, your colours and your address.",

  formatsLeadTitre: "Get",
  formatsLeadMotCle: "5 years ahead",
  formatsLeadFin: "of your competitors",
  formatsLeadCorps:
    "Unlike a plain ebook or a free training, quizzes tick every box that improves your presence online and maximises your conversions.",
  formatsLeadNote:
    "With quizzes you stand out from your competitors, you engage your audience in a playful way, you bring in qualified traffic, and you turn visitors into paying customers more easily.",

  qualifiesTitre: "Capture",
  qualifiesMotCle: "qualified leads",
  qualifiesFin: "Not tourists.",
  qualifiesCorps: [
    "Forget the prospects who join your list and never do anything with it.",
    "When someone takes the time to fill in a quiz, they are (really) interested in the topic, enough to spend time on it.",
    "Those prospects genuinely care about what you offer, and they are far more qualified than the ones who download a plain ebook.",
    "Those are the ones you want on your list.",
  ],
  offresTitre: "Build",
  offresMotCle: "irresistible offers",
  offresFin: "your prospects will fight over",
  offresIntro:
    "When you build a quiz you do not just collect email addresses, you also learn a great deal about:",
  offresPuces: [
    "What your audience struggles with right now",
    "What they want",
    "Their goals and aspirations",
    "Their preferences and their tastes",
    "The problems they have not solved yet",
    "The solutions they have already tried",
    "How happy they are with what exists today",
  ],
  offresConclusion:
    "You find all of it straight from your dashboard, ready to be analysed and turned into targeted offers your prospects are already willing to buy.",
  demarqueTitre: "Stand out",
  demarqueMotCle: "with fresh, engaging content",
  demarqueFin: "",
  demarqueCorps: [
    "Tiquiz is a fresh way to get your audience involved, keep it engaged and build a friendlier relationship along the way.",
    "Your marketing becomes a game everyone wins: your prospects have fun discovering your offers, and you watch your conversions climb.",
  ],

  outilsTitre: "Other quiz tools stop",
  outilsMotCle: "before Systeme.io",
  outilsCorps:
    "They all build very good quizzes. That is not the question: the question is what you have to install between their form and your Systeme.io account, and who applies the tag once the lead arrives.",
  outilsColonnes: ["", "What goes in between", "One tag per profile"],
  outilsGain:
    "In plain terms: elsewhere you pay for one more subscription (from {prix}), you create every tag by hand in Systeme.io, then you build one scenario per result profile. With Tiquiz you pick the tag from a list while you write the profile, and if it does not exist yet, it is created for you.",
  outilsNote: "",
  outilsLien: "See the detail, tool by tool",

  pasPourToiTitre: "And it is not for you",
  pasPourToiMotCle: "if",
  pasPourToiCorps:
    "Better you know before creating an account than after.",
  pasPourToi: [
    "You want result copy written from scratch for every single visitor. Tiquiz assigns a profile YOU wrote in advance, it does not draft case by case.",
    "You want paths that branch on the answers. The path is linear: everyone sees the same questions, only the result changes.",
    "You want to place every element to the pixel. You set your logo, your colours, your font and the layout, not the whole design.",
  ],
  pasPourToiFin:
    "If one of those three is essential where you are, do not take Tiquiz: you would waste your time and mine.",

  viralTitre: "Your prospects bring you",
  viralMotCle: "more prospects",
  viralCorps: [
    "A quiz result is something people show off. You can ask your visitor to share theirs to unlock a bonus, and your quiz travels to people just like them: exactly the ones you were looking for.",
    "It is the only place in your system where one lead brings you another, and it does not cost you a cent in advertising.",
  ],
  viralNote:
    "Sharing is never mandatory, and you can switch it off. On a private topic, money, health, family, nobody shares, and that is normal: it says nothing about the quality of your quiz.",
  viralCta: "I want my quiz to go viral",

  formatsTitre: "A quiz, a survey, or a",
  formatsMotCle: "video that asks questions",
  formatsCorps:
    "Tiquiz sells all three, in the same subscription. Three ways to fill your list depending on what you already have on hand.",
  formats: [
    {
      titre: "The quiz",
      corps: "Your visitor discovers their profile or their score, and you get their address plus everything they just told you about themselves.",
    },
    {
      titre: "The survey",
      corps: "You ask your audience a question and collect their answers in their own words. That is how you find out what to sell.",
    },
    {
      titre: "The Popquiz",
      corps: "Questions appear during your video, YouTube, Vimeo or your own file. Your viewer answers without leaving the screen.",
    },
  ],

  modesTitre: "Your quiz says who they are, or",
  modesMotCle: "where they stand",
  modesCorps:
    "Two mechanics, and you pick. A profile quiz files each person under a type; a scored quiz gives them a number and a level. Either way, the tag reaches Systeme.io on its own.",
  modesNote:
    "That is what makes a Tiquiz quiz work just as well for a personality test as for a skills review or a maturity diagnosis.",

  brandingTitre: "Your visitor sees your brand,",
  brandingMotCle: "never ours",
  brandingCorps:
    "Your logo, your colours, your font, your domain name. The quiz looks like your site, not like a tool you rented last month.",
  brandingNote:
    "And the AI writes in your audience's language, regional variants included: a quiz in Brazilian Portuguese does not come out in European Portuguese.",

  objectionsTitre: "What you are",
  objectionsMotCle: "thinking right now",
  objections: [
    {
      q: "One more tool to learn.",
      r: "Tiquiz replaces two: your form builder, and the middleman that sends it to Systeme.io. And you change nothing about what you already use.",
    },
    {
      q: "I am not technical.",
      r: "Nothing to install, nothing to wire by hand, not a line of code to write. You describe your topic, you read it over, you publish. If you can copy a link, you can put your quiz online.",
    },
    {
      q: "This is going to take me time.",
      r: "The AI writes the first version. The time you spend is reading time: you swap two or three sentences for your own. That is time spent on your message, not on fighting a tool.",
    },
    {
      q: "I am not sure it works in my field.",
      r: "A quiz works anywhere someone is asking a question about themselves, which is very nearly everywhere. Profile or score, you pick the mechanic. And the free plan exists so you can check it on your own audience before paying anything.",
    },
    {
      q: "I have already tried plenty of things that led nowhere.",
      r: "Then do not take my word for it. Build your quiz for free, put it online, and count the addresses after a week. That is the only argument that counts, and it is yours.",
    },
  ],

  ctas: {
    probleme: "I want to capture those emails",
    viral: "I want my quiz to go viral",
    qualifies: "I want real customers",
    offres: "I want better offers",
    etapes: "Let's go",
    funnel: "I want to sell with a quiz",
    demarque: "I want to stand out",
    sio: "Get me started for free",
    modes: "Build my quiz today",
    formats: "I need that too",
    branding: "Build my quiz now",
  },
  ctaRassurance: "Free, no card needed",

  avisTitre: "There is a before, and an",
  avisMotCle: "after Tiquiz",
  avisCorps:
    "What changes is not the number of visitors. It is that you finally know who they are, and you can write to them.",
  apres: [
    "The contacts coming in are concerned, not curious. They reply to your emails.",
    "Each one is filed from the first second: you know what to offer them, and when.",
    "You stop testing at random. You see where your leads come from and why it works.",
    "And it keeps running on the days you publish nothing.",
  ],

  prixTitre: "Pricing, the",
  prixMotCle: "gentle way",
  prixNote:
    "These are the checkout prices, to the euro. You start for free, with no card, and move up the day your quiz brings in more than it costs.",
  prixMensuel: "Monthly",
  prixAnnuel: "Yearly",
  prixEconomie: "2 months free",
  prixRubans: [
    { ruban: "Free forever", pour: "To try it and make up your mind", cta: "Start for free" },
    { ruban: "Tiquiz", pour: "For small, occasional needs", cta: "Get Tiquiz" },
    { ruban: "Tiquiz PLUS", pour: "For agencies and freelancers", cta: "Get Tiquiz PLUS" },
  ],
  prixParMois: "per month",
  prixParAn: "per year",
  gratuit: { nom: "Free", prix: "0 €", rythme: "to get started" },
  gratuitLignes: [
    "{quiz} active quiz and {quiz} active survey",
    "{popquiz} Popquiz",
    "{leads} responses visible over a rolling 30 days, the rest are captured and blurred",
  ],
  prixInclus: ["Everything in Free, without the limits:", "Everything in Tiquiz, plus:"],
  comparatifTitre: "The detail, line by line",
  comparatifCorps:
    "Everything Tiquiz can do, and which plan has it. Nothing hidden at the bottom of a terms page.",
  comparatifGroupes: [
    "What you can create",
    "In every plan, free included",
    "PLUS plans only",
  ],
  comparatifLimites: [
    "Active quizzes",
    "Active surveys",
    "Popquiz (interactive videos)",
    "Responses visible over a rolling 30 days",
  ],
  illimite: "Unlimited",
  partageTitre: "In every plan, free included",

  faqTitre: "Frequently asked",
  faqCorps: "Click a question to read the answer.",

  demoTitre: "See what",
  demoMotCle: "your visitor will experience",
  demoCorps:
    "This demo is itself a Tiquiz Popquiz. Questions appear during the video and you answer them: you go through exactly what the person landing on your quiz will go through.",
  demoLien: "Open the demo in a new tab",


  bandeTitre: "Your email list will not build itself",
  bandeCorps:
    "While you hesitate, your visitors leave without giving you their email. A quiz changes that, and you build one in minutes.",
  bandeCta: "Build my quiz today",
};

/**
 * LES LANGUES ÉCRITES, ET RIEN DE PLUS.
 *
 * Deux pour l'instant, et c'est délibéré. Traduire une page de vente en
 * sept langues avant que le texte français soit validé, c'est refaire
 * sept fois le travail au premier mot qu'elle change.
 *
 * Une langue absente retombe sur l'ANGLAIS, jamais sur le français : un
 * lecteur espagnol comprend plus souvent l'anglais, et un repli qui
 * sert du français à qui a demandé de l'espagnol a l'air de marcher,
 * ce qui est pire qu'un manque visible (leçon du robot d'aide,
 * 31 août).
 */
export const LANDING: Readonly<Record<string, ContenuLanding>> = { fr, en };

export function contenuLanding(locale: string | null | undefined): ContenuLanding {
  const brut = String(locale ?? "").trim();
  return LANDING[brut] ?? LANDING[brut.split("-")[0]] ?? LANDING.en;
}
