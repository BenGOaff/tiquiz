// lib/affiliateSwipe.ts
// Kit de contenu prêt à l'emploi pour les affiliés de L'Atelier du Quiz :
//   - SWIPE_EMAILS : la séquence de 6 emails (copie de
//     vente/emails-affilies-atelier-du-quiz.md), que l'affilié copie-colle.
//   - SWIPE_POSTS / ARTICLE_ANGLES / VIDEO_IDEAS : idées de contenu réseaux,
//     articles de blog et vidéos promo.
//
// Data-pure (réutilisable client + serveur). Les placeholders {LIEN} et
// {TON_PRENOM} sont substitués à l'affichage (lien affilié réel + prénom).
// {first_name} reste tel quel : c'est le champ de fusion de l'outil d'emailing
// de l'affilié, pas quelque chose qu'on remplit ici.
//
// Contenu USER-VISIBLE : aucun tiret long (règle anti-IA). Ne pas coller de
// texte généré sans repasser le scan grep "—\|–".

export interface SwipeEmail {
  /** Numéro dans la séquence (1 à 6). */
  n: number;
  /** Rôle du mail (ouverture, preuve...). */
  role: string;
  /** 3 objets A/B/C à tester. */
  subjects: string[];
  /** Corps du mail, avec placeholders {first_name} {LIEN} {TON_PRENOM}. */
  body: string;
}

