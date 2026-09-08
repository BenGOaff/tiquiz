// lib/site/fonctionnalites.ts
//
// CE QUE TIQUIZ SAIT FAIRE, FONCTIONNALITÉ PAR FONCTIONNALITÉ.
//
// Béné, 5 septembre 2026 : "je veux aussi une page avec le détail de
// chaque fonctionnalité pour creuser le sujet : sur la landing on
// présente pourquoi cette fonctionnalité + les bénéfices + comment ça
// marche en une phrase. Sur la page détail on détaille comment ça
// marche avec des screenshot etc."
//
// Puis sa liste : "intégration Systeme io, popquiz, sondages, quiz
// profils / quiz scorés, automatisations, suivi des leads +
// synchronisation systeme io + tag automatique, générateur de bonus,
// générateur d'emails, analyse des résultats, clé API systeme io ..."
//
// -- DEUX LECTEURS, UNE SEULE SOURCE ---------------------------------
//
// `resume`, `pourquoi`, `benefices` et `commentCourt` s'affichent sur la
// LANDING ; `detail` ne s'affiche que sur la page dédiée. Écrire les
// deux textes séparément donnerait, dans six mois, une landing qui
// promet ce que la page détaillée ne décrit plus. C'est le défaut le
// plus cher de ce dépôt, et il est déjà sorti sept fois.
//
// -- CHAQUE AFFIRMATION PORTE SON FICHIER ----------------------------
//
// `source` nomme le code qui rend la phrase vraie. Ce n'est pas de la
// décoration : le test vérifie que le fichier EXISTE, donc une
// fonctionnalité retirée du produit fait rougir la page qui la vend.
//
// -- UNE STRUCTURE, UN TEXTE PAR LANGUE (8 septembre 2026) -----------
//
// Cette page a dit "ce module est en français seulement" jusqu'au
// 8 septembre. C'est corrigé en place, parce que Béné a demandé la
// suite : "je bosse sur la landing, continue la traduction de tout."
//
// CE QUI EST STRUCTUREL NE SE DUPLIQUE PAS. Le slug, le palier, le
// fichier source, les deux voisines et le visuel vivent UNE fois, dans
// `FONCTIONNALITES_FR`. Une langue n'apporte que du TEXTE, rangé par
// slug. Dupliquer le tableau entier par langue laisserait `liees` et
// `source` diverger sans que rien ne le dise, et c'est le défaut que ce
// dépôt paie en boucle depuis juin.
//
// ET LE COMPILATEUR REFUSE UNE LANGUE INCOMPLÈTE : `TRADUCTIONS` est un
// `Record` dont les clés sont les 8 slugs, donc en oublier un ne
// compile pas. Sans ça, un slug manquant servirait du FRANÇAIS sous une
// adresse anglaise, la page s'afficherait parfaitement, et Google
// indexerait du contenu dupliqué (règle du 8 septembre).
//
// LE SLUG EST LE MÊME DANS LES DEUX LANGUES, et c'est une décision.
// `/fonctionnalites/generation-ia` et `/en/fonctionnalites/generation-ia`
// désignent la même page : le sitemap, les `hreflang` et le menu se
// calculent alors par simple préfixe (`cheminPourLangue`). Un slug
// traduit ranquerait un peu mieux sur une requête anglaise et exigerait
// une deuxième table d'appariement, article par article, comme le blog
// a dû le faire : c'est exactement ce qui casse `hrefPourLangue` quand
// on l'oublie.

/** Le palier minimum, tel que `lib/planLimits.ts` le décide vraiment. */
export type Palier = "gratuit" | "payant" | "plus";

// LA TABLE VIT DANS UN MODULE PUR (`lib/site/blocsAnimes.ts`), pas dans
// `anims.tsx` : celui la lit le disque et porte du JSX, donc le runner
// de tests natif ne sait pas le charger.
import type { BlocAnime } from "@/lib/site/blocsAnimes";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";

export interface Fonctionnalite {
  slug: string;
  nom: string;
  /** UNE phrase. C'est elle qui s'affiche sur la landing. */
  resume: string;
  palier: Palier;
  /** Le problème que ça règle, avant de dire comment. */
  pourquoi: string;
  /** Bénéfice PLUS sa conséquence concrète : le test du "et alors ??". */
  benefices: readonly string[];
  /** Comment ça marche, en une phrase, pour la landing. */
  commentCourt: string;
  /** Le détail, réservé à la page dédiée. */
  detail: readonly { titre: string; corps: readonly string[] }[];
  /** Où ça se passe dans l'app, pour que ce soit trouvable. */
  ou: string;
  /**
   * LA CAPTURE D'ÉCRAN QUI MANQUE, NOMMÉE.
   *
   * Je ne peux pas la produire d'ici : la seule que l'app sait rendre
   * vient de `/visual-test`, la fixture des tests visuels, qui porte un
   * bandeau "Mode aperçu" et un quiz de démo écrit sans accents.
   *
   * Alors chaque fonctionnalité DIT quel écran il faut photographier.
   * Un champ vide passerait pour un oubli ; nommé, il se prend en deux
   * minutes dans un compte réel.
   */
  capture: string;
  /** Le fichier qui rend la phrase vraie. Le test vérifie qu'il existe. */
  source: string;
  /**
   * LES DEUX PAGES VOISINES, ET C'EST DU MAILLAGE, PAS DE LA DÉCO.
   *
   * Béné, 6 septembre 2026 : "chaque page /fonctionnalites/<slug>
   * pointe vers /tarifs et vers deux autres pages fonctionnalités
   * liées."
   *
   * Une page de détail atteinte depuis une recherche est un cul-de-sac
   * si elle ne mène qu'au tarif : le lecteur a une question de plus, et
   * il repart la poser à Google. Le test EXIGE que les deux slugs
   * existent et qu'aucune page ne se cite elle même.
   */
  liees: readonly [string, string];
  /**
   * LE VISUEL DE LA SECTION CORRESPONDANTE, QUAND IL EN EXISTE UN.
   *
   * Béné, 6 septembre 2026 : "chaque page reprend la section
   * correspondante de la page actuelle, telle qu'elle est écrite, avec
   * son visuel."
   *
   * Ce sont ses blocs animés, levés à l'octet près de sa page de vente
   * par `npm run anims:extraire` : on les DÉPLACE, on ne les redessine
   * pas. Quatre fonctionnalités sur huit en ont un ; les quatre autres
   * portent `null`, et un visuel inventé pour combler serait pire que
   * son absence.
   */
  visuel: BlocAnime | null;
}

