// lib/blog/motsDuBlog.ts
//
// LES MOTS ET LES ADRESSES DU BLOG, PAR LANGUE.
//
// Béné, 8 septembre 2026 : "il faut à chaque fois utiliser le champ
// sémantique, les expressions, tournures de phrases, ponctuation etc..
// propre à chaque langue, c'est pas uniquement du mot à mot."
//
// -- CE QUI MANQUAIT, ET CE N'ÉTAIT PAS LE CORPS DE L'ARTICLE ---------
//
// Ses quatre articles anglais sont écrits en anglais. Le MEUBLE autour,
// lui, était écrit en dur en français dans la page : "Fil d'Ariane",
// "En bref", "Dans cet article", "min de lecture", "Partager cet
// article", "À lire ensuite", et la date rendue en `fr-FR`.
//
// Servir un texte anglais dans ce cadre là, c'est une page à moitié
// traduite, sur laquelle un lecteur anglophone voit tout de suite qu'il
// n'était pas prévu. C'est exactement le reproche du client du 7
// septembre ("some parts of the quiz UI were in French"), transposé au
// blog.
//
// -- LES ADRESSES VIENNENT D'UN SEUL ENDROIT --------------------------
//
// `cheminPourLangue` (lib/site/langues.ts) décide déjà où vit une
// langue. Réécrire `/en/blog/${slug}` à la main dans une page donnerait
// un deuxième endroit qui dit où est l'anglais, et c'est le défaut que
// ces dépôts paient en boucle : le jour où le préfixe change, un des
// deux suit et l'autre pas.
//
// -- CE MODULE EST PUR --------------------------------------------------
//
// Aucune lecture de disque, aucun `next/headers` : il est chargeable par
// le runner de tests, donc ces décisions sont testées. Une règle
// enfermée dans un composant React n'est pas testable, donc elle n'est
// pas testée (règle du 1er août).

import { cheminPourLangue, type LanguePublique } from "@/lib/site/langues";
import { MESSAGE_MAX, MESSAGE_MIN, NOM_MAX } from "@/lib/blog/commentaires";

/** L'adresse du sommaire du blog, dans une langue. */
export function cheminBlog(langue: LanguePublique): string {
  return cheminPourLangue("/blog", langue);
}

/** L'adresse d'un article, dans SA langue. */
export function cheminArticle(slug: string, langue: LanguePublique): string {
  return cheminPourLangue(`/blog/${slug}`, langue);
}

/** L'adresse d'une rubrique. */
export function cheminRubrique(id: string, langue: LanguePublique): string {
  return cheminPourLangue(`/blog/rubrique/${id}`, langue);
}

/**
 * La langue d'un balisage `inLanguage` et d'un `og:locale`.
 *
 * On ne fabrique PAS `${langue}-${langue.toUpperCase()}` : ça marche
 * pour "fr" et "en" et ça donnerait "pt-PT" pour du brésilien le jour
 * où une troisième langue arrive. Une table dit ce qu'on sert.
 */
const BALISE_LANGUE: Record<LanguePublique, { inLanguage: string; ogLocale: string }> = {
  fr: { inLanguage: "fr-FR", ogLocale: "fr_FR" },
  en: { inLanguage: "en-US", ogLocale: "en_US" },
};

export function baliseLangue(langue: LanguePublique): { inLanguage: string; ogLocale: string } {
  return BALISE_LANGUE[langue];
}

/**
 * -- CE QUI TRAVERSE VERS UN COMPOSANT CLIENT -------------------------
 *
 * `BoutonCopier` et `FormulaireCommentaire` sont marques `use client`.
 * Un composant client ne peut PAS recevoir une reference de FONCTION
 * depuis une page serveur, et **le typecheck ne voit rien de tout
 * ca** : ca ne pete qu'au RENDU, en 500, avec "Functions cannot be
 * passed directly to Client Components". C'est le drame du 1er aout
 * (`FolderCard` chez Tipote), et il a ete rejoue ici en SERVANT la
 * page : `tsc` etait vert, `npm run test:logic` etait vert a 2728, et
 * les deux articles repondaient 500.
 *
 * Ces deux formes ne portent donc QUE des chaines, et c'est le TYPE qui
 * le dit. Les deux fonctions de la table (`surReseau`, `titreN`)
 * restent EN DEHORS : leurs appelants sont rendus par le serveur.
 */
