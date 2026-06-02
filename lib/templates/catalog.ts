// lib/templates/catalog.ts
//
// Catalogue des templates de quiz par métier (phase 5 ROADMAP_RETENTION.md).
//
// Béné (1er juin 2026) : "Soigne les templates, ne reste pas trop IA,
// utile / efficace / pertinent / simple." → Contenu écrit à la main,
// ton humain, tutoiement, options concrètes, résultats avec personnalité.
// Pas de remplissage générique type "Découvrez votre profil unique".
//
// Chaque template a 4 résultats. Chaque question a 4 options mappées
// 1:1 sur les 4 résultats (result_index 0..3) → scoring majoritaire.
//
// Ces objets calquent la shape du POST /api/quiz → instanciation sans
// aucun code d'INSERT custom.

import type { QuizTemplate } from "@/lib/templates/types";

export const TEMPLATE_CATALOG: QuizTemplate[] = [
  // ─────────────────────────────────────────────────────────────────
  // 1. Coach business / entrepreneuriat
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "profil-entrepreneur",
    metier: "Coach business",
    emoji: "🚀",
    cardTitle: "Quel entrepreneur es-tu vraiment ?",
    tagline: "Le quiz qui révèle le frein n°1 de tes prospects.",
    whoFor:
      "Coachs business, mentors et accompagnateurs d'entrepreneurs qui veulent qualifier leurs prospects avant le premier appel.",
    whyItWorks:
      "Tes prospects adorent se situer. En découvrant leur profil, ils se reconnaissent — et tu sais exactement quel message leur envoyer ensuite.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel entrepreneur es-tu vraiment ?",
      introduction:
        "En 6 questions, découvre ton profil d'entrepreneur et le levier qui va vraiment faire décoller ton activité. Pas de bla-bla, juste ce qui te ressemble.",
      cta_text: "Découvrir mon profil",
      share_message:
        "Je viens de découvrir mon profil d'entrepreneur 🚀 Et toi, tu es plutôt lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand tu as une nouvelle idée de business, ta première réaction c'est…",
          options: [
            { text: "J'ouvre un doc et je planifie tout, étape par étape", result_index: 0 },
            { text: "Je teste vite fait pour voir si ça mord", result_index: 1 },
            { text: "J'en parle autour de moi pour sentir les réactions", result_index: 2 },
            { text: "Je me lance, on verra bien en chemin", result_index: 3 },
          ],
        },
        {
          question_text: "Ce qui te bloque le plus en ce moment :",
          options: [
            { text: "J'ai un plan mais je n'arrive pas à passer à l'action", result_index: 0 },
            { text: "Je teste plein de trucs sans jamais finir", result_index: 1 },
            { text: "Je doute de ma légitimité à vendre", result_index: 2 },
            { text: "Je fais tout, tout le temps, et je m'épuise", result_index: 3 },
          ],
        },
        {
          question_text: "Ton rapport à l'argent dans ton business :",
          options: [
            { text: "Je veux des chiffres carrés avant de me lancer", result_index: 0 },
            { text: "Je préfère encaisser vite, quitte à ajuster après", result_index: 1 },
            { text: "J'ai du mal à fixer mes prix sans culpabiliser", result_index: 2 },
            { text: "Je réinvestis tout, parfois trop vite", result_index: 3 },
          ],
        },
        {
          question_text: "Quand un client te dit non, tu…",
          options: [
            { text: "Analyses ce qui a coincé pour corriger le process", result_index: 0 },
            { text: "Passes au suivant sans trop te poser de questions", result_index: 1 },
            { text: "Le prends un peu personnellement", result_index: 2 },
            { text: "Relances trois fois avec une nouvelle offre", result_index: 3 },
          ],
        },
        {
          question_text: "Ta journée idéale de travail :",
          options: [
            { text: "Structurée, avec mes blocs de temps et mes objectifs", result_index: 0 },
            { text: "Pleine d'imprévus et de nouvelles opportunités", result_index: 1 },
            { text: "Du temps pour créer et soigner la relation client", result_index: 2 },
            { text: "Intense, à fond, peu importe l'heure", result_index: 3 },
          ],
        },
        {
          question_text: "Dans 1 an, ta plus grande fierté ce serait :",
          options: [
            { text: "Avoir une machine qui tourne sans moi", result_index: 0 },
            { text: "Avoir validé plusieurs offres rentables", result_index: 1 },
            { text: "Avoir une communauté qui me fait confiance", result_index: 2 },
            { text: "Avoir doublé mon chiffre d'affaires", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Le Stratège",
          description:
            "Tu réfléchis avant d'agir et tu détestes l'improvisation. Ta force : tu construis des bases solides. Ton piège : tu peux rester bloqué en mode 'préparation' pendant des mois.",
          insight:
            "Ton plan est probablement déjà très bon. Ce qui te manque, ce n'est pas une meilleure stratégie — c'est une première action imparfaite, lancée cette semaine.",
          projection:
            "Imagine arrêter de peaufiner et publier ta première offre dans les 7 jours. C'est exactement le déclic qu'on travaille ensemble.",
          cta_text: "Passer à l'action avec moi",
        },
        {
          title: "L'Expérimentateur",
          description:
            "Tu testes vite, tu apprends vite. Ta force : tu n'as pas peur de te lancer. Ton piège : tu commences dix choses et tu en finis une.",
          insight:
            "Ton énergie est ton meilleur atout — mais sans focus, elle se disperse. Le vrai levier pour toi : choisir UNE offre et la pousser jusqu'au bout.",
          projection:
            "Imagine concentrer toute ton énergie sur un seul projet rentable au lieu de cinq à moitié faits. C'est là qu'on débloque ton chiffre.",
          cta_text: "Trouver mon focus",
        },
        {
          title: "Le Relationnel",
          description:
            "Tu places l'humain avant tout. Ta force : tes clients t'adorent et te recommandent. Ton piège : tu doutes de ta valeur et tu sous-factures.",
          insight:
            "Ta légitimité n'est pas un problème de compétence — c'est un problème de posture. Tes résultats clients parlent déjà pour toi.",
          projection:
            "Imagine vendre tes accompagnements au juste prix, sans cette petite boule au ventre. C'est le premier chantier qu'on attaque.",
          cta_text: "Assumer ma valeur",
        },
        {
          title: "Le Fonceur",
          description:
            "Tu avances à 200 à l'heure. Ta force : tu obtiens des résultats que les autres n'osent même pas viser. Ton piège : tu confonds vitesse et précipitation, et tu frôles le burn-out.",
          insight:
            "Tu n'as pas besoin de travailler plus — tu as besoin de travailler sur les bons leviers. Ton énergie mérite d'être canalisée, pas grillée.",
          projection:
            "Imagine garder ton rythme mais avec un cap clair, sans t'éparpiller ni t'épuiser. C'est ce qu'on construit ensemble.",
          cta_text: "Canaliser mon énergie",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. Coach développement personnel
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "moteur-interieur",
    metier: "Coach de vie",
    emoji: "🧭",
    cardTitle: "Quel est ton moteur intérieur ?",
    tagline: "Aide tes prospects à comprendre ce qui les fait avancer.",
    whoFor:
      "Coachs de vie, en développement personnel ou en transition professionnelle qui veulent créer un premier point de contact bienveillant.",
    whyItWorks:
      "Les gens cherchent à se comprendre. Un quiz introspectif crée un moment de prise de conscience — et c'est exactement à ce moment qu'ils ont envie d'être accompagnés.",
    estimatedMinutes: 3,
    payload: {
      title: "Quel est ton moteur intérieur ?",
      introduction:
        "On avance tous pour une raison différente. En quelques questions, découvre ce qui te met vraiment en mouvement — et ce qui te freine sans que tu t'en rendes compte.",
      cta_text: "Découvrir mon moteur",
      share_message:
        "Je viens de découvrir mon moteur intérieur 🧭 Ça m'a fait réfléchir. Et toi ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Le matin, ce qui te fait sortir du lit, c'est surtout :",
          options: [
            { text: "Cocher des choses sur ma liste et avancer", result_index: 0 },
            { text: "Le sentiment d'être utile à quelqu'un", result_index: 1 },
            { text: "La curiosité, apprendre un truc nouveau", result_index: 2 },
            { text: "La liberté de faire ce que je veux de ma journée", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu prends une décision importante, tu écoutes surtout :",
          options: [
            { text: "Ce qui est logique et efficace", result_index: 0 },
            { text: "Ce que ressentent les gens autour de moi", result_index: 1 },
            { text: "Mon intuition et mes valeurs profondes", result_index: 2 },
            { text: "Mon envie du moment, sans trop me justifier", result_index: 3 },
          ],
        },
        {
          question_text: "Ce qui t'épuise le plus :",
          options: [
            { text: "L'inefficacité et le temps perdu", result_index: 0 },
            { text: "Les conflits et les tensions", result_index: 1 },
            { text: "La routine et l'absence de sens", result_index: 2 },
            { text: "Les contraintes et les cases à remplir", result_index: 3 },
          ],
        },
        {
          question_text: "Tu te sens vraiment toi-même quand :",
          options: [
            { text: "Je termine un projet et je vois le résultat", result_index: 0 },
            { text: "J'aide quelqu'un à aller mieux", result_index: 1 },
            { text: "Je comprends quelque chose qui m'échappait", result_index: 2 },
            { text: "Je suis libre, sans personne sur mon dos", result_index: 3 },
          ],
        },
        {
          question_text: "Ta petite phrase intérieure quand ça va pas :",
          options: [
            { text: "\"Je dois faire mieux, plus, plus vite\"", result_index: 0 },
            { text: "\"Est-ce que les autres vont bien ?\"", result_index: 1 },
            { text: "\"Qu'est-ce que tout ça veut dire ?\"", result_index: 2 },
            { text: "\"J'étouffe, j'ai besoin d'air\"", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Le moteur de l'Accomplissement",
          description:
            "Tu avances pour construire, finir, réussir. C'est une force immense. Mais quand elle s'emballe, tu peux oublier de t'arrêter et de savourer.",
          insight:
            "Et si ta valeur ne dépendait pas de ta prochaine réussite ? C'est souvent la question qui change tout pour les profils comme toi.",
          projection:
            "Imagine garder ton ambition tout en te sentant déjà 'assez'. C'est un équilibre qui se travaille, et c'est possible.",
          cta_text: "En parler avec moi",
        },
        {
          title: "Le moteur du Lien",
          description:
            "Tu avances par et pour les autres. Ton empathie est un cadeau. Mais à force de prendre soin de tout le monde, tu t'oublies souvent toi.",
          insight:
            "Prendre soin de toi n'est pas de l'égoïsme — c'est ce qui te permet de continuer à donner sans te vider.",
          projection:
            "Imagine poser des limites sans culpabiliser, et te sentir enfin légitime à recevoir aussi. On peut y arriver ensemble.",
          cta_text: "Apprendre à me recentrer",
        },
        {
          title: "Le moteur du Sens",
          description:
            "Tu as besoin que les choses aient une raison d'être. C'est ce qui te rend profond et aligné. Mais la quête de sens peut aussi te paralyser.",
          insight:
            "Le sens ne se trouve pas seulement en réfléchissant — il se construit aussi en agissant. Parfois, il faut avancer pour y voir clair.",
          projection:
            "Imagine arrêter de tout questionner et te sentir enfin à ta place, dans une voie qui te ressemble vraiment.",
          cta_text: "Clarifier ma direction",
        },
        {
          title: "Le moteur de la Liberté",
          description:
            "Tu as besoin d'espace pour respirer. Ton indépendance est précieuse. Mais la peur d'être enfermé peut t'empêcher de t'engager pleinement.",
          insight:
            "La vraie liberté, ce n'est pas l'absence de cadre — c'est de choisir le tien. Et ça change tout dans la façon dont tu construis ta vie.",
          projection:
            "Imagine t'engager dans un projet ou une relation sans avoir l'impression de perdre ta liberté. C'est exactement ce qu'on explore.",
          cta_text: "Trouver mon équilibre",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 3. Prof de yoga
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "style-yoga",
    metier: "Prof de yoga",
    emoji: "🧘",
    cardTitle: "Quel style de yoga est fait pour toi ?",
    tagline: "Oriente tes futurs élèves vers le bon cours.",
    whoFor:
      "Profs de yoga, studios et professeurs de bien-être qui veulent attirer des élèves alignés avec leur pratique.",
    whyItWorks:
      "Un débutant ne sait jamais quel yoga choisir. Tu lèves son hésitation, tu le rassures — et il s'inscrit naturellement à TON cours.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel style de yoga est fait pour toi ?",
      introduction:
        "Vinyasa, Yin, Hatha, Ashtanga… On s'y perd vite. En quelques questions, trouve le style de yoga qui correspond vraiment à ton corps et à ton énergie du moment.",
      cta_text: "Découvrir mon style",
      share_message:
        "J'ai trouvé le style de yoga fait pour moi 🧘 Et toi, tu pratiques lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Pourquoi tu veux te (re)mettre au yoga ?",
          options: [
            { text: "Évacuer le stress et me poser", result_index: 0 },
            { text: "Me renforcer et transpirer un peu", result_index: 1 },
            { text: "Gagner en souplesse en douceur", result_index: 2 },
            { text: "Me dépasser et me discipliner", result_index: 3 },
          ],
        },
        {
          question_text: "Ton niveau d'énergie en général :",
          options: [
            { text: "Souvent à plat, j'ai besoin de calme", result_index: 0 },
            { text: "Dynamique, j'aime bouger", result_index: 1 },
            { text: "Variable, je cherche l'équilibre", result_index: 2 },
            { text: "Débordante, il m'en faut beaucoup", result_index: 3 },
          ],
        },
        {
          question_text: "Une séance réussie, pour toi, c'est :",
          options: [
            { text: "Je ressors apaisé·e, l'esprit clair", result_index: 0 },
            { text: "J'ai bien transpiré et je me sens vivant·e", result_index: 1 },
            { text: "Mon corps est détendu et plus souple", result_index: 2 },
            { text: "J'ai repoussé mes limites", result_index: 3 },
          ],
        },
        {
          question_text: "Face à une posture difficile, tu :",
          options: [
            { text: "Respires et acceptes là où j'en suis", result_index: 0 },
            { text: "Cherches à la tenir avec force", result_index: 1 },
            { text: "Y vas progressivement, sans forcer", result_index: 2 },
            { text: "Recommences jusqu'à y arriver", result_index: 3 },
          ],
        },
        {
          question_text: "Ton rapport au corps en ce moment :",
          options: [
            { text: "J'ai besoin de relâcher les tensions", result_index: 0 },
            { text: "J'ai envie de me sentir fort·e", result_index: 1 },
            { text: "Je me sens raide, je veux m'assouplir", result_index: 2 },
            { text: "Je veux un vrai défi physique", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Le Yin Yoga est fait pour toi",
          description:
            "Tu as besoin de ralentir. Le Yin, avec ses postures tenues longtemps et au sol, va t'apprendre à lâcher prise et à relâcher les tensions profondes.",
          insight:
            "Ton corps réclame du repos actif, pas plus de performance. Le Yin est exactement ce terrain de douceur dont tu as besoin.",
          projection:
            "Imagine finir ta semaine apaisé·e, le mental enfin calme. Mon cours de Yin est pensé pour ça.",
          cta_text: "Voir mes cours de Yin",
        },
        {
          title: "Le Vinyasa est fait pour toi",
          description:
            "Tu aimes le mouvement et l'énergie. Le Vinyasa enchaîne les postures au rythme de ta respiration : dynamique, fluide, jamais ennuyeux.",
          insight:
            "Tu as besoin de bouger pour te sentir bien. Le Vinyasa va canaliser ton énergie tout en te renforçant en profondeur.",
          projection:
            "Imagine une pratique qui te défoule autant qu'elle t'apaise. C'est exactement ce que je propose dans mes flows.",
          cta_text: "Voir mes cours de Vinyasa",
        },
        {
          title: "Le Hatha est fait pour toi",
          description:
            "Tu cherches l'équilibre. Le Hatha, plus lent, te laisse le temps d'installer chaque posture et de gagner en souplesse sans jamais te brusquer.",
          insight:
            "Le bon yoga pour toi n'est ni trop mou ni trop intense. Le Hatha te donne ce cadre progressif et rassurant pour avancer à ton rythme.",
          projection:
            "Imagine un corps plus souple et un mental plus stable, semaine après semaine. Mes cours de Hatha sont parfaits pour démarrer.",
          cta_text: "Voir mes cours de Hatha",
        },
        {
          title: "L'Ashtanga est fait pour toi",
          description:
            "Tu aimes te dépasser. L'Ashtanga, exigeant et structuré, va nourrir ton besoin de discipline et de défi physique avec une vraie progression.",
          insight:
            "Tu as besoin d'un cadre ambitieux pour t'épanouir. L'Ashtanga te donnera ce challenge et cette rigueur qui te font vibrer.",
          projection:
            "Imagine maîtriser des postures que tu pensais inaccessibles. Mon accompagnement Ashtanga est fait pour les déterminé·es comme toi.",
          cta_text: "Voir mes cours d'Ashtanga",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 4. Naturopathe
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "terrain-naturo",
    metier: "Naturopathe",
    emoji: "🌿",
    cardTitle: "Quel est ton terrain naturo ?",
    tagline: "Un bilan express qui donne envie d'aller plus loin.",
    whoFor:
      "Naturopathes, praticiens en santé naturelle et nutrithérapeutes qui veulent un premier diagnostic engageant.",
    whyItWorks:
      "Les gens veulent comprendre leur corps. Ce mini-bilan leur donne une piste concrète — et la suite logique, c'est une consultation avec toi.",
    estimatedMinutes: 3,
    payload: {
      title: "Quel est ton terrain naturo ?",
      introduction:
        "En naturopathie, tout part du terrain. En quelques questions, identifie le tien et la première chose à rééquilibrer pour retrouver ton énergie. (Ce quiz ne remplace pas une consultation.)",
      cta_text: "Découvrir mon terrain",
      share_message:
        "J'ai découvert mon terrain naturo 🌿 Intéressant ! Et toi, tu es plutôt lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "En fin de journée, tu te sens plutôt :",
          options: [
            { text: "Vidé·e, comme une pile à plat", result_index: 0 },
            { text: "Tendu·e, l'esprit qui tourne", result_index: 1 },
            { text: "Ballonné·e, digestion difficile", result_index: 2 },
            { text: "Patraque, sensible au moindre virus", result_index: 3 },
          ],
        },
        {
          question_text: "Ton sommeil ressemble à :",
          options: [
            { text: "Je dors mais je ne récupère jamais vraiment", result_index: 0 },
            { text: "J'ai du mal à m'endormir, je rumine", result_index: 1 },
            { text: "Je me réveille la nuit, souvent vers 3h", result_index: 2 },
            { text: "Je dors beaucoup mais je suis quand même fatigué·e", result_index: 3 },
          ],
        },
        {
          question_text: "Côté alimentation, ton péché mignon :",
          options: [
            { text: "Le café pour tenir, beaucoup de café", result_index: 0 },
            { text: "Le sucre quand je suis stressé·e", result_index: 1 },
            { text: "Les repas vite avalés sur le pouce", result_index: 2 },
            { text: "Je grignote sans vraie faim", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu es fatigué·e, ton corps te le dit par :",
          options: [
            { text: "Un coup de mou général, plus d'élan", result_index: 0 },
            { text: "Des tensions, mâchoire ou nuque serrées", result_index: 1 },
            { text: "Des soucis digestifs", result_index: 2 },
            { text: "Des petits bobos à répétition", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu cherches en priorité :",
          options: [
            { text: "Retrouver de l'énergie durable", result_index: 0 },
            { text: "Apaiser mon stress et mon mental", result_index: 1 },
            { text: "Une digestion légère et apaisée", result_index: 2 },
            { text: "Renforcer mes défenses naturelles", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Terrain Énergie à recharger",
          description:
            "Ton corps tourne en réserve. Tu compenses avec des stimulants, mais le fond de batterie reste bas. Bonne nouvelle : c'est très réversible.",
          insight:
            "Le café ne crée pas d'énergie, il l'emprunte à demain. Ton premier levier, c'est de reconstruire de vraies réserves — pas d'en tirer toujours plus.",
          projection:
            "Imagine te réveiller reposé·e et tenir la journée sans coup de barre. C'est le premier objectif qu'on fixerait ensemble.",
          cta_text: "Faire mon bilan vitalité",
        },
        {
          title: "Terrain Stress à apaiser",
          description:
            "Ton système nerveux est en hypervigilance. Mental qui tourne, tensions, sommeil difficile : ton corps a besoin qu'on lui réapprenne à relâcher.",
          insight:
            "Ton stress n'est pas 'dans ta tête' — il s'inscrit dans ton corps. Et c'est par le corps, autant que par le mental, qu'on le dénoue.",
          projection:
            "Imagine retrouver un mental calme et un sommeil qui répare vraiment. C'est tout à fait atteignable avec le bon accompagnement.",
          cta_text: "Apaiser mon terrain",
        },
        {
          title: "Terrain Digestion à rééquilibrer",
          description:
            "Ta digestion est ton point sensible. Ballonnements, repas trop rapides, réveils nocturnes : ton système digestif te lance des signaux.",
          insight:
            "On dit que la santé commence dans l'intestin — et dans ton cas, c'est clairement la porte d'entrée pour retrouver de l'aisance au quotidien.",
          projection:
            "Imagine des repas qui te font du bien, un ventre léger et plus d'énergie. C'est par là qu'on commencerait ton rééquilibrage.",
          cta_text: "Rééquilibrer ma digestion",
        },
        {
          title: "Terrain Immunité à renforcer",
          description:
            "Tu attrapes tout ce qui passe et tu mets du temps à récupérer. Tes défenses naturelles ont besoin d'un coup de pouce de fond.",
          insight:
            "Une immunité solide ne se construit pas en avalant des vitamines au hasard — elle se cultive avec un terrain global équilibré.",
          projection:
            "Imagine passer un hiver sans enchaîner les rhumes, avec un corps qui se défend tout seul. C'est l'objectif d'un accompagnement sur-mesure.",
          cta_text: "Renforcer mon terrain",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 5. Formateur en ligne (readiness)
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "pret-a-lancer-formation",
    metier: "Formateur en ligne",
    emoji: "🎓",
    cardTitle: "Es-tu prêt à lancer ta formation ?",
    tagline: "Le quiz qui qualifie tes prospects formateurs.",
    whoFor:
      "Formateurs, infopreneurs et coachs qui aident d'autres à créer et vendre leur formation en ligne.",
    whyItWorks:
      "Ton prospect hésite à se lancer. Tu lui montres précisément où il en est et ce qui lui manque — et ton offre devient la suite évidente.",
    estimatedMinutes: 2,
    payload: {
      title: "Es-tu prêt à lancer ta formation en ligne ?",
      introduction:
        "Créer une formation qui se vend, ce n'est pas qu'une question de savoir. En 6 questions, situe-toi honnêtement et découvre ta prochaine étape concrète.",
      cta_text: "Évaluer où j'en suis",
      share_message:
        "Je viens de tester si je suis prêt à lancer ma formation 🎓 Verdict surprenant !",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Ton sujet de formation, aujourd'hui :",
          options: [
            { text: "Je n'ai qu'une vague idée", result_index: 0 },
            { text: "J'ai un thème mais c'est encore flou", result_index: 1 },
            { text: "C'est clair et précis", result_index: 2 },
            { text: "C'est clair ET les gens m'en parlent déjà", result_index: 3 },
          ],
        },
        {
          question_text: "Ton audience :",
          options: [
            { text: "Je n'en ai pas encore", result_index: 0 },
            { text: "Quelques abonnés, ça démarre", result_index: 1 },
            { text: "Une communauté qui m'écoute", result_index: 2 },
            { text: "Des gens qui me demandent déjà de les former", result_index: 3 },
          ],
        },
        {
          question_text: "As-tu déjà vendu quelque chose en ligne ?",
          options: [
            { text: "Jamais", result_index: 0 },
            { text: "Un petit truc, une fois", result_index: 1 },
            { text: "Oui, régulièrement", result_index: 2 },
            { text: "Oui, et je veux passer à l'échelle", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu penses à enregistrer tes modules :",
          options: [
            { text: "Ça me paralyse complètement", result_index: 0 },
            { text: "Je ne sais pas par où commencer", result_index: 1 },
            { text: "Je sais faire, c'est une question de temps", result_index: 2 },
            { text: "J'en ai déjà enregistré", result_index: 3 },
          ],
        },
        {
          question_text: "Ton vrai blocage en ce moment :",
          options: [
            { text: "Je ne me sens pas légitime", result_index: 0 },
            { text: "Je m'éparpille, je ne structure pas", result_index: 1 },
            { text: "Je manque de méthode pour vendre", result_index: 2 },
            { text: "Je veux optimiser et vendre plus", result_index: 3 },
          ],
        },
        {
          question_text: "Si tu lançais demain, ta réaction :",
          options: [
            { text: "Panique totale, je ne suis pas prêt·e", result_index: 0 },
            { text: "Stressé·e mais curieux·se", result_index: 1 },
            { text: "Plutôt confiant·e", result_index: 2 },
            { text: "Impatient·e d'y être", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Tu es en phase d'idée",
          description:
            "Tu as l'envie, c'est le plus important. Mais il te manque encore les fondations : un sujet précis, une audience, et la confiance de te lancer.",
          insight:
            "La bonne nouvelle : tu n'as pas besoin d'être un expert reconnu pour former. Tu dois juste avoir un cran d'avance sur ceux que tu veux aider.",
          projection:
            "Imagine transformer cette idée floue en un plan clair en quelques semaines. C'est exactement le point de départ qu'on travaille ensemble.",
          cta_text: "Poser mes fondations",
        },
        {
          title: "Tu es en phase de structuration",
          description:
            "Ton idée prend forme et ton audience démarre. Ce qui te manque, c'est de la méthode pour ne pas t'éparpiller et avancer dans le bon ordre.",
          insight:
            "Ton problème n'est pas le manque d'idées — c'est l'absence de cadre. Une bonne structure te ferait gagner des mois.",
          projection:
            "Imagine un plan d'action clair, étape par étape, sans te disperser. C'est ce qu'on met en place dès le début.",
          cta_text: "Structurer mon projet",
        },
        {
          title: "Tu es prêt à lancer",
          description:
            "Tu as le sujet, l'audience et l'expérience. Il te manque surtout une vraie méthode de lancement pour vendre sans te brader.",
          insight:
            "À ton stade, la différence entre un flop et un succès, ce n'est pas le contenu — c'est la stratégie de vente. Et ça s'apprend.",
          projection:
            "Imagine ton premier lancement qui cartonne au lieu de partir dans le vide. C'est précisément ce que je t'aide à orchestrer.",
          cta_text: "Réussir mon lancement",
        },
        {
          title: "Tu es prêt à passer à l'échelle",
          description:
            "Tu vends déjà et tu veux aller plus loin. Ton enjeu n'est plus de te lancer mais d'optimiser, automatiser et vendre plus, sans plus de temps.",
          insight:
            "Le plafond de verre à ton niveau, c'est souvent le 'tout faire soi-même'. La croissance passe par des systèmes, pas par plus d'heures.",
          projection:
            "Imagine doubler tes ventes sans doubler ton temps de travail. C'est le chantier qu'on attaque pour les profils comme toi.",
          cta_text: "Passer à l'échelle",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 6. Consultant marketing
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "levier-croissance-marketing",
    metier: "Consultant marketing",
    emoji: "📈",
    cardTitle: "Quel levier va débloquer ta croissance ?",
    tagline: "Diagnostique le frein marketing de tes prospects.",
    whoFor:
      "Consultants marketing, growth et agences qui veulent qualifier des prospects business avant un audit.",
    whyItWorks:
      "Un dirigeant qui découvre SON levier prioritaire a immédiatement envie d'en savoir plus. Tu deviens l'expert qui a mis le doigt sur le bon problème.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel levier va débloquer ta croissance ?",
      introduction:
        "Quand la croissance stagne, c'est rarement par manque de travail — c'est qu'on pousse le mauvais levier. En 6 questions, identifie le tien.",
      cta_text: "Trouver mon levier",
      share_message:
        "J'ai identifié le levier qui bloque ma croissance 📈 Ça remet les idées en place !",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Ton plus gros problème en ce moment :",
          options: [
            { text: "Pas assez de visiteurs / de trafic", result_index: 0 },
            { text: "Du trafic mais peu de prospects", result_index: 1 },
            { text: "Des prospects mais peu de ventes", result_index: 2 },
            { text: "Des ventes mais des clients qui partent vite", result_index: 3 },
          ],
        },
        {
          question_text: "Quand quelqu'un découvre ton offre, en général :",
          options: [
            { text: "Personne ne la découvre, justement", result_index: 0 },
            { text: "Il regarde et repart sans laisser ses coordonnées", result_index: 1 },
            { text: "Il s'intéresse mais n'achète pas", result_index: 2 },
            { text: "Il achète une fois et ne revient pas", result_index: 3 },
          ],
        },
        {
          question_text: "Sur quoi tu passes le plus de temps :",
          options: [
            { text: "À chercher comment me faire connaître", result_index: 0 },
            { text: "À créer du contenu qui ne convertit pas", result_index: 1 },
            { text: "À relancer des prospects tièdes", result_index: 2 },
            { text: "À aller chercher sans cesse de nouveaux clients", result_index: 3 },
          ],
        },
        {
          question_text: "Tes chiffres, tu les connais comment ?",
          options: [
            { text: "Je ne mesure quasiment rien", result_index: 0 },
            { text: "Je connais mon trafic mais pas mes conversions", result_index: 1 },
            { text: "Je connais mon taux de conversion, il est faible", result_index: 2 },
            { text: "Je connais tout sauf ma rétention", result_index: 3 },
          ],
        },
        {
          question_text: "Si tu avais une baguette magique, tu voudrais :",
          options: [
            { text: "Être vu·e par beaucoup plus de monde", result_index: 0 },
            { text: "Transformer mes visiteurs en contacts", result_index: 1 },
            { text: "Convaincre mes prospects d'acheter", result_index: 2 },
            { text: "Garder mes clients plus longtemps", result_index: 3 },
          ],
        },
        {
          question_text: "Ton budget marketing, tu le ressens comme :",
          options: [
            { text: "Un trou noir, je ne sais pas si ça marche", result_index: 0 },
            { text: "Mal utilisé, je touche les mauvaises personnes", result_index: 1 },
            { text: "Du potentiel gâché au dernier moment", result_index: 2 },
            { text: "Rentable à l'acquisition mais pas sur la durée", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Ton levier : la Visibilité",
          description:
            "Ton offre est peut-être excellente, mais trop peu de gens la voient. Tout en aval est bridé tant que le haut de l'entonnoir est étroit.",
          insight:
            "Inutile d'optimiser une page que personne ne visite. Ta priorité absolue, c'est de générer un flux de trafic qualifié et régulier.",
          projection:
            "Imagine multiplier tes visiteurs qualifiés par 3 en 90 jours. C'est le premier levier qu'on actionnerait dans un audit.",
          cta_text: "Auditer ma visibilité",
        },
        {
          title: "Ton levier : la Conversion en leads",
          description:
            "Tu as du trafic, mais il s'évapore. Tes visiteurs repartent sans laisser de trace : tu paies pour de l'attention que tu ne captures pas.",
          insight:
            "Chaque visiteur qui part sans laisser son email, c'est de l'argent jeté. Un bon mécanisme de capture change radicalement ta rentabilité.",
          projection:
            "Imagine transformer ne serait-ce que 5 % de plus de tes visiteurs en contacts. L'impact sur ton chiffre est immédiat.",
          cta_text: "Optimiser ma capture",
        },
        {
          title: "Ton levier : la Conversion en ventes",
          description:
            "Tu attires et tu captures, mais ça coince au moment d'acheter. Le problème est souvent dans l'offre, le message ou le tunnel de vente.",
          insight:
            "Quand les prospects s'intéressent sans acheter, ce n'est pas un problème de produit — c'est un problème de désir et de confiance.",
          projection:
            "Imagine doubler ton taux de conversion sans une seule visite de plus. C'est souvent le levier le plus rentable et le plus rapide.",
          cta_text: "Booster mes ventes",
        },
        {
          title: "Ton levier : la Rétention",
          description:
            "Tu sais vendre, mais tes clients ne reviennent pas. Or acquérir coûte cher : c'est en les gardant que tu construis une vraie rentabilité.",
          insight:
            "Augmenter ta rétention de quelques points peut faire plus pour ton chiffre que doubler ton acquisition — et coûte bien moins cher.",
          projection:
            "Imagine des clients qui rachètent et te recommandent, au lieu de repartir après un seul achat. C'est là qu'on va chercher ta croissance durable.",
          cta_text: "Fidéliser mes clients",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 7. Photographe
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "style-photo",
    metier: "Photographe",
    emoji: "📸",
    cardTitle: "Quel style photo te ressemble ?",
    tagline: "Attire les clients qui aiment vraiment ton univers.",
    whoFor:
      "Photographes (mariage, portrait, famille, branding) qui veulent attirer des clients alignés avec leur esthétique.",
    whyItWorks:
      "Un futur client veut des photos qui lui ressemblent. En l'aidant à nommer son style, tu attires exactement les bonnes personnes — celles qui aimeront ton travail.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel style photo te ressemble ?",
      introduction:
        "Tu veux de belles images, mais lesquelles te ressemblent vraiment ? En quelques questions, découvre le style photo qui raconte le mieux ton histoire.",
      cta_text: "Découvrir mon style",
      share_message:
        "J'ai trouvé le style photo qui me ressemble 📸 Et toi, tu serais plutôt lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand tu regardes une photo que tu adores, c'est souvent :",
          options: [
            { text: "Une scène spontanée, pleine d'émotion vraie", result_index: 0 },
            { text: "Une image épurée, lumineuse, intemporelle", result_index: 1 },
            { text: "Une photo audacieuse, avec du caractère", result_index: 2 },
            { text: "Un portrait soigné, élégant, posé", result_index: 3 },
          ],
        },
        {
          question_text: "Devant l'objectif, tu te sens :",
          options: [
            { text: "Plus à l'aise si on me fait oublier l'appareil", result_index: 0 },
            { text: "Bien dans une ambiance douce et naturelle", result_index: 1 },
            { text: "Prêt·e à oser des trucs originaux", result_index: 2 },
            { text: "Rassuré·e si on me guide pour bien poser", result_index: 3 },
          ],
        },
        {
          question_text: "Les couleurs qui te parlent :",
          options: [
            { text: "Chaudes et vivantes, comme un souvenir", result_index: 0 },
            { text: "Claires et pastel, très douces", result_index: 1 },
            { text: "Contrastées, franches, qui claquent", result_index: 2 },
            { text: "Sobres et élégantes, presque intemporelles", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu veux que tes photos racontent :",
          options: [
            { text: "Un moment vrai, tel qu'il a été vécu", result_index: 0 },
            { text: "Une atmosphère paisible et lumineuse", result_index: 1 },
            { text: "Ma personnalité, sans filtre", result_index: 2 },
            { text: "Une image soignée dont je serai fier·e longtemps", result_index: 3 },
          ],
        },
        {
          question_text: "Le lieu idéal pour ta séance :",
          options: [
            { text: "Chez moi ou dehors, dans la vraie vie", result_index: 0 },
            { text: "En pleine nature, à la lumière du matin", result_index: 1 },
            { text: "Un endroit urbain avec du style", result_index: 2 },
            { text: "Un studio ou un lieu choisi avec soin", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Style Reportage / Lifestyle",
          description:
            "Tu aimes le vrai, le vécu, l'émotion qui ne se commande pas. Les photos posées te laissent froid·e : ce que tu veux, ce sont des instants capturés sur le vif.",
          insight:
            "Les images qui te touchent le plus sont celles qu'on n'a pas 'fabriquées'. C'est tout l'art du reportage : être là au bon moment, discrètement.",
          projection:
            "Imagine des photos où tu te reconnais vraiment, sans pose forcée. C'est exactement ma façon de travailler.",
          cta_text: "Voir mon travail",
        },
        {
          title: "Style Naturel / Lumineux",
          description:
            "Tu es attiré·e par la douceur, la lumière naturelle et les ambiances apaisantes. Tu veux des images qui respirent et qui ne se démodent pas.",
          insight:
            "Ton œil cherche la sérénité. La lumière naturelle et les tons doux, c'est ce qui rend une photo intemporelle — et c'est ma signature.",
          projection:
            "Imagine des images douces et lumineuses que tu aimeras encore dans 20 ans. C'est ce que je crée pour mes clients.",
          cta_text: "Voir mon univers",
        },
        {
          title: "Style Créatif / Audacieux",
          description:
            "Tu n'aimes pas faire comme tout le monde. Tu veux des images qui ont du caractère, qui osent, qui te ressemblent vraiment dans ce que tu as d'unique.",
          insight:
            "Les photos classiques t'ennuient. Tu as besoin d'un photographe qui prend des risques créatifs — et ça, c'est exactement mon terrain de jeu.",
          projection:
            "Imagine des photos dont tout le monde te parle parce qu'elles sortent du lot. C'est ce que j'adore créer.",
          cta_text: "Voir mes créations",
        },
        {
          title: "Style Élégant / Intemporel",
          description:
            "Tu recherches le raffinement et la justesse. Tu veux des portraits soignés, élégants, dont tu seras fier·e longtemps — rien de criard, tout dans la classe.",
          insight:
            "Pour toi, une belle photo est une photo maîtrisée. La lumière, la pose, le cadre : chaque détail compte, et c'est précisément mon exigence.",
          projection:
            "Imagine des portraits dignes d'un magazine, qui traverseront le temps avec élégance. C'est ce que je m'engage à te offrir.",
          cta_text: "Réserver ma séance",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 8. Agent immobilier (readiness acheteur)
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "pret-premier-achat-immo",
    metier: "Immobilier",
    emoji: "🏡",
    cardTitle: "Es-tu prêt à acheter ton premier bien ?",
    tagline: "Capte les futurs acheteurs au bon moment.",
    whoFor:
      "Agents immobiliers, courtiers et conseillers qui veulent capter des primo-accédants en amont de leur projet.",
    whyItWorks:
      "Un futur acheteur a mille questions et peu de réponses. Tu le rassures, tu le situes — et tu deviens le pro vers qui il se tourne naturellement.",
    estimatedMinutes: 2,
    payload: {
      title: "Es-tu prêt à acheter ton premier bien ?",
      introduction:
        "Acheter, c'est excitant… et un peu flippant. En 6 questions, découvre où tu en es vraiment dans ton projet, et la prochaine étape pour avancer sereinement.",
      cta_text: "Évaluer mon projet",
      share_message:
        "Je viens de tester si je suis prêt à acheter mon premier bien 🏡 Verdict !",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Ton projet d'achat, aujourd'hui :",
          options: [
            { text: "C'est un rêve flou, sans date", result_index: 0 },
            { text: "J'y pense sérieusement depuis peu", result_index: 1 },
            { text: "Je suis activement en recherche", result_index: 2 },
            { text: "Je veux passer à l'action très vite", result_index: 3 },
          ],
        },
        {
          question_text: "Ton apport personnel :",
          options: [
            { text: "Je n'ai rien mis de côté pour l'instant", result_index: 0 },
            { text: "Je commence à épargner", result_index: 1 },
            { text: "J'ai un apport correct", result_index: 2 },
            { text: "Mon apport est prêt", result_index: 3 },
          ],
        },
        {
          question_text: "Ta capacité d'emprunt, tu la connais :",
          options: [
            { text: "Pas du tout", result_index: 0 },
            { text: "Vaguement, j'ai fait une simulation en ligne", result_index: 1 },
            { text: "Assez bien", result_index: 2 },
            { text: "Précisément, j'ai vu un courtier", result_index: 3 },
          ],
        },
        {
          question_text: "Tu sais quel type de bien tu cherches ?",
          options: [
            { text: "Aucune idée encore", result_index: 0 },
            { text: "J'ai quelques critères en tête", result_index: 1 },
            { text: "Oui, c'est assez clair", result_index: 2 },
            { text: "Oui, et je visite déjà", result_index: 3 },
          ],
        },
        {
          question_text: "Ce qui te fait le plus peur :",
          options: [
            { text: "Tout, je ne sais pas par où commencer", result_index: 0 },
            { text: "Me tromper et le regretter", result_index: 1 },
            { text: "Ne pas trouver le bon bien au bon prix", result_index: 2 },
            { text: "Passer à côté d'une opportunité", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu imagines signer chez le notaire :",
          options: [
            { text: "Ça me paraît très loin", result_index: 0 },
            { text: "Ça me stresse autant que ça m'excite", result_index: 1 },
            { text: "Je m'y vois dans les prochains mois", result_index: 2 },
            { text: "J'ai hâte, le plus tôt sera le mieux", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Tu es en phase de rêve",
          description:
            "Ton projet est encore une envie, pas un plan. Et c'est très bien : tout le monde commence là. La clé, c'est de transformer ce rêve en premières étapes concrètes.",
          insight:
            "La première marche n'est pas de chercher des biens — c'est de comprendre ce que tu peux vraiment financer. Ça change tout le reste.",
          projection:
            "Imagine y voir clair sur ton budget réel en un seul rendez-vous, sans aucun engagement. C'est par là qu'on commence.",
          cta_text: "Faire le point avec moi",
        },
        {
          title: "Tu es en phase de réflexion",
          description:
            "Tu y penses sérieusement et tu commences à bouger. Il te manque surtout des repères pour avancer sans te disperser ni te tromper.",
          insight:
            "À ton stade, la peur de mal faire est normale — elle vient d'un manque d'infos, pas d'un manque de capacité. On comble ce vide ensemble.",
          projection:
            "Imagine avancer étape par étape, accompagné·e, sans cette boule au ventre. C'est exactement mon rôle à tes côtés.",
          cta_text: "Être accompagné·e",
        },
        {
          title: "Tu es prêt à chercher",
          description:
            "Tu as les bases : une idée claire, un apport, une recherche active. Ton enjeu maintenant, c'est de viser juste et de ne pas perdre de temps.",
          insight:
            "À ce stade, un bon accompagnement te fait gagner des semaines : accès aux biens avant tout le monde, et un œil pro pour éviter les pièges.",
          projection:
            "Imagine visiter les bons biens, au bon prix, sans courir après les annonces. C'est ce que je t'apporte concrètement.",
          cta_text: "Lancer ma recherche",
        },
        {
          title: "Tu es prêt à signer",
          description:
            "Ton projet est mûr et tu veux avancer vite. À ce niveau, chaque jour compte : le bon bien part en quelques heures, pas en quelques semaines.",
          insight:
            "Ta priorité, c'est la réactivité. Être informé·e en premier des nouvelles opportunités fait toute la différence sur un marché tendu.",
          projection:
            "Imagine être prévenu·e en avant-première dès qu'un bien correspond à tes critères. C'est exactement ce que je mets en place pour mes clients.",
          cta_text: "Recevoir les biens en avant-première",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 9. Coach mindset / développement personnel
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "croyance-limitante",
    metier: "Coach mindset",
    emoji: "🧠",
    cardTitle: "Quelle croyance limitante te freine vraiment ?",
    tagline: "Le quiz qui met le doigt sur ce qui te bloque sans que tu le voies.",
    whoFor:
      "Coachs mindset, thérapeutes brèves et accompagnateurs en développement personnel qui veulent que leurs prospects identifient eux-mêmes le frein avant la séance découverte.",
    whyItWorks:
      "Quand quelqu'un met un mot sur ce qui le bloque, il devient demandeur d'une solution. C'est le moment idéal pour proposer un accompagnement.",
    estimatedMinutes: 2,
    payload: {
      title: "Quelle croyance limitante te freine vraiment ?",
      introduction:
        "En 6 questions honnêtes, on identifie la petite voix qui te freine au quotidien — et la façon de la calmer. Pas de blabla psy, juste ce qui est vrai pour toi.",
      cta_text: "Identifier ma croyance",
      share_message:
        "Je viens d'identifier la croyance qui me bloquait depuis des années 🧠 Et toi, c'est quoi la tienne ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand tu veux te lancer dans un projet, la petite voix dans ta tête te dit :",
          options: [
            { text: "« Tu n'es pas assez bon·ne pour ça »", result_index: 0 },
            { text: "« Tu vas finir par décevoir tout le monde »", result_index: 1 },
            { text: "« Tu n'as pas le droit de réussir alors que d'autres galèrent »", result_index: 2 },
            { text: "« Tu vas te planter et tout le monde va le voir »", result_index: 3 },
          ],
        },
        {
          question_text: "Quand on te fait un compliment sincère, tu :",
          options: [
            { text: "Le minimises immédiatement (« non c'est rien »)", result_index: 0 },
            { text: "Le reçois mais culpabilises de ne pas en faire plus", result_index: 1 },
            { text: "Es mal à l'aise, tu détournes la conversation", result_index: 2 },
            { text: "L'accueilles puis te demandes ce qu'ils veulent vraiment", result_index: 3 },
          ],
        },
        {
          question_text: "Devant une opportunité qui te dépasse un peu, ton premier réflexe :",
          options: [
            { text: "« Je dois encore me former avant d'oser y aller »", result_index: 0 },
            { text: "« Et si je n'arrive pas à tenir ce qu'on attend de moi ? »", result_index: 1 },
            { text: "« Ce n'est pas pour les gens comme moi »", result_index: 2 },
            { text: "« Et si je rate devant tout le monde ? »", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu te compares aux autres sur les réseaux :",
          options: [
            { text: "Tu te dis qu'ils sont juste plus compétents que toi", result_index: 0 },
            { text: "Tu te dis que tu devrais en faire autant", result_index: 1 },
            { text: "Tu te dis qu'ils ont eu plus de chance ou de soutien", result_index: 2 },
            { text: "Tu te dis qu'eux savent gérer la pression, pas toi", result_index: 3 },
          ],
        },
        {
          question_text: "Quand quelqu'un te dit non, tu :",
          options: [
            { text: "Te dis que c'est parce que tu n'es pas assez bon·ne", result_index: 0 },
            { text: "Te promets d'en faire plus la prochaine fois", result_index: 1 },
            { text: "Te dis que c'était trop beau pour toi", result_index: 2 },
            { text: "Repenses à ce moment pendant des jours", result_index: 3 },
          ],
        },
        {
          question_text: "Le déclic que tu attends sans vraiment y croire :",
          options: [
            { text: "Me sentir enfin légitime de prendre ma place", result_index: 0 },
            { text: "Arrêter de m'oublier en m'occupant des autres", result_index: 1 },
            { text: "Me donner le droit de réussir vraiment", result_index: 2 },
            { text: "Oser être vu·e sans avoir peur du regard", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "L'imposture",
          description:
            "Tu fais souvent semblant d'être à ta place, en attendant qu'on te démasque. Tu as l'impression de te faire passer pour quelqu'un de plus compétent que tu n'es. Cette voix est si forte qu'elle peut t'empêcher de candidater, oser, parler.",
          insight:
            "Le syndrome de l'imposteur ne disparaît pas parce qu'on accumule des diplômes — il disparaît quand on apprend à reconnaître ses vraies compétences. Tu sais probablement bien plus que tu ne te le permets.",
          projection:
            "Imagine te lever le matin sans cette boule au ventre, en sachant que ta place est exactement là où tu es. C'est ce qu'on installe ensemble.",
          cta_text: "M'autoriser à exister",
        },
        {
          title: "La sur-responsabilité",
          description:
            "Tu portes les autres avant toi, tout le temps. Tu sens que si tu ne tiens pas la barre, tout va s'effondrer. Résultat : tu t'épuises et tu n'avances jamais sur tes propres projets.",
          insight:
            "Ce n'est pas de l'altruisme — c'est une croyance que ta valeur dépend de ce que tu donnes. Mais quand on donne sans frein, on finit par ne plus rien avoir à donner.",
          projection:
            "Imagine poser un cadre clair sur ce que tu prends en charge et ce que tu laisses aux autres. Et te sentir libre, pas coupable.",
          cta_text: "Apprendre à dire non",
        },
        {
          title: "Le plafond de verre intérieur",
          description:
            "Tu te coupes l'élan dès que tu approches du succès. Comme si tu n'avais pas le droit de réussir alors que d'autres autour de toi galèrent. Cette loyauté invisible te ramène toujours au point de départ.",
          insight:
            "Tu n'as PAS à porter la culpabilité de réussir. Ton succès n'enlève rien à personne — au contraire, il peut inspirer ceux que tu aimes.",
          projection:
            "Imagine atteindre tes objectifs sans cette petite voix qui te chuchote « tu ne mérites pas ». C'est exactement ce qu'on déconstruit ensemble.",
          cta_text: "Briser mon plafond",
        },
        {
          title: "La peur du regard",
          description:
            "Tu portes en permanence le poids de ce que les gens vont penser. Tu modères tes prises de parole, tu refuses des opportunités visibles, tu restes dans l'ombre par sécurité. Et ça te ronge.",
          insight:
            "La peur du regard n'a pas besoin d'être éliminée — elle a juste besoin d'être plus petite que ton envie d'avancer. Et ça se travaille très concrètement.",
          projection:
            "Imagine prendre la parole sans trembler, publier sans relire 10 fois, vivre ta vie sans te demander ce qu'on va en dire. C'est possible.",
          cta_text: "Reprendre ma place",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 10. Coach nutrition / rapport au corps
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "rapport-nourriture",
    metier: "Coach nutrition",
    emoji: "🥗",
    cardTitle: "Quel est ton vrai rapport à la nourriture ?",
    tagline: "Le quiz qui dépasse les régimes pour comprendre ce qui se joue à table.",
    whoFor:
      "Diététiciennes, coachs nutrition, thérapeutes spécialisé·es dans le rapport au corps. Pour qualifier des prospects qui ne cherchent pas un énième régime mais une vraie transformation.",
    whyItWorks:
      "Les gens en surpoids ont essayé 10 régimes. Ce qu'ils veulent vraiment, c'est comprendre POURQUOI ça ne marche pas. Ton quiz les place dans une posture de découverte, pas de jugement.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel est ton vrai rapport à la nourriture ?",
      introduction:
        "En 6 questions sans jugement, on identifie ce qui se passe vraiment quand tu manges. Spoiler : ce n'est pas une question de volonté.",
      cta_text: "Comprendre mon profil",
      share_message:
        "Je viens enfin de comprendre mon rapport à la nourriture 🥗 Pas de régime, juste de la clarté.",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand tu manges, le plus souvent tu :",
          options: [
            { text: "Comptes mentalement les calories ou les portions", result_index: 0 },
            { text: "Manges très vite, sans vraiment savoir ce que tu as avalé", result_index: 1 },
            { text: "Te récompenses ou te consoles avec ce que tu choisis", result_index: 2 },
            { text: "Es perdu·e entre ce qui est « bien » et ce dont tu as envie", result_index: 3 },
          ],
        },
        {
          question_text: "Tu te trouves devant un placard plein le soir, tu :",
          options: [
            { text: "Te raisonnes en pensant à demain matin sur la balance", result_index: 0 },
            { text: "Grignotes plusieurs choses sans vraiment t'en rendre compte", result_index: 1 },
            { text: "Cherches précisément le truc sucré/salé qui va te réconforter", result_index: 2 },
            { text: "Hésites longtemps puis prends « un peu de tout »", result_index: 3 },
          ],
        },
        {
          question_text: "Après un repas où tu as « craqué », tu te sens :",
          options: [
            { text: "Coupable, tu te promets de compenser demain", result_index: 0 },
            { text: "Étonnamment vide, comme si tu n'avais pas profité", result_index: 1 },
            { text: "Bizarrement triste ou en colère contre toi", result_index: 2 },
            { text: "En guerre intérieure entre plaisir et raison", result_index: 3 },
          ],
        },
        {
          question_text: "Sur une journée de stress important, tu manges :",
          options: [
            { text: "Très peu, tu n'as plus faim du tout", result_index: 0 },
            { text: "Sans t'en rendre compte, en pilote automatique", result_index: 1 },
            { text: "Beaucoup, et plutôt sucré ou gras", result_index: 2 },
            { text: "N'importe comment, des fois rien, des fois trop", result_index: 3 },
          ],
        },
        {
          question_text: "Ton rapport à ton corps en ce moment :",
          options: [
            { text: "Je le contrôle, je le surveille, je le pèse", result_index: 0 },
            { text: "Je l'oublie, je le découvre dans le miroir parfois", result_index: 1 },
            { text: "Je m'en veux et je le punis quand il « déborde »", result_index: 2 },
            { text: "Je suis fatigué·e de cette relation conflictuelle avec lui", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu attends d'un accompagnement, c'est :",
          options: [
            { text: "Un plan clair que je peux suivre sans réfléchir", result_index: 0 },
            { text: "Réapprendre à écouter mon corps et mes signaux", result_index: 1 },
            { text: "Comprendre POURQUOI je mange comme je mange", result_index: 2 },
            { text: "Sortir enfin de cette spirale et trouver mon équilibre", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "La gestionnaire (contrôle)",
          description:
            "Tu es dans la maîtrise. Tu connais probablement les calories de tes aliments par cœur. Cette stratégie t'a tenue debout, mais elle te coûte une charge mentale énorme — et elle finit par craquer.",
          insight:
            "Le contrôle alimentaire ressemble à de la volonté, mais c'est en réalité une cage qui se resserre à chaque écart. La sortie n'est pas dans plus de contrôle — elle est ailleurs.",
          projection:
            "Imagine manger sans calculer, sans surveiller, et te sentir EN PAIX devant ton assiette. C'est exactement le voyage qu'on fait ensemble.",
          cta_text: "Sortir du contrôle",
        },
        {
          title: "La déconnectée (pilote auto)",
          description:
            "Tu manges plus par habitude que par faim. Tu peux finir un paquet sans t'en rendre compte. Ton corps t'envoie des signaux mais ils n'arrivent plus jusqu'à ta conscience.",
          insight:
            "Tu n'es pas « sans volonté » — tu es juste coupé·e de tes sensations. C'est un mécanisme de protection qui s'est installé pour de très bonnes raisons. Et qui se déprogramme.",
          projection:
            "Imagine retrouver les sensations de faim et de satiété, et qu'elles te guident naturellement. Ton corps redevient ton allié.",
          cta_text: "Me reconnecter à mon corps",
        },
        {
          title: "L'émotionnelle (réconfort)",
          description:
            "Tu manges pour combler autre chose que la faim — un stress, une tristesse, un vide. La nourriture est devenue ta réponse à tout ce qui te traverse. Ça t'apaise sur le moment, et te culpabilise après.",
          insight:
            "Il n'y a RIEN de mal à chercher du réconfort. Le souci n'est pas que tu manges tes émotions, c'est que tu n'as pas d'autres outils pour les accueillir. On peut en installer.",
          projection:
            "Imagine traverser une journée difficile sans que ton premier réflexe soit d'ouvrir le placard. Et te sentir capable de faire face autrement.",
          cta_text: "Trouver d'autres outils",
        },
        {
          title: "L'épuisée (chaos)",
          description:
            "Tu as essayé tellement de choses que tu ne sais plus où tu en es. Tu navigues entre régimes, craquages, culpabilité et reprises. Tu en as marre, vraiment marre, de cette relation conflictuelle.",
          insight:
            "L'épuisement est le signe que tu as suffisamment cherché toute seule. Tu n'as pas besoin d'une méthode de plus — tu as besoin de quelqu'un qui regarde TON cas en particulier.",
          projection:
            "Imagine sortir de cette spirale, pas avec une énième promesse miracle, mais avec un accompagnement qui regarde VRAIMENT ce qui se joue chez toi.",
          cta_text: "Trouver ma sortie",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 11. Coach sommeil / énergie
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "fuites-energie",
    metier: "Coach sommeil & énergie",
    emoji: "⚡",
    cardTitle: "Où sont tes vraies fuites d'énergie ?",
    tagline: "Le quiz qui identifie ce qui te vide vraiment au quotidien.",
    whoFor:
      "Coachs énergie, naturopathes spécialisé·es sommeil/fatigue, sophrologues. Pour qualifier des prospects qui se disent « épuisé·es sans raison ».",
    whyItWorks:
      "« Je suis fatigué·e » est trop vague. En identifiant LA VRAIE source de fatigue (physique, mentale, émotionnelle, relationnelle), ton prospect comprend qu'il faut une approche ciblée — pas un café de plus.",
    estimatedMinutes: 2,
    payload: {
      title: "Où sont tes vraies fuites d'énergie ?",
      introduction:
        "En 6 questions, on identifie où ton énergie part vraiment. Indice : ce n'est probablement pas là où tu crois.",
      cta_text: "Identifier mes fuites",
      share_message:
        "Je viens de comprendre où mon énergie partait vraiment ⚡ Spoiler : ce n'était pas le manque de sommeil.",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Le matin au réveil, le plus souvent tu te sens :",
          options: [
            { text: "Comme si tu n'avais pas dormi, le corps lourd", result_index: 0 },
            { text: "Déjà fatigué·e mentalement avant même la première tâche", result_index: 1 },
            { text: "Submergé·e par tout ce que tu vas devoir gérer émotionnellement", result_index: 2 },
            { text: "Pressé·e d'avoir un moment à toi avant que ça commence", result_index: 3 },
          ],
        },
        {
          question_text: "En milieu d'après-midi, ton creux d'énergie ressemble à :",
          options: [
            { text: "Un coup de barre physique, tu rêves d'une sieste", result_index: 0 },
            { text: "Une saturation mentale, tu ne peux plus réfléchir", result_index: 1 },
            { text: "Un trop-plein émotionnel, tu as besoin de t'isoler", result_index: 2 },
            { text: "Une lassitude des interactions, tu sursaute au moindre bruit", result_index: 3 },
          ],
        },
        {
          question_text: "Tes nuits :",
          options: [
            { text: "Sont agitées, je me réveille fatigué·e même après 8h", result_index: 0 },
            { text: "Le cerveau tourne, je rumine, je n'arrive pas à m'endormir", result_index: 1 },
            { text: "Je dors mal après des journées chargées émotionnellement", result_index: 2 },
            { text: "Je m'endors épuisé·e d'avoir trop interagi dans la journée", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu as un week-end libre, tu as envie de :",
          options: [
            { text: "Dormir, ne rien faire, récupérer physiquement", result_index: 0 },
            { text: "Vider ta tête, marcher, déconnecter du mental", result_index: 1 },
            { text: "Être seul·e en silence, sans aucune sollicitation", result_index: 2 },
            { text: "Ne plus avoir personne à gérer ou à supporter", result_index: 3 },
          ],
        },
        {
          question_text: "Ta plus grosse difficulté en ce moment :",
          options: [
            { text: "Mon corps ne suit plus, j'ai mal partout, je tombe malade souvent", result_index: 0 },
            { text: "Ma tête est en surchauffe permanente, je perds en clarté", result_index: 1 },
            { text: "Je porte les autres et je n'en peux plus émotionnellement", result_index: 2 },
            { text: "Mes proches/collègues me pompent toute mon énergie", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu attends vraiment :",
          options: [
            { text: "Récupérer une vitalité physique stable", result_index: 0 },
            { text: "Calmer mon cerveau et retrouver de la clarté", result_index: 1 },
            { text: "Apprendre à protéger mon énergie émotionnelle", result_index: 2 },
            { text: "Poser des limites avec les gens qui me vident", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Fuite physique",
          description:
            "Ton corps porte des années de surcharge. Tu dors peut-être bien sur le papier mais tu ne récupères plus. Tes signaux : douleurs chroniques, infections à répétition, sensation de batterie à plat dès le matin.",
          insight:
            "Le sommeil seul ne suffit plus à compenser. Ton corps a besoin d'un protocole spécifique pour relancer ses mécanismes de récupération — pas juste « se reposer plus ».",
          projection:
            "Imagine te lever en te sentant vraiment reposé·e, avec un corps qui répond. C'est exactement le chemin qu'on fait ensemble.",
          cta_text: "Récupérer ma vitalité",
        },
        {
          title: "Fuite mentale",
          description:
            "Ton cerveau ne s'arrête jamais. Tu rumines la nuit, tu fais 10 choses en parallèle, tu ne sais plus prioriser. Ce n'est pas de la fatigue physique — c'est une saturation cognitive.",
          insight:
            "Tu ne peux pas penser pour te sortir d'une fatigue mentale (sinon tu y serais déjà arrivé·e). Il faut une approche par le corps et le souffle pour calmer le système nerveux.",
          projection:
            "Imagine retrouver une tête claire, capable de réfléchir sereinement sans cette saturation permanente. C'est ce qu'on installe.",
          cta_text: "Calmer ma tête",
        },
        {
          title: "Fuite émotionnelle",
          description:
            "Tu portes tout, tout le temps, et tu n'as plus de place pour toi. Tu absorbes les émotions des autres, tu anticipes leurs besoins, et personne ne remarque que tu craques toi-même.",
          insight:
            "Ton hyper-empathie est un super-pouvoir mal protégé. Il ne s'agit pas de l'éteindre — il s'agit de te donner des frontières pour qu'elle ne te vide pas.",
          projection:
            "Imagine continuer à aimer les gens autour de toi, mais en ayant gardé suffisamment d'énergie pour TOI aussi. C'est possible.",
          cta_text: "Protéger mon énergie",
        },
        {
          title: "Fuite relationnelle",
          description:
            "Certaines personnes te vident à chaque interaction. Tu sors d'un repas de famille comme d'un marathon, d'une réunion comme d'une bataille. Tu confonds peut-être obligation et choix.",
          insight:
            "Ce n'est pas toi qui as un problème — ce sont certaines relations qui drainent disproportionnellement. Identifier précisément lesquelles change tout.",
          projection:
            "Imagine sortir de tes interactions sans cette sensation d'avoir été vidé·e. Avec des limites claires, posées sans culpabilité.",
          cta_text: "Reprendre le contrôle",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 12. Coach parentalité positive
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "style-parental",
    metier: "Coach parentalité",
    emoji: "👨‍👩‍👧",
    cardTitle: "Quel parent es-tu vraiment ?",
    tagline: "Le quiz bienveillant qui révèle ton style éducatif (sans jugement).",
    whoFor:
      "Coachs en parentalité positive, accompagnant·es des parents, thérapeutes familiaux. Pour qualifier des prospects qui veulent comprendre leur fonctionnement parental.",
    whyItWorks:
      "Tout parent doute. Le quiz pose un cadre rassurant (« il n'y a pas de mauvaise réponse ») qui les met immédiatement à l'aise — et te positionne comme un·e allié·e, pas un·e juge.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel parent es-tu vraiment ?",
      introduction:
        "En 6 questions sans jugement, on identifie ton style éducatif et le petit ajustement qui peut tout changer dans ta relation avec ton enfant.",
      cta_text: "Découvrir mon profil",
      share_message:
        "Je viens de comprendre mon style parental 👨‍👩‍👧 Et toi, tu te reconnais dans lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand ton enfant fait une crise en public, tu :",
          options: [
            { text: "Poses fermement les limites, peu importe le regard des autres", result_index: 0 },
            { text: "Cherches à comprendre ce qui se passe pour lui à ce moment", result_index: 1 },
            { text: "Cèdes pour éviter le drame, tu lui parleras après", result_index: 2 },
            { text: "Te sens débordé·e et tu réagis comme tu peux", result_index: 3 },
          ],
        },
        {
          question_text: "Ton enfant rapporte une mauvaise note de l'école :",
          options: [
            { text: "Tu fixes un cadre pour travailler plus sérieusement", result_index: 0 },
            { text: "Tu lui demandes comment IL se sent par rapport à ça", result_index: 1 },
            { text: "Tu lui dis que ce n'est pas grave et le rassures", result_index: 2 },
            { text: "Tu réagis selon TON état du moment (déçu·e, énervé·e, indifférent·e)", result_index: 3 },
          ],
        },
        {
          question_text: "Le plus gros défi avec ton enfant en ce moment :",
          options: [
            { text: "Il ne respecte pas les règles et c'est un combat permanent", result_index: 0 },
            { text: "Il vit des émotions intenses que je ne sais pas accueillir", result_index: 1 },
            { text: "Je suis trop indulgent·e et je ne sais pas dire non", result_index: 2 },
            { text: "Je m'énerve trop facilement et je culpabilise après", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu compares ta parentalité à celle de tes propres parents :",
          options: [
            { text: "Je fais comme eux, ça a fonctionné pour moi", result_index: 0 },
            { text: "Je fais TOUT l'inverse, je ne veux pas reproduire", result_index: 1 },
            { text: "Je suis plus doux/douce, mais peut-être trop", result_index: 2 },
            { text: "Je me retrouve à faire des trucs que je m'étais juré de ne pas faire", result_index: 3 },
          ],
        },
        {
          question_text: "Quand ton enfant te dit « tu es méchant·e », tu :",
          options: [
            { text: "Lui rappelles que c'est toi le parent et que tu as des règles", result_index: 0 },
            { text: "Te poses la question : est-ce que mon action était vraiment juste ?", result_index: 1 },
            { text: "T'effondres intérieurement, tu culpabilises beaucoup", result_index: 2 },
            { text: "T'énerves, ça te touche mais tu ne sais pas l'exprimer", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu voudrais améliorer dans ta parentalité :",
          options: [
            { text: "Tenir mon cadre sans crier ni m'épuiser", result_index: 0 },
            { text: "Mieux accompagner les émotions de mon enfant", result_index: 1 },
            { text: "Oser poser des limites sans culpabiliser", result_index: 2 },
            { text: "Sortir du cycle où je m'énerve puis je m'en veux", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Le parent cadre",
          description:
            "Tu poses des règles claires et tu y tiens. Ta force : ton enfant sait à quoi s'attendre. Ton piège : tu peux confondre fermeté et sévérité, et louper les besoins émotionnels qui se cachent derrière les comportements.",
          insight:
            "Un cadre solide est essentiel — mais sans accueil de l'émotion, il devient un mur. Apprendre à dire OUI aux émotions tout en disant NON au comportement, c'est le vrai art.",
          projection:
            "Imagine garder ton cadre clair tout en accueillant ce que ton enfant traverse vraiment. Sans crier, sans céder.",
          cta_text: "Allier cadre et bienveillance",
        },
        {
          title: "Le parent émotionnel",
          description:
            "Tu accueilles les émotions, tu prends le temps de comprendre. Ta force : ton enfant se sent entendu. Ton piège : tu peux te perdre dans son monde émotionnel et oublier ton propre cadre.",
          insight:
            "L'écoute émotionnelle est ton super-pouvoir. Ce qu'il te manque parfois, c'est l'autorité tranquille qui sécurise sans étouffer.",
          projection:
            "Imagine poser un cadre clair tout en gardant cette belle qualité d'écoute. Ton enfant a besoin des deux.",
          cta_text: "Trouver mon autorité juste",
        },
        {
          title: "Le parent permissif (par amour)",
          description:
            "Tu détestes voir ton enfant en colère ou triste, alors tu cèdes pour préserver l'harmonie. Ta force : il sent ton amour inconditionnel. Ton piège : sans cadre, il navigue dans le flou et finit par tester les limites de plus en plus loin.",
          insight:
            "Dire NON n'est pas un manque d'amour — c'est l'inverse. Un enfant a besoin de buter contre des limites pour se construire en sécurité.",
          projection:
            "Imagine poser un NON ferme et bienveillant sans culpabiliser, et voir ton enfant grandir plus apaisé. C'est ce qu'on installe.",
          cta_text: "Apprendre à dire non",
        },
        {
          title: "Le parent réactif",
          description:
            "Tu navigues entre amour et colère, patience et explosion. Ta force : tu n'es pas dans le contrôle, tu es authentique. Ton piège : ton enfant ne sait jamais sur quel pied danser, et toi tu culpabilises après chaque réaction.",
          insight:
            "Ce n'est pas une question de volonté — c'est un système nerveux qui sature. La parentalité positive ne se gagne pas par effort, elle s'installe par des outils CONCRETS pour ne plus exploser.",
          projection:
            "Imagine garder ton calme dans les situations qui te déclenchent aujourd'hui. Sans masquer, juste avec d'autres outils.",
          cta_text: "Sortir du cycle",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 13. Coach couple / relations amoureuses
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "schema-amoureux",
    metier: "Coach couple",
    emoji: "💞",
    cardTitle: "Quel est ton schéma amoureux dominant ?",
    tagline: "Le quiz qui révèle ce qui se rejoue dans chacune de tes histoires.",
    whoFor:
      "Coachs en relations amoureuses, thérapeutes de couple, accompagnant·es après rupture. Pour des prospects qui sentent que « ça recommence à chaque fois » et veulent comprendre.",
    whyItWorks:
      "Personne ne veut entendre « tu reproduis tes schémas ». Mais tout le monde veut savoir QUEL est son schéma. Le quiz transforme un sujet tabou en une découverte de soi.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel est ton schéma amoureux dominant ?",
      introduction:
        "En 6 questions honnêtes, on identifie ce qui se rejoue à chaque histoire — et le déclic qui peut tout changer dans ta prochaine relation.",
      cta_text: "Identifier mon schéma",
      share_message:
        "Je viens d'identifier mon schéma amoureux 💞 Et toi, tu te reconnais dans lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Au début d'une relation, tu :",
          options: [
            { text: "Tombe vite, fort, et tu donnes tout très vite", result_index: 0 },
            { text: "Restes méfiant·e, tu observes longtemps avant de t'engager", result_index: 1 },
            { text: "T'investis modérément, tu protèges ton indépendance", result_index: 2 },
            { text: "Vis des montagnes russes émotionnelles intenses", result_index: 3 },
          ],
        },
        {
          question_text: "Quand l'autre prend ses distances quelques jours :",
          options: [
            { text: "Tu paniques, tu cherches à comprendre, tu relances", result_index: 0 },
            { text: "Tu te dis « voilà, c'est fini, j'ai toujours raison de me méfier »", result_index: 1 },
            { text: "Tu en profites pour respirer, ça te soulage presque", result_index: 2 },
            { text: "Tu passes de la rage à la tristesse plusieurs fois par jour", result_index: 3 },
          ],
        },
        {
          question_text: "Tes histoires se terminent souvent parce que :",
          options: [
            { text: "L'autre dit que tu en demandes trop ou que tu étouffes", result_index: 0 },
            { text: "Tu n'as jamais vraiment fait confiance et ça a fini par se voir", result_index: 1 },
            { text: "Tu décroches au moment où ça devient sérieux", result_index: 2 },
            { text: "Vous vous êtes déchiré·es plusieurs fois avant de craquer", result_index: 3 },
          ],
        },
        {
          question_text: "Ton plus grand besoin en couple :",
          options: [
            { text: "Être rassuré·e en permanence sur l'amour de l'autre", result_index: 0 },
            { text: "Garder le contrôle pour ne pas être blessé·e à nouveau", result_index: 1 },
            { text: "Garder mon espace, mon autonomie, mes activités", result_index: 2 },
            { text: "Vivre des émotions intenses, sinon ça me paraît plat", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu reproduis sans t'en rendre compte :",
          options: [
            { text: "Je tombe sur des gens qui ne peuvent pas me donner ce que je demande", result_index: 0 },
            { text: "Je teste l'autre en permanence pour voir s'il va rester", result_index: 1 },
            { text: "Je finis par fuir quand ça devient « trop sérieux »", result_index: 2 },
            { text: "Je m'attache à des gens compliqués qui me font vivre des hauts et des bas", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu cherches vraiment, c'est :",
          options: [
            { text: "Une relation où je n'ai plus besoin de réclamer", result_index: 0 },
            { text: "Apprendre à faire confiance sans avoir peur d'être trahi·e", result_index: 1 },
            { text: "Aimer profondément sans perdre qui je suis", result_index: 2 },
            { text: "Sortir de la spirale des relations toxiques", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "L'attachement anxieux",
          description:
            "Tu donnes beaucoup, tu attends beaucoup, et tu paniques dès que l'autre s'éloigne. Tes histoires sont intenses au début et te laissent vidé·e à la fin. Tu confonds parfois amour et peur de l'abandon.",
          insight:
            "Tu n'es pas « trop » — tu as juste un système d'alerte sur-actif. Ça se calme avec les bons outils, et ça change radicalement la qualité de tes relations.",
          projection:
            "Imagine vivre une relation où tu n'as plus besoin de réclamer, parce que tu te sens enfin solide à l'intérieur. C'est le travail qu'on fait ensemble.",
          cta_text: "Apaiser mon anxiété",
        },
        {
          title: "L'évitement protecteur",
          description:
            "Tu testes, tu observes, tu protèges ton cœur. Tu te dis souvent que les gens finissent toujours par décevoir. Ta carapace t'a sauvé·e — mais elle t'empêche aujourd'hui de vivre ce que tu mérites.",
          insight:
            "La méfiance n'est pas un défaut, c'est une compétence de survie. Mais quand elle s'applique aux mauvaises personnes, elle te coupe d'amours qui auraient pu être bons.",
          projection:
            "Imagine pouvoir baisser ta garde avec quelqu'un qui le mérite vraiment, sans te sentir en danger. Ça se travaille.",
          cta_text: "Faire confiance à nouveau",
        },
        {
          title: "L'indépendant·e qui fuit",
          description:
            "Tu aimes ton autonomie plus que tout. Tu fuis dès que ça devient « sérieux » sans toujours comprendre pourquoi. Tu enchaînes des histoires qui ressemblent à des promesses non tenues.",
          insight:
            "Aimer profondément ne veut pas dire perdre qui tu es. Ce que tu fuis n'est pas l'engagement — c'est la peur de te diluer. Et ça se déconstruit.",
          projection:
            "Imagine pouvoir t'engager pleinement tout en gardant ton espace, ton identité, tes passions. Ce n'est pas l'un ou l'autre.",
          cta_text: "Apprendre à m'engager",
        },
        {
          title: "Le tumulte (cycles intenses)",
          description:
            "Tes relations sont des montagnes russes. Tu t'attaches à des gens compliqués, tu vis intensément, tu te déchires, tu reviens. Tu confonds passion et chaos.",
          insight:
            "L'intensité n'est pas la profondeur. Une relation saine peut être TOUT AUSSI vibrante — sans les déchirures. Ça nécessite de comprendre ce qui te scotche au tumulte.",
          projection:
            "Imagine vivre un amour à la fois intense ET paisible. Pas plat — paisible. C'est très différent, et c'est accessible.",
          cta_text: "Sortir du tumulte",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 14. Coach reconversion / carrière
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "blocage-reconversion",
    metier: "Coach reconversion",
    emoji: "🚪",
    cardTitle: "Qu'est-ce qui te bloque vraiment dans ta reconversion ?",
    tagline: "Le quiz qui dépasse le « je n'ai pas le temps » pour identifier le vrai frein.",
    whoFor:
      "Coachs en reconversion professionnelle, bilans de compétences, accompagnant·es de transition. Pour qualifier des prospects qui pensent à changer depuis des mois sans passer à l'action.",
    whyItWorks:
      "Tout le monde se dit « bloqué par le temps ou l'argent ». La vraie cause est presque toujours ailleurs (peur, identité, légitimité). Le quiz fait émerger cette vraie cause — et te place comme la personne qui peut aider.",
    estimatedMinutes: 2,
    payload: {
      title: "Qu'est-ce qui te bloque vraiment dans ta reconversion ?",
      introduction:
        "En 6 questions sincères, on identifie ce qui te freine vraiment (et ce n'est probablement pas ce que tu crois).",
      cta_text: "Identifier mon blocage",
      share_message:
        "Je viens enfin de comprendre ce qui me bloquait dans ma reconversion 🚪 Et toi ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand tu penses à ton job actuel, tu ressens surtout :",
          options: [
            { text: "Du vide, comme si tu passais à côté de ta vie", result_index: 0 },
            { text: "De la peur de perdre ta sécurité si tu changeais", result_index: 1 },
            { text: "Du doute sur ce que tu pourrais bien faire d'autre", result_index: 2 },
            { text: "De l'impuissance face au regard des autres", result_index: 3 },
          ],
        },
        {
          question_text: "Quand quelqu'un te demande « tu fais quoi dans la vie ? », tu :",
          options: [
            { text: "Réponds avec un petit pincement, tu n'es plus aligné·e", result_index: 0 },
            { text: "Réponds avec fierté en surface, mais ça sonne creux pour toi", result_index: 1 },
            { text: "Réponds par défaut, sans savoir ce que tu ferais d'autre", result_index: 2 },
            { text: "Évites le sujet parce que tu sens le jugement venir", result_index: 3 },
          ],
        },
        {
          question_text: "Le matin avant d'aller bosser :",
          options: [
            { text: "Tu pars résigné·e, tu coches les jours", result_index: 0 },
            { text: "Tu fais le calcul des ans qu'il te reste à tenir", result_index: 1 },
            { text: "Tu rêves d'autre chose mais sans savoir quoi vraiment", result_index: 2 },
            { text: "Tu te demandes ce que les gens diraient si tu démissionnais", result_index: 3 },
          ],
        },
        {
          question_text: "Ce qui te freine vraiment d'oser sauter :",
          options: [
            { text: "Je ne sens pas que ce job a un sens, mais je ne sais pas ce qui en aurait", result_index: 0 },
            { text: "J'ai peur de ne plus pouvoir maintenir mon niveau de vie", result_index: 1 },
            { text: "Je n'arrive pas à identifier ce qui me ferait vraiment vibrer", result_index: 2 },
            { text: "Ma famille / mon entourage compte sur ma stabilité actuelle", result_index: 3 },
          ],
        },
        {
          question_text: "Tu as déjà essayé quoi pour avancer sur ta reconversion ?",
          options: [
            { text: "Beaucoup réfléchi, mais sans vraiment passer à l'action", result_index: 0 },
            { text: "Fait des simulations financières en boucle qui me freinent", result_index: 1 },
            { text: "Passé des tests d'orientation qui me laissent encore plus perdu·e", result_index: 2 },
            { text: "Évité d'en parler autour de moi pour ne pas inquiéter", result_index: 3 },
          ],
        },
        {
          question_text: "Si tu avais un coup de pouce, ce serait pour :",
          options: [
            { text: "Trouver un cap qui ait du sens pour moi", result_index: 0 },
            { text: "Sécuriser la transition financièrement", result_index: 1 },
            { text: "Identifier précisément ce qui me correspond", result_index: 2 },
            { text: "M'autoriser à le faire malgré le regard des autres", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "Le blocage sens",
          description:
            "Tu sens que ton travail actuel ne te correspond plus, mais tu manques d'un cap clair vers où aller. Tu n'es pas paresseux/se — tu es en quête. Et chaque journée sans direction te pèse de plus en plus.",
          insight:
            "Le sens ne se découvre pas par la réflexion seule — il émerge en confrontant tes valeurs profondes à des projets concrets. C'est exactement ce sur quoi on travaille en accompagnement.",
          projection:
            "Imagine te lever le matin en sachant POURQUOI tu fais ce que tu fais. Sans plus jamais ce vide qui te ronge.",
          cta_text: "Trouver mon cap",
        },
        {
          title: "Le blocage sécurité",
          description:
            "Tu rêves de changer mais l'argent te tient en otage. Tu fais des simulations Excel à n'en plus finir, tu compares les scénarios, et tu finis toujours par te dire « pas maintenant ». Tu confonds prudence et paralysie.",
          insight:
            "La sécurité financière ne se gagne pas en restant à son poste — elle se construit AVEC une stratégie de transition adaptée. Et ça, c'est planifiable concrètement.",
          projection:
            "Imagine avancer vers ta nouvelle vie SANS sacrifier ta sécurité. C'est exactement la roadmap qu'on construit ensemble.",
          cta_text: "Sécuriser ma transition",
        },
        {
          title: "Le blocage clarté",
          description:
            "Tu sais que tu veux changer mais tu n'arrives pas à mettre le doigt sur QUOI. Les tests d'orientation t'enferment dans des cases, les amis te suggèrent des trucs qui ne te ressemblent pas. Tu es perdu·e dans le possible.",
          insight:
            "La clarté ne vient pas en lisant 30 articles « top métiers ». Elle vient en explorant ta singularité avec quelqu'un qui te pose les bonnes questions.",
          projection:
            "Imagine voir clairement le chemin qui te correspond — pas un métier abstrait, mais TON projet précis et incarné.",
          cta_text: "Y voir clair",
        },
        {
          title: "Le blocage regard",
          description:
            "Tu sais ce que tu veux mais tu es paralysé·e par ce que les autres vont dire. Ta famille a investi dans tes études, ton entourage compte sur ton statut, tu as l'impression de trahir. C'est une cage invisible.",
          insight:
            "Tu ne peux pas vivre la vie de quelqu'un d'autre par loyauté. Ceux qui t'aiment vraiment préfèrent un toi épanoui à un toi conforme. Reste à oser le leur prouver.",
          projection:
            "Imagine assumer pleinement ton choix sans porter le regard des autres comme un poids. Et voir tes proches s'adapter, plus vite que tu ne le crois.",
          cta_text: "Reprendre ma place",
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // 15. Coach finance personnelle
  // ─────────────────────────────────────────────────────────────────
  {
    slug: "rapport-argent",
    metier: "Coach finance",
    emoji: "💸",
    cardTitle: "Quel est ton vrai rapport à l'argent ?",
    tagline: "Le quiz qui révèle ce qui se joue (vraiment) quand tu regardes ton compte.",
    whoFor:
      "Coachs en finance personnelle, conseillers en gestion de patrimoine pédagogues, money coachs. Pour des prospects qui veulent comprendre leurs blocages avant les chiffres.",
    whyItWorks:
      "Personne n'aime parler de ses problèmes d'argent. Mais tout le monde veut savoir « quel rapport j'ai à l'argent ». Le quiz transforme un tabou en self-discovery.",
    estimatedMinutes: 2,
    payload: {
      title: "Quel est ton vrai rapport à l'argent ?",
      introduction:
        "En 6 questions honnêtes, on identifie ce qui se joue quand tu gères ton argent — et le déclic qui peut tout changer.",
      cta_text: "Découvrir mon profil",
      share_message:
        "Je viens enfin de comprendre mon rapport à l'argent 💸 Et toi, tu te reconnais dans lequel ?",
      virality_enabled: true,
      address_form: "tu",
      questions: [
        {
          question_text: "Quand tu reçois ton salaire / ton chiffre du mois, tu :",
          options: [
            { text: "T'attends déjà aux dépenses qui vont l'avaler", result_index: 0 },
            { text: "Mets tout sur le côté, tu ne touches à rien", result_index: 1 },
            { text: "Te fais plaisir tout de suite, on verra après", result_index: 2 },
            { text: "Évites de regarder précisément combien il reste", result_index: 3 },
          ],
        },
        {
          question_text: "Devant un compte qui descend, tu ressens :",
          options: [
            { text: "Une boule au ventre familière, comme depuis toujours", result_index: 0 },
            { text: "Une raideur, tu te promets de NE PLUS RIEN dépenser", result_index: 1 },
            { text: "Un peu d'inquiétude vite balayée par autre chose", result_index: 2 },
            { text: "Une envie de fermer l'appli et de penser à autre chose", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu vois quelqu'un dépenser plus que toi, tu te dis :",
          options: [
            { text: "« Il/elle ne se rend pas compte, ça va lui retomber dessus »", result_index: 0 },
            { text: "« Moi je préfère mettre de côté pour la sécurité »", result_index: 1 },
            { text: "« Pourquoi pas moi aussi, je vis qu'une fois »", result_index: 2 },
            { text: "Tu détournes le regard, le sujet te met mal à l'aise", result_index: 3 },
          ],
        },
        {
          question_text: "Demander à être mieux payé·e :",
          options: [
            { text: "Te paraît mal vu, on ne fait pas ça dans ma famille / mon milieu", result_index: 0 },
            { text: "T'angoisse, tu préfères économiser plutôt que négocier", result_index: 1 },
            { text: "Te tente, mais tu ne sais pas comment t'y prendre", result_index: 2 },
            { text: "Te paraît hors d'atteinte, on ne te dira jamais oui", result_index: 3 },
          ],
        },
        {
          question_text: "Quand tu reçois une rentrée d'argent imprévue (cadeau, prime, vente), tu :",
          options: [
            { text: "L'utilises pour combler un retard ou une dette qui traîne", result_index: 0 },
            { text: "La planques sur un compte « sécurité », tu n'y touches pas", result_index: 1 },
            { text: "T'autorises un plaisir que tu repoussais", result_index: 2 },
            { text: "Ne réalises pas vraiment, elle s'évapore sans projet précis", result_index: 3 },
          ],
        },
        {
          question_text: "Ce que tu attends d'un accompagnement money, c'est :",
          options: [
            { text: "Casser la croyance que l'argent est forcément un combat", result_index: 0 },
            { text: "Sortir de la peur permanente et oser dépenser pour vivre", result_index: 1 },
            { text: "Apprendre à gérer sans m'oublier sur mes envies", result_index: 2 },
            { text: "Reprendre le contrôle au lieu de subir mon compte", result_index: 3 },
          ],
        },
      ],
      results: [
        {
          title: "L'angoisse familiale",
          description:
            "Tu as grandi avec l'idée que l'argent était difficile, qu'il fallait se battre, que ça finit toujours par manquer. Aujourd'hui, même quand tu en as, tu vis comme si tu en manquais.",
          insight:
            "Tes croyances sur l'argent ne sont PAS tes croyances — ce sont celles de la génération d'avant, héritées sans qu'on te demande ton avis. Et elles se déconstruisent.",
          projection:
            "Imagine te sentir en paix avec ton argent, sans cette boule au ventre familiale. Et transmettre autre chose à tes enfants que ce que tu as reçu.",
          cta_text: "Libérer mes croyances",
        },
        {
          title: "La gardienne (peur de manquer)",
          description:
            "Tu mets tout de côté, tu te prives sur tes plaisirs, tu vis avec une épargne « au cas où ». Tu confonds gestion saine et privation chronique. Tu protèges si fort que tu en oublies de vivre.",
          insight:
            "L'argent qu'on amasse sans jamais utiliser n'est pas une protection — c'est une cage dorée. La sécurité véritable n'est pas dans le montant, elle est dans ta capacité à FAIRE confiance.",
          projection:
            "Imagine te faire plaisir SANS culpabilité, tout en gardant une vraie sécurité financière. C'est ce qu'on construit ensemble.",
          cta_text: "Sortir de la privation",
        },
        {
          title: "L'impulsive (carpe diem)",
          description:
            "Tu vis pleinement, tu te fais plaisir, tu détestes les calculs. Ta force : tu profites de la vie. Ton piège : tu finis le mois en stress, tu accumules les petites dettes, et tu n'as aucune visibilité long terme.",
          insight:
            "Le plaisir n'est pas l'ennemi de la rigueur financière. Tu peux garder ta joie de vivre tout en construisant une vraie tranquillité — il faut juste les bons outils, pas des restrictions punitives.",
          projection:
            "Imagine continuer à profiter sans le stress de fin de mois, et voir ta sécurité grandir doucement en parallèle.",
          cta_text: "Concilier plaisir et tranquillité",
        },
        {
          title: "L'évitante",
          description:
            "Tu détestes regarder ton compte. Tu ouvres les enveloppes en travers, tu fermes les apps quand ça t'inquiète. L'argent te met mal à l'aise, alors tu détournes les yeux — mais ça ne disparaît pas.",
          insight:
            "L'évitement est une protection émotionnelle, pas une stratégie financière. Et la bonne nouvelle, c'est qu'on peut reprendre le contrôle SANS devoir devenir un·e expert·e des chiffres.",
          projection:
            "Imagine ouvrir tes comptes sans angoisse, savoir où tu vas, et te sentir enfin actrice/acteur de ton argent. C'est ce qu'on installe pas à pas.",
          cta_text: "Reprendre le contrôle",
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

export function getTemplateBySlug(slug: string): QuizTemplate | null {
  return TEMPLATE_CATALOG.find((t) => t.slug === slug) ?? null;
}

export function listTemplates(): QuizTemplate[] {
  return TEMPLATE_CATALOG;
}

/** Liste des métiers distincts pour le filtre de la galerie. */
export function listMetiers(): string[] {
  return Array.from(new Set(TEMPLATE_CATALOG.map((t) => t.metier)));
}