const FONCTIONNALITES_FR = [
  {
    slug: "generation-ia",
    nom: "La génération par l'IA",
    resume:
      "Tu décris ton sujet, l'IA écrit les questions, les options et les profils de résultat.",
    palier: "gratuit",
    pourquoi:
      "La page blanche est ce qui arrête le plus de monde. Écrire dix questions, quatre options par question et quatre profils de résultat cohérents entre eux, c'est une journée de travail, et c'est la journée que personne ne trouve.",
    benefices: [
      "Tu pars d'une première version complète en quelques secondes : le travail qui te reste est de la relecture, pas de la rédaction.",
      "Les profils sont cohérents entre eux dès le départ : chaque question laisse une chance à chaque profil, donc aucun résultat n'est inattribuable.",
      "Tu peux aussi ne pas t'en servir : l'import d'un quiz existant et l'écriture manuelle sont là, au même endroit.",
    ],
    commentCourt:
      "Tu choisis un objectif, un format, ton public et la mécanique, et le quiz revient écrit.",
    detail: [
      {
        titre: "Ce que tu donnes",
        corps: [
          "L'objectif du quiz, le format (court ou long), ton public cible, et la mécanique : par profil ou avec un score.",
          "Le ton et la langue viennent de tes réglages : tu ne les ressaisis pas à chaque quiz.",
          "Cent langues et variantes sont reconnues, avec leurs notes régionales.",
        ],
      },
      {
        titre: "Ce que tu récupères",
        corps: [
          "Les questions, leurs options, et les profils de résultat avec leur texte.",
          "Tout est modifiable, tout de suite, dans l'éditeur. Rien n'est verrouillé.",
        ],
      },
      {
        titre: "Et si tu ne veux pas d'IA",
        corps: [
          "Tu écris ton quiz à la main, ou tu importes un quiz existant depuis un fichier. Les trois chemins mènent au même éditeur.",
        ],
      },
      {
        titre: "Ce que l'IA écrit APRÈS le quiz",
        corps: [
          "Trois générateurs prolongent le quiz une fois qu'il tourne : le bonus que tu remets à la fin, la séquence d'emails qui suit, et les contenus qui annoncent le quiz.",
          "Ils repartent de ton quiz : son sujet, ses profils, son ton, ta langue et l'adresse publique. Tu ne redécris rien.",
          "Ils sont réservés aux paliers PLUS.",
        ],
      },

      {
        titre: "Le parcours",
        corps: [
          "Combien de personnes ont VU chaque question, et combien y ont RÉPONDU. Les deux, parce qu'ils appellent deux corrections opposées : vu sans réponse, la question bloque ; répondu puis parti, c'est la fatigue, et reformuler ne sert à rien.",
          "La chute est portée par la question qui la SUBIT, jamais par la suivante. Quelqu'un qui abandonne entre la 6 et la 7 s'est arrêté SUR la 6 : il n'a jamais lu la 7.",
          "Rien n'est signalé en dessous de 20 personnes. Sur huit visiteurs, une personne vaut 12,5 %, et une alerte qui part là dessus fait réécrire un quiz qui va très bien.",
        ],
      },
      {
        titre: "La répartition par résultat",
        corps: [
          "Combien de personnes pour chaque profil, y compris ceux qui n'ont encore personne. Un profil à zéro est une information, pas une ligne à cacher.",
        ],
      },
      {
        titre: "Deux choses qu'on dit à chaque fois",
        corps: [
          "Perdre du monde est NORMAL et sain : ce sont d'abord les visiteurs non qualifiés, et aucun quiz ne vise 100 % de complétion.",
          "Une seule modification à la fois, puis 20 à 30 nouvelles réponses avant de juger.",
        ],
      },
      {
        titre: "Et sur le palier PLUS",
        corps: [
          "L'IA lit tes statistiques et te dit ce qu'elle en comprend, en langage normal, avec ce qu'il y a à faire ensuite.",
        ],
      },
    ],
    ou: "Créer un quiz, onglet Générer avec l'IA.",
    capture: "L'écran Créer un quiz, onglet Générer avec l'IA, avec l'objectif et le public cible remplis.",
    source: "lib/prompts/quiz/system.ts",
    liees: ["resultats-par-profil", "quiz-profil-ou-score"],
    visuel: "generation-ia",
  },
  {
    slug: "connexion-systeme-io",
    nom: "L'intégration Systeme.io",
    resume:
      "Tes leads arrivent directement dans ton compte Systeme.io, sans Zapier, Make ni Pabbly au milieu.",
    palier: "gratuit",
    pourquoi:
      "Aucun autre outil de quiz ne parle à Systeme.io. Pour qu'un lead y arrive, il faut un intermédiaire : un abonnement de plus, une configuration de plus, et un endroit de plus où ça casse sans que personne ne le voie.",
    benefices: [
      "Un abonnement en moins : tu n'as pas besoin de Zapier pour que ça marche, donc tu ne paies pas deux outils pour faire circuler une adresse email.",
      "Un endroit en moins où ça casse : le contact part de Tiquiz et arrive dans Systeme.io, il n'y a rien entre les deux qui puisse tomber en panne.",
      "Ça marche avec le compte GRATUIT de Systeme.io : tu n'as pas besoin d'un plan payant chez eux pour en profiter.",
    ],
    commentCourt:
      "Tu colles ta clé API Systeme.io une fois, et chaque email capturé part chez eux dans la seconde.",
    detail: [
      {
        titre: "Ce que tu fais, une seule fois",
        corps: [
          "Dans Systeme.io, tu ouvres tes Paramètres puis Clés API publiques, et tu copies ta clé.",
          "Dans Tiquiz, tu la colles dans Réglages, section Connexions. C'est tout, et tu n'y retouches plus.",
        ],
      },
      {
        titre: "Ce qui se passe ensuite, tout seul",
        corps: [
          "Ton visiteur termine ton quiz et laisse son email sur l'écran de capture.",
          "Tiquiz cherche le contact chez Systeme.io. S'il n'existe pas, il le crée.",
          "Le tag du résultat obtenu est posé sur ce contact. Et si ce tag n'existe pas encore dans ton compte, Tiquiz le crée aussi.",
        ],
      },
      {
        titre: "Ce que les autres outils ne font pas",
        corps: [
          "Chez Zapier, seuls les tags DÉJÀ créés à la main sont proposés dans la liste. Un profil oublié, c'est un lead qui arrive sans rien pour le reconnaître, et tu ne t'en aperçois qu'en relisant ta liste des semaines plus tard.",
          "Interact le dit dans sa propre documentation : il faut créer un tag dans Systeme.io pour chaque résultat de quiz, sinon il n'apparaît pas comme option dans Zapier.",
        ],
      },
      {
        titre: "Si tu n'utilises pas Systeme.io",
        corps: [
          "Le quiz fonctionne quand même, entièrement. Il capture les emails, affiche les résultats, et tu exportes tes leads en CSV en un clic vers l'autorépondeur de ton choix.",
          "La connexion Systeme.io ajoute l'automatisation derrière : ce n'est pas une condition pour se servir de Tiquiz.",
        ],
      },
      {
        titre: "Une clé par compte, ou une clé par quiz",
        corps: [
          "Une seule clé suffit dans l'immense majorité des cas : tu la colles une fois, tous tes quiz s'en servent.",
          "Tu travailles pour des clients ? Tu peux enregistrer plusieurs clés et choisir, quiz par quiz, dans quel compte Systeme.io les leads doivent arriver. Le quiz de ta cliente remplit SA liste, pas la tienne.",
          "Le choix vit dans l'onglet Créer de l'éditeur, section Gestion du quiz.",
        ],
      },
      {
        titre: "Poser un tag ne déclenche rien tout seul",
        corps: [
          "C'est le piège le plus cher, et il n'est pas chez nous : chez Systeme.io, un tag posé ne déclenche une séquence que si une règle d'automatisation l'écoute.",
          "Sans cette règle, tu mets ton quiz en ligne, tu captes quarante adresses, et il ne se passe rien. L'onglet Automatiser de l'éditeur liste donc les tags exacts que ton quiz va poser, et la marche à suivre pour créer la règle une fois pour toutes.",
          "Les accès à une formation ou à une communauté font exception : Tiquiz les ouvre lui même, une règle de plus les ouvrirait deux fois.",
        ],
      },
    ],
    ou: "Réglages, section Connexions.",
    capture: "L'écran Réglages > Connexions avec une clé Systeme.io reliée (la clé masquée).",
    source: "app/api/quiz/[quizId]/public/route.ts",
    liees: ["resultats-par-profil", "ou-placer-son-quiz"],
    visuel: "leads-qualifies",
  },
  {
    slug: "resultats-par-profil",
    nom: "Les résultats par profil",
    resume:
      "Un seul quiz, et chacun repart vers le texte, le bouton et l'offre qui le concernent.",
    palier: "gratuit",
    pourquoi:
      "Un diagnostic qui dit la même chose à tout le monde n'est pas un diagnostic. Et surtout, il renvoie tout le monde vers la même offre, alors que le quiz vient justement d'apprendre que ces gens ne veulent pas la même chose.",
    benefices: [
      "Chaque profil a son propre bouton : celui qui débute et celui qui est déjà lancé n'atterrissent pas sur la même page, donc tu arrêtes de vendre à contretemps.",
      "Le tag part avec le contact : ta séquence email sait de qui elle parle dès le premier message, sans que tu tries quoi que ce soit à la main.",
      "Tu écris les profils une fois, ils tournent tant que le quiz tourne.",
    ],
    commentCourt:
      "Chaque réponse vote pour un profil, le profil le plus voté gagne, et il porte son texte, son bouton et son tag.",
    detail: [
      {
        titre: "Comment le profil est attribué",
        corps: [
          "Chaque option de réponse porte un profil. À la fin, le profil le plus voté est celui qui s'affiche.",
          "Le nom du profil s'affiche directement sous chaque réponse dans l'éditeur : tu vois ce que tu branches, tu ne comptes pas des numéros.",
          "En mode score, la mécanique change : c'est la tranche de points qui décide. Les deux ne se mélangent jamais.",
        ],
      },
      {
        titre: "Ce que porte un profil",
        corps: [
          "Un titre et un texte, une image, un bouton avec sa propre adresse, et un tag Systeme.io.",
          "Tu peux aussi dérouler la page de résultat en quatre temps : ce qu'il reconnaît de lui, la cause, le chemin, puis le pont vers ton offre.",
        ],
      },

      {
        titre: "Ce que Tiquiz enregistre",
        corps: [
          "L'adresse email, le prénom quand tu le demandes, le résultat obtenu, et la réponse donnée à chaque question.",
          "Les données personnelles sont chiffrées en base, avec une clé par créatrice. Un accès direct à la base ne montre que du chiffré.",
        ],
      },
      {
        titre: "Le tag part avec le contact",
        corps: [
          "Tu nommes un tag par profil de résultat dans l'éditeur. Le visiteur qui obtient ce profil reçoit ce tag chez Systeme.io.",
          "Sur un quiz scoré, le tag est CALCULÉ à partir de tes libellés de tranches : un score dans la tranche 'en route' donne le tag score-en_route.",
          "Sur un sondage, tu peux poser un tag par RÉPONSE : c'est ce qui permet de segmenter sur ce que les gens t'ont dit, pas seulement sur le fait qu'ils ont répondu.",
        ],
      },
      {
        titre: "Et si tu exportes",
        corps: [
          "Un bouton, un fichier CSV, et tout est dedans : les adresses, les profils et les réponses. Aucun contenu n'est retenu en otage.",
        ],
      },
    ],
    ou: "Éditeur du quiz, colonne Résultats, puis Mes leads.",
    capture: "Un profil de résultat ouvert dans l'éditeur, avec son bouton et son tag.",
    source: "lib/quizScoring.ts",
    liees: ["connexion-systeme-io", "quiz-profil-ou-score"],
    visuel: "offres-sur-mesure",
  },
  {
    slug: "quiz-profil-ou-score",
    nom: "Quiz par profil, ou quiz scoré",
    resume:
      "Ton quiz dit à ton visiteur QUI il est, ou OÙ il en est. Tu choisis, et l'IA génère les deux.",
    palier: "gratuit",
    pourquoi:
      "Un test de personnalité et un bilan de niveau ne se construisent pas pareil. Un outil qui n'en propose qu'un force la moitié des sujets dans le mauvais moule.",
    benefices: [
      "Tu poses la question qui correspond vraiment à ton offre : tu ne tords pas ton sujet pour le faire entrer dans un format.",
      "Chaque résultat a son texte, son bouton et son tag : ton visiteur repart vers l'offre qui le concerne, pas vers ta page d'accueil.",
      "L'IA calcule les tranches de score toute seule : tu ne fais aucune arithmétique pour savoir ce que 68 sur 100 doit afficher.",
    ],
    commentCourt:
      "Tu choisis la mécanique à la création, et tout le reste suit : questions, résultats et tags.",
    detail: [
      {
        titre: "Le quiz par profil : qui es-tu ?",
        corps: [
          "Chaque réponse vote pour un profil. Le profil le plus voté gagne, et c'est son écran qui s'affiche.",
          "C'est le format des « Quel type de ... es-tu ? », et c'est celui qui segmente le mieux une audience.",
        ],
      },
      {
        titre: "Le quiz scoré : où en es-tu ?",
        corps: [
          "Chaque réponse vaut des points. Le total tombe dans une tranche, et c'est le message de cette tranche qui s'affiche.",
          "Tu peux ajouter des AXES : sommeil 50 sur 100, alimentation 20 sur 100. Chaque axe a son score et sa barre.",
          "Un bouton répartit les tranches sur la plage de points réellement atteignable : tu n'as pas à poser les bornes à la main.",
        ],
      },
      {
        titre: "Ce qui est vrai dans les deux cas",
        corps: [
          "Un tag part dans Systeme.io selon le résultat.",
          "Le résultat suit les quatre temps enseignés dans l'Atelier du Quiz : le miroir, la cause, le chemin, le pont.",
          "Ton visiteur ne tombe jamais sur une page vide, même si un score sort d'une tranche que tu n'avais pas prévue.",
        ],
      },
    ],
    ou: "Le choix se fait à la création du projet, et se change dans l'éditeur.",
    capture: "Les deux cartes de choix à la création, et un écran de résultat scoré avec ses axes.",
    source: "lib/quizScoring.ts",
    liees: ["resultats-par-profil", "sondages-et-popquiz"],
    visuel: "tes-pixels",
  },
  {
    slug: "partage-et-viralite",
    nom: "Le partage et le bonus",
    resume:
      "Ton visiteur partage son résultat pour débloquer un bonus, et ton quiz part chez des gens qui lui ressemblent.",
    palier: "gratuit",
    pourquoi:
      "Tous tes autres leviers CONVERTISSENT le trafic que tu as déjà. Celui là en RAMÈNE, et il ne coûte pas un centime de publicité.",
    benefices: [
      "Un lead t'en amène un autre : c'est le seul endroit de ton système où ça arrive, et ça continue de tourner les jours où tu ne publies rien.",
      "Les gens qui arrivent par un partage ressemblent à celui qui a partagé : tu ne paies pas pour du trafic qui ne te concerne pas.",
      "Tu choisis les réseaux et tu peux tout couper : sur un sujet intime, personne ne partage, et l'outil ne t'oblige à rien.",
    ],
    commentCourt:
      "Tu promets un bonus, le visiteur partage, le bonus se débloque, et un tag part dans Systeme.io.",
    detail: [
      {
        titre: "Ce que le visiteur voit",
        corps: [
          "Son résultat, puis la proposition de partager pour débloquer ton bonus. Le lien partagé porte SON profil : l'aperçu affiche le résultat qu'il a obtenu, pas la page d'accueil du quiz.",
          "S'il refuse, il garde son résultat quand même. Le partage n'est jamais une condition pour voir sa réponse.",
        ],
      },
      {
        titre: "Les réseaux",
        corps: [
          "X, Facebook, LinkedIn, WhatsApp, Threads, Instagram, Pinterest, Reddit et email. Tu coches ceux que tu veux ; si tu n'en coches aucun, ton visiteur les a tous.",
        ],
      },
      {
        titre: "Une nuance honnête",
        corps: [
          "Sur un sujet intime ou stigmatisant (santé, santé mentale, argent, poids, famille), partager revient à s'exposer. Un taux de partage bas n'y est ni un défaut de ton quiz ni un cadeau trop faible : c'est le sujet.",
        ],
      },
    ],
    ou: "L'onglet Partager de l'éditeur.",
    capture: "L'écran de partage vu par le visiteur, avec le bonus à débloquer.",
    source: "lib/quiz/shareNetworks.ts",
    liees: ["resultats-par-profil", "branding-et-langues"],
    visuel: "viralite-trafic",
  },
  {
    slug: "sondages-et-popquiz",
    nom: "Les sondages et les Popquiz",
    resume:
      "Tu poses une question à ton audience et tu récoltes ses réponses avec ses mots à elle.",
    palier: "gratuit",
    pourquoi:
      "Tu peux passer six mois à construire une offre que personne n'attendait. La seule façon de ne pas le faire, c'est de demander avant, et d'écouter les mots employés.",
    benefices: [
      "Tu sais quoi vendre avant de le fabriquer : tu ne passes plus des semaines sur une offre qui n'intéresse personne.",
      "Tu récupères les mots exacts de ton audience : ce sont eux qui vont dans ta page de vente, et une page écrite avec leurs mots convertit mieux qu'une page écrite avec les tiens.",
      "Chaque réponse peut poser son propre tag : tu segmentes sur ce que les gens t'ont dit, pas seulement sur le fait qu'ils ont répondu.",
    ],
    commentCourt:
      "Même moteur que les quiz, mais sans résultat à afficher : ce sont les réponses qui t'intéressent.",
    detail: [
      {
        titre: "Les types de questions",
        corps: [
          "Choix simple ou multiple, oui ou non, texte libre, échelle de notation, étoiles, et classement par ordre d'importance.",
          "Le texte libre est celui qui rapporte le plus : c'est là que les gens écrivent avec leurs mots.",
        ],
      },
      {
        titre: "Ce que tu vois ensuite",
        corps: [
          "La répartition par option, avec les pourcentages.",
          "La liste des réponses écrites, avec un bouton pour les copier d'un bloc.",
          "La moyenne et la répartition des notes, pour les échelles.",
        ],
      },
      {
        titre: "Et sur le palier PLUS",
        corps: [
          "L'IA lit toutes les réponses et te dit ce qui en ressort : les thèmes qui reviennent, les mots employés, ce sur quoi les gens sont d'accord et ce qui les divise.",
        ],
      },
      {
        titre: "D'où vient la vidéo",
        corps: [
          "YouTube, Vimeo, ou ton propre fichier envoyé dans Tiquiz. Les trois marchent pareil.",
        ],
      },
      {
        titre: "Où se posent les questions",
        corps: [
          "Tu choisis le moment de chaque question, à la seconde. La vidéo se met en pause, la question s'affiche par dessus, et la lecture reprend quand ton spectateur a répondu.",
        ],
      },
      {
        titre: "Ce que ça te rapporte",
        corps: [
          "L'email, le tag correspondant, et les réponses données pendant la vidéo.",
          "Et le point exact où chaque personne s'est arrêtée, ce qu'aucune plateforme vidéo ne te dit sur ton propre contenu.",
        ],
      },
    ],
    ou: "Mes projets, bouton Créer, puis Sondage.",
    capture: "Un sondage avec ses réponses libres et la synthèse par question.",
    source: "app/api/quiz/[quizId]/survey-results/route.ts",
    liees: ["generation-ia", "quiz-profil-ou-score"],
    visuel: null,
  },
  {
    slug: "branding-et-langues",
    nom: "Ton branding et tes langues",
    resume:
      "Ton logo, tes couleurs, ton domaine, et un quiz écrit dans la langue de ton audience.",
    palier: "gratuit",
    pourquoi:
      "Un visiteur qui se rend compte qu'il a quitté ton site pour un outil externe hésite avant de donner son adresse. C'est la confiance qui fait laisser un email, et la confiance passe par le fait d'être chez toi.",
    benefices: [
      "Ton prospect a l'impression d'être chez toi jusqu'au bout : il ne se demande pas à qui il donne son adresse.",
      "Ton nom de domaine remplace le nôtre : ce que tu partages porte ta marque, pas la nôtre.",
      "L'IA écrit dans la langue de ton audience, variantes régionales comprises : un quiz en portugais du Brésil ne sort pas en portugais du Portugal.",
    ],
    commentCourt:
      "Tu règles ton logo, tes couleurs et ta police une fois, et tous tes quiz suivent.",
    detail: [
      {
        titre: "Ce que tu règles",
        corps: [
          "Le logo, sa taille et son alignement, indépendamment du titre.",
          "Les couleurs, la police, la disposition de l'écran d'accueil et celle des réponses.",
          "L'image de chaque question et de chaque réponse, gardée à SON format : rien n'est recadré de force.",
        ],
      },
      {
        titre: "Ton nom de domaine",
        corps: [
          "quiz.tonsite.fr au lieu de notre adresse. Le visiteur ne voit jamais Tiquiz.",
        ],
      },
      {
        titre: "Les langues",
        corps: [
          "L'interface de Tiquiz existe en 7 langues.",
          "La génération, elle, couvre 100 langues et variantes du catalogue, avec leurs notes régionales.",
        ],
      },
    ],
    ou: "L'éditeur, colonne de réglages.",
    capture: "Le même quiz avec deux brandings différents, côte à côte.",
    source: "lib/quiz/introLayout.ts",
    liees: ["ou-placer-son-quiz", "partage-et-viralite"],
    visuel: "ton-branding",
  },
  {
    slug: "ou-placer-son-quiz",
    nom: "Un lien, ou six lignes de code",
    resume:
      "Ton quiz vit sur ton domaine, dans une page Systeme.io, dans WordPress, ou tout seul.",
    palier: "gratuit",
    pourquoi:
      "Un outil qui n'existe que sur son propre site t'oblige à envoyer ton audience ailleurs. C'est un clic de plus, donc une partie des gens qui ne suivent pas.",
    benefices: [
      "Tu poses ton quiz là où ton audience passe déjà : tu ne perds personne dans un déplacement de plus.",
      "Aucun greffon à installer, aucune ligne à écrire : tu copies, tu colles, c'est en ligne.",
      "Pas de site ? Ton quiz EST la page, avec sa propre adresse.",
    ],
    commentCourt:
      "Soit tu partages un lien, soit tu colles six lignes de code dans ta page.",
    detail: [
      {
        titre: "Le lien",
        corps: [
          "Tu le colles dans un email, une story, une bio, un QR code. Avec ton nom de domaine si tu en as un.",
        ],
      },
      {
        titre: "Le code",
        corps: [
          "Six lignes à coller dans ta page. Le quiz s'affiche dedans, à ta place, aux dimensions que tu choisis.",
          "Ça marche dans un tunnel Systeme.io, dans WordPress, dans un article de blog, dans une pop-up, en pied de page.",
        ],
      },
    ],
    ou: "L'onglet Partager de l'éditeur.",
    capture: "Le champ du lien avec son bouton Copier, et le bloc de code.",
    source: "lib/quiz/urlPublique.ts",
    liees: ["connexion-systeme-io", "branding-et-langues"],
    visuel: null,
  },
] as const satisfies readonly Fonctionnalite[];

