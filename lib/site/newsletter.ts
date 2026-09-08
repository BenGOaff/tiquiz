// lib/site/newsletter.ts
//
// LA PAGE D'INSCRIPTION A LA PEPITE DU LUNDI, DANS LES DEUX LANGUES.
//
// Bene, 8 septembre 2026 : "oui traduis la newsletter."
//
// -- D'OU VIENT LE FRANCAIS -------------------------------------------
//
// De SA page Systeme.io, reprise le 31 aout 2026 : le rendez-vous du
// lundi, ce qu'il y a dedans, les themes, ce qu'il n'y a PAS dedans,
// l'invitation a repondre, sa note de franchise. Le texte vivait dans
// `app/(site)/newsletter/page.tsx` et il est repris ICI a l'octet pres :
// le reformuler "proprement" aurait produit exactement le texte lisse
// qu'elle repere en trois lignes.
//
// -- UNE STRUCTURE, UN TEXTE PAR LANGUE -------------------------------
//
// Meme geste que `lib/site/aPropos.ts`, `fonctionnalites.ts` et
// `generateurQuiz.ts` : la STRUCTURE (l'ordre des sections, le nombre
// de cartes, les liens) vit UNE fois ; une langue n'apporte que du
// TEXTE. `TRADUCTIONS` est un `Record` sur les langues prefixees, donc
// une langue ajoutee sans son texte NE COMPILE PAS. Sans ca, un champ
// manquant servirait du francais sous une adresse anglaise, la page
// s'afficherait parfaitement, et Google jugerait l'anglais sur du
// contenu duplique.
//
// -- L'ANGLAIS N'EST PAS DU MOT A MOT ---------------------------------
//
// Bene, 8 septembre : "il faut a chaque fois utiliser le champ
// semantique, les expressions, tournures de phrases, ponctuation etc.
// propre a chaque langue, c'est pas uniquement du mot a mot."
//
// Donc : typographie anglaise (aucune espace devant `?` `:` `!`, le
// `%` colle), et des tournures anglaises la ou le calque sonnerait
// faux. "La pepite du lundi" devient "Monday's nugget" et pas "the
// Monday pepite" ; "a tester avant vendredi" devient "try it before
// Friday". Ce qui ne bouge PAS : ce qu'elle PROMET et ce qu'elle
// REFUSE. Les cinq "pas de" sont sa ligne rouge numero un (ne jamais
// mentir, meme pour vendre) : les adoucir en anglais reviendrait a
// promettre autre chose a un lecteur anglophone.
//
// -- CE MODULE EST PUR, ET C'EST OBLIGATOIRE --------------------------
//
// `FormulaireNewsletter` est un composant CLIENT (le seul du site
// public) et il l'appelle : un import de `next/headers`, de
// `supabaseAdmin` ou de quoi que ce soit qui touche au disque casserait
// son bundle sans qu'un `tsc` vert ne dise rien (drame du `node:fs` de
// la landing, 6 septembre). N'ajouter ici que des imports de type.

import type { LanguePublique } from "@/lib/site/langues";
import { LANGUE_SANS_PREFIXE } from "@/lib/site/langues";

/** L'adresse de la page. Le slug est le MEME dans les deux langues. */
export const CHEMIN_NEWSLETTER = "/newsletter";

/** Une des quatre cartes de "ce qu'il y a dedans". */
export interface CarteDedans {
  tag: string;
  titre: string;
  texte: string;
}

/** Un des cinq refus. `fort` est en gras, `suite` termine la phrase. */
export interface Refus {
  fort: string;
  suite: string;
}

/** Ce que le formulaire affiche, y compris ses messages d'echec. */
export interface TexteFormulaire {
  labelPrenom: string;
  placeholderPrenom: string;
  labelEmail: string;
  placeholderEmail: string;
  consentementAvant: string;
  lienConfidentialite: string;
  bouton: string;
  boutonEnvoi: string;
  succesTitre: string;
  succesCorps: string;
  /** Les raisons rendues par le serveur, traduites ici. */
  raisons: {
    email_manquant: string;
    email_invalide: string;
    consentement_manquant: string;
    trop_de_demandes: string;
    /** `{contact}` est remplace par l'adresse d'expedition. */
    indisponible: string;
  };
  reseau: string;
}

