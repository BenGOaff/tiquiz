// lib/site/aPropos.ts
//
// LA PAGE AUTEUR : SON HISTOIRE, ET RIEN QUI SOIT INVENTÉ.
//
// Béné, 8 septembre 2026 : "je bosse sur la landing, continue la
// traduction de tout stp."
//
// ── D'OÙ VIENT CE TEXTE ──────────────────────────────────────────────
//
// De SA page, lue le 30 août 2026. Le français vit ici tel qu'il était
// dans `app/.../a-propos/page.tsx` : ses phrases sont gardées mot pour
// mot partout où elles sont fortes, et les reformuler "proprement"
// aurait produit exactement le texte lisse qu'elle repère en trois
// lignes. C'est sa vie, elle la raconte mieux que n'importe quelle
// reformulation.
//
// ── UNE STRUCTURE, UN TEXTE PAR LANGUE ───────────────────────────────
//
// Même geste que `lib/site/fonctionnalites.ts` et
// `lib/site/generateurQuiz.ts` : ce qui est STRUCTUREL (l'ordre des
// sections, les liens, les profils, les données structurées) vit UNE
// fois ; une langue n'apporte que du TEXTE. `TRADUCTIONS` est un
// `Record` sur les langues sans préfixe exclues, donc une langue
// ajoutée sans son texte ne compile pas : sans ça, un champ manquant
// servirait du FRANÇAIS sous une adresse anglaise, la page
// s'afficherait parfaitement, et Google indexerait du contenu dupliqué.
//
// ── L'ANGLAIS N'EST PAS DU MOT À MOT ─────────────────────────────────
//
// Béné, 8 septembre : "il faut à chaque fois utiliser le champ
// sémantique, les expressions, tournures de phrases, ponctuation etc.
// propre à chaque langue, c'est pas uniquement du mot à mot."
//
// Donc la typographie est anglaise (aucune espace devant `?` et `:`, le
// `%` collé, `€387` symbole devant), et les tournures sont celles d'un
// récit anglais. Ce qui ne bouge PAS : les FAITS. Les montants, les
// dates, les métiers, les lieux, le nombre d'opérations, les deux ans
// perdus et les 30 000 € sont les siens.
//
// ── LA CITATION DE SON EX-ASSOCIÉ EST TRADUITE, ET C'EST UNE DÉCISION ─
//
// La règle du 5 septembre dit qu'un TÉMOIGNAGE ne se traduit jamais :
// une carte de preuve sociale porte les mots de quelqu'un, et les
// réécrire en ferait un faux témoignage. Celle là est autre chose :
// c'est une parole RAPPORTÉE à l'intérieur de son récit, dont elle est
// la narratrice, et un lecteur anglophone ne peut pas la lire en
// français. Un récit traduit traduit les paroles qu'il rapporte.
//
// Ce n'est pas pour autant à moi de trancher : c'est écrit ici pour que
// Béné puisse dire non, et la version française reste la source.

import type { LanguePublique } from "@/lib/site/langues";
import { LANGUE_SANS_PREFIXE } from "@/lib/site/langues";

/** L'adresse de la page. Le slug est le MÊME dans les deux langues. */
export const CHEMIN_A_PROPOS = "/a-propos";

/** Une carte de produit, en bas de la section Tiquiz. */
export interface CarteProduit {
  titre: string;
  corps: string;
  bouton: string;
}

/** Tout ce qui se LIT sur la page auteur. */
export interface TexteAPropos {
  /** La langue de ce texte, pour l'attribut `lang` du `<main>`. */
  langue: LanguePublique;
  metaTitre: string;
  metaDescription: string;

  etiquette: string;
  /** Le titre est coupé en deux : le mot surligné termine la phrase. */
  h1Avant: string;
  h1Surligne: string;
  intro: readonly string[];
  altPortrait: string;

  origines: { titre: string; p: readonly string[] };
  arret: { titre: string; p: readonly string[] };
  iziquiz: {
    titre: string;
    p: readonly string[];
    citation: string;
    citationAuteur: string;
  };
  tiquiz: { titre: string; p: readonly string[]; emphase: string };
  produits: { tiquiz: CarteProduit; atelier: CarteProduit };
  valeurs: { titre: string; p: readonly string[]; emphase: string };

