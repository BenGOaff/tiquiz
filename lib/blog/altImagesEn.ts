// lib/blog/altImagesEn.ts
//
// LE TEXTE ALTERNATIF DES IMAGES DES ARTICLES ANGLAIS.
//
// Mesure du 8 septembre 2026, avant d'ecrire une ligne : **27 images
// sur 27 n'avaient AUCUN texte alternatif** dans les quatre articles
// importes de `tipote.blog`. C'est 100 %, la ou le francais etait a
// 43 % le 31 aout.
//
// -- POURQUOI UNE DEUXIEME TABLE, ET PAS `ALT_IMAGES` -----------------
//
// La cle est le CHEMIN de l'image, et **deux visuels sont PARTAGES avec
// les articles francais** (`/blog/img/quiz-buzzfeed.webp` et
// `/blog/img/quiz-kerastase.webp`). Une seule table poserait donc du
// FRANCAIS dans une page anglaise, sur l'ecran exact ou un lecteur
// d'ecran anglophone ecoute la page. C'est le reproche du client du
// 7 septembre ("some parts of the quiz UI were in French"), transpose
// au blog.
//
// Chaque script ne lit QUE sa table : `blog:reparer` la francaise,
// `blog:reparer-en` celle-ci. C'est pour ca que `poserAltEn` existe a
// cote de `poserAlt` au lieu de prendre une langue en parametre : une
// fonction qui accepte les deux tables finit par recevoir la mauvaise.
//
// -- LES 27 ONT ETE REGARDEES UNE PAR UNE -----------------------------
//
// Regle du 31 aout, et elle n'a pas d'autre methode : un `alt` se
// deduit de ce qu'on VOIT, jamais du nom du fichier ni de la position
// dans l'article. Les noms d'ici sont des empreintes
// (`...-4ce3c7f955.webp`) : ils ne disent rien du tout.
//
// **Ce qu'on ne peut PAS nommer, on le decrit.** Deux visuels portent
// une marque que la capture ne permet pas d'identifier avec certitude
// (la banniere a 82M+ quiz takers, l'ecran "First, choose an
// intention") : leur texte dit ce qui est a l'ecran et s'arrete la.
// Nommer au jugé mettrait une marque fausse dans la seule ligne que
// lisent Google, un modele de langue et une lectrice aveugle.
//
// **Les schemas portent leurs CHIFFRES**, c'est la moitie du travail :
// "21% opens against 24% once the list is segmented" est ce que le
// dessin dit, et c'est ce qu'il faut ecrire.
//
// -- LES DEUX VISUELS ECARTES SONT DANS LA TABLE, ET SANS CHIFFRE -----
//
// Les deux captures d'affiliation sont retirees des pages depuis le
// 8 septembre (`lib/blog/visuelsPerimes.ts`), donc leur `alt` ne
// s'affiche nulle part aujourd'hui. Il est ecrit quand meme, pour le
// jour ou Bene les redessine : sans lui elles reviendraient nues.
//
// Et il ne porte NI le tarif NI la projection : ce sont exactement les
// chiffres qui les ont fait ecarter, et un texte qui les recopierait
// serait faux le jour du redessin, sans que rien ne le dise.