/**
 * LES ADRESSES D'AVANT, ET POURQUOI ELLES REDIRIGENT.
 *
 * La refonte du 6 septembre ramène quatorze pages à HUIT, celles que
 * Béné nomme. Cinq slugs sont renommés, six pages sont FONDUES dans une
 * autre (leur contenu y vit en entier, en sections de détail).
 *
 * Une adresse qui a existé ne meurt pas : elle peut être dans un
 * sitemap déjà lu, dans un favori, dans un lien posé ailleurs. Un 404
 * là dessus, c'est un lecteur perdu et un signal négatif de plus. On
 * REDIRIGE, en 308, vers la page qui porte désormais le sujet.
 */
export const ANCIENS_SLUGS: Readonly<Record<string, string>> = {
  "integration-systeme-io": "connexion-systeme-io",
  "cles-api-systeme-io": "connexion-systeme-io",
  automatisations: "connexion-systeme-io",
  "suivi-des-leads": "resultats-par-profil",
  "analyse-des-resultats": "generation-ia",
  "generateur-de-bonus": "generation-ia",
  "generateur-d-emails": "generation-ia",
  "generateur-de-promo": "generation-ia",
  "partage-viral": "partage-et-viralite",
  sondages: "sondages-et-popquiz",
  popquiz: "sondages-et-popquiz",
  "ou-vit-ton-quiz": "ou-placer-son-quiz",
};