export const SWIPE_EMAILS: SwipeEmail[] = [
  {
    n: 1,
    role: "Ouverture (cascade de bénéfices)",
    subjects: [
      "Ton quiz, tu sais le faire. Et après ?",
      "La pièce qui manque à 90% des quiz",
      "Comment transformer un quiz en machine à leads",
    ],
    body: `Salut {first_name},

Si tu cherches à capter plus de leads sans y passer tes journées, garde ce mail deux minutes.

On sait tous que les quiz, ça marche pour récolter des emails.

Le hic, ce n'est presque jamais de créer le quiz. Ça, c'est la partie facile.

Le vrai blocage, c'est l'après : amener des visiteurs dessus, trier les leads, les relancer, vendre. Et savoir dans quel ordre le faire.

Personne n'explique cette partie-là. Résultat : des quiz tout beaux qui ne rapportent rien.

Je suis tombé sur un truc qui règle exactement ce problème : L'Atelier du Quiz.

Ce n'est pas une formation de plus à regarder en accéléré pour ne jamais l'appliquer.

C'est un "quizing" : tu apprends en faisant, une petite action par jour, et au bout de 7 jours tu as un quiz publié, branché à ton Systeme.io, qui tourne tout seul.

Voici ce que tu obtiens :

- Un plan de trafic gratuit, jour par jour, pour remplir ton quiz de visiteurs qualifiés sans un euro de pub.
- Le réglage à 0€ qui empêche les gens d'abandonner ton quiz juste avant de te laisser leur email.
- Le Quiz Doctor qui passe ton quiz au crible avant publication, repère les erreurs qui te coûtent des leads et te dit quoi corriger.
- Un générateur d'emails branché sur ton quiz + des templates Systeme.io à importer en un clic : tes leads sont accueillis et relancés à ta place.
- La méthode CAPTO : les 5 étapes dans l'ordre, pour ne plus jamais te demander "et maintenant, je fais quoi ?".
- Ton quiz branché à Systeme.io sans code, tes leads taggés et tes emails automatisés (pas de Zapier, pas de Make).
- Un coach IA branché sur les vraies données de ton quiz, dispo jour et nuit, qui adapte sa stratégie à TES chiffres.

Tu as aussi la communauté des participants et 5 bonus pour aller plus loin (trafic payant, vente, sondages, popquiz, réseaux sociaux).

Le tout pour **47€. Une seule fois.** Accès à vie, et l'accès Tiquiz gratuit est inclus pour démarrer sans rien payer de plus.

Et il y a une garantie : si tu appliques la méthode et que tu ne captes pas un seul lead en 30 jours, **tu es remboursé**.

👉 Je découvre l'Atelier du Quiz : {LIEN}

{TON_PRENOM}

PS : si tu as déjà un quiz qui ne te ramène pas grand-chose, le problème n'est presque jamais le quiz lui-même. C'est tout ce qu'il y a autour. Et c'est exactement ce que l'Atelier règle en 7 jours.`,
  },
  {
    n: 2,
    role: "La preuve (étude de cas)",
    subjects: [
      "285 leads en 9 jours, partie de zéro",
      "0,18€ le lead (tu as bien lu)",
      "Elle n'avait ni audience ni liste",
    ],
    body: `Salut {first_name},

Hier je t'ai parlé de l'Atelier du Quiz. Aujourd'hui, du concret.

Il y a une étude de cas qui résume tout : celle de Jocelyne.

Elle s'est lancée sur une niche où elle était totalement inconnue. Comptes réseaux créés la veille. Aucune audience. Aucune liste email. Le point de départ le plus dur qui soit.

Plutôt que d'attendre des mois pour construire une audience, elle a fait un quiz. 5 questions, des profils sur mesure. Le quiz tague chaque personne selon ses réponses, directement dans Systeme.io, et déclenche l'email adapté. Sans code.

Le résultat, sur 9 jours (chiffres réels) :

- **285 leads qualifiés** via la pub.
- **63,50€** de budget pub. Au total, pas par jour.
- **0,18€ le lead.**

Et ce n'est pas un coup de chance. C'est juste le bon enchaînement, dans le bon ordre : capter, attirer, profiler, transformer, optimiser. La méthode qu'on installe pas à pas dans l'Atelier.

Franchement, elle a mis un peu de pub. Mais dans l'Atelier, on commence par le trafic 100% gratuit (la pub, c'est un bonus, pas un passage obligé). Ce que son histoire prouve, c'est l'essentiel : un quiz bien construit qualifie tes leads pour une fraction du prix d'un PDF classique, même en partant de rien.

👉 Je veux ce système pour mon activité : {LIEN}

{TON_PRENOM}`,
  },
  {
    n: 3,
    role: "Pourquoi pas toi (objection d'identité)",
    subjects: [
      "\"Oui mais elle, c'est pas pareil\"",
      "Ils l'ont fait. Pourquoi pas toi ?",
      "Ce que ton cerveau s'est dit hier",
    ],
    body: `Salut {first_name},

Hier, l'histoire de Jocelyne. Et je parie que ton cerveau a fait un truc en la lisant : il a cherché la raison pour laquelle, toi, ça ne marcherait pas.

"Elle a plus d'expérience que moi."
"Elle a mis de la pub, j'ai pas de budget."
"Moi je suis nul en technique."

Je te réponds vite fait.

**Ton expertise, tu l'as déjà.** Tu as un métier, un vécu, des galères que d'autres traversent en ce moment. Le quiz sert justement à mettre ça en avant, et l'IA t'aide à le formuler à partir de tes mots.

**Le budget, tu n'en as pas besoin pour démarrer.** On commence par le trafic gratuit, et l'accès Tiquiz gratuit est inclus. Tu fais tout le parcours sans sortir un euro de plus que les 47€.

**La technique, elle est guidée.** Zéro code, zéro Make, zéro Zapier. L'IA écrit ton quiz, tu corriges en cliquant, la connexion à Systeme.io est expliquée clic par clic. Si tu sais répondre à des questions, tu sais faire ton quiz.

Et si malgré tout tu as un doute : la garantie couvre tes arrières. Pas un seul lead capté en 30 jours malgré la méthode appliquée ? Remboursé. Le risque est du côté du produit, pas du tien.

Donc la vraie question, ce n'est plus "est-ce que ça peut marcher pour moi". C'est "est-ce que je me lance".

👉 Oui, je me lance : {LIEN}

{TON_PRENOM}`,
  },
  {
    n: 4,
    role: "Le système (la chaîne CAPTO)",
    subjects: [
      "Là où 9 personnes sur 10 lâchent",
      "Ton quiz n'est que la première marche",
      "Les 5 étapes (et celle que tout le monde saute)",
    ],
    body: `Salut {first_name},

Pour qu'un quiz rapporte vraiment, il y a des étapes à respecter, dans l'ordre :

1. Capter : un quiz qu'on a envie de finir (le bon angle, des résultats qui parlent).
2. Attirer : du trafic qualifié dessus, gratuitement.
3. Profiler : taguer chaque personne selon ses réponses.
4. Transformer : convertir ces leads en ventes, avec les bons emails au bon moment.
5. Optimiser : mesurer, ajuster, faire tourner en boucle.

C'est la méthode **CAPTO**. Et voilà le truc que presque personne ne dit.

La plupart des gens font l'étape 1. Ils créent leur quiz. Ils sont fiers (à raison). Et ils s'arrêtent là.

Le quiz est en ligne, mais personne ne tombe dessus. Ou il capte des emails que personne ne trie ni ne relance. La chaîne casse à la première marche, et le quiz ne rapporte rien.

Ce n'est pas un problème d'effort. C'est un problème d'enchaînement.

L'Atelier du Quiz, c'est exactement ça : on déroule les 5 maillons avec toi, dans l'ordre, sans en sauter un seul. Ton quiz est publié dès le 4e jour, pour avoir le temps de brancher tout le reste derrière.

Un maillon en cadeau, tout de suite : à l'étape "Capter", l'ordre de tes questions change tout. Plus une personne avance dans ton quiz, moins elle a envie de l'abandonner. Donc si ta question qui fait décrocher tombe trop tôt, tu perds des gens juste avant qu'ils ne te laissent leur email. Inverse-la avec une autre, et tu gardes plus de monde jusqu'au bout. Plus de monde au bout = plus de leads, sans un visiteur de plus.

Ça, c'est UN maillon. Dans l'Atelier, tu as les cinq, et le coach vérifie que les tiens tiennent.

👉 Je veux la chaîne complète : {LIEN}

{TON_PRENOM}`,
  },
  {
    n: 5,
    role: "FAQ (objections pratiques)",
    subjects: [
      "Tout ce que tu te demandes sur l'Atelier",
      "Je réponds à tes questions",
      "Cette question vient de toi ?",
    ],
    body: `Salut {first_name},

On me pose souvent les mêmes questions sur l'Atelier du Quiz. Je te réponds cash.

"C'est un abonnement ?"
Non. **47€ une seule fois**, accès à vie, mises à jour comprises. Aucun prélèvement caché.

"Faut-il payer Tiquiz pour réussir ?"
Non, tu démarres en gratuit. L'accès Tiquiz gratuit est inclus et il suffit pour créer et publier ton premier quiz. Tu passeras au payant seulement quand ton quiz te ramènera déjà des leads.

"C'est encore une formation comme les autres ?"
Non. Tu ne regardes pas des vidéos en prenant des notes que tu n'appliques jamais. Tu apprends à faire un quiz en faisant ton quiz. Chaque jour, une action, un livrable. À la fin, tu as un quiz publié qui tourne.

"Et si je bloque ?"
Tu as un coach IA branché sur les vraies données de ton quiz, dispo jour et nuit, qui te débloque en adaptant ses conseils à tes chiffres. Plus la communauté des participants.

"Comment je sais si mon quiz est bon avant de le lancer ?"
Le Quiz Doctor le passe au crible avant publication : angle, ordre des questions, capture, images. Il te dit quoi corriger. Tu publies un quiz déjà réglé.

"Je débute, je suis nul en technique."
C'est fait pour toi. Zéro code. L'IA écrit ton quiz, tu corriges en cliquant, chaque étape est guidée.

"Est-ce que ça marche dans ma niche ?"
Oui. Coach, consultant, e-commerce, freelance, créateur : la mécanique est la même, c'est juste l'angle qui change. Partout, les gens adorent parler d'eux et découvrir leur profil.

"Et si ça ne marche pas pour moi ?"
Garantie 30 jours. Pas un seul lead capté en appliquant la méthode ? Remboursé.

👉 J'ai ma réponse, je rejoins l'Atelier : {LIEN}

{TON_PRENOM}`,
  },
  {
    n: 6,
    role: "Clôture (à activer si tu poses une deadline)",
    subjects: [
      "Dernier rappel pour l'Atelier du Quiz",
      "Ce n'est plus le moment de réfléchir",
      "On récapitule (et on décide)",
    ],
    body: `Salut {first_name},

Je ne vais pas te tenir la jambe, alors je fais court.

Tu sais que les quiz marchent. Tu sais (ou presque) en créer un. Et tu sais que ce qui te manque, c'est tout ce qui vient après : le trafic, le tri des leads, les relances, la vente.

C'est exactement ce que tu installes dans l'Atelier du Quiz, en 7 jours, accompagné du premier au dernier jour :

- Un quiz audité par le Quiz Doctor puis publié dès le 4e jour.
- Tes leads triés et tes relances automatisées (générateur d'emails + templates Systeme.io).
- Des visiteurs sans un euro de pub et le mécanisme de viralité qui fait grossir ta liste.
- Un coach IA branché sur tes données, la communauté et 5 bonus (trafic payant, vente, sondages, popquiz, réseaux sociaux).

Le tout pour **47€, une seule fois**, avec la garantie remboursé si tu ne captes pas un seul lead en 30 jours.

Au fond, tu as deux options. Fermer ce mail, et dans un mois ton quiz est au même point qu'aujourd'hui. Ou cliquer, répondre à quelques questions, et dans 7 jours avoir un système qui te ramène des leads en automatique.

👉 Je rejoins l'Atelier du Quiz : {LIEN}

{TON_PRENOM}

PS : si tu veux vraiment créer de l'urgence auprès de ta liste, ajoute ici TA propre échéance (un bonus que tu offres, une date de fin de recommandation). Reste honnête : ne promets que ce que tu tiens.`,
  },
];

