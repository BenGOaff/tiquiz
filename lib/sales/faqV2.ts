// lib/sales/faqV2.ts
//
// LA FAQ, REFAITE SIMPLE ET CLIQUABLE.
//
// Béné, 2 septembre 2026 : "tu peux simplifier la FAQ, redresser les
// blocs, supprimer les effets, la rendre plus simple et facile à
// naviguer" et "je ne peux pas cliquer sur les éléments de la faq".
//
// -- ELLE AVAIT RAISON, ET C'ÉTAIT MA RÉGRESSION ----------------------
//
// La FAQ d'origine EST un accordéon, et c'est le bundle React de
// l'éditeur Systeme.io qui l'ouvre. En retirant ce bundle (sans quoi la
// page servie était ignorée), je l'ai figée.
//
// ET MA MESURE AVAIT DIT LE CONTRAIRE. J'avais comparé la hauteur au
// repos (1608 px) et la longueur du texte (4886 caractères) : identiques
// des deux côtés, parce que tout est visible au repos. Je n'avais jamais
// CLIQUÉ. Refait avec un clic :
//
//     ORIGINE  1608 px -> 1730 px   ça bouge
//     V2       1608 px -> 1608 px   immobile
//
// Deuxième fois dans le même chantier qu'un contrôle ne distingue pas ce
// qu'il est censé distinguer, et sur la même page. La règle est écrite
// depuis le 22 août ; ce qui manquait ici, c'est de MESURER LE GESTE, pas
// l'état au repos.
//
// -- LA REFONTE : PAS UNE LIGNE DE JAVASCRIPT --------------------------
//
// `<details>` / `<summary>` natifs. Ça s'ouvre au clic, au clavier, à la
// recherche du navigateur (Ctrl+F ouvre le bon panneau tout seul depuis
// `hidden="until-found"`), et ça ne peut pas se casser en retirant un
// script. Aucune animation, aucune ombre portée : "supprimer les effets".
//
// -- LA SOURCE EST LE JSON-LD, ET C'EST LE POINT IMPORTANT ------------
//
// La page porte déjà un `FAQPage` en données structurées, avec les 16
// questions et leurs réponses. Écrire la FAQ VISIBLE à côté donnerait
// deux listes de la même chose, donc deux listes qui divergent, donc
// Google à qui on raconte autre chose qu'à la lectrice.
//
// Le script LIT le JSON-LD et FABRIQUE la section à partir de lui. Une
// seule source, par construction.

// ATTENTION À L'ORDRE : `CORRECTIONS_FAQ` s'applique AVANT `rangerFaq`,
// donc les débuts de question ci dessous nomment le texte CORRIGÉ, pas
// celui de la capture. Le script l'a dit tout seul au premier essai
// (« le plan de la FAQ nomme des questions absentes »), et c'est ce
// qu'on lui demande : ne jamais laisser une question disparaître.

/** Un groupe de questions, pour qu'on s'y retrouve sans tout lire. */
export interface GroupeFaq {
  readonly titre: string;
  /** Le DÉBUT de chaque question, dans l'ordre voulu. */
  readonly questions: readonly string[];
}

/**
 * Les cinq groupes.
 *
 * SEIZE questions à la file, c'est un mur : on ne cherche pas, on
 * abandonne. Regroupées, on saute directement à la sienne.
 *
 * L'ordre des groupes suit celui des inquiétudes : est-ce que je peux
 * m'en servir, est-ce que ça marche avec MON outil, qu'est-ce que ça
 * fait, combien ça m'engage, et après.
 */
