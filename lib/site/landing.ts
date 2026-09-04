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

/**
 * UN AVIS TRUSTPILOT. IL NE SE TRADUIT JAMAIS.
 *
 * Béné, 4 septembre 2026 : "on a ici des avis tous frais sur tiquiz, tu
 * peux les utiliser : fr.trustpilot.com/review/tiquiz.fr".
 *
 * Les six avis sont RELEVÉS sur cette page, mot pour mot, avec leur
 * auteur et leur date. Ils vivent donc HORS des objets de langue : un
 * témoignage traduit n'est plus un témoignage, c'est une reformulation
 * signée du nom de quelqu'un d'autre. C'est son interdit numéro un.
 *
 * MESURÉ, ET LES DEUX CHIFFRES SEMBLENT SE CONTREDIRE : Trustpilot
 * affiche 6 avis, une répartition de 100 % en 5 étoiles, et un
 * TrustScore de 4,2/5. Le TrustScore est une note PONDÉRÉE (volume et
 * fraîcheur), pas la moyenne. On n'affiche donc AUCUNE note chiffrée :
 * à côté de "100 % en 5 étoiles", un 4,2 se lirait comme une erreur.
 * On dit le fait, et on met le lien pour que n'importe qui vérifie.
 */
export interface Avis {
  auteur: string;
  titre: string;
  texte: string;
  /** La date telle qu'affichée par Trustpilot. */
  date: string;
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

/**
 * LE BRIEF DE L'ÉTAPE 1, DESSINÉ.
 *
 * L'étape 1 réutilisait la maquette du haut de page : le même écran
 * deux fois sur la même page, ce qui se lit comme un manque de soin.
 * Elle a sa propre maquette, les trois champs qu'on remplit vraiment.
 */
export interface Brief {
  titre: string;
  champs: readonly { etiquette: string; valeur: string }[];
  bouton: string;
}

/** Un profil de la démonstration du funnel : ce qu'il lit, et son tag. */
export interface ProfilDemo {
  reponse: string;
  profil: string;
  offre: string;
  tag: string;
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
  /** Ce que CETTE colonne ajoute. Jamais recopié : lu dans `avantages.ts`. */
  lignes: readonly string[];
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
  /** La barre de preuve Trustpilot, et son lien. */
  preuve: string;
  preuveLien: string;
  /** Le bouton du champ de lien. Il affichait "Étape" : j'avais passé
   *  la mauvaise chaîne, et ça ne se voit qu'à l'écran. */
  copier: string;

  problemeTitre: string;
  problemeCorps: string[];

  chiffre: string;
  chiffreLegende: string;
  chiffreSource: string;

  maquette: Maquette;
  brief: Brief;

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

  sioTitre: string;
  sioCorps: string[];

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

  avisTitre: string;
  avisMotCle: string;
  avisCorps: string;
  avisSur: string;

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
  /** Les limites du gratuit. `{quiz}`, `{popquiz}` et `{leads}` sont remplis depuis `FREE_LIMITS`. */
  gratuitLignes: readonly string[];
  partageTitre: string;

  faqTitre: string;
  faqCorps: string;
  /** Les 16 questions viennent de SA page de vente : voir `FAQ_VENTE`. */
  faq: Question[];

  /** La démo : son vrai popquiz, en iframe. */
  demoTitre: string;
  demoMotCle: string;
  demoCorps: string;
  demoLien: string;

