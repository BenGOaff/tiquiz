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