/**
 * LE TEXTE D'UNE FONCTIONNALITÉ, C'EST À DIRE TOUT CE QUI SE LIT.
 *
 * `Pick` sur `Fonctionnalite`, jamais une liste de champs recopiée :
 * ajouter un champ visible à la fiche fait alors rougir la compilation
 * de chaque langue, au lieu de laisser un champ français traîner sous
 * une adresse anglaise.
 */
export type TexteFonctionnalite = Pick<
  Fonctionnalite,
  "nom" | "resume" | "pourquoi" | "benefices" | "commentCourt" | "detail" | "ou" | "capture"
>;

/** Les huit slugs, DÉRIVÉS de la liste. Une liste écrite à côté divergerait. */
export type SlugFonctionnalite = (typeof FONCTIONNALITES_FR)[number]["slug"];

/**
 * L'ANGLAIS : le champ sémantique, pas le mot à mot.
 *
 * Béné, 8 septembre 2026 : "il faut à chaque fois utiliser le champ
 * sémantique, les expressions, tournures de phrases, ponctuation etc.
 * propre à chaque langue, c'est pas uniquement du mot à mot."
 *
 * Donc la TYPOGRAPHIE est anglaise, comme pour le blog anglais du même
 * jour : `12.5%` collé, le point décimal, aucune espace devant `?` ou
 * `:`. Et aucun tiret cadratin, la règle du 7 juin ne dépend pas de la
 * langue.
 */
