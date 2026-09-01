// lib/blog/altImages.ts
//
// LE TEXTE ALTERNATIF DE CHAQUE IMAGE DU BLOG.
//
// Audit SEO/GEO demandé par Béné. **33 images sur 76 n'avaient aucun
// `alt`**, soit 43 % du blog (mesuré, pas estimé : l'AGENTS.md disait
// 80 %, c'était faux et je le corrige ici).
//
// -- POURQUOI ÇA COMPTE, ET PAS QU'UN PEU ------------------------------
//
// Un `alt` vide, c'est trois choses perdues d'un coup :
//
//  1. **une lectrice aveugle n'entend rien.** Son lecteur d'écran saute
//     l'image, ou pire, épelle le nom du fichier
//     (`mjaxntazmgewmtkwodgyywezytzimjvinmzknti3mjg0mge4owu.webp`) ;
//  2. **Google ne sait pas ce qu'il y a dedans.** Les schémas de ce blog
//     portent l'essentiel de l'argumentaire (les chiffres de l'email vs
//     les réseaux, le tunnel de Jocelyne) : sans `alt`, ce contenu
//     n'existe pas pour un moteur ;
//  3. **un modèle de langue non plus.** C'est exactement ce que Béné
//     vise en parlant de GEO : quand ChatGPT ou Claude lisent une page,
//     ils lisent le `alt`, jamais le pixel.
//
// -- CE QU'UN `alt` DOIT ÊTRE ------------------------------------------
//
// Ce qu'on VOIT, dans le contexte de l'article, en une phrase. Pas
// "image de", pas "photo montrant" : un lecteur d'écran annonce déjà
// que c'est une image, le répéter fait perdre du temps. Pas de bourrage
// de mots clés non plus : Google le pénalise et une lectrice aveugle
// l'entend.
//
// **Les schémas portent leurs CHIFFRES.** C'est la moitié du travail :
// "l'email rapporte 36 € pour 1 € investi contre 5 à 7 € pour les
// réseaux" est ce que le dessin dit, et c'est ce qu'il faut écrire.
//
// -- POURQUOI UN MODULE, ET PAS UNE PASSE À LA MAIN --------------------
//
// Même raison que `faitsProgramme.ts` : le contenu est un FICHIER, et un
// ré-import le remplacerait sans son `alt`. La règle vit donc ici,
// `npm run blog:reparer` l'applique, et le test exige qu'il ne reste
// aucune image sans texte.
//
// La clé est le CHEMIN de l'image, pas sa position : une image déplacée
// dans l'article garde son texte, et une image utilisée deux fois (les
// variantes desktop et mobile d'un même schéma) est couverte une seule
// fois.