/** Tout ce qui se LIT sur la page de la newsletter. */
export interface TexteNewsletter {
  /** La langue de ce texte, pour l'attribut `lang` du `<main>`. */
  langue: LanguePublique;
  metaTitre: string;
  metaDescription: string;

  etiquette: string;
  /** Le titre est coupe en deux : le fragment surligne termine la phrase. */
  h1Avant: string;
  h1Surligne: string;
  /** L'accroche, coupee autour du fragment en gras. */
  introAvant: string;
  introFort: string;
  introApres: string;
  /** Les trois promesses. `fort` ouvre, `suite` termine. */
  promesses: readonly Refus[];

  /** La maquette d'email. Decorative, mais elle se lit quand meme. */
  maquette: {
    jour: string;
    objet: string;
    corps: string;
    etiquetteAction: string;
    action: string;
    signature: string;
  };

  formulaire: TexteFormulaire;

  dedansTitre: string;
  dedansIntro: string;
  dedans: readonly CarteDedans[];

  themesTitre: string;
  themesIntro: string;
  themes: readonly string[];

  pasDedansTitre: string;
  pasDedansIntro: string;
  pasDedans: readonly Refus[];

  reponds: { titre: string; p: readonly string[] };
  franchise: { titre: string; p: readonly string[] };

  /** La note de bas de page, coupee autour de l'adresse et du lien. */
  noteAvantAdresse: string;
  noteApresAdresse: string;
  noteLien: string;
  noteFin: string;
}

// ── LE FRANCAIS ──────────────────────────────────────────────────────
// Ses mots, repris de sa page. On ne les "ameliore" pas.