const TEXTES_EN: Readonly<Record<SlugFonctionnalite, TexteFonctionnalite>> = {
  "generation-ia": {
    nom: "AI generation",
    resume:
      "You describe your topic, the AI writes the questions, the options and the result profiles.",
    pourquoi:
      "The blank page is what stops most people. Writing ten questions, four options for each one and four result profiles that hold together is a full day of work, and it's the day nobody ever finds.",
    benefices: [
      "You start from a complete first draft in seconds: what's left is proofreading, not writing.",
      "The profiles hold together from the start: every question gives every profile a chance, so no result is impossible to reach.",
      "You can also skip it entirely: importing an existing quiz and writing one by hand sit right there, in the same place.",
    ],
    commentCourt:
      "You pick a goal, a length, your audience and the mechanic, and the quiz comes back written.",
    detail: [
      {
        titre: "What you give",
        corps: [
          "The goal of the quiz, the length (short or long), the audience you're after, and the mechanic: by profile, or with a score.",
          "The tone and the language come from your settings: you don't retype them for every quiz.",
          "A hundred languages and variants are recognised, with their regional notes.",
        ],
      },
      {
        titre: "What you get back",
        corps: [
          "The questions, their options, and the result profiles with their text.",
          "Everything is editable, right away, in the editor. Nothing is locked.",
        ],
      },
      {
        titre: "And if you'd rather not use AI",
        corps: [
          "You write your quiz by hand, or you import an existing one from a file. All three roads lead to the same editor.",
        ],
      },
      {
        titre: "What the AI writes AFTER the quiz",
        corps: [
          "Three generators pick up where the quiz stops: the bonus you hand over at the end, the email sequence that follows, and the posts that announce the quiz.",
          "They start from your quiz: its topic, its profiles, its tone, your language and its public address. You describe nothing twice.",
          "They're reserved for the PLUS plans.",
        ],
      },
      {
        titre: "Where people drop off",
        corps: [
          "How many people SAW each question, and how many ANSWERED it. Both, because they call for opposite fixes: seen without an answer, the question itself is blocking; answered then gone, that's fatigue, and rewording won't help.",
          "The drop is carried by the question that SUFFERS it, never by the one after. Someone who leaves between 6 and 7 stopped ON 6: they never read 7.",
          "Nothing is flagged below 20 people. On eight visitors, one person is worth 12.5%, and an alert based on that makes you rewrite a quiz that's doing fine.",
        ],
      },
      {
        titre: "The split by result",
        corps: [
          "How many people for each profile, including the ones nobody has landed on yet. A profile at zero is information, not a line to hide.",
        ],
      },
      {
        titre: "Two things we say every single time",
        corps: [
          "Losing people is NORMAL and healthy: they're your unqualified visitors first, and no quiz aims for 100% completion.",
          "One change at a time, then 20 to 30 fresh answers before you judge it.",
        ],
      },
      {
        titre: "And on the PLUS plan",
        corps: [
          "The AI reads your stats and tells you what it makes of them, in plain language, with what to do next.",
        ],
      },
    ],
    ou: "Create a quiz, Generate with AI tab.",
    capture:
      "The Create a quiz screen, Generate with AI tab, with the goal and the target audience filled in.",
  },
  "connexion-systeme-io": {
    nom: "The Systeme.io integration",
    resume:
      "Your leads land straight in your Systeme.io account, with no Zapier, Make or Pabbly in between.",
    pourquoi:
      "No other quiz tool talks to Systeme.io. To get a lead in there you need a middleman: one more subscription, one more thing to set up, and one more place where it breaks without anyone noticing.",
    benefices: [
      "One subscription less: you don't need Zapier for this to work, so you're not paying two tools to move one email address.",
      "One breaking point less: the contact leaves Tiquiz and lands in Systeme.io, with nothing in between that can go down.",
      "It works with the FREE Systeme.io account: you don't need a paid plan on their side to use it.",
    ],
    commentCourt:
      "You paste your Systeme.io API key once, and every email you capture lands there within the second.",
    detail: [
      {
        titre: "What you do, once",
        corps: [
          "In Systeme.io, open your Settings then Public API keys, and copy your key.",
          "In Tiquiz, paste it into Settings, Connections. That's it, and you never touch it again.",
        ],
      },
      {
        titre: "What happens next, on its own",
        corps: [
          "Your visitor finishes your quiz and leaves their email on the capture screen.",
          "Tiquiz looks for that contact in Systeme.io. If it isn't there, it creates it.",
          "The tag for the result they got is applied to that contact. And if that tag doesn't exist in your account yet, Tiquiz creates it too.",
        ],
      },
      {
        titre: "What the other tools don't do",
        corps: [
          "In Zapier, only the tags you've ALREADY created by hand show up in the list. One forgotten profile means a lead arriving with nothing to recognise them by, and you find out weeks later, reading your list.",
          "Interact says it in their own documentation: you have to create a tag in Systeme.io for every quiz result, or it won't appear as an option in Zapier.",
        ],
      },
      {
        titre: "If you don't use Systeme.io",
        corps: [
          "The quiz still works, completely. It captures emails, it shows results, and you export your leads to CSV in one click, into whichever autoresponder you use.",
          "The Systeme.io connection adds the automation behind it: it isn't a condition for using Tiquiz.",
        ],
      },
      {
        titre: "One key per account, or one key per quiz",
        corps: [
          "One key is enough for the vast majority: you paste it once, all your quizzes use it.",
          "Working for clients? You can save several keys and choose, quiz by quiz, which Systeme.io account the leads should land in. Your client's quiz fills THEIR list, not yours.",
          "That choice lives in the Create tab of the editor, under Quiz management.",
        ],
      },
      {
        titre: "Applying a tag doesn't trigger anything on its own",
        corps: [
          "This is the most expensive trap, and it isn't on our side: in Systeme.io, a tag only fires a sequence if an automation rule is listening for it.",
          "Without that rule, you publish your quiz, you collect forty addresses, and nothing happens. So the Automate tab of the editor lists the exact tags your quiz will apply, and the steps to create the rule once and for all.",
          "Access to a course or a community is the exception: Tiquiz opens it itself, and one more rule would open it twice.",
        ],
      },
    ],
    ou: "Settings, Connections.",
    capture: "The Settings > Connections screen with a Systeme.io key connected (key masked).",
  },
  "resultats-par-profil": {
    nom: "Results by profile",
    resume:
      "One quiz, and everyone leaves with the text, the button and the offer that concern them.",
    pourquoi:
      "A diagnosis that says the same thing to everyone isn't a diagnosis. Worse, it sends everyone to the same offer, when the quiz has just found out that these people don't want the same thing.",
    benefices: [
      "Each profile gets its own button: the beginner and the one who's already running don't land on the same page, so you stop selling at the wrong moment.",
      "The tag travels with the contact: your email sequence knows who it's talking to from the first message, with no sorting on your side.",
      "You write the profiles once, they keep working for as long as the quiz does.",
    ],
    commentCourt:
      "Every answer votes for a profile, the most voted profile wins, and it carries its text, its button and its tag.",
    detail: [
      {
        titre: "How the profile is decided",
        corps: [
          "Every answer option carries a profile. At the end, the most voted profile is the one that shows.",
          "The profile name shows right under each answer in the editor: you see what you're wiring, you're not counting numbers.",
          "In score mode the mechanic changes: the points bracket decides. The two never mix.",
        ],
      },
      {
        titre: "What a profile carries",
        corps: [
          "A title and a body, an image, a button with its own address, and a Systeme.io tag.",
          "You can also lay the result page out in four beats: what they recognise about themselves, the cause, the path, then the bridge to your offer.",
        ],
      },
      {
        titre: "What Tiquiz records",
        corps: [
          "The email address, the first name when you ask for it, the result they got, and the answer given to every question.",
          "Personal data is encrypted in the database, with one key per creator. Direct access to the database shows nothing but ciphertext.",
        ],
      },
      {
        titre: "The tag travels with the contact",
        corps: [
          "You name one tag per result profile in the editor. The visitor who lands on that profile gets that tag in Systeme.io.",
          "On a scored quiz the tag is CALCULATED from your bracket labels: a score in the 'on track' bracket gives the tag score-on_track.",
          "On a survey you can apply one tag per ANSWER: that's what lets you segment on what people told you, not just on the fact that they replied.",
        ],
      },
      {
        titre: "And if you export",
        corps: [
          "One button, one CSV file, and it's all in there: the addresses, the profiles and the answers. Nothing of yours is held hostage.",
        ],
      },
    ],
    ou: "Quiz editor, Results column, then My leads.",
    capture: "A result profile open in the editor, with its button and its tag.",
  },
  "quiz-profil-ou-score": {
    nom: "Profile quiz, or scored quiz",
    resume:
      "Your quiz tells your visitor WHO they are, or WHERE they stand. You choose, and the AI writes either one.",
    pourquoi:
      "A personality test and a level assessment aren't built the same way. A tool that only offers one of them forces half of all topics into the wrong mould.",
    benefices: [
      "You ask the question that actually matches your offer: you don't bend your topic to fit a format.",
      "Every result has its own text, its own button and its own tag: your visitor leaves towards the offer that concerns them, not towards your homepage.",
      "The AI works out the score brackets on its own: you do no arithmetic to know what 68 out of 100 should show.",
    ],
    commentCourt:
      "You pick the mechanic when you create the quiz, and everything follows: questions, results and tags.",
    detail: [
      {
        titre: "The profile quiz: who are you?",
        corps: [
          "Every answer votes for a profile. The most voted profile wins, and its screen is the one that shows.",
          "It's the format behind every 'What kind of ... are you?', and it's the one that segments an audience best.",
        ],
      },
      {
        titre: "The scored quiz: where do you stand?",
        corps: [
          "Every answer is worth points. The total falls into a bracket, and that bracket's message is what shows.",
          "You can add AXES: sleep 50 out of 100, food 20 out of 100. Each axis gets its own score and its own bar.",
          "One button spreads the brackets across the range of points that can actually be reached: you never set the bounds by hand.",
        ],
      },
      {
        titre: "What's true either way",
        corps: [
          "A tag goes into Systeme.io according to the result.",
          "The result follows the four beats taught in the Atelier du Quiz: the mirror, the cause, the path, the bridge.",
          "Your visitor never lands on an empty page, even if a score falls outside a bracket you hadn't planned for.",
        ],
      },
    ],
    ou: "You choose when you create the project, and you can change it in the editor.",
    capture: "The two choice cards at creation, and a scored result screen with its axes.",
  },
  "partage-et-viralite": {
    nom: "Sharing and the bonus",
    resume:
      "Your visitor shares their result to unlock a bonus, and your quiz travels to people who look like them.",
    pourquoi:
      "Every other lever you have CONVERTS traffic you already had. This one BRINGS traffic back, and it doesn't cost a cent in ads.",
    benefices: [
      "One lead brings you another: it's the only place in your system where that happens, and it keeps running on the days you publish nothing.",
      "People who arrive through a share look like the person who shared: you're not paying for traffic that has nothing to do with you.",
      "You pick the networks, and you can switch the whole thing off: on an intimate topic nobody shares, and the tool never forces your hand.",
    ],
    commentCourt:
      "You promise a bonus, the visitor shares, the bonus unlocks, and a tag goes into Systeme.io.",
    detail: [
      {
        titre: "What the visitor sees",
        corps: [
          "Their result, then the offer to share it and unlock your bonus. The shared link carries THEIR profile: the preview shows the result they got, not the quiz landing page.",
          "If they say no, they keep their result anyway. Sharing is never a condition for seeing your answer.",
        ],
      },
      {
        titre: "The networks",
        corps: [
          "X, Facebook, LinkedIn, WhatsApp, Threads, Instagram, Pinterest, Reddit and email. You tick the ones you want; tick none, and your visitor gets them all.",
        ],
      },
      {
        titre: "One honest caveat",
        corps: [
          "On an intimate or stigmatising topic (health, mental health, money, weight, family), sharing means exposing yourself. A low share rate there is neither a flaw in your quiz nor a bonus that's too weak: it's the topic.",
        ],
      },
    ],
    ou: "The Share tab of the editor.",
    capture: "The share screen as the visitor sees it, with the bonus to unlock.",
  },
  "sondages-et-popquiz": {
    nom: "Surveys and Popquiz",
    resume: "You ask your audience a question and you collect their answers in their own words.",
    pourquoi:
      "You can spend six months building an offer nobody was waiting for. The only way not to is to ask first, and to listen to the words people actually use.",
    benefices: [
      "You know what to sell before you build it: no more weeks spent on an offer nobody wants.",
      "You get your audience's exact words: those are the ones that go into your sales page, and a page written in their words converts better than one written in yours.",
      "Every answer can apply its own tag: you segment on what people told you, not just on the fact that they replied.",
    ],
    commentCourt:
      "Same engine as the quizzes, but with no result to show: here it's the answers that matter.",
    detail: [
      {
        titre: "The question types",
        corps: [
          "Single or multiple choice, yes or no, free text, rating scale, stars, and ranking by order of importance.",
          "Free text is the one that pays off most: that's where people write in their own words.",
        ],
      },
      {
        titre: "What you see next",
        corps: [
          "The split by option, with percentages.",
          "The list of written answers, with a button to copy them in one go.",
          "The average and the spread of ratings, for scales.",
        ],
      },
      {
        titre: "And on the PLUS plan",
        corps: [
          "The AI reads every answer and tells you what comes out of it: the themes that keep coming back, the words people use, what they agree on and what divides them.",
        ],
      },
      {
        titre: "Where the video comes from",
        corps: [
          "YouTube, Vimeo, or your own file uploaded to Tiquiz. All three work the same way.",
        ],
      },
      {
        titre: "Where the questions sit",
        corps: [
          "You choose the moment for each question, to the second. The video pauses, the question shows on top of it, and playback resumes once your viewer has answered.",
        ],
      },
      {
        titre: "What it earns you",
        corps: [
          "The email, the matching tag, and the answers given during the video.",
          "And the exact point where each person stopped, which no video platform tells you about your own content.",
        ],
      },
    ],
    ou: "My projects, Create button, then Survey.",
    capture: "A survey with its free-text answers and the per-question summary.",
  },
  "branding-et-langues": {
    nom: "Your branding and your languages",
    resume: "Your logo, your colours, your domain, and a quiz written in your audience's language.",
    pourquoi:
      "A visitor who realises they've left your site for some external tool hesitates before handing over their address. Trust is what makes people leave an email, and trust comes from still being at your place.",
    benefices: [
      "Your prospect feels they're at your place the whole way through: they never wonder who they're giving their address to.",
      "Your domain name replaces ours: what you share carries your brand, not ours.",
      "The AI writes in your audience's language, regional variants included: a Brazilian Portuguese quiz doesn't come out in European Portuguese.",
    ],
    commentCourt: "You set your logo, your colours and your font once, and every quiz follows.",
    detail: [
      {
        titre: "What you set",
        corps: [
          "The logo, its size and its alignment, independently of the title.",
          "The colours, the font, the layout of the landing screen and the layout of the answers.",
          "The image on every question and every answer, kept at ITS own aspect ratio: nothing is cropped by force.",
        ],
      },
      {
        titre: "Your domain name",
        corps: ["quiz.yoursite.com instead of our address. The visitor never sees Tiquiz."],
      },
      {
        titre: "The languages",
        corps: [
          "The Tiquiz interface exists in 7 languages.",
          "Generation itself covers 100 languages and variants from the catalogue, with their regional notes.",
        ],
      },
    ],
    ou: "The editor, settings column.",
    capture: "The same quiz with two different brandings, side by side.",
  },
  "ou-placer-son-quiz": {
    nom: "A link, or six lines of code",
    resume: "Your quiz lives on your domain, in a Systeme.io page, in WordPress, or on its own.",
    pourquoi:
      "A tool that only exists on its own site forces you to send your audience somewhere else. That's one more click, so it's a share of people who don't follow.",
    benefices: [
      "You put your quiz where your audience already is: you lose nobody in one more hop.",
      "No plugin to install, no line to write: you copy, you paste, it's live.",
      "No site? Your quiz IS the page, with its own address.",
    ],
    commentCourt: "Either you share a link, or you paste six lines of code into your page.",
    detail: [
      {
        titre: "The link",
        corps: [
          "You paste it into an email, a story, a bio, a QR code. With your own domain name if you have one.",
        ],
      },
      {
        titre: "The code",
        corps: [
          "Six lines to paste into your page. The quiz shows up inside it, in your place, at whatever size you choose.",
          "It works in a Systeme.io funnel, in WordPress, in a blog post, in a pop-up, in a footer.",
        ],
      },
    ],
    ou: "The Share tab of the editor.",
    capture: "The link field with its Copy button, and the code block.",
  },
};