/** Le texte alternatif de chaque image anglaise, par son chemin public. */
export const ALT_IMAGES_EN: Readonly<Record<string, string>> = {
  // ── 17 reasons to launch a business quiz ──
  "/blog/img/en/17-reasons-to-launch-business-quiz-bb1552529f.webp":
    "Home screen of Adobe's Creative Types quiz, Shape the Future, with its Start Test button",
  "/blog/img/quiz-buzzfeed.webp":
    "Result screen of a BuzzFeed quiz: the profile description, then a row of buttons to share it",
  "/blog/img/en/17-reasons-to-launch-business-quiz-bc2325bb64.webp":
    "Beardbrand's What's Your Beardsman Persona quiz: a grid of fifteen bearded portraits, a Start quiz button and a two minute promise",
  "/blog/img/en/17-reasons-to-launch-business-quiz-4e808cf052.webp":
    "Sephora's Shade Finder banner: foundation swatches on the left, Take a quiz to find your shade match on the right",
  "/blog/img/en/17-reasons-to-launch-business-quiz-042358d2e3.webp":
    "The My leads screen in Tiquiz: 15 leads captured, 14 synced to Systeme.io, and one row per lead with its quiz, its profile and its date",
  "/blog/img/en/17-reasons-to-launch-business-quiz-1775434586.webp":
    "Segmenting doubles the clicks: 21% opens and 2.6% clicks on a bulk list, against 24% and 5.2% once the list is segmented by quiz",
  "/blog/img/en/17-reasons-to-launch-business-quiz-8042590757.webp":
    "Segmenting keeps contacts longer: the unsubscribe rate drops 10% below the market reference, in every industry Mailchimp documented",
  "/blog/img/en/17-reasons-to-launch-business-quiz-206f20133c.webp":
    "A dark banner with four figures, 14K customers, 82M+ quiz takers, 47+ languages and 100+ countries, over the line We help entrepreneurs launch, grow, and scale digital businesses",
  "/blog/img/en/17-reasons-to-launch-business-quiz-4ce3c7f955.webp":
    "First question of Warby Parker's Find Your Frames quiz: eyeglasses or sunglasses, with a button to skip it",
  "/blog/img/en/17-reasons-to-launch-business-quiz-46281eb9a7.webp":
    "Opening screen of VitaminLab's onboarding quiz, five minutes away from a personal supplement formula",
  "/blog/img/en/17-reasons-to-launch-business-quiz-1959256906.webp":
    "Interactive content converts twice as many leads as an ebook, a PDF or a blog post, from the Outgrow benchmarks",
  "/blog/img/en/17-reasons-to-launch-business-quiz-6efd450716.webp":
    "Home screen of Function of Beauty's Custom Hair Quiz, two minutes for a haircare formula of your own",
  "/blog/img/en/17-reasons-to-launch-business-quiz-2f4fccd914.webp":
    "First question of a wellness quiz, choose an intention, with four answers from exploring more to practising self-kindness",
  "/blog/img/quiz-kerastase.webp":
    "Kerastase's hair diagnosis quiz, in French: a five step bar, then fourteen hair concerns to rank, from hair loss to dull hair",
  "/blog/img/en/17-reasons-to-launch-business-quiz-c2acb54bd9.webp":
    "Three steps to feed Meta ads with quiz leads: the lead tags itself, the per profile export builds a lookalike audience, the cost per lead drops",
  "/blog/img/en/17-reasons-to-launch-business-quiz-5f514d0f0a.webp":
    "BuzzFeed's Trending Quizzes section, eight quizzes side by side with their author",
  "/blog/img/en/17-reasons-to-launch-business-quiz-d9e18c1c33.webp":
    "The 16Personalities free personality test: its three steps, then a statement to rate from Agree to Disagree",

  // ── Capturing emails with a quiz ──
  "/blog/img/en/capturing-emails-quiz-strategy-23d4ad1243.webp":
    "Email against social media: $36 back for every $1 spent, seven times more than social, with an audience you actually own and no algorithm in between",
  "/blog/img/en/capturing-emails-quiz-strategy-91560385a0.webp":
    "Out of 1,000 visitors with no capture in place, 970 leave and 30 are captured, where an interactive quiz on the same page captures 350",
  "/blog/img/en/capturing-emails-quiz-strategy-04bd081988.webp":
    "A classic opt-in captures 2 to 3% of visitors, an interactive quiz 30 to 40%, with four minutes of engagement and automatic sorting into profiles",
  "/blog/img/en/capturing-emails-quiz-strategy-ccf336ae5d.webp":
    "Home screen of Airbnb's Trip Matcher quiz, take the quiz to find your travel personality",
  "/blog/img/en/capturing-emails-quiz-strategy-b824ffcc87.webp":
    "Beardbrand's What type of beardsman are you quiz, with its grid of portraits and its Start quiz button",

  // ── Create a quiz for Systeme.io ──
  "/blog/img/en/create-quiz-systeme-io-4bea33374d.webp":
    "A generic quiz asks which Marvel hero you are and sells nothing, where a qualifying quiz sends each profile to the offer that fits, from $47 to $1,497",
  "/blog/img/en/create-quiz-systeme-io-4c8915dc27.webp":
    "Four quiz headlines on four phones, positioning, diagnostic, maturity and quick audit, each with its promise and its duration",
  "/blog/img/en/create-quiz-systeme-io-e73a700c3d.webp":
    "The share bonus in three steps: the lead takes the quiz, shares it to unlock the full result, and brings back four to six new leads tagged in Systeme.io",

  // ── Monthly recurring income (les deux visuels ECARTES) ──
  //
  // Aucun chiffre ici, et c'est deliberé : ce sont les chiffres de ces
  // deux dessins qui les ont fait ecarter. Le texte dit l'ECRAN, il
  // restera vrai le jour ou Bene les redessine.
  "/blog/img/en/monthly-recurring-income-tiquiz-affiliate-252317915d.webp":
    "The Tiquiz affiliate dashboard: the sharing link, then the counters for clicks, signups and commissions",
  "/blog/img/en/monthly-recurring-income-tiquiz-affiliate-f07444fceb.webp":
    "The affiliate commission simulator: a slider for the number of referrals, and the monthly income it adds up to",
};

/** Le texte alternatif d'une image anglaise, ou `null` si on n'en a pas ecrit. */
export function altEnDe(src: unknown): string | null {
  const chemin = typeof src === "string" ? src.trim() : "";
  return ALT_IMAGES_EN[chemin] ?? null;
}

/**
 * Pose le `alt` anglais d'un bloc image.
 *
 * La table GAGNE sur ce qu'elle NOMME (meme regle que `poserAlt`
 * cote francais, corrigee le 1er septembre), et une image ABSENTE de
 * la table garde le texte qu'elle a : on ne perd aucun `alt` correct
 * venu de l'import.
 */
export function poserAltEn(bloc: { src?: unknown; alt?: unknown }): boolean {
  const texte = altEnDe(bloc.src);
  if (texte) {
    if (bloc.alt === texte) return false;
    bloc.alt = texte;
    return true;
  }
  return false;
}