export interface SwipePost {
  /** Réseau conseillé. */
  platform: string;
  /** Accroche courte pour se repérer. */
  hook: string;
  /** Texte du post, prêt à coller, avec {LIEN}. */
  body: string;
}

export const SWIPE_POSTS: SwipePost[] = [
  {
    platform: "LinkedIn / Facebook",
    hook: "Le quiz n'est pas le problème",
    body: `Tout le monde te dit "fais un quiz pour capter des leads".

Personne ne te dit ce qui vient après.

Le quiz, c'est la partie facile. Le vrai travail, c'est : amener du trafic dessus, trier les leads, les relancer, vendre. Dans le bon ordre.

C'est exactement ce que L'Atelier du Quiz t'apprend en 7 jours, une action par jour. À la fin tu as un quiz publié, branché à ton outil d'emailing, qui tourne tout seul.

47€ une fois. Accès Tiquiz gratuit inclus. Garantie 30 jours.

👉 {LIEN}`,
  },
  {
    platform: "Instagram / Story",
    hook: "Preuve chiffrée (Jocelyne)",
    body: `285 leads qualifiés en 9 jours. 63,50€ de pub au total. 0,18€ le lead.

Partie de zéro : aucune audience, aucune liste, une niche inconnue.

Son secret ? Un quiz de 5 questions qui tague chaque personne et déclenche le bon email, sans code.

La méthode complète est dans L'Atelier du Quiz.

👉 Lien en bio / {LIEN}`,
  },
  {
    platform: "X / Threads",
    hook: "Fil court CAPTO",
    body: `Pourquoi 9 quiz sur 10 ne rapportent rien :

Les gens font l'étape 1 (créer le quiz) et s'arrêtent là.

Il en manque 4 : attirer du trafic, profiler, transformer, optimiser.

La chaîne casse à la première marche.

L'Atelier du Quiz déroule les 5 étapes avec toi en 7 jours 👉 {LIEN}`,
  },
  {
    platform: "Email court / DM",
    hook: "Relance douce 1 ligne",
    body: `Petit rappel : le quiz qui capte des leads en automatique, tu peux l'avoir en ligne dans 7 jours. Une action par jour, 47€ une fois, garantie 30 jours. 👉 {LIEN}`,
  },
];