  doutes: { titre: string; corps: string };
  suivre: string;
  boutons: { newsletter: string; blog: string; ecrire: string };
  /** La note légale : le nom de la société est INTERPOLÉ entre les deux. */
  mentions: { avant: string; milieu: string; lien: string };

  /**
   * CE QUI PART DANS LES DONNÉES STRUCTURÉES.
   *
   * `knowsAbout` est lu par les moteurs pour savoir de QUOI elle parle :
   * le laisser en français sur une page anglaise décrirait une personne
   * dans une langue que la page ne sert pas.
   */
  jsonLd: {
    jobTitle: string;
    knowsAbout: readonly string[];
    orgDescription: string;
  };
}

const FR: TexteAPropos = {
  langue: "fr",
  metaTitre: "Bénédicte Lagardette : d'infirmière à fondatrice de Tiquiz",
  metaDescription:
    "Ex-infirmière, handicapée à 34 ans, elle a repris depuis son lit et code aujourd'hui ses propres logiciels. L'histoire derrière Tiquiz et l'Atelier du Quiz.",

  etiquette: "À propos",
  h1Avant: "Moi c'est Béné, et j'ai créé",
  h1Surligne: "Tiquiz",
  intro: [
    "On me connaît pour Tiquiz, mon logiciel de création de quiz, et pour l'Atelier du Quiz, où j'apprends aux solopreneurs à transformer un simple quiz en machine à trouver des clients.",
    "Mais pour comprendre pourquoi je fais ça, et pourquoi tu peux me croire quand je te parle de leads et d'éthique, il faut revenir un peu en arrière.",
  ],
  altPortrait: "Bénédicte Lagardette, fondatrice de Tiquiz",

  origines: {
    titre: "D'où je viens",
    p: [
      "Je viens d'une famille modeste de vignerons du Beaujolais. Avant les tunnels de vente, j'ai vendangé. J'ai aussi été maître-nageuse, chauffeuse-livreuse, ambulancière.",
      "Puis j'ai passé mon concours d'infirmière à 27 ans, haut la main et sans prépa. Et j'ai exercé là où ça compte vraiment : aux urgences en Corse, en ambulance en Suisse, dans la lutte contre la tuberculose, avec les pompiers.",
      "Mes valeurs, je les tiens de ces années et de mon éducation : prendre soin, pour de vrai. Protéger les plus fragiles, partager ce que je sais plutôt que de le garder pour moi, donner de mon temps, et tendre la main à celui qui galère. Accueillir chacun tel qu'il est, avec son histoire et ses moyens, sans jamais le juger sur son point de départ.",
      "Mais attention : je suis sympa et j'aide volontiers, ça ne veut pas dire que j'encaisse tout et qu'on peut me prendre pour une quiche. J'ai assez roulé ma bosse dans ce milieu pour repérer quelqu'un de malhonnête, et ça, je ne le supporte plus.",
    ],
  },
  arret: {
    titre: "Et puis, à 34 ans, tout s'est arrêté",
    p: [
      "Une hernie discale, une opération en urgence, puis deux autres. Je finis handicapée, en fauteuil, obèse et incapable de dormir, de tenir debout ou assise.",
      "Début 2020, je n'avais plus un centime de revenu. Zéro. Enfin non, pas tout à fait : j'ai droit à 387 € de pension d'invalidité (ça paye même pas le loyer). Plus aucun but, une santé merdique et un traitement de cheval pour supporter la douleur. Et ça a duré pendant des mois.",
      "La médecine du travail avait beau dire que j'étais inapte, il était hors de question pour moi de ne plus rien apporter à la société, de dépendre des aides sociales pour le restant de mes jours.",
      "Alors je m'y suis mise, depuis mon lit, malgré la douleur et les insomnies. J'ai découvert le marketing digital, l'affiliation, la création de contenu. J'ai lancé mon blog, blagardette.com, et j'ai construit une audience en partant de rien. Je suis infiniment reconnaissante envers toutes ces personnes qui me suivent parfois depuis le début 🙏",
      "Pour être sincère : le traitement antalgique de ouf, les douleurs chroniques et les effets secondaires, j'en souffrirai toute ma vie. Mais au moins j'ai un but maintenant. Et je suis financièrement libre.",
    ],
  },
  iziquiz: {
    titre: "L'histoire d'iziquiz, mon plus gros échec",
    p: [
      "J'avais une conviction : le quiz est le meilleur outil pour capter et qualifier des leads. Cette intuition s'est largement confirmée quand j'ai étudié les études sérieuses sur le sujet et fait mes propres tests. Alors j'ai voulu créer le logiciel qui allait avec, connecté à mon outil préféré : Systeme.io. Je l'ai appelé iziquiz.",
      "Un associé m'a rejointe, et ensemble on a confié le développement à un prestataire. Un type qui se vantait d'avoir 30 ans d'expérience, et qui savait bien vendre son truc.",
      "Deux ans à bosser comme une acharnée, pour rien. Un logiciel promis qui n'arrivait jamais. 30 000 € partis en fumée. Une amitié gâchée. Et le pire, pour moi : des centaines de clients à qui on avait promis un outil, et qui se retrouvaient sans rien.",
      "Cette sensation, je ne l'oublierai jamais. Avoir vendu une promesse sincère, y croire à fond, et se retrouver les mains vides devant des gens déçus.",
      "Beaucoup auraient tout arrêté là. Pas moi. Abandonner ces clients, mes convictions me l'interdisaient : on ne laisse jamais quelqu'un en plan. Encore moins quelqu'un qui m'a fait confiance et qui m'a donné son argent durement gagné.",
    ],
    citation:
      "\"Tu as fait mieux en 2 mois qu'un soi-disant développeur et ses 30 ans d'expérience en 2 ans.\"",
    citationAuteur:
      "Mon ex-associé. Et il a raison. Je ne suis pas du genre à me vanter, mais j'ai fait mieux, et j'en suis fière.",
  },
  tiquiz: {
    titre: "Ce que j'en ai fait : Tiquiz",
    p: [
      "J'ai repris le projet. Seule. Et cette fois, j'ai codé l'outil moi-même, avec l'intelligence artificielle comme copilote. Le résultat, c'est Tiquiz : un logiciel meilleur que celui qu'on avait imaginé au départ, connecté à Systeme.io (j'ai tout mon business dessus depuis 2020), pensé pour les créateurs qui veulent des leads sans usine à gaz.",
      "Il y a un avantage que je n'avais pas vu venir : l'agilité. Comme je suis seule à la barre, je peux ajouter une fonctionnalité, corriger un bug ou améliorer un détail dans la journée, en écoutant directement les gens qui utilisent l'outil. Pas de comité de direction, pas d'associé à convaincre, pas de prestataire à relancer pendant des semaines.",
      "Alors oui, ça m'a pris des mois et j'ai franchement transpiré. J'ai douté, je suis revenue en arrière, j'ai perdu des semaines entières à cause d'erreurs stupides. Mais j'ai appris, et ce que je propose aujourd'hui est aussi solide que n'importe quel outil codé par un développeur avec de l'expérience.",
    ],
    emphase: "L'échec que je croyais fatal est devenu ma plus grande force.",
  },
  produits: {
    tiquiz: {
      titre: "Tiquiz",
      corps:
        "Le logiciel pour créer ton quiz et capturer des leads qualifiés, sans usine à gaz. Connecté à Systeme.io pour faciliter tout le processus.",
      bouton: "Découvrir Tiquiz",
    },
    atelier: {
      titre: "L'Atelier du Quiz",
      corps:
        "La méthode en 7 jours pour faire de ton quiz un système fiable qui te ramène des clients de manière automatique et prédictible.",
      bouton: "Voir l'Atelier",
    },
  },
  valeurs: {
    titre: "Les valeurs que je défends",
    p: [
      "Il y a une règle à laquelle je n'ai jamais renoncé : je préfère les gens qui partagent mes valeurs à l'argent facile. La solidarité et la bienveillance, c'est pas un argument de vente à mes yeux. C'est ce qui m'a sauvée. Alors c'est ce que je mets au centre de tout.",
      "Dans mon travail, ça se traduit simplement : travail acharné, solidarité, éthique sans compromis. Je ne vends jamais de méthode \"miracle\". Je code avec l'IA, j'adore le growth hacking, je suis passionnée par le copywriting, et je suis convaincue qu'on peut réussir sans jamais forcer la main de personne.",
      "Ce que je gagne, je veux le mériter. Et je veux que mes clients gagnent aussi. Pour moi, un bon business est un business dans lequel tout le monde sort grandi.",
    ],
    emphase:
      "Je ne serai jamais la plus grosse boîte du marché. Mais je serai toujours celle qui est là pour de vrai, qui te répond, et qui améliore son outil pour toi, tous les jours.",
  },

  doutes: {
    titre: "Encore des doutes sur ma sincérité ?",
    corps: "Va lire les retours de mes clients sur mes pages Trustpilot. Tout y est.",
  },
  suivre: "Où me suivre",
  boutons: {
    newsletter: "Recevoir ma newsletter",
    blog: "Lire le blog",
    ecrire: "M'écrire",
  },
  mentions: {
    avant: "Tiquiz et l'Atelier du Quiz sont édités par ",
    milieu: ", dont je suis la dirigeante. L'adresse et les mentions complètes sont sur la ",
    lien: "page des mentions légales",
  },

  jsonLd: {
    jobTitle: "Fondatrice de Tiquiz et de l'Atelier du Quiz",
    knowsAbout: [
      "Création de quiz",
      "Génération de leads",
      "Marketing par quiz",
      "Tunnel de vente",
      "Email marketing",
      "Growth hacking",
      "Copywriting",
      "Tiquiz",
      "Atelier du Quiz",
      "Intelligence artificielle",
      "Systeme.io",
    ],
    orgDescription:
      "Logiciel de création de quiz connecté à Systeme.io, pour capter et qualifier des leads. Éditeur de l'Atelier du Quiz.",
  },
};