const FR: TexteNewsletter = {
  langue: "fr",
  metaTitre: "La pépite du lundi : une action à tester avant vendredi",
  metaDescription:
    "Deux minutes de lecture, une chose que j'ai testée et qui a marché, et une action précise à essayer dans la semaine. Cet email ne vend rien : il donne.",

  etiquette: "Le rendez-vous du lundi",
  h1Avant: "Une pépite le lundi, une",
  h1Surligne: "action avant vendredi",
  introAvant:
    "Deux minutes de lecture, une chose que j'ai testée et qui a marché, et une action précise à essayer dans la semaine. Cet email-là ne vend rien : ",
  introFort: "il donne",
  introApres: ", et il est utile même si tu ne m'achètes jamais rien.",
  promesses: [
    {
      fort: "Une action concrète à chaque fois",
      suite: ", pas une idée à méditer. Tu la testes avant vendredi ou tu la jettes.",
    },
    {
      fort: "Rien que je n'aie essayé moi-même",
      suite: ", avec les chiffres quand j'en ai et les ratages quand il y en a eu.",
    },
    {
      fort: "Tu te désinscris en un clic",
      suite: ", en bas de chaque message, sans avoir à te justifier.",
    },
  ],

  maquette: {
    jour: "Lundi",
    objet: "Arrête de publier",
    corps:
      "Ton meilleur post de l'année, la majorité de tes abonnés ne l'ont jamais vu. Et ceux qui l'ont vu il y a quatre mois l'ont oublié. Tu as un stock qui dort.",
    etiquetteAction: "Ton action de la semaine",
    action:
      "Va dans tes stats, repère tes 3 posts au-dessus de ta moyenne, et reprogramme le meilleur tel quel pour jeudi.",
    signature: "Bonne semaine ! Béné",
  },

  formulaire: {
    labelPrenom: "Ton prénom",
    placeholderPrenom: "Gwenn",
    labelEmail: "Ton email",
    placeholderEmail: "gwenn@exemple.fr",
    consentementAvant:
      "J'accepte de recevoir les emails de Béné. Je peux me désinscrire en un clic, en bas de chaque email. ",
    lienConfidentialite: "Politique de confidentialité",
    bouton: "Je m'inscris",
    boutonEnvoi: "Une seconde...",
    succesTitre: "C'est fait, tu es inscrit.",
    succesCorps:
      "Tu recevras le prochain email avec les autres. Si tu ne trouves rien d'ici quelques jours, regarde dans tes indésirables et fais-moi sortir de là (ça aide tout le monde).",
    raisons: {
      email_manquant: "Il manque ton adresse email.",
      email_invalide: "Cette adresse ne ressemble pas à une adresse email. Vérifie la frappe ?",
      consentement_manquant: "Coche la case pour que je puisse t'envoyer la newsletter.",
      trop_de_demandes: "Trop de tentatives depuis cette connexion. Réessaie dans une heure.",
      indisponible:
        "Je n'ai pas réussi à t'inscrire, et ce n'est pas de ta faute. Réessaie dans un moment, ou écris à {contact}.",
    },
    reseau: "La connexion a coupé. Réessaie ?",
  },

  dedansTitre: "Ce qu'il y a dedans",
  dedansIntro:
    "Le format ne bouge pas d'une semaine à l'autre. Tu sais ce que tu ouvres, et tu l'as lu avant la fin de ton café.",
  dedans: [
    {
      tag: "La pépite",
      titre: "Un truc que j'ai testé",
      texte:
        "Un réglage, une tournure, une source de trafic, une habitude. Quelque chose de précis, expliqué en deux minutes, pas un grand principe.",
    },
    {
      tag: "L'action",
      titre: "À tester avant vendredi",
      texte:
        "Chaque email se termine par une seule action, écrite noir sur blanc. Tu la fais ou tu ne la fais pas, mais tu n'as pas à te demander par où commencer.",
    },
    {
      tag: "Les coulisses",
      titre: "Ce que je fabrique",
      texte:
        "Les nouveautés de Tiquiz et de l'Atelier du Quiz, ce que je viens de changer et pourquoi. Y compris quand j'ai dû revenir en arrière.",
    },
    {
      tag: "Toi",
      titre: "Tu réponds, je lis",
      texte:
        "Chaque email finit par la même invitation, et ce n'est pas une formule : je lis toutes les réponses. Tes questions deviennent souvent la pépite du lundi suivant.",
    },
  ],

  themesTitre: "Les thèmes que je couvre",
  themesIntro:
    "J'écris sur ce que je pratique tous les jours. Une semaine tu apprends à écrire une accroche, la suivante à ranger ta journée, celle d'après à construire une offre.",
  themes: [
    "Copywriting et vente",
    "Contenu et réseaux sociaux",
    "Productivité et organisation",
    "Offres et produits",
    "Titres et accroches",
    "Emails et newsletter",
    "Vidéo et YouTube",
    "Acquisition",
    "Lancements et promos",
  ],

  pasDedansTitre: "Ce qu'il n'y a pas dedans",
  pasDedansIntro:
    "C'est peut-être plus important que le reste, parce que c'est ce qui te fera rester.",
  pasDedans: [
    {
      fort: "Pas de vente",
      suite:
        ". Le lundi, je donne. Quand j'ai quelque chose à te proposer, je t'écris à un autre moment, et tu verras tout de suite la différence.",
    },
    {
      fort: "Pas de faux compte à rebours",
      suite:
        ", pas de « plus que 3 places » quand il y en a mille. Je ne mens pas, même pour vendre.",
    },
    {
      fort: "Pas de secret ni de méthode magique",
      suite:
        ". Ce que je sais faire, je te l'explique, et tu peux très bien l'appliquer sans rien m'acheter.",
    },
    {
      fort: "Pas de recommandation que je n'ai pas testée",
      suite:
        ". Quand un outil ne me convainc pas, je n'en parle pas, même si on me paie pour.",
    },
    {
      fort: "Pas de remplissage",
      suite:
        ". Deux minutes, une idée, une action. Si je n'ai rien de neuf à te donner, je ne t'écris pas pour tenir un rythme.",
    },
  ],

  reponds: {
    titre: "Réponds-moi, vraiment",
    p: [
      "Ce n'est pas une adresse qui n'existe pas. J'adore recevoir des réponses, et je les lis toutes (je ne réponds pas toujours le jour même, mais je réponds).",
      "Dis-moi si tu as testé la pépite, raconte-moi ce qui coince, envoie-moi ton quiz si tu veux un avis. C'est souvent comme ça que je trouve le sujet du lundi suivant.",
    ],
  },

  franchise: {
    titre: "Une dernière chose, pour être honnête",
    p: [
      "Mes résultats sont le reflet de plusieurs années de travail. Ils ne s'obtiennent ni facilement, ni rapidement, et personne ne peut te garantir les tiens. Méfie-toi de ceux qui te promettent le contraire.",
      "Ce que je peux te promettre, c'est de te donner ce qui a marché chez moi, avec le contexte, pour que tu décides toi-même si ça s'applique à ta situation.",
    ],
  },

  noteAvantAdresse: "Pour recevoir mes emails, ajoute ",
  noteApresAdresse:
    " à tes contacts, sinon le premier message risque d'atterrir dans les indésirables. Ton adresse sert à t'envoyer cette newsletter et mes offres, elle n'est ni vendue ni transmise, et le lien de désinscription est en bas de chaque message. Le détail est dans ma ",
  noteLien: "politique de confidentialité",
  noteFin: ".",
};