export interface MotsCopie {
  copierLeLien: string;
  /** Ce que le bouton dit APRES la copie. */
  lienCopie: string;
  /** Quand le presse-papier refuse : on dit quoi faire a la main. */
  copieRatee: string;
}

/** Tout ce que le formulaire de commentaire affiche. Chaines seules. */
export interface MotsFormulaire {
  laisserUn: string;
  prenom: string;
  email: string;
  /** L'aparte du champ email : il ne sort jamais. */
  emailJamaisPublie: string;
  message: string;
  envoyer: string;
  envoiEnCours: string;
  /**
   * Le libelle du champ PIEGE.
   *
   * Il est hors de l'ecran et hors du flux de tabulation, donc personne
   * ne le lit. Il se traduit quand meme : une phrase francaise dans un
   * formulaire anglais est une phrase francaise dans un formulaire
   * anglais.
   */
  piegeLibelle: string;
  noteEmail: string;
  /** La confirmation, en deux morceaux : le gras, puis la suite. */
  publieFort: string;
  publieSuite: string;
  attenteFort: string;
  attenteSuite: string;
  /**
   * CE QUE LE SERVEUR A REFUSE, TRADUIT ICI.
   *
   * La route rend une RAISON, jamais une phrase (regle du 3 aout) :
   * c'est ce qui permet a cette table d'exister par langue. Une raison
   * inconnue retombe sur `ecriture`, elle n'affiche JAMAIS sa cle.
   */
  refus: Record<string, string>;
}