export interface ArticleAngle {
  title: string;
  angle: string;
}

export const ARTICLE_ANGLES: ArticleAngle[] = [
  {
    title: "Pourquoi ton quiz ne te ramène aucun lead (et comment y remédier)",
    angle:
      "Démonte l'idée que le problème vient du quiz. Le vrai sujet : le trafic, le profilage et les relances. Termine sur L'Atelier du Quiz comme méthode complète (lien affilié).",
  },
  {
    title: "Étude de cas : 285 leads en 9 jours en partant de zéro",
    angle:
      "Raconte l'histoire de Jocelyne (niche inconnue, aucune liste). Décortique l'enchaînement capter, attirer, profiler, transformer. CTA vers l'Atelier.",
  },
  {
    title: "La méthode CAPTO expliquée simplement",
    angle:
      "Un article pédagogique sur les 5 étapes. Donne un maillon en cadeau (l'ordre des questions), garde le reste pour l'Atelier. Idéal en SEO longue traîne.",
  },
  {
    title: "Quiz, sondage, test de personnalité : lequel pour capter des leads ?",
    angle:
      "Comparatif utile qui positionne le quiz de profilage comme le plus efficace. Recommande l'outil (Tiquiz) et la méthode (l'Atelier) en fin d'article.",
  },
];

