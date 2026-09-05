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
// -- ET CE MODULE EST EN FRANÇAIS SEULEMENT --------------------------
//
// Même choix assumé que `lib/checkout/avantages.ts`, pour la même
// raison : traduire ici fabriquerait une deuxième liste. La traduction
// se fera une fois, quand le texte français sera validé, et les deux
// écrans qui le lisent en profiteront le même jour. Sur `?lang=en`, la
// coquille du site est traduite et ces blocs restent en français.

/** Le palier minimum, tel que `lib/planLimits.ts` le décide vraiment. */
export type Palier = "gratuit" | "payant" | "plus";

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
}

export const FONCTIONNALITES: readonly Fonctionnalite[] = [
  {
    slug: "integration-systeme-io",
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
    ],
    ou: "Réglages, section Connexions.",
    capture: "L'écran Réglages > Connexions avec une clé Systeme.io reliée (la clé masquée).",
    source: "app/api/quiz/[quizId]/public/route.ts",
  },
  {
    slug: "suivi-des-leads",
    nom: "Le suivi des leads et le tag automatique",
    resume:
      "Chaque personne qui répond arrive dans ta liste avec son résultat, son tag et ce qu'elle a répondu.",
    palier: "gratuit",
    pourquoi:
      "Une adresse email toute seule ne te dit rien. Tu ne sais pas à qui tu parles, donc tu écris le même message à tout le monde, donc presque personne ne répond.",
    benefices: [
      "Tu sais QUI est chaque contact avant de lui écrire : tu ne fais plus d'emails à l'aveugle, tu écris à quelqu'un dont tu connais le blocage.",
      "Le tri se fait tout seul, à la seconde où la personne répond : tu n'as aucune liste à segmenter à la main le dimanche soir.",
      "Tu récupères aussi ce qu'elle a répondu, question par question : c'est là que tu trouves les mots exacts à mettre dans ta prochaine page de vente.",
    ],
    commentCourt:
      "Le lead, son profil, son tag et ses réponses arrivent ensemble, dans Tiquiz et dans Systeme.io.",
    detail: [
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
    ou: "Mes leads, et l'onglet Résultats de chaque projet.",
    capture: "L'écran Mes leads, avec la colonne du profil obtenu et le tag posé.",
    source: "app/api/quiz/[quizId]/public/route.ts",
  },
  {
    slug: "cles-api-systeme-io",
    nom: "Plusieurs comptes Systeme.io",
    resume:
      "Tu relies autant de comptes Systeme.io que tu as de clients, et tu choisis lequel reçoit les leads de chaque quiz.",
    palier: "plus",
    pourquoi:
      "Quand tu montes des quiz pour tes clients, leurs leads doivent atterrir chez EUX, pas chez toi. Avec une seule clé, il faut exporter et réimporter à la main, à chaque fois.",
    benefices: [
      "Chaque client garde ses leads dans son propre compte : tu n'as plus de fichier CSV à faire circuler par email, et tu ne détiens plus les données de quelqu'un d'autre.",
      "Tu changes de compte quiz par quiz, depuis un menu : monter un quiz pour un nouveau client devient une affaire de minutes.",
    ],
    commentCourt:
      "Tu ajoutes une clé par compte, et chaque quiz porte celle qu'il doit utiliser.",
    detail: [
      {
        titre: "Comment ça se règle",
        corps: [
          "Tu ajoutes tes clés dans Réglages, section Connexions. Elles portent le nom que tu leur donnes.",
          "Dans l'éditeur d'un quiz, groupe Gestion du quiz, tu choisis la clé de ce quiz là. Sans choix, le quiz utilise la clé par défaut de ton compte.",
        ],
      },
      {
        titre: "Le palier",
        corps: [
          "Une clé sur les paliers gratuit, Mensuel et Annuel. Plusieurs clés sur Mensuel PLUS et Annuel PLUS.",
        ],
      },
    ],
    ou: "Réglages > Connexions, puis l'éditeur du quiz.",
    capture: "La liste des clés dans Réglages, et le sélecteur de clé dans l'éditeur.",
    source: "lib/planLimits.ts",
  },
  {
    slug: "automatisations",
    nom: "Le guide d'automatisation",
    resume:
      "Tiquiz te donne les tags exacts à créer dans Systeme.io, et la marche à suivre en trois clics.",
    palier: "payant",
    pourquoi:
      "Poser un tag ne déclenche rien tant qu'aucune règle d'automatisation ne l'écoute, et ces règles se créent à la main dans Systeme.io. Une créatrice met son quiz en ligne, capte quarante adresses, et il ne se passe rien. Elle n'en conclut pas qu'il lui manque une règle : elle en conclut que l'outil ne sert à rien.",
    benefices: [
      "Tu sais exactement quels tags créer, écrits au caractère près : tu ne passes plus une soirée à chercher pourquoi ta séquence ne part pas.",
      "L'écran ne liste QUE les tags que ton quiz enverra vraiment : tu ne construis pas de workflow sur un tag qui n'arrivera jamais.",
      "Chaque nom se copie d'un clic : une faute de frappe dans un nom de tag casse tout en silence, et c'est le seul endroit où ça arrive.",
    ],
    commentCourt:
      "Un onglet de l'éditeur liste les tags de TON quiz, groupés, avec la recette dite une fois.",
    detail: [
      {
        titre: "Ce que l'onglet affiche",
        corps: [
          "Les tags de profil, un par résultat, si ton projet est un quiz.",
          "Le tag de capture et les tags par réponse, si ton projet est un sondage.",
          "Les tags de score, une ligne par tranche possible, si tu les as activés.",
          "Le tag de partage, si tu promets un bonus contre un partage.",
        ],
      },
      {
        titre: "Ce qu'il te dit de NE PAS faire",
        corps: [
          "Les accès à une formation ou à une communauté sont ouverts par Tiquiz lui même. Créer une règle de plus les ouvrirait DEUX fois, et ça ne se voit qu'en recevant deux emails. La carte le dit en toutes lettres.",
        ],
      },
      {
        titre: "La recette, une seule fois",
        corps: [
          "Les trois clics sont les mêmes pour tous les tags : elle est écrite en haut de l'écran, pas répétée sous chaque nom. Un quiz à six profils affichait dix-huit lignes de marche à suivre pour six informations.",
        ],
      },
    ],
    ou: "L'onglet Automatiser de l'éditeur.",
    capture: "L'onglet Automatiser sur un quiz à plusieurs profils, avec ses groupes de tags.",
    source: "lib/automatisation/planSysteme.ts",
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
  },
  {
    slug: "sondages",
    nom: "Les sondages",
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
    ],
    ou: "Mes projets, bouton Créer, puis Sondage.",
    capture: "Un sondage avec ses réponses libres et la synthèse par question.",
    source: "app/api/quiz/[quizId]/survey-results/route.ts",
  },
  {
    slug: "popquiz",
    nom: "Les Popquiz",
    resume:
      "Des questions s'affichent pendant ta vidéo, et ton spectateur répond sans quitter l'écran.",
    palier: "gratuit",
    pourquoi:
      "Une vidéo qui tourne bien ne rapporte rien tant que personne ne laisse son email. Un lien en description est vu par une poignée de gens, et cliqué par presque personne.",
    benefices: [
      "Ta vidéo capture des adresses pendant qu'elle est regardée : tu ne comptes plus sur un lien en description que personne n'ouvre.",
      "Tu vois où les gens décrochent, minute par minute : tu sais quel passage refaire au lieu de deviner.",
      "Ça marche sur une vidéo que tu as DÉJÀ publiée : tu n'as rien à retourner ni à remonter.",
    ],
    commentCourt:
      "Tu colles l'adresse de ta vidéo, tu poses tes questions aux moments qui comptent, et c'est en ligne.",
    detail: [
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
    ou: "Mes projets, bouton Créer, puis Popquiz.",
    capture: "Un Popquiz en lecture, question affichée par dessus la vidéo.",
    source: "supabase/migrations/026_popquiz_schema.sql",
  },
  {
    slug: "partage-viral",
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
  },
  {
    slug: "ou-vit-ton-quiz",
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
  },
  {
    slug: "analyse-des-resultats",
    nom: "L'analyse des résultats",
    resume:
      "Tu vois combien de personnes commencent, où elles s'arrêtent, et quel profil ressort le plus.",
    palier: "gratuit",
    pourquoi:
      "Sans chiffres, tu modifies ton quiz au hasard. Et avec les mauvais chiffres, c'est pire : tu corriges une question que les partants n'ont jamais lue.",
    benefices: [
      "Tu vois quelle question fait décrocher, et laquelle exactement : tu ne réécris pas trois fois la mauvaise.",
      "Tu vois la répartition de tes profils : tu sais quel segment est le plus gros, donc quelle offre pousser en premier.",
      "Tu vois ce qui se passe en temps réel, pas dans un rapport mensuel.",
    ],
    commentCourt:
      "Un écran par projet : vues, démarrages, complétions, leads, et le parcours question par question.",
    detail: [
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
    ou: "Le bouton Statistiques d'un projet.",
    capture: "L'écran de statistiques d'un quiz qui a de la donnée, avec le parcours par question.",
    source: "lib/quiz/funnelSignal.ts",
  },
  {
    slug: "generateur-de-bonus",
    nom: "Le générateur de bonus",
    resume:
      "L'IA écrit le bonus que tu offres à la fin de ton quiz, son mode d'emploi et les textes qui le remettent.",
    palier: "plus",
    pourquoi:
      "Le quiz capture l'adresse, le bonus fait la suite. Sauf qu'écrire un bonus qui donne envie d'acheter derrière prend des jours, et c'est l'étape où la plupart des gens abandonnent.",
    benefices: [
      "Tu obtiens un bonus complet en une fois : tu ne repousses plus ton lancement de trois semaines parce qu'il te manque le cadeau.",
      "Le bonus ramène vers TON offre payante : il ouvre un vide que seule ton offre comble, au lieu de se suffire à lui même.",
      "Un bonus par profil si tu veux : chaque personne reçoit ce qui correspond à son résultat, pas le même PDF pour tout le monde.",
    ],
    commentCourt:
      "Tu dis ce que tu vends, l'IA propose trois pistes, tu en choisis une, et elle écrit.",
    detail: [
      {
        titre: "Ce que tu remplis, et ce que tu ne remplis pas",
        corps: [
          "Ton offre payante, à qui elle s'adresse, et ce que chaque profil doit recevoir.",
          "Le titre du quiz, sa promesse, ton ton, ta langue, tes profils et leurs tags sont RELUS depuis ton projet : on ne te redemande pas ce qu'on sait déjà.",
        ],
      },
      {
        titre: "Trois pistes, tu en choisis une",
        corps: [
          "Elles sont volontairement différentes. Tu prends celle qui te ressemble, pas la plus impressionnante.",
          "Chaque piste dit ce qu'elle te coûtera en temps, y compris le temps par personne : un format personnalisé se découvre au quarantième lead, c'est à dire quand ton quiz commence à marcher.",
        ],
      },
      {
        titre: "Ce que tu récupères",
        corps: [
          "Le contenu du bonus lui même.",
          "Ton mode d'emploi : comment le fabriquer et le livrer.",
          "Les textes qui le remettent : l'écran de résultat, l'email, le message de partage.",
          "Le tout se relit, se corrige sur place, s'exporte en PDF, et se retrouve dans ta bibliothèque.",
        ],
      },
    ],
    ou: "Générateurs, puis Bonus.",
    capture: "L'écran des trois pistes, et un bonus produit dans ses trois dossiers.",
    source: "lib/generateurs/catalogue.ts",
  },
  {
    slug: "generateur-d-emails",
    nom: "Le générateur d'emails",
    resume:
      "L'IA écrit la séquence d'emails qui part après ton quiz, écrite pour le profil obtenu.",
    palier: "plus",
    pourquoi:
      "Le quiz range tes contacts par profil, et la plupart des gens leur envoient quand même le même email. Tout le travail de segmentation est perdu à l'étape suivante.",
    benefices: [
      "Chaque profil reçoit une séquence qui lui parle de SON blocage : tes emails sont ouverts parce qu'ils tombent juste.",
      "Cinq emails écrits d'un coup : tu ne repousses plus la suite de ton tunnel au mois prochain.",
      "Ils se collent directement dans Systeme.io : tu écris, tu copies, c'est programmé.",
    ],
    commentCourt:
      "Tu choisis le profil, et l'IA écrit les cinq temps de la séquence post-quiz.",
    detail: [
      {
        titre: "Les cinq temps",
        corps: [
          "La séquence n'a pas de pistes à choisir, et c'est voulu : elle a des temps FIXES, elle se déroule. Ce sont exactement ceux enseignés dans l'Atelier du Quiz.",
        ],
      },
      {
        titre: "Ce qui est repris de ton quiz",
        corps: [
          "Le profil obtenu, son texte de résultat, ton offre, ton ton, ta langue, et l'adresse publique de ton quiz.",
          "Le lien n'est posé QUE là où il doit apparaître : dans un email d'invitation, oui ; dans le contenu d'un bonus qui se lit hors ligne, non.",
        ],
      },
      {
        titre: "Ce que tu peux corriger",
        corps: [
          "Tout, sur place, avec un éditeur. Et chaque email se regénère seul si celui là ne te va pas.",
        ],
      },
    ],
    ou: "Générateurs, puis Emails.",
    capture: "Un email produit, ouvert dans l'éditeur.",
    source: "lib/generateurs/sequences.ts",
  },
  {
    slug: "generateur-de-promo",
    nom: "Le générateur de contenus de promo",
    resume:
      "L'IA écrit les emails et les publications qui annoncent ton quiz, chacun sous un angle différent.",
    palier: "plus",
    pourquoi:
      "Un quiz que personne ne voit ne rapporte rien. Et annoncer la même chose quatre fois avec les mêmes mots, c'est un post publié quatre fois.",
    benefices: [
      "Tu as de quoi annoncer ton quiz pendant une semaine, prêt à copier : tu ne te retrouves plus devant une page blanche le jour du lancement.",
      "Chaque publication attaque par un angle différent : ton audience ne lit pas quatre fois le même message.",
    ],
    commentCourt:
      "Un bouton par contenu, et tu récupères trois emails et quatre publications.",
    detail: [
      {
        titre: "Ce qui est produit",
        corps: [
          "Trois emails d'invitation et quatre publications, chacun sous un angle qui lui est propre.",
          "Ils portent l'adresse publique de ton quiz, avec ton nom de domaine si tu en as un.",
        ],
      },
      {
        titre: "Pas de pistes ici non plus",
        corps: [
          "Annoncer un quiz est une routine, pas une création : il n'y a rien à choisir entre trois directions, alors on ne te fait pas payer une étape pour rien.",
        ],
      },
    ],
    ou: "Générateurs, puis Promotion.",
    capture: "La bibliothèque des contenus générés, avec les trois blocs.",
    source: "lib/generateurs/sequences.ts",
  },
] as const;

/** Retrouve une fonctionnalité par son slug, ou rend `null`. */
export function fonctionnaliteParSlug(slug: string): Fonctionnalite | null {
  return FONCTIONNALITES.find((f) => f.slug === slug) ?? null;
}

/**
 * LE LIBELLÉ DU PALIER, ET IL NE SE DEVINE PAS.
 *
 * "payant" ne veut pas dire PLUS : le guide d'automatisation est dans
 * les quatre paliers payants, l'analyse IA seulement dans les deux
 * paliers PLUS. Les confondre ferait promettre sur la page ce que le
 * bon de commande ne donne pas.
 */
export const LIBELLE_PALIER: Readonly<Record<Palier, string>> = {
  gratuit: "Dans tous les paliers, gratuit compris",
  payant: "Dans les paliers payants",
  plus: "Réservé aux paliers PLUS",
};