// ── L'ANGLAIS ────────────────────────────────────────────────────────
//
// Ecrit en anglais, pas traduit du francais. Ce qui est GARDE : les
// faits (le rythme du lundi, les deux minutes, la desinscription en un
// clic), et surtout les cinq refus, qui sont sa ligne rouge.
//
// Ce qui CHANGE : les tournures. "Une pepite" devient "a nugget", qui
// est le mot anglais pour ca ; "a tester avant vendredi" devient "try
// it before Friday" et pas "to test before Friday" ; la typographie
// n'a plus aucune espace devant `?` `:` `!` et les guillemets sont
// droits, pas des chevrons.

const EN: TexteNewsletter = {
  langue: "en",
  metaTitre: "Monday's nugget: one thing to try before Friday",
  metaDescription:
    "Two minutes to read, one thing I tried myself that worked, and one specific action to try this week. This email doesn't sell anything: it gives.",

  etiquette: "Every Monday",
  h1Avant: "One nugget on Monday, one",
  h1Surligne: "action before Friday",
  introAvant:
    "Two minutes to read, one thing I tried myself that worked, and one specific action to try this week. This email doesn't sell you anything: ",
  introFort: "it gives",
  introApres: ", and it's worth reading even if you never buy a thing from me.",
  promesses: [
    {
      fort: "One concrete action every time",
      suite: ", not an idea to think about. You try it before Friday or you bin it.",
    },
    {
      fort: "Nothing I haven't tried myself",
      suite: ", with the numbers when I have them and the flops when there were any.",
    },
    {
      fort: "One click to unsubscribe",
      suite: ", at the bottom of every email, no explanation needed.",
    },
  ],

  maquette: {
    jour: "Monday",
    objet: "Stop posting",
    corps:
      "Your best post of the year? Most of your followers never saw it. And the ones who saw it four months ago have forgotten it. You're sitting on a back catalogue.",
    etiquetteAction: "Your action this week",
    action:
      "Open your stats, find the 3 posts that beat your average, and reschedule the best one as it is for Thursday.",
    signature: "Have a good week! Béné",
  },

  formulaire: {
    labelPrenom: "Your first name",
    placeholderPrenom: "Gwenn",
    labelEmail: "Your email",
    placeholderEmail: "gwenn@example.com",
    consentementAvant:
      "I agree to receive Béné's emails. I can unsubscribe in one click, at the bottom of every email. ",
    lienConfidentialite: "Privacy policy",
    bouton: "Sign me up",
    boutonEnvoi: "One second...",
    succesTitre: "Done, you're in.",
    succesCorps:
      "You'll get the next email along with everyone else. If nothing shows up in a few days, check your spam folder and drag me out of there (it helps everyone).",
    raisons: {
      email_manquant: "Your email address is missing.",
      email_invalide: "That doesn't look like an email address. Want to check the spelling?",
      consentement_manquant: "Tick the box so I'm allowed to send you the newsletter.",
      trop_de_demandes: "Too many attempts from this connection. Try again in an hour.",
      indisponible:
        "I couldn't sign you up, and it's not your fault. Try again in a moment, or write to {contact}.",
    },
    reseau: "The connection dropped. Try again?",
  },

  dedansTitre: "What's inside",
  dedansIntro:
    "The format never changes from one week to the next. You know what you're opening, and you've finished it before your coffee.",
  dedans: [
    {
      tag: "The nugget",
      titre: "Something I tried",
      texte:
        "A setting, a turn of phrase, a traffic source, a habit. Something specific, explained in two minutes, not a grand principle.",
    },
    {
      tag: "The action",
      titre: "Try it before Friday",
      texte:
        "Every email ends with one single action, spelled out. You do it or you don't, but you never have to wonder where to start.",
    },
    {
      tag: "Behind the scenes",
      titre: "What I'm building",
      texte:
        "What's new in Tiquiz and in the Atelier du Quiz, what I've just changed and why. Including the times I had to undo it.",
    },
    {
      tag: "You",
      titre: "You reply, I read",
      texte:
        "Every email ends with the same invitation, and it isn't a polite formula: I read every reply. Your questions often become the following Monday's nugget.",
    },
  ],

  themesTitre: "What I write about",
  themesIntro:
    "I write about what I do every day. One week you learn to write a hook, the next to get your day in order, the one after to build an offer.",
  themes: [
    "Copywriting and selling",
    "Content and social media",
    "Productivity and organisation",
    "Offers and products",
    "Headlines and hooks",
    "Email and newsletters",
    "Video and YouTube",
    "Getting traffic",
    "Launches and promos",
  ],

  pasDedansTitre: "What's not inside",
  pasDedansIntro:
    "This part probably matters more than the rest, because it's what will make you stay.",
  pasDedans: [
    {
      fort: "No selling",
      suite:
        ". Monday is when I give. When I do have something to offer you, I write to you another day, and you'll spot the difference straight away.",
    },
    {
      fort: "No fake countdowns",
      suite:
        ", no \"only 3 spots left\" when there are a thousand. I don't lie, not even to sell.",
    },
    {
      fort: "No secret, no magic method",
      suite:
        ". What I know how to do, I explain, and you can absolutely put it to work without buying anything from me.",
    },
    {
      fort: "Nothing I recommend that I haven't tried",
      suite:
        ". When a tool doesn't convince me, I don't talk about it, even if someone pays me to.",
    },
    {
      fort: "No filler",
      suite:
        ". Two minutes, one idea, one action. If I have nothing new to give you, I don't write just to keep a schedule.",
    },
  ],

  reponds: {
    titre: "Reply to me, honestly",
    p: [
      "It isn't a no-reply address. I love getting replies, and I read all of them (I don't always answer the same day, but I do answer).",
      "Tell me if you tried the nugget, tell me what's not working, send me your quiz if you want a second opinion. That's often how I find the following Monday's topic.",
    ],
  },

  franchise: {
    titre: "One last thing, to be straight with you",
    p: [
      "My results come from several years of work. They don't come easily and they don't come fast, and nobody can promise you the same. Be wary of anyone who tells you otherwise.",
      "What I can promise is to give you what worked for me, with the context around it, so you can decide for yourself whether it applies to your situation.",
    ],
  },

  noteAvantAdresse: "To make sure my emails reach you, add ",
  noteApresAdresse:
    " to your contacts, otherwise the first one may land in spam. Your address is used to send you this newsletter and my offers, it is never sold or passed on, and the unsubscribe link sits at the bottom of every email. The details are in my ",
  noteLien: "privacy policy",
  noteFin: ".",
};