export interface MotsDuBlog {
  /** La locale passée à `Intl.DateTimeFormat`. */
  locale: string;
  blog: string;
  filDAriane: string;
  signature: string;
  minutesDeLecture: (n: number) => string;
  enBref: string;
  dansCetArticle: string;
  partagerCetArticle: string;
  aLireEnsuite: string;
  /** Le lien pose sous chaque article DANS LE FLUX RSS. */
  lireLArticle: string;
  /**
   * LA VIDEO D'UN ARTICLE.
   *
   * `note` dit ce qu'un clic declenche, et elle n'est pas decorative :
   * un article ne porte aucune banniere de consentement, donc c'est la
   * SEULE phrase qui previent avant que quoi que ce soit ne parte chez
   * Google. La retirer rendrait le cadre muet.
   */
  video: { lire: string; note: string };
  nomDuBlog: string;
  /**
   * LE MEUBLE D'UN ARTICLE : partage, invitation, commentaires.
   *
   * Ces trois composants portaient leurs phrases EN DUR en francais.
   * Un lecteur anglophone arrive de `tipote.blog` lisait donc
   * "Copier le lien", "Ton avis sur cet article" et "Ton prenom" au
   * bas d'un article anglais, c'est a dire le reproche du client du
   * 7 septembre ("some parts of the quiz UI were in French") sur les
   * pages exactes ou on veut le recuperer.
   */
  /**
   * LE RAIL COLLANT, A DROITE DE L'ARTICLE.
   *
   * `dansCetArticle` existait deja et le rail ne l'appelait pas : il
   * reecrivait la phrase en dur. Ces deux cles la sont celles qui
   * n'avaient aucun equivalent.
   */
  rail: {
    /** Le libelle d'accessibilite de la navigation du sommaire. */
    sommaireAria: string;
    /** "Partager", court : le rail est etroit. */
    partagerCourt: string;
  };
  partage: {
    /** Le titre et le libelle d'accessibilite d'un bouton de reseau. */
    surReseau: (reseau: string) => string;
    /** Les trois libelles du bouton Copier, qui part chez un client. */
    copie: MotsCopie;
  };
  encart: {
    titre: string;
    corps: string;
    bouton: string;
    /**
     * Le second bouton, ou `null` quand sa destination n'existe pas
     * dans cette langue.
     *
     * Meme decision que `sommaire.ctaSecondaire` : il mene a `/`, qui
     * sert la page de vente CAPTUREE, en francais. L'annoncer en
     * anglais enverrait un lecteur anglophone sur une page francaise
     * depuis un blog anglais.
     */
    secondaire: string | null;
  };
  commentaires: {
    /** Le titre quand il n'y en a aucun : c'est une invitation. */
    titreVide: string;
    titreUn: string;
    /** Une FONCTION : elle reste au serveur, elle ne traverse pas. */
    titreN: (n: number) => string;
    aucun: string;
    /** Ce que le formulaire affiche. Chaines seules : il est client. */
    formulaire: MotsFormulaire;
  };
  /**
   * LE SOMMAIRE DU BLOG, MOT POUR MOT.
   *
   * Le francais est recopie a l'identique de ce que la page servait
   * avant ce chantier : ce sont ses phrases, elles sont indexees, et un
   * chantier de langue n'a pas a les reecrire au passage.
   */
  sommaire: {
    metaTitre: string;
    metaDescription: string;
    etiquette: string;
    /** Le titre se coupe en deux : le fragment surligne est le second. */
    titreDebut: string;
    titreSurb: string;
    aucunArticle: string;
    lesDerniers: string;
    /**
     * Le titre de la grille QUAND des rubriques existent, et son titre
     * quand il n'y en a pas.
     *
     * Les rubriques n'existent qu'en francais (`rubriquesDeLaLangue`) :
     * garder "Choisis un sujet" au dessus d'une grille sans une seule
     * pastille demanderait de choisir dans une liste qui n'est pas la.
     */
    choisisUnSujet: string;
    tousLesArticles: string;
    ctaTitreDebut: string;
    ctaTitreSurb: string;
    ctaCorps: string;
    ctaBouton: string;
    /**
     * Le second bouton, ou `null` quand sa destination n'existe pas
     * dans cette langue.
     *
     * Il mene a `/`, qui sert la page de vente CAPTUREE, en francais.
     * L'annoncer en anglais enverrait un lecteur anglophone sur une
     * page francaise depuis un blog anglais : on n'affiche donc rien
     * plutot que de promettre une page qui n'existe pas encore. C'est
     * la meme regle que les `hreflang` : on ne declare que ce qui est
     * ecrit.
     */
    ctaSecondaire: string | null;
    ctaRassurance: string;
  };
}

/**
 * LES MOTS, ÉCRITS DANS CHAQUE LANGUE, PAS TRADUITS MOT À MOT.
 *
 * "5 min de lecture" se dit "5 min read" en anglais, pas "5 min of
 * reading" ; "À lire ensuite" se dit "Read next", pas "To read after".
 * C'est sa consigne, et c'est ce qui sépare un site traduit d'un site
 * passé à la machine.
 */