/** Le texte alternatif de chaque image, par son chemin public. */
export const ALT_IMAGES: Readonly<Record<string, string>> = {
  // ── 17 raisons de lancer un quiz ──
  "/blog/img/quiz-adobe.webp":
    "Page d'accueil du quiz Creative Types d'Adobe, avec son bouton Démarrer le test",
  "/blog/img/quiz-buzzfeed.webp":
    "Écran de résultat d'un quiz BuzzFeed, avec sa description de profil et ses boutons de partage",
  "/blog/img/beardsmanquiz.webp":
    "Quiz What type of beardsman are you : la page qui demande l'email avant d'afficher le résultat",
  "/blog/img/quiz-sephora.webp":
    "Quiz Sephora pour trouver le soin visage adapté, illustré par cinq visages aux masques colorés",
  "/blog/img/leads-systeme-io-tiquiz.webp":
    "Tableau des leads dans Tiquiz : email, prénom, quiz, profil obtenu, date et synchronisation Systeme.io ligne par ligne",
  "/blog/img/schema-segmentation.webp":
    "Liste envoyée en bloc contre liste segmentée par quiz : 21 % d'ouvertures contre 24 %, et 2,6 % de clics contre 5,2 %, soit le double",
  "/blog/img/schema-desinscriptions.webp":
    "Le taux de désinscription baisse de 10 % quand la liste est segmentée par quiz au lieu d'être envoyée en bloc",
  "/blog/img/ask-methode-ryan-levesque.webp":
    "Les chiffres de la méthode ASK de Ryan Levesque : 14 000 clients, 82 millions de participants aux quiz, 47 langues, 100 pays",
  "/blog/img/quiz-warbyparker.webp":
    "Écran d'attente du quiz Warby Parker pendant le calcul du résultat, avec le prix des lunettes et la livraison gratuite",
  "/blog/img/quiz-asphalte.webp":
    "Sondage de la marque Asphalte sur ses futures boots : elle demande son avis à sa communauté avant de lancer le produit",
  "/blog/img/schema-interactif-vs-passif.webp":
    "Le contenu interactif convertit deux fois plus que le contenu passif : quiz, calculatrices et sondages contre ebook, PDF et article de blog",
  "/blog/img/quiz-functionofbeauty.webp":
    "Page d'accueil du questionnaire capillaire personnalisé de Function of Beauty, avec ses flacons roses",
  "/blog/img/quiz-theskill.webp":
    "Première question du quiz The Skill : choisir une intention parmi quatre propositions",
  "/blog/img/quiz-kerastase.webp":
    "Question du diagnostic capillaire Kérastase : classer ses trois principales préoccupations parmi quatorze",
  "/blog/img/schema-pubs-meta.webp":
    "Trois étapes pour nourrir ses pubs Meta avec les leads d'un quiz : les leads se taguent par profil, Meta en tire une audience similaire, le coût par lead est divisé",
  "/blog/img/quiz-buzzfeed1.webp":
    "Page des quiz populaires de BuzzFeed : une grille de vignettes, chacune avec son titre accrocheur",
  "/blog/img/16personalities-quiz.webp":
    "Page du test de personnalité gratuit 16Personalities et ses trois étapes : compléter le test, afficher les résultats, libérer son potentiel",

  // ── L'étude de cas de Jocelyne ──
  "/blog/img/mjaxntazmgewmtkwodgyywezytzimjvinmzknti3mjg0mge4owu.webp":
    "Portrait de Jocelyne Bacquet, orthophoniste, autrice du quiz sur les profils TDAH adulte",
  "/blog/img/quiz-jacqueline.webp":
    "Écran d'accueil du quiz Quel type de cerveau TDAH êtes-vous, de Jocelyne Bacquet",
  "/blog/img/svg-tunnel-jocelyne.svg":
    "Le tunnel de Jocelyne, étape par étape : audience ciblée, pub Meta à 7 € par jour, quiz Tiquiz de 5 questions et 5 profils, email automatique via Systeme.io, livre Amazon",
  "/blog/img/svg-tunnel-jocelyne-mobile-preview.webp":
    "Le tunnel de Jocelyne, étape par étape : audience ciblée, pub Meta à 7 € par jour, quiz Tiquiz de 5 questions et 5 profils, email automatique via Systeme.io, livre Amazon",
  "/blog/img/gwenn.webp":
    "Portrait de Gwenn, qui a accompagné Jocelyne sur les plans technique, stratégique et humain",
  "/blog/img/svg-gwenn-3-axes.svg":
    "Les trois axes de l'accompagnement de Gwenn : technique (pixel Meta, raccord Tiquiz vers Systeme.io), stratégique (lead magnet, hook publicitaire), humain (présence et vidéos explicatives)",
  "/blog/img/publicite-quiz.webp":
    "La publicité Meta de Jocelyne dans la bibliothèque publicitaire : le visuel du quiz TDAH, ses cinq profils et le bouton Découvrir mon profil",
  "/blog/img/svg-comment-lire-chiffres.svg":
    "Comment lire les chiffres de la campagne : 2,8 % de clics, 41,7 % de conversion du clic au lead, 0,18 € par lead, soit 285 lectrices qualifiées pour 63,50 € de budget",
  "/blog/img/svg-comment-lire-chiffres-mobile.svg":
    "Comment lire les chiffres de la campagne : 2,8 % de clics, 41,7 % de conversion du clic au lead, 0,18 € par lead, soit 285 lectrices qualifiées pour 63,50 € de budget",

  // ── Le quiz dans une vidéo ──
  "/blog/img/schema-popquiz-vs-classique.webp":
    "100 vues sur une vidéo classique donnent zéro contact ; avec un Popquiz, elles donnent 30 à 40 contacts triés par profil",
  "/blog/img/schema-marque-page-livre.webp":
    "Le Popquiz comparé à un marque-page glissé dans le livre d'un autre auteur : la vidéo reste la sienne, le quiz est à toi",
  "/blog/img/quiz-tiquiz.webp":
    "Écran Mes projets dans Tiquiz : chaque quiz avec ses vues, ses démarrages, ses complétions, ses leads et son taux de conversion",

  // ── Collecter des emails ──
  "/blog/img/schema-email-vs-social.webp":
    "Email contre réseaux sociaux : 36 € de retour pour 1 € investi contre 5 à 7 €, une audience qui t'appartient à 100 % et aucun algorithme entre toi et elle",

  // ── Stratégie de quiz marketing ──
  "/blog/img/theme-quiz.webp":
    "Quiz générique contre quiz qualifiant : Quel héros Marvel es-tu ne rapporte ni lead ni vente, quand Quelle offre devrais-tu lancer oriente chaque profil vers la bonne offre",

  // ── Les schemas redessines (1er septembre 2026) ──
  "/blog/img/schema-visiteur-evapore.webp":
    "Sur 1 000 visiteurs, un opt-in classique en capture 30 et laisse partir les 970 autres ; le même trafic avec un quiz donne 350 leads, soit 35 % de conversion",
  "/blog/img/schema-optin-vs-quiz.webp":
    "Opt-in classique avec ebook : 2 à 3 % de visiteurs capturés et 3 secondes d'engagement. Quiz interactif : 30 à 40 % capturés, 4 minutes d'engagement et segmentation en 4 profils",
  "/blog/img/schema-connexion-api.webp":
    "La connexion entre Tiquiz et Systeme.io en un copier-coller : la clé API se copie dans Systeme.io et se colle une seule fois dans Tiquiz",
  "/blog/img/schema-tags-creation.webp":
    "Un tag Systeme.io par profil de résultat, quiz-débutant, quiz-motivée, quiz-pragmatique et quiz-avancé, chacun déclenchant son propre workflow",
  "/blog/img/schema-ia-generation.webp":
    "Un brief en quatre lignes, objectif, audience, ton et CTA final, et l'IA rend un quiz complet avec ses questions et ses quatre profils de résultat",
  "/blog/img/schema-profil-tag.webp":
    "Les réponses du visiteur donnent 10 points, donc le profil Motivée, donc sa page de résultat et le tag quiz-motivee posé automatiquement dans Systeme.io",
  "/blog/img/schema-workflow-systeme-io.webp":
    "Le tag quiz-motivee déclenche un workflow Systeme.io : email de résultat, inscription à la formation, ajout à la communauté, campagne email et notification de l'équipe",
  "/blog/img/schema-partage-bonus.webp":
    "Le partage débloque le résultat : elle finit son quiz, partage pour voir la suite et recevoir le PDF cadeau, et sa story ramène d'autres leads",
  "/blog/img/schema-quiz-vs-formulaire.webp":
    "Un formulaire classique capte une fois ; un quiz interactif capte 2 à 3 fois plus, avec l'email, le profil et le besoin",
  "/blog/img/tiquiz-3-formats-1.webp":
    "Les trois formats de Tiquiz : le quiz qui qualifie et capte des leads, le sondage qui recueille les avis, et le pop quiz qui s'affiche pendant une vidéo",
  "/blog/img/tiquiz-fonctionnement-systeme-io-1.webp":
    "Du quiz à ta liste en quatre étapes : on répond, le profil devient un tag, le contact arrive tagué dans Systeme.io, le bon email part tout seul. Sans Zapier ni code",
  "/blog/img/tiquiz-quiz-vs-formulaire-1.webp":
    "Formulaire classique : intrusif, peu rempli, peu d'engagement. Quiz interactif : engage dès la première question, récupère 2 à 3 fois plus d'emails et qualifie le contact",
  "/blog/img/tiquiz-points-forts-limites-1.webp":
    "Ce qui marche : premier quiz en moins d'une heure, intégration Systeme.io fiable, l'IA rédige. Les limites : personnalisation visuelle basique, pas de logique conditionnelle poussée",
  "/blog/img/quizsystemeio.webp":
    "Sur 100 personnes qui commencent un quiz, 59 vont jusqu'à la dernière question et 45 laissent leur email ; ces 45 % se comptent sur celles qui ont cliqué démarrer",
  "/blog/img/titrequiztiquiz.webp":
    "Quatre modèles de titres de quiz : Quel type de coach es-tu, Qu'est-ce qui bloque vraiment tes ventes, Dans 6 mois où en sera ton business, Ton tunnel est-il prêt à convertir",
  "/blog/img/quizviraltiquiz.webp":
    "Un lead qui partage son quiz pour débloquer son résultat en ramène quatre à six autres, tous tagués automatiquement dans Systeme.io",
  "/blog/img/methode-capto-5-maillons.webp":
    "La méthode CAPTO en cinq maillons : Capter, Attirer et Profiler, dont le quiz se charge, puis Transformer et Optimiser, à monter soi-même",
  "/blog/img/transformer-3-gestes.webp":
    "Trois gestes pour vendre après le quiz : le premier email dans la minute, le profil dans l'objet, puis la séquence connaître, apprécier, confiance, achat",
};