/**
 * Les langues AUTRES que celle sans préfixe.
 *
 * Le français est la source : il vit dans `FONCTIONNALITES_FR`, avec la
 * structure, exactement comme il vit à la racine des adresses. Une
 * langue ajoutée ici sans ses 8 textes ne compile pas.
 */
const TRADUCTIONS: Readonly<
  Record<
    Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>,
    Readonly<Record<SlugFonctionnalite, TexteFonctionnalite>>
  >
> = { en: TEXTES_EN };

/** Les huit fonctionnalités, dans la langue demandée. */
export function fonctionnalites(langue: LanguePublique): readonly Fonctionnalite[] {
  if (langue === LANGUE_SANS_PREFIXE) return FONCTIONNALITES_FR;
  const textes = TRADUCTIONS[langue];
  return FONCTIONNALITES_FR.map((f) => ({ ...f, ...textes[f.slug] }));
}

/**
 * LES SLUGS, ET RIEN D'AUTRE.
 *
 * Le sitemap et `generateStaticParams` n'ont besoin que de ça, et ils
 * n'ont pas de langue à passer : les adresses sont les mêmes dans les
 * deux, au préfixe près.
 */
export const SLUGS_FONCTIONNALITES: readonly SlugFonctionnalite[] = FONCTIONNALITES_FR.map(
  (f) => f.slug,
);