export const GROUPES_FAQ: readonly GroupeFaq[] = [
  {
    titre: "Avant de commencer",
    questions: [
      "Ai-je besoin d'une carte bancaire",
      "Est-ce que j'aurai quelque chose à télécharger",
      "Je démarre de zéro",
      "Pourra-t-on utiliser Tiquiz depuis un smartphone",
    ],
  },
  {
    titre: "Systeme.io et les connexions",
    questions: [
      "J'ai absolument besoin d'un compte Systeme io",
      "Faut-il un abonnement payant",
      "Est-ce que Tiquiz est compatible avec le compte gratuit",
      "Ai-je besoin de connecter Zapier",
      "Ai-je besoin de clés API",
    ],
  },
  {
    titre: "Les quiz et le partage",
    questions: [
      "Mes utilisateurs sont-ils obligés de partager",
      "Sur quels réseaux sociaux",
    ],
  },
  {
    titre: "L'abonnement",
    questions: ["Y a-t-il des frais cachés", "Comment résilier mon abonnement"],
  },
  {
    titre: "Pour aller plus loin",
    questions: [
      "Est-ce qu'il y a une formation",
      "C'est quoi Tipote",
      "J'ai encore des questions",
    ],
  },
] as const;

/** Une question du JSON-LD. */
export interface QuestionFaq {
  readonly name: string;
  readonly acceptedAnswer: { readonly text: string };
}

/**
 * Les corrections de texte de la FAQ.
 *
 * Elles portent sur des choses FAUSSES ou INTERDITES, jamais sur du
 * style : une passe qui réécrit le ton de Béné ne se voit pas venir et
 * ne se défait pas.
 */
export const CORRECTIONS_FAQ: readonly { cherche: string; remplace: string; pourquoi: string }[] = [
  {
    cherche: "Serai-je obligé(e) de prendre un abonnement chez Systeme.io ?",
    remplace: "Faut-il un abonnement payant chez Systeme.io ?",
    pourquoi:
      "« obligé(e) » liste les deux genres au lieu de n'en imposer aucun. " +
      "On tourne la phrase, comme partout ailleurs depuis le 23 août : " +
      "le point médian et la parenthèse n'existent qu'en français, une " +
      "phrase tournée marche dans les 7 langues.",
  },
  {
    cherche: "Non, tu n'es pas obligé(e).",
    remplace: "Non, ce n'est pas obligatoire.",
    pourquoi: "Même raison, dans la réponse.",
  },
  {
    cherche: "Je suis débutant(e), est-ce que Tiquiz peut m'aider quand même ?",
    remplace: "Je démarre de zéro, est-ce que Tiquiz peut m'aider quand même ?",
    pourquoi: "Même raison. « Je démarre de zéro » dit en plus quelque chose de plus concret.",
  },
  {
    cherche: "https://www.tipote.fr/atelier-du-quiz-bene",
    remplace: "https://atelierduquiz.fr/",
    pourquoi:
      "Un lien qui atterrit chez Systeme.io ne paie PLUS PERSONNE depuis " +
      "que nos liens portent `?ref=` (24 août) : leur page ignore ce " +
      "paramètre, notre middleware ne voit jamais la requête, et leur " +
      "webhook ne sait lire qu'un `sa`. `atelierduquiz.fr` est un hôte de " +
      "vente à nous depuis le 26 août, et son middleware capte le `?ref=`.",
  },
  {
    cherche: "Tu peux découvrir l'Atelier du Quiz ici >>",
    remplace: "Tu peux découvrir l'Atelier du Quiz sur atelierduquiz.fr",
    pourquoi:
      "« ici >> » ne dit rien quand le lien disparaît, et il disparaît " +
      "partout où la réponse est rendue en TEXTE (la FAQ de la landing " +
      "lit le même JSON-LD). Nommer la destination marche dans les deux " +
      "cas, et le lien reste cliquable là où il existe.",
  },
  {
    // ON VISE LE TEXTE DU LIEN, PAS LA PHRASE. Le premier jet cherchait
    // « Par email en cliquant ici >> », qui TRAVERSE la balise <a> : dans
    // le JSON-LD brut, seul « cliquant ici &gt;&gt; » est le texte du
    // lien, et la correction ne trouvait rien.
    cherche: "cliquant ici >>",
    remplace: "écrivant à hello@tiquiz.fr.",
    pourquoi:
      "C'est la seule ligne de la FAQ qui promet une réponse humaine, et " +
      "« en cliquant ici » ne dit rien partout où le lien disparaît (la " +
      "FAQ de la landing rend la réponse en TEXTE). Nommer l'adresse " +
      "marche dans les deux cas, et le lien reste cliquable là où il est.",
  },
  {
    cherche: "mailto:hello@tipote.com",
    remplace: "mailto:hello@tiquiz.fr",
    pourquoi:
      "L'adresse de Tiquiz est `hello@tiquiz.fr` depuis le 30 août (Cloudflare, " +
      "Resend, et le `.env`). La FAQ envoyait encore sur celle de Tipote, sur la " +
      "seule ligne de la page qui promet une réponse humaine.",
  },
] as const;