const EN: TexteAPropos = {
  langue: "en",
  metaTitre: "Benedicte Lagardette: from nurse to founder of Tiquiz",
  metaDescription:
    "A former nurse, disabled at 34, she started over from her bed and now codes her own software. The story behind Tiquiz and the Atelier du Quiz.",

  etiquette: "About",
  h1Avant: "I'm Bene, and I built",
  h1Surligne: "Tiquiz",
  intro: [
    "People know me for Tiquiz, my quiz builder, and for the Atelier du Quiz, where I teach solopreneurs how to turn a simple quiz into a machine that finds them clients.",
    "But to understand why I do this, and why you can take my word when I talk to you about leads and about ethics, we need to go back a little.",
  ],
  altPortrait: "Benedicte Lagardette, founder of Tiquiz",

  origines: {
    titre: "Where I come from",
    p: [
      "I come from a modest family of Beaujolais winegrowers. Long before sales funnels, I picked grapes. I've also been a lifeguard, a delivery driver, an ambulance worker.",
      "Then I sat my nursing exam at 27, passed it easily and without a prep course. And I worked where it really counts: the emergency room in Corsica, an ambulance in Switzerland, tuberculosis screening, alongside firefighters.",
      "My values come from those years and from how I was raised: taking care of people, for real. Protecting the most fragile, sharing what I know instead of keeping it to myself, giving my time, and holding out a hand to whoever is struggling. Taking everyone as they are, with their story and their means, without ever judging them on where they started.",
      "One thing though: I'm friendly and I help gladly, and that doesn't mean I'll swallow anything or that I can be taken for a fool. I've been around this world long enough to spot someone dishonest, and that, I no longer put up with.",
    ],
  },
  arret: {
    titre: "And then, at 34, everything stopped",
    p: [
      "A herniated disc, emergency surgery, then two more. I ended up disabled, in a wheelchair, obese and unable to sleep, to stand or to sit.",
      "In early 2020 I had no income left at all. Zero. Well, not quite: I'm entitled to a €387 disability pension (that doesn't even cover the rent). No purpose left, lousy health and a brutal treatment to get through the pain. And it went on for months.",
      "Occupational health could call me unfit all it wanted, there was no way I was going to stop contributing anything to society, or depend on benefits for the rest of my life.",
      "So I got to work, from my bed, through the pain and the sleepless nights. I discovered digital marketing, affiliate marketing, content creation. I launched my blog, blagardette.com, and I built an audience from nothing. I'm endlessly grateful to all the people who follow me, some of them since day one 🙏",
      "To be honest with you: the heavy painkillers, the chronic pain and the side effects are mine for life. But at least I have a purpose now. And I'm financially free.",
    ],
  },
  iziquiz: {
    titre: "The story of iziquiz, my biggest failure",
    p: [
      "I had one conviction: a quiz is the best tool there is to capture and qualify leads. That hunch was largely confirmed once I read the serious research on the subject and ran my own tests. So I set out to build the software that went with it, connected to my favourite tool: Systeme.io. I called it iziquiz.",
      "A business partner joined me, and together we handed the development to a contractor. A guy who boasted about 30 years of experience, and who knew how to sell his story.",
      "Two years of working myself to the bone, for nothing. A promised piece of software that never arrived. €30,000 up in smoke. A friendship ruined. And the worst part, for me: hundreds of customers who had been promised a tool, and who ended up with nothing.",
      "I will never forget that feeling. Having sold a sincere promise, believing in it completely, and standing empty-handed in front of people you've let down.",
      "Plenty of people would have stopped there. Not me. My convictions wouldn't let me walk away from those customers: you never leave someone stranded. Least of all someone who trusted you and handed you their hard-earned money.",
    ],
    citation:
      "\"You did more in 2 months than a so-called developer with 30 years of experience did in 2 years.\"",
    citationAuteur:
      "My former business partner. And he's right. I'm not one to brag, but I did do better, and I'm proud of it.",
  },
  tiquiz: {
    titre: "What I made of it: Tiquiz",
    p: [
      "I took the project back. On my own. And this time I coded the tool myself, with AI as my copilot. The result is Tiquiz: a better piece of software than the one we had imagined at the start, connected to Systeme.io (my whole business has run on it since 2020), built for creators who want leads without a monster to maintain.",
      "There's one upside I hadn't seen coming: how fast I can move. Since I'm the only one at the helm, I can add a feature, fix a bug or improve a detail within the day, listening directly to the people who use the tool. No steering committee, no partner to convince, no contractor to chase for weeks.",
      "So yes, it took me months and I genuinely sweated. I doubted myself, I backtracked, I lost entire weeks to stupid mistakes. But I learned, and what I offer today is as solid as any tool coded by an experienced developer.",
    ],
    emphase: "The failure I thought would finish me became my greatest strength.",
  },
  produits: {
    tiquiz: {
      titre: "Tiquiz",
      corps:
        "The software to build your quiz and capture qualified leads, without a monster to maintain. Connected to Systeme.io to make the whole process easier.",
      bouton: "Discover Tiquiz",
    },
    atelier: {
      titre: "The Atelier du Quiz",
      corps:
        "The 7-day method to turn your quiz into a reliable system that brings you clients automatically and predictably.",
      bouton: "See the Atelier",
    },
  },
  valeurs: {
    titre: "The values I stand for",
    p: [
      "There's one rule I've never given up on: I'd rather have people who share my values than easy money. Solidarity and kindness aren't a selling point to me. They're what saved me. So they're what I put at the centre of everything.",
      "In my work, that translates simply: hard work, solidarity, ethics with no compromise. I never sell a \"miracle\" method. I code with AI, I love growth hacking, I'm passionate about copywriting, and I'm convinced you can succeed without ever twisting anyone's arm.",
      "What I earn, I want to have earned. And I want my clients to win too. To me, a good business is one where everyone comes out better off.",
    ],
    emphase:
      "I will never be the biggest company on the market. But I'll always be the one who's actually there, who answers you, and who improves her tool for you, every single day.",
  },

  doutes: {
    titre: "Still not sure I mean it?",
    corps: "Go read what my clients say on my Trustpilot pages. It's all there.",
  },
  suivre: "Where to follow me",
  boutons: {
    newsletter: "Get my newsletter",
    blog: "Read the blog",
    ecrire: "Write to me",
  },
  mentions: {
    avant: "Tiquiz and the Atelier du Quiz are published by ",
    milieu: ", of which I am the director. The address and the full legal notice are on the ",
    lien: "legal notice page",
  },

  jsonLd: {
    jobTitle: "Founder of Tiquiz and of the Atelier du Quiz",
    knowsAbout: [
      "Quiz creation",
      "Lead generation",
      "Quiz marketing",
      "Sales funnels",
      "Email marketing",
      "Growth hacking",
      "Copywriting",
      "Tiquiz",
      "Atelier du Quiz",
      "Artificial intelligence",
      "Systeme.io",
    ],
    orgDescription:
      "Quiz building software connected to Systeme.io, to capture and qualify leads. Publisher of the Atelier du Quiz.",
  },
};

/**
 * LE FRANÇAIS EST LA SOURCE, comme il l'est à la racine des adresses.
 * Une langue ajoutée ici sans son texte complet ne compile pas.
 */
const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteAPropos>
> = { en: EN };

/** Le texte de la page auteur, dans la langue demandée. */
export function contenuAPropos(langue: LanguePublique): TexteAPropos {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