/** Retrouve une fonctionnalité par son slug, ou rend `null`. */
export function fonctionnaliteParSlug(
  slug: string,
  langue: LanguePublique,
): Fonctionnalite | null {
  return fonctionnalites(langue).find((f) => f.slug === slug) ?? null;
}

/**
 * LE LIBELLÉ DU PALIER, ET IL NE SE DEVINE PAS.
 *
 * "payant" ne veut pas dire PLUS : le guide d'automatisation est dans
 * les quatre paliers payants, l'analyse IA seulement dans les deux
 * paliers PLUS. Les confondre ferait promettre sur la page ce que le
 * bon de commande ne donne pas.
 */
const LIBELLES_PALIER: Readonly<Record<LanguePublique, Readonly<Record<Palier, string>>>> = {
  fr: {
    gratuit: "Dans tous les paliers, gratuit compris",
    payant: "Dans les paliers payants",
    plus: "Réservé aux paliers PLUS",
  },
  en: {
    gratuit: "In every plan, free included",
    payant: "In the paid plans",
    plus: "PLUS plans only",
  },
};

export function libellePalier(palier: Palier, langue: LanguePublique): string {
  return LIBELLES_PALIER[langue][palier];
}

/**
 * LE CHROME DE CES DEUX ÉCRANS.
 *
 * Il vit ici et pas dans les composants pour la raison qui vaut pour
 * tout le reste du module : deux écrans lisent les mêmes mots, et une
 * deuxième version des mêmes phrases finit par ne plus dire la même
 * chose. Le hub et la page détaillée partagent le libellé du palier, le
 * bouton et la phrase de rassurance.
 */