/** Le texte alternatif d'une image, ou `null` si on n'en a pas écrit. */
export function altDe(src: unknown): string | null {
  const chemin = typeof src === "string" ? src.trim() : "";
  return ALT_IMAGES[chemin] ?? null;
}

/**
 * Pose le `alt` d'un bloc image.
 *
 * **LA TABLE GAGNE, et c'est une correction du 1er septembre 2026.**
 * Cette fonction disait "on n'écrase jamais un `alt` existant", et son
 * commentaire annonçait dans la même phrase que "les mauvais se
 * corrigent en les ajoutant à la table". Les deux ne pouvaient pas être
 * vrais en même temps : un `alt` importé de Systeme.io ("tiquiz avis",
 * "qui viral tiquiz") existe, donc il bloquait la correction, donc
 * l'ajouter à la table ne faisait rien. Le remède documenté ne
 * marchait pas, et personne ne pouvait le voir.
 *
 * La protection qui comptait vraiment reste : **une image ABSENTE de la
 * table garde le texte qu'elle a**. On ne perd donc aucun `alt`
 * correct venu de l'import ; on ne réécrit que ceux qu'on a
 * explicitement relus, image par image.
 */
export function poserAlt(bloc: { src?: unknown; alt?: unknown }): boolean {
  const texte = altDe(bloc.src);
  if (texte) {
    if (bloc.alt === texte) return false;
    bloc.alt = texte;
    return true;
  }
  return false;
}