export interface VideoIdea {
  format: string;
  title: string;
  outline: string;
}

export const VIDEO_IDEAS: VideoIdea[] = [
  {
    format: "Reel / Short (30-45 s)",
    title: "Le réglage à 0€ qui garde tes leads",
    outline:
      "Hook : \"Tes visiteurs abandonnent ton quiz juste avant de te laisser leur email.\" Montre l'ordre des questions qui change tout. CTA : méthode complète dans l'Atelier, lien en bio.",
  },
  {
    format: "Reel / Short (30-45 s)",
    title: "285 leads, 63€ de pub",
    outline:
      "Balance les 3 chiffres à l'écran. \"Partie de zéro, sans audience.\" Explique en 2 phrases le quiz qui tague. CTA vers l'Atelier.",
  },
  {
    format: "Vidéo YouTube (5-8 min)",
    title: "J'ai construit un quiz qui capte des leads en 7 jours",
    outline:
      "Format défi : une action par jour à l'écran, le quiz qui se monte, la connexion Systeme.io sans code, le premier lead. Lien affilié en description et épinglé.",
  },
  {
    format: "Live / Webinaire",
    title: "Atelier offert : ton premier quiz lead-magnet",
    outline:
      "Mini-atelier live où tu montres la création d'un quiz en direct, puis tu recommandes l'Atelier pour aller au bout (trafic, relances). CTA lien affilié en fin de live.",
  },
];

export interface DefaultAsset {
  title: string;
  description: string;
  /** Chemin public (servi depuis /public/affiliate-kit). */
  url: string;
  fileType: string;
}

/**
 * Kit visuel officiel de L'Atelier du Quiz, fourni d'office à tous les
 * affiliés (logo, icône, mockups, jaquette). Servi depuis /public : le
 * process de deploy doit recopier /public dans le build standalone (déjà
 * le cas pour le logo / favicon). Béné peut en ajouter d'autres via
 * l'admin (bucket Supabase) ; les deux listes s'affichent ensemble.
 */