const MOTS: Record<LanguePublique, MotsDuBlog> = {
  fr: {
    locale: "fr-FR",
    blog: "Blog",
    filDAriane: "Fil d'Ariane",
    signature: "Par Béné, fondatrice de Tiquiz",
    minutesDeLecture: (n) => `${n} min de lecture`,
    enBref: "En bref",
    dansCetArticle: "Dans cet article",
    partagerCetArticle: "Partager cet article",
    aLireEnsuite: "À lire ensuite",
    lireLArticle: "Lire l'article",
    video: {
      lire: "Lire la vidéo",
      note: "Rien ne part chez YouTube tant que tu n'as pas cliqué.",
    },
    nomDuBlog: "Le blog Tiquiz",
    rail: { sommaireAria: "Sommaire de l'article", partagerCourt: "Partager" },
    partage: {
      surReseau: (reseau) => `Partager sur ${reseau}`,
      copie: {
        copierLeLien: "Copier le lien",
        lienCopie: "Lien copié",
        copieRatee: "Copie refusée",
      },
    },
    encart: {
      titre: "Un quiz qui tague tes leads dans Systeme.io",
      corps:
        "Tiquiz écrit le quiz, pose un tag par profil et te rend des leads déjà triés. Plan gratuit pour tester, sans carte bancaire.",
      bouton: "Créer mon quiz gratuitement",
      secondaire: "Voir ce que fait Tiquiz",
    },
    commentaires: {
      titreVide: "Ton avis sur cet article",
      titreUn: "1 commentaire",
      titreN: (n) => `${n} commentaires`,
      aucun:
        "Personne n'a encore réagi. Si un point te fait tiquer ou s'il te manque quelque chose, dis-le : c'est comme ça que ces articles s'améliorent.",
      formulaire: {
        laisserUn: "Laisser un commentaire",
        prenom: "Ton prénom",
        email: "Ton email",
        emailJamaisPublie: "(jamais publié)",
        message: "Ton message",
        envoyer: "Envoyer",
        envoiEnCours: "Envoi...",
        piegeLibelle: "Ne remplis pas ce champ",
        noteEmail:
          "Ton email sert uniquement à te répondre. Il n'apparaît nulle part et ne part dans aucune liste de diffusion.",
        publieFort: "C'est en ligne.",
        publieSuite: "Recharge la page pour le voir avec les autres. Merci d'avoir pris le temps.",
        attenteFort: "C'est envoyé.",
        attenteSuite:
          "Ton commentaire attend d'être relu avant d'apparaître : c'est ce qui garde cette page lisible. Tu ne le verras donc pas tout de suite.",
        refus: {
          "nom-manquant": "Il manque ton prénom.",
          "nom-trop-long": `Ton nom fait plus de ${NOM_MAX} caractères.`,
          "message-court": `Ton message fait moins de ${MESSAGE_MIN} caractères.`,
          "message-long": `Ton message dépasse ${MESSAGE_MAX} caractères.`,
          "email-invalide": "Cette adresse email ne ressemble pas à une adresse.",
          "trop-de-liens": "Deux liens au maximum par commentaire, sinon ça part en pub.",
          piege: "Ce message n'a pas pu être envoyé.",
          "propos-interdits": "Ce message ne peut pas être publié tel quel.",
          "article-inconnu": "Cet article n'existe pas.",
          "trop-rapide": "Tu viens d'en envoyer plusieurs. Laisse passer un moment.",
          "corps-illisible": "Le message n'est pas arrivé entier. Réessaie.",
          table_absente:
            "Les commentaires ne sont pas encore activés sur le serveur. Rien n'est perdu de ton côté : réessaie plus tard.",
          ecriture: "Ton commentaire n'a pas pu être enregistré. Réessaie dans un instant.",
          reseau: "La connexion n'a pas abouti. Ton message n'est pas parti.",
        },
      },
    },
    sommaire: {
      metaTitre: "Le blog Tiquiz : quiz, leads et Systeme.io",
      metaDescription:
        "Comment un quiz capte des leads qualifiés, les tague par profil et les transforme en clients. Méthodes, cas concrets et outils, sans jargon.",
      etiquette: "Le blog",
      titreDebut: "Des quiz qui ",
      titreSurb: "rapportent",
      aucunArticle: "Aucun article pour le moment.",
      lesDerniers: "Les derniers",
      choisisUnSujet: "Choisis un sujet",
      tousLesArticles: "Tous les articles",
      ctaTitreDebut: "Ton premier quiz tourne ",
      ctaTitreSurb: "ce soir",
      ctaCorps:
        "Tiquiz écrit le quiz, pose les tags par profil et te rend des leads déjà triés dans Systeme.io. Sans Zapier, sans Make.",
      ctaBouton: "Créer mon quiz gratuitement",
      ctaSecondaire: "Voir ce que fait Tiquiz",
      ctaRassurance: "Plan gratuit, sans carte bancaire et sans limite de durée.",
    },
  },
  en: {
    locale: "en-US",
    blog: "Blog",
    filDAriane: "Breadcrumb",
    signature: "By Béné, founder of Tiquiz",
    minutesDeLecture: (n) => `${n} min read`,
    enBref: "In short",
    dansCetArticle: "In this article",
    partagerCetArticle: "Share this article",
    aLireEnsuite: "Read next",
    lireLArticle: "Read the article",
    video: {
      lire: "Play the video",
      note: "Nothing is sent to YouTube until you click.",
    },
    nomDuBlog: "The Tiquiz blog",
    rail: { sommaireAria: "Article contents", partagerCourt: "Share" },
    partage: {
      surReseau: (reseau) => `Share on ${reseau}`,
      copie: {
        copierLeLien: "Copy the link",
        lienCopie: "Link copied",
        copieRatee: "Copy refused",
      },
    },
    encart: {
      titre: "A quiz that tags your leads in Systeme.io",
      corps:
        "Tiquiz writes the quiz, sets one tag per profile and hands you leads that are already sorted. Free plan to try it, no card needed.",
      bouton: "Create my quiz for free",
      // `null` : le second bouton mene a `/`, qui sert la page de vente
      // CAPTUREE, en francais. Voir `encart.secondaire`.
      secondaire: null,
    },
    commentaires: {
      titreVide: "Your take on this article",
      titreUn: "1 comment",
      titreN: (n) => `${n} comments`,
      aucun:
        "Nobody has reacted yet. If something here rubs you the wrong way, or if something is missing, say so: that is how these articles get better.",
      formulaire: {
        laisserUn: "Leave a comment",
        prenom: "Your first name",
        email: "Your email",
        emailJamaisPublie: "(never published)",
        message: "Your message",
        envoyer: "Send",
        envoiEnCours: "Sending...",
        piegeLibelle: "Do not fill in this field",
        noteEmail:
          "Your email is only used to reply to you. It appears nowhere and goes on no mailing list.",
        publieFort: "It is live.",
        publieSuite: "Reload the page to see it with the others. Thanks for taking the time.",
        attenteFort: "It has been sent.",
        attenteSuite:
          "Your comment is waiting to be read before it appears: that is what keeps this page readable. So you will not see it straight away.",
        refus: {
          "nom-manquant": "Your first name is missing.",
          "nom-trop-long": `Your name is longer than ${NOM_MAX} characters.`,
          "message-court": `Your message is shorter than ${MESSAGE_MIN} characters.`,
          "message-long": `Your message is longer than ${MESSAGE_MAX} characters.`,
          "email-invalide": "That email address does not look like an address.",
          "trop-de-liens": "Two links per comment at most, otherwise it turns into advertising.",
          piege: "That message could not be sent.",
          "propos-interdits": "That message cannot be published as it stands.",
          "article-inconnu": "That article does not exist.",
          "trop-rapide": "You have just sent several. Let a moment pass.",
          "corps-illisible": "The message did not arrive in one piece. Try again.",
          table_absente:
            "Comments are not switched on the server yet. Nothing is lost on your side: try again later.",
          ecriture: "Your comment could not be saved. Try again in a moment.",
          reseau: "The connection did not go through. Your message did not leave.",
        },
      },
    },
    sommaire: {
      metaTitre: "The Tiquiz blog: quizzes, leads and Systeme.io",
      metaDescription:
        "How a quiz captures qualified leads, tags them by profile and turns them into customers. Methods, real cases and tools, no jargon.",
      etiquette: "Blog",
      titreDebut: "Quizzes that ",
      titreSurb: "pay off",
      aucunArticle: "Nothing published here yet.",
      lesDerniers: "Latest",
      choisisUnSujet: "Pick a topic",
      tousLesArticles: "All the articles",
      ctaTitreDebut: "Your first quiz can be live ",
      ctaTitreSurb: "tonight",
      ctaCorps:
        "Tiquiz writes the quiz, tags every profile and hands you leads already sorted in Systeme.io. No Zapier, no Make.",
      ctaBouton: "Create my quiz for free",
      ctaSecondaire: null,
      ctaRassurance: "Free plan, no credit card, no time limit.",
    },
  },
};

export function motsDuBlog(langue: LanguePublique): MotsDuBlog {
  return MOTS[langue];
}