/**
 * LES TRADUCTIONS, TYPEES SUR LES LANGUES PREFIXEES.
 *
 * Le `Exclude` est ce qui protege : ajouter une langue a
 * `LANGUES_PUBLIQUES` sans ecrire son texte NE COMPILE PAS. Sans lui,
 * une langue manquante retomberait sur le francais, la page
 * s'afficherait parfaitement, et personne ne le verrait avant que
 * Google n'indexe du francais sous une adresse etrangere.
 */
const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteNewsletter>
> = { en: EN };

/** Le texte de la page, dans la langue demandee. */
export function contenuNewsletter(langue: LanguePublique): TexteNewsletter {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}

/**
 * LA PHRASE D'UN ECHEC, AVEC L'ADRESSE DE CONTACT DEDANS.
 *
 * L'adresse vient de `adresseExpediteur()`, la MEME source que
 * l'expediteur des emails : une adresse ecrite a la main dans un
 * message d'erreur est invérifiable, et on ne la lit que le jour ou
 * quelque chose est deja casse (leçon du 31 aout, ou j'avais remplace
 * une adresse parfaitement bonne).
 *
 * Une raison INCONNUE retombe sur `indisponible`, jamais sur sa cle :
 * afficher `raison_bizarre` a quelqu'un ne l'aide pas.
 */
export function phraseEchecNewsletter(
  t: TexteFormulaire,
  raison: string | undefined,
  contact: string,
): string {
  const table = t.raisons as unknown as Record<string, string | undefined>;
  const brut = (raison && table[raison]) || t.raisons.indisponible;
  return brut.replace("{contact}", contact);
}