export const DEFAULT_ASSETS: DefaultAsset[] = [
  {
    title: "Logo Atelier du Quiz",
    description: "Logo complet, fond transparent (PNG).",
    url: "/affiliate-kit/logo-atelier-du-quiz.png",
    fileType: "image/png",
  },
  {
    title: "Logo Atelier du Quiz (vectoriel)",
    description: "Logo complet en SVG, net à toutes les tailles.",
    url: "/affiliate-kit/logo-atelier-du-quiz.svg",
    fileType: "image/svg+xml",
  },
  {
    title: "Icône seule",
    description: "Icône carrée, idéale en avatar ou vignette.",
    url: "/affiliate-kit/logo-icone.png",
    fileType: "image/png",
  },
  {
    title: "Mockup produit",
    description: "Visuel produit à poser dans tes posts et emails.",
    url: "/affiliate-kit/mockup-atelier-du-quiz.png",
    fileType: "image/png",
  },
  {
    title: "Mockup produit (fond blanc)",
    description: "Même mockup sur fond blanc, pour les fonds clairs.",
    url: "/affiliate-kit/mockup-atelier-du-quiz-fond-blanc.png",
    fileType: "image/png",
  },
  {
    title: "Jaquette Atelier du Quiz",
    description: "Couverture verticale, pour vignettes et miniatures.",
    url: "/affiliate-kit/jaquette-atelier-du-quiz.png",
    fileType: "image/png",
  },
  {
    title: "Logo fond foncé",
    description: "Version du logo à poser sur un fond sombre (SVG).",
    url: "/affiliate-kit/logo-atelier-du-quiz-fond-fonce.svg",
    fileType: "image/svg+xml",
  },
];

/**
 * Posts réseaux prêts à publier (format 4:5), fournis d'office. Numéros
 * impairs = visuel image (PNG), numéros pairs = carrousel (PDF). Servis
 * depuis /public/affiliate-kit/posts.
 */
export const DEFAULT_POSTS: DefaultAsset[] = [
  { n: 1, kind: "image" },
  { n: 2, kind: "carousel" },
  { n: 3, kind: "image" },
  { n: 4, kind: "carousel" },
  { n: 5, kind: "image" },
  { n: 6, kind: "carousel" },
  { n: 7, kind: "image" },
  { n: 8, kind: "carousel" },
  { n: 9, kind: "image" },
  { n: 10, kind: "carousel" },
  { n: 11, kind: "image" },
  { n: 12, kind: "carousel" },
  { n: 13, kind: "image" },
  { n: 14, kind: "carousel" },
  { n: 15, kind: "image" },
].map(({ n, kind }) => {
  const num = String(n).padStart(2, "0");
  const isImg = kind === "image";
  return {
    title: `Post ${n}`,
    description: isImg ? "Visuel prêt à publier (image)." : "Carrousel prêt à publier (PDF).",
    url: `/affiliate-kit/posts/post-${num}.${isImg ? "png" : "pdf"}`,
    fileType: isImg ? "image/png" : "application/pdf",
  };
});

/** Pack "textes des posts" (légendes) à télécharger (Word). */
export const POSTS_TEXT_DOC: DefaultAsset = {
  title: "Textes des posts (Word)",
  description: "Toutes les légendes des posts, à copier-coller et adapter.",
  url: "/affiliate-kit/posts/kit-reseaux-sociaux-affilies.docx",
  fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Remplace {LIEN} et {TON_PRENOM} par les valeurs de l'affilié. {first_name}
 *  est laissé intact (champ de fusion de l'outil d'emailing de l'affilié). */
export function fillSwipe(text: string, opts: { link: string; firstName: string | null }): string {
  const link = opts.link?.trim() || "TON_LIEN_AFFILIE";
  const prenom = (opts.firstName ?? "").trim() || "Ton prénom";
  return text.replace(/\{LIEN\}/g, link).replace(/\{TON_PRENOM\}/g, prenom);
}