  finTitre: string;
  finCorps: string;
  /** Le bandeau dégradé de fin, le seul aplat de couleur de la page. */
  bandeTitre: string;
  bandeCorps: string;
  bandeCta: string;
}

/**
 * LES SIX AVIS, RELEVÉS SUR TRUSTPILOT LE 4 SEPTEMBRE 2026.
 *
 * Recopiés mot pour mot. On ne corrige NI l'orthographe NI la ponctuation
 * (Eric écrit "pour avoir développer", Christian "quizz") : corriger le
 * texte de quelqu'un, c'est écrire à sa place. Les seules coupes sont
 * marquées par des points de suspension entre crochets, et il n'y en a
 * aucune pour l'instant.
 */
export const AVIS: readonly Avis[] = [
  {
    auteur: "Maurice Massolin",
    titre: "Un outil simple, puissant, et vraiment connecté à ce qui compte.",
    texte:
      "J'utilise Tiquiz pour mon quiz de diagnostic client, connecté à System.io avec des séquences emails segmentées par profil. La connexion est propre, les tags s'appliquent automatiquement, et l'interface est suffisamment intuitive pour qu'on configure tout sans développeur. Pour quelqu'un qui opère seul et qui veut un funnel de capture qui tourne sans surveillance, Tiquiz fait exactement ce qu'il promet.",
    date: "4 septembre 2026",
  },
  {
    auteur: "Monique Pulby",
    titre: "Un générateur de quiz qui te facilite la vie",
    texte:
      "As-tu déjà galéré à créer un quiz, à gérer les résultats qui en découlent, à le rattacher à une campagne d'emails ? Moi oui, jusqu'à ce que je découvre Tiquiz. Il fait tout ça. Tu as seulement besoin de lui préciser à qui tu souhaites adresser le quiz, ce à quoi il doit servir et quel résultat tu aimerais obtenir. Et le tour est joué : tu obtiens un quiz qualitatif. Bref, une pépite. Je recommande à 100 %",
    date: "27 juillet 2026",
  },
  {
    auteur: "Eric Legrigeois",
    titre: "Un outil de quiz parfaitement pensé marketing",
    texte:
      "Tiquiz un outil de quiz parfaitement pensé marketing, qui est connecté à Systeme.io pour récupérer les leads et les taguer automatiquement, sans devoir passer par des outils comme Zapier ou Make. Je remercie Béné pour avoir développer Tiquiz , pour sa présence , ses retours à mes questions , sa réactivité pour faire évoluer l'outil.",
    date: "2 septembre 2026",
  },
  {
    auteur: "Christian",
    titre: "J'ai découvert quelque chose de super.",
    texte:
      "J'ai créé mes deux premiers quizz qui ont donné des résultats que je n'aurais jamais imaginés. Ce qui est fabuleux c'est que Tiquiz comble une lacune de System.io qui ne permet pas de faire des quiz. Ca fonctionne comme un rêve.",
    date: "2 septembre 2026",
  },
  {
    auteur: "Gwenn",
    titre: "Enfin un outil de quiz parfaitement pensé marketing",
    texte:
      "Enfin un outil de quiz parfaitement pensé marketing, qui est directement relié à Systeme.io pour récupérer les leads et les taguer automatiquement, sans devoir passer par des outils comme Zapier ou Make. Hyper pratique et complet, avec plein de types de quiz et de sondages possibles. J'adore !",
    date: "2 septembre 2026",
  },
  {
    auteur: "Chris Lecroard",
    titre: "Tiquiz c'est de la bombe",
    texte:
      "Excellent logiciel la conceptrice est à l'écoute et l'ensemble est cohérent avec nos besoins et nos missions.",
    date: "2 septembre 2026",
  },
] as const;

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

/** Le popquiz de démonstration, celui qu'elle m'a donné. */
export const DEMO_POPQUIZ = "https://quiz.tipote.com/embed/p/0a7d8f50-f329-48e5-b5af-36c642f00c7c";

/** L'adresse publique de la fiche, pour que n'importe qui vérifie. */
export const TRUSTPILOT_URL = "https://fr.trustpilot.com/review/tiquiz.fr";

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
  const prix = (id: "mensuel" | "annuel" | "mensuel-plus" | "annuel-plus") =>
    formatOwnerPrice(OWNER_CATALOG[id]);

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
      // `replaceAll` ET PAS `replace` : une ligne peut nommer deux fois
      // la même limite ("1 quiz et 1 sondage"), et `replace` avec une
      // chaîne ne remplace que la PREMIÈRE. C'est sorti à l'écran, pas
      // au typecheck : le rendu affichait "1 quiz et {quiz} sondage".
      lignes: t.gratuitLignes.map((ligne) =>
        ligne
          .replaceAll("{quiz}", String(FREE_LIMITS.maxQuizzesPerMode))
          .replaceAll("{popquiz}", String(FREE_LIMITS.maxPopquizzes))
          .replaceAll("{leads}", String(FREE_LIMITS.visibleLeadsPerMonth)),
      ),
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
      lignes: AVANTAGES_PAYANTS.map((a) => a.texte),
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
      lignes: AVANTAGES_PLUS.map((a) => a.texte),
    },
  ];
}

/** Ce que TOUS les paliers portent, gratuit compris. Même source. */
export function avantagesPartages(): readonly string[] {
  return [...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX].map((a) => a.texte);
}