export const CHROME_FONCTIONNALITES: Readonly<
  Record<
    LanguePublique,
    {
      metaTitre: string;
      metaDescription: string;
      titreHub: string;
      chapoHub: (n: number) => string;
      lireLeDetail: string;
      versTarifs: string;
      rassureHub: string;
      fil: string;
      pourquoi: string;
      benefices: string;
      comment: string;
      ouCaSePasse: string;
      captureAAjouter: string;
      cta: string;
      rassure: string;
      detailDesPaliers: string;
      aLireAussi: string;
    }
  >
> = {
  fr: {
    metaTitre: "Tout ce que Tiquiz sait faire",
    metaDescription:
      "La connexion Systeme.io, les quiz par profil ou scorés, les sondages, les Popquiz, les tags automatiques, les générateurs : chaque fonctionnalité, expliquée en détail.",
    titreHub: "Tout ce que Tiquiz sait faire",
    chapoHub: (n) =>
      `${n} fonctionnalités, expliquées une par une : à quoi elles servent, ce qu'elles te rapportent, et comment elles marchent vraiment. Clique sur celle qui t'intéresse.`,
    lireLeDetail: "Le détail",
    versTarifs: "Voir les tarifs",
    rassureHub: "Le premier palier ne coûte rien, et il n'expire pas.",
    fil: "Les fonctionnalités",
    pourquoi: "Pourquoi",
    benefices: "Ce que ça te rapporte",
    comment: "Comment ça marche",
    ouCaSePasse: "Où ça se passe :",
    captureAAjouter: "Capture d'écran à ajouter",
    cta: "Créer mon compte gratuit",
    rassure: "Gratuit, sans carte bancaire.",
    detailDesPaliers: "Le détail de chaque palier",
    aLireAussi: "À lire aussi",
  },
  en: {
    metaTitre: "Everything Tiquiz can do",
    metaDescription:
      "The Systeme.io connection, profile and scored quizzes, surveys, Popquiz, automatic tags, the generators: every feature, explained in full.",
    titreHub: "Everything Tiquiz can do",
    chapoHub: (n) =>
      `${n} features, explained one by one: what they're for, what they earn you, and how they actually work. Click the one you're after.`,
    lireLeDetail: "The detail",
    versTarifs: "See the pricing",
    rassureHub: "The first plan costs nothing, and it doesn't expire.",
    fil: "Features",
    pourquoi: "Why",
    benefices: "What it earns you",
    comment: "How it works",
    ouCaSePasse: "Where it happens:",
    captureAAjouter: "Screenshot to add",
    cta: "Create my free account",
    rassure: "Free, no card needed.",
    detailDesPaliers: "What each plan includes",
    aLireAussi: "Read next",
  },
};

/**
 * LES DEUX PAGES VOISINES, RÉSOLUES.
 *
 * Un slug qui ne correspond à rien est IGNORÉ plutôt que rendu en lien
 * mort : mieux vaut une voisine que deux liens dont un tombe. Le test,
 * lui, exige que les deux existent : c'est là que ça se voit, pas à
 * l'écran d'une lectrice.
 */
export function fonctionnalitesLiees(
  f: Fonctionnalite,
  langue: LanguePublique,
): Fonctionnalite[] {
  return f.liees
    .map((slug) => fonctionnaliteParSlug(slug, langue))
    .filter((x): x is Fonctionnalite => x !== null && x.slug !== f.slug);
}