/**
 * APPLIQUE LES CORRECTIONS, QUEL QUE SOIT L'ÉCHAPPEMENT DU TEXTE.
 *
 * Deux consommateurs lisent la même liste et ne voient pas le même
 * texte : le script de la page v2 travaille sur le JSON-LD BRUT, où les
 * chevrons sont écrits `&gt;&gt;`, et l'extracteur de la landing
 * travaille sur le texte DÉSÉCHAPPÉ. La correction « ici >> » trouvait
 * donc chez l'un et pas chez l'autre.
 *
 * Une deuxième liste écrite pour l'autre forme aurait diverge en une
 * semaine. Cette fonction essaie les DEUX formes, et rend le nombre de
 * corrections qui ont mordu pour que l'appelant puisse REFUSER quand
 * une ne trouve rien : une correction qui ne trouve rien est une
 * correction qu'on croit appliquée.
 */
export function appliquerCorrectionsFaq(texte: string): { texte: string; mordu: boolean[] } {
  let out = texte;
  const mordu: boolean[] = [];
  for (const c of CORRECTIONS_FAQ) {
    const echappe = (t: string) => t.replace(/>/g, "&gt;").replace(/</g, "&lt;");
    const formes = [c.cherche, echappe(c.cherche)];
    let touche = false;
    for (const f of formes) {
      if (!out.includes(f)) continue;
      // Le remplacement suit la forme trouvée : sinon on injecterait un
      // chevron nu dans du JSON destiné à du HTML.
      const remplace = f === c.cherche ? c.remplace : echappe(c.remplace);
      out = out.split(f).join(remplace);
      touche = true;
    }
    mordu.push(touche);
  }
  return { texte: out, mordu };
}

/** Le rang d'une question dans le plan, ou -1 si aucun groupe ne la prend. */
export function rangDansLesGroupes(nom: string): number {
  let rang = 0;
  for (const g of GROUPES_FAQ) {
    for (const q of g.questions) {
      if (nom.startsWith(q)) return rang;
      rang++;
    }
  }
  return -1;
}

/**
 * Range les questions du JSON-LD dans les groupes.
 *
 * AUCUNE QUESTION NE SE PERD, et c'est ce que le script vérifie : une
 * question que le plan ne nomme pas disparaîtrait de la page tout en
 * restant dans les données structurées. Google lirait une réponse que
 * la lectrice ne voit pas, ce qui est exactement le genre d'écart qui
 * fait déclasser une page.
 */
export function rangerFaq(questions: readonly QuestionFaq[]): {
  groupes: { titre: string; questions: QuestionFaq[] }[];
  orphelines: QuestionFaq[];
  inconnues: string[];
} {
  const restantes = [...questions];
  const groupes = GROUPES_FAQ.map((g) => {
    const prises: QuestionFaq[] = [];
    for (const debut of g.questions) {
      const i = restantes.findIndex((q) => q.name.startsWith(debut));
      if (i >= 0) prises.push(...restantes.splice(i, 1));
    }
    return { titre: g.titre, questions: prises };
  });
  const attendues = GROUPES_FAQ.flatMap((g) => g.questions);
  const inconnues = attendues.filter((d) => !questions.some((q) => q.name.startsWith(d)));
  return { groupes, orphelines: restantes, inconnues };
}