const fr: ContenuLanding = {
  langue: "fr",
  metaTitre: "Tiquiz : le générateur de quiz connecté à Systeme.io",
  metaDescription:
    "Décris ton sujet, l'IA écrit le quiz, et chaque profil renvoie vers ton offre. Le contact arrive dans Systeme.io avec son tag, créé automatiquement s'il n'existe pas.",

  etiquette: "Générateur de quiz",
  titre: "Le générateur de quiz connecté à Systeme.io",
  motCle: "connecté à Systeme.io",
  accroche:
    "Tu décris ton sujet en trois champs. L'IA écrit les questions, les réponses et les profils de résultat. Tu relis, tu remplaces deux ou trois formulations par les tiennes, et c'est en ligne.",
  ctaPrincipal: "Tester le générateur",
  ctaSecondaire: "Créer mon compte gratuit",
  sousCta: "Aucune carte demandée. Le quiz que tu génères reste à toi.",
  rassurances: ["Gratuit à vie", "Pas besoin de CB", "Connecté à Systeme.io"],
  bandeau: [
    "Branding personnalisé",
    "Domaine personnalisé",
    "Tags Systeme.io automatiques",
    "Quiz illimités",
    "IA intégrée",
    "Sondages et Popquiz",
    "Design responsive",
    "100 langues",
  ],
  preuve: "6 avis sur Trustpilot, tous en 5 étoiles",
  preuveLien: "Lire les avis",
  copier: "Copier",

  problemeTitre: "Un opt-in demande. Un quiz donne.",
  problemeCorps: [
    "Une page de capture demande une adresse et promet un PDF que personne n'ouvrira. La personne doit décider de te faire confiance avant d'avoir reçu quoi que ce soit.",
    "Un quiz fait l'inverse. Il répond à une question que ton visiteur se pose sur lui même, il lui rend un résultat qui lui parle, et l'adresse email arrive au milieu de ça, au moment où il veut savoir la suite.",
  ],

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

  brief: {
    titre: "Ton nouveau quiz",
    champs: [
      { etiquette: "De quoi parle ton quiz ?", valeur: "Trouver son premier client" },
      { etiquette: "À qui tu parles ?", valeur: "Coachs qui démarrent" },
      { etiquette: "Ce que tu veux obtenir", valeur: "Des leads qualifiés par niveau" },
    ],
    bouton: "Générer mon quiz",
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
      titre: "Tu décris ton sujet",
      corps:
        "Ton thème, à qui tu parles, ce que tu veux obtenir. Trois champs, pas un formulaire de dix minutes.",
    },
    {
      titre: "L'IA écrit le quiz",
      corps:
        "Les questions, les réponses et les profils de résultat arrivent sous tes yeux. C'est une base de départ solide, et tu la corriges là où ça ne sonne pas comme toi.",
    },
    {
      titre: "Tu publies",
      corps:
        "Sur ton domaine, dans une page Systeme.io, dans WordPress, ou tout seul avec sa propre adresse. Tu choisis, et le design suit ta marque.",
    },
    {
      titre: "Chaque profil part vers son offre",
      corps:
        "Le résultat n'est pas une impasse : il renvoie vers l'offre qui correspond à ce profil là, et le contact arrive dans Systeme.io avec son tag.",
    },
  ],

  sioTitre: "Le tag est posé, même s'il n'existe pas encore",
  sioCorps: [
    "C'est la seule chose que les autres outils de quiz ne savent pas faire, et c'est celle qui coûte le plus de temps. Tiquiz écrit le nom du tag que tu as choisi, et si ce tag n'existe pas encore dans ton compte Systeme.io, il le crée.",
    "Ailleurs, il faut passer par Zapier. Et Zapier ne propose que les tags déjà créés à la main : un profil de résultat oublié, c'est un lead qui arrive sans rien pour le reconnaître.",
    "Deux outils suffisent pour tout le système, Tiquiz et Systeme.io. Un des deux, tu l'utilises déjà.",
  ],

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

  avisTitre: "Il y a un avant, et un",
  avisMotCle: "après Tiquiz",
  avisCorps:
    "Ces personnes ont laissé leur avis sur Trustpilot. Ce sont leurs mots, pas les miens.",
  avisSur: "Voir la fiche Trustpilot",

  prixTitre: "Des tarifs tout en",
  prixMotCle: "douceur",
  prixNote:
    "Les prix affichés sont ceux du bon de commande, à l'euro. Tu commences gratuitement, sans carte, et tu montes de palier quand ton quiz travaille.",
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
  partageTitre: "Dans tous les paliers, gratuit compris",

  faqTitre: "Questions fréquentes",
  faqCorps: "Clique sur une question pour lire la réponse.",

  demoTitre: "Tiquiz en action :",
  demoMotCle: "teste la création de ton quiz",
  demoCorps:
    "C'est un vrai Popquiz Tiquiz, pas une vidéo. Réponds aux questions posées pendant la vidéo, comme le feraient tes visiteurs.",
  demoLien: "Ouvrir la démo dans un nouvel onglet",

  faq: [
    {
      q: "Faut-il savoir coder ?",
      r: "Non. Tu écris ce dont parle ton quiz, tu relis ce que l'IA propose, et tu publies. Il n'y a rien à installer.",
    },
    {
      q: "Est-ce que je peux m'en servir sans Systeme.io ?",
      r: "Oui. Le quiz fonctionne tout seul, capture les emails et affiche les résultats sans aucune connexion. Systeme.io ajoute l'automatisation derrière, ce n'est pas une condition.",
    },
    {
      q: "L'IA écrit un quiz utilisable du premier coup ?",
      r: "Elle écrit une base de départ solide, et c'est le retour constant de ceux qui s'en servent. Compte quelques minutes de relecture pour remplacer deux ou trois formulations par les tiennes. Personne ne publie un texte généré sans le relire, et c'est très bien comme ça.",
    },
    {
      q: "Dans quelles langues ?",
      r: "L'interface est traduite en 7 langues. La génération, elle, couvre 100 langues et variantes régionales : un quiz écrit en portugais du Brésil ne sort pas en portugais du Portugal.",
    },
  ],

  finTitre: "Teste le générateur avant de créer un compte",
  finCorps:
    "Décris ton sujet, regarde le quiz s'écrire, passe le tien. Si ça te plaît, tu le gardes en créant ton compte gratuit, et il t'attend dedans.",
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

  etiquette: "Quiz builder",
  titre: "The quiz builder that connects to Systeme.io",
  motCle: "connects to Systeme.io",
  accroche:
    "You describe your topic in three fields. The AI writes the questions, the answers and the result profiles. You read it over, you swap two or three sentences for your own, and it goes live.",
  ctaPrincipal: "Try the builder",
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
  preuve: "6 reviews on Trustpilot, all five stars",
  preuveLien: "Read the reviews",
  copier: "Copy",

  problemeTitre: "An opt-in asks. A quiz gives.",
  problemeCorps: [
    "A capture page asks for an address and promises a PDF nobody will open. Your visitor has to decide to trust you before receiving anything at all.",
    "A quiz does the opposite. It answers a question your visitor is already asking about themselves, hands back a result that fits, and the email address comes in the middle of that, right when they want to know what follows.",
  ],

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

  brief: {
    titre: "Your new quiz",
    champs: [
      { etiquette: "What is your quiz about?", valeur: "Finding your first client" },
      { etiquette: "Who are you talking to?", valeur: "Coaches just starting out" },
      { etiquette: "What you want out of it", valeur: "Leads qualified by level" },
    ],
    bouton: "Generate my quiz",
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

  sioTitre: "The tag gets applied, even if it does not exist yet",
  sioCorps: [
    "This is the one thing other quiz tools cannot do, and it is the one that eats the most time. Tiquiz writes the tag name you chose, and if that tag does not exist in your Systeme.io account yet, it creates it.",
    "Everywhere else you go through Zapier. And Zapier only offers tags you already created by hand: one forgotten result profile means a lead arriving with nothing to recognise it by.",
    "Two tools cover the whole system, Tiquiz and Systeme.io. One of the two, you already use.",
  ],

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

  avisTitre: "There is a before, and an",
  avisMotCle: "after Tiquiz",
  avisCorps: "These people left their review on Trustpilot. These are their words, not mine.",
  avisSur: "See the Trustpilot page",

  prixTitre: "Pricing, the",
  prixMotCle: "gentle way",
  prixNote:
    "These are the checkout prices, to the euro. You start for free, with no card, and move up once your quiz is working.",
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
  partageTitre: "In every plan, free included",

  faqTitre: "Frequently asked",
  faqCorps: "Click a question to read the answer.",

  demoTitre: "Tiquiz in action:",
  demoMotCle: "try building your quiz",
  demoCorps:
    "This is a real Tiquiz Popquiz, not a video. Answer the questions asked during it, exactly like your visitors would.",
  demoLien: "Open the demo in a new tab",

  faq: [
    {
      q: "Do I need to know how to code?",
      r: "No. You write what your quiz is about, you read what the AI proposes, and you publish. There is nothing to install.",
    },
    {
      q: "Can I use it without Systeme.io?",
      r: "Yes. The quiz runs on its own, captures emails and shows results with no connection at all. Systeme.io adds the automation behind it, it is not a requirement.",
    },
    {
      q: "Does the AI write a usable quiz on the first try?",
      r: "It writes a solid starting point, and that is the consistent feedback from people using it. Budget a few minutes of reading to swap two or three sentences for your own. Nobody publishes generated text without reading it, and that is exactly as it should be.",
    },
    {
      q: "Which languages?",
      r: "The interface is translated into 7 languages. Generation covers 100 languages and regional variants: a quiz written in Brazilian Portuguese does not come out in European Portuguese.",
    },
  ],

  finTitre: "Try the builder before creating an account",
  finCorps:
    "Describe your topic, watch the quiz being written, take it yourself. If you like it, you keep it by creating your free account, and it is waiting for you inside.",
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
