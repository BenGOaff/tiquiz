// lib/site/pageAffiliation.ts
//
// LE TEXTE DES DEUX PAGES D'AFFILIATION, PAR LANGUE.
//
// Les deux pages sont une PAIRE : `/affiliation` (Tiquiz, 40 % a chaque
// echeance) et `/affiliation-atelier` (l'Atelier, 70 % une fois). Elles
// partagent les memes regles, le meme code public et le meme virement,
// donc leur texte vit dans UN fichier : deux modules ecrits separement
// finiraient par annoncer deux delais differents, et c'est exactement
// ce que l'en-tete de `/affiliation-atelier` existe pour empecher.
//
// AUCUN CHIFFRE N'EST TAPE ICI. Le taux, le prix et les montants
// viennent de `programmeAffiliation.ts`, qui les derive du catalogue :
// un montant recopie serait faux au prochain changement de tarif, et il
// vit ici a l'endroit exact ou un affilie va le verifier.
//
// LA STRUCTURE VIT UNE FOIS, une langue n'apporte que du TEXTE, et
// `TRADUCTIONS` est un `Record` des langues prefixees : en oublier une
// ne compile pas. C'est le geste des 8 pages de fonctionnalites.
//
// LES MONTANTS RESTENT EN EUROS, seul leur FORMAT change : un affilie
// anglophone est paye en euros comme les autres, et convertir
// afficherait un versement qui n'aura pas lieu.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { COMMISSION_MAX_PCT } from "@/lib/site/recompenseAffiliation";
import { TAUX, gainAtelier, tableauDesGains } from "@/lib/site/programmeAffiliation";

const PCT_TIQUIZ = Math.round(TAUX.tiquiz * 100);
const PCT_ATELIER = Math.round(TAUX.atelier * 100);

/** Une phrase dont le milieu porte du gras ou du code. */
export interface PhraseFort {
  avant: string;
  fort: string;
  milieu?: string;
  fort2?: string;
  apres: string;
}

export interface TexteAffiliation {
  titre: string;
  description: string;
  etiquette: string;
  h1Apres: string;
  accroche: string;
  ctaRejoindre: string;
  ctaAtelier: string;
  noteGratuit: string;
  combienTitre: string;
  combienIntro: PhraseFort;
  recompenseTitre: string;
  option1Label: string;
  option1Titre: string;
  option1Items: readonly string[];
  option2Label: string;
  option2Titre: string;
  option2Items: readonly string[];
  recompenseNote: string;
  gainsTitre: string;
  gainsIntro: string;
  gainsEntetes: readonly [string, string, string];
  gainsAtelierLabel: string;
  gainsAtelierRythme: string;
  gainsNote: (gainMensuel: string) => string;
  reglesTitre: string;
  reglesIntro: string;
  sioTitre: string;
  sioP1: string;
  sioP2: PhraseFort;
  sioP3: string;
  ctaTitreAvant: string;
  ctaTitreSurb: string;
  ctaTexte: string;
  ctaCreer: string;
  ctaConditions: string;
}

export interface TexteAffiliationAtelier {
  titre: string;
  description: string;
  etiquette: string;
  h1Apres: string;
  accroche: string;
  ctaLien: string;
  ctaTiquiz: string;
  recoitTitre: string;
  recoitIntro: string;
  etapes: readonly string[];
  recoitNote: string;
  memeTitre: string;
  memeIntro: string;
  labelTiquiz: string;
  noteTiquiz: string;
  labelAtelier: string;
  noteAtelier: string;
  memeNote: string;
  memeCta: string;
  payeTitre: string;
  payeIntro: string;
  ctaConditions: string;
}

const FR: TexteAffiliation = {
  titre: "Programme d'affiliation Tiquiz : 40 % récurrent, à vie",
  description:
    "Recommande Tiquiz et touche 40 % chaque mois où ton filleul reste abonné. Cookie d'un an, versement dès 20 €, facture éditée par nous. Gratuit et ouvert à tous.",
  etiquette: "Programme d'affiliation",
  h1Apres: " chaque mois, tant qu'il reste abonné",
  accroche: `Tu parles de Tiquiz à quelqu'un, il s'abonne, tu touches ${PCT_TIQUIZ} % de son abonnement. Pas une fois : tous les mois, tant qu'il reste client. Le jour où il part, ça s'arrête, et c'est normal.`,
  ctaRejoindre: "Rejoindre le programme",
  ctaAtelier: `Et l'Atelier du Quiz, à ${PCT_ATELIER} %`,
  noteGratuit:
    "C'est gratuit, il n'y a rien à acheter, et tu n'as pas besoin d'être client de Tiquiz pour en parler.",
  combienTitre: "Combien tu touches, concrètement",
  combienIntro: {
    avant: `${PCT_TIQUIZ} % sur chaque paiement, et pas seulement sur le premier. Et ta récompense monte avec toi : soit un `,
    fort: "taux plus élevé",
    milieu: ", soit une ",
    fort2: "remise sur ton propre abonnement",
    apres: ". Tu prends l'une ou l'autre, jamais les deux, et tu peux changer d'avis.",
  },
  recompenseTitre: "Ta récompense, c'est toi qui la choisis",
  option1Label: "Option 1",
  option1Titre: "Un taux d'affiliation plus élevé",
  option1Items: [
    "+5 % par marche de 10 filleuls abonnés.",
    "La première marche s'ouvre dès ton premier filleul : tu passes à 45 %.",
    `Plafond à ${COMMISSION_MAX_PCT} %, atteint à 51 filleuls.`,
    "Le taux s'applique à TOUS tes filleuls, pas seulement aux nouveaux.",
  ],
  option2Label: "Option 2",
  option2Titre: "Une remise sur ton abonnement",
  option2Items: [
    "10 % de remise par marche de 10 filleuls abonnés.",
    "Elle s'ouvre au 10e filleul : en dessous, elle ne donne rien.",
    "À 100 filleuls, tu ne paies plus ton abonnement.",
    `Tu gardes ${PCT_TIQUIZ} % de commission à côté.`,
  ],
  recompenseNote:
    "Ton décompte est recalculé une fois par mois. Si des filleuls partent, ton taux ou ta remise redescendent, et tu es prévenu avant que ça s'applique. Personne ne découvre une hausse de prix sur son relevé.",
  gainsTitre: "Chaque offre, et ce qu'elle te rapporte",
  gainsIntro:
    "Les montants ci-dessous sont calculés sur le prix hors taxes, qui est la base réelle du calcul. Autant que tu voies le bon chiffre tout de suite plutôt qu'au premier versement.",
  gainsEntetes: ["Ce qu'il prend", "Il paie", "Tu touches"],
  gainsAtelierLabel: "L'Atelier du Quiz",
  gainsAtelierRythme: `une fois (${PCT_ATELIER} %)`,
  gainsNote: (gain) =>
    `Trente filleuls au mensuel, ça fait ${gain} multiplié par 30 chaque mois, et ça continue le mois suivant sans que tu refasses quoi que ce soit. C'est là que l'abonnement change tout par rapport à une vente unique.`,
  reglesTitre: "Les règles, en entier",
  reglesIntro:
    "Pas de petites lignes. Si un point te paraît flou, écris-nous, on le précisera sur cette page pour tout le monde.",
  sioTitre: "Tu affilies déjà avec un lien Systeme.io ?",
  sioP1:
    "Tes anciens liens restent valides et continuent de te payer, exactement comme avant. Rien n'est perdu, rien n'est à refaire.",
  sioP2: {
    avant: "Ce qui change, c'est que les liens de ton espace affilié portent maintenant ton code public (",
    fort: "?ref=",
    apres:
      ") au lieu de l'identifiant de Systeme.io. Ils passent par notre bon de commande, donc ils comptent tes clics, tes inscrits et tes ventes, canal par canal. Les anciens liens ne peuvent pas faire ça (leur page ne nous transmet rien).",
  },
  sioP3:
    "Et le mois offert à ton filleul ne fonctionne qu'avec les liens de cette génération. C'est un argument de vente que tu n'as pas sur un ancien lien, donc autant reprendre les nouveaux dans tes contenus quand tu en as l'occasion.",
  ctaTitreAvant: "Ton lien est prêt en ",
  ctaTitreSurb: "deux minutes",
  ctaTexte:
    "Tu crées ton compte affilié, tu récupères ton lien, tu le mets dans ta bio, sous ta vidéo ou dans ton prochain email. Le tableau de bord te dit ensuite lequel de tes canaux travaille vraiment.",
  ctaCreer: "Créer mon compte affilié",
  ctaConditions: "Lire les conditions",
};

const EN: TexteAffiliation = {
  titre: "Tiquiz affiliate programme: 40 % every month, for life",
  description:
    "Recommend Tiquiz and earn 40 % every month your referral stays subscribed. One-year cookie, payout from 20 EUR, invoice issued by us. Free, and open to everyone.",
  etiquette: "Affiliate programme",
  h1Apres: " every month, for as long as they stay subscribed",
  accroche: `You tell someone about Tiquiz, they subscribe, you earn ${PCT_TIQUIZ} % of what they pay. Not once: every month, for as long as they stay. The day they leave, it stops, and that is how it should be.`,
  ctaRejoindre: "Join the programme",
  ctaAtelier: `And L'Atelier du Quiz, at ${PCT_ATELIER} %`,
  noteGratuit:
    "It is free, there is nothing to buy, and you do not need to be a Tiquiz customer to talk about it.",
  combienTitre: "What you actually earn",
  combienIntro: {
    avant: `${PCT_TIQUIZ} % on every payment, not just the first one. And your reward climbs with you: either a `,
    fort: "higher rate",
    milieu: ", or a ",
    fort2: "discount on your own subscription",
    apres: ". One or the other, never both, and you can change your mind.",
  },
  recompenseTitre: "You pick your own reward",
  option1Label: "Option 1",
  option1Titre: "A higher affiliate rate",
  option1Items: [
    "+5 % for every 10 subscribed referrals.",
    "The first step opens with your very first referral: you move to 45 %.",
    `Capped at ${COMMISSION_MAX_PCT} %, reached at 51 referrals.`,
    "The rate applies to ALL your referrals, not only the new ones.",
  ],
  option2Label: "Option 2",
  option2Titre: "A discount on your subscription",
  option2Items: [
    "10 % off for every 10 subscribed referrals.",
    "It opens at the 10th referral: below that, it gives nothing.",
    "At 100 referrals, you stop paying for your subscription.",
    `You keep your ${PCT_TIQUIZ} % commission alongside it.`,
  ],
  recompenseNote:
    "Your count is worked out once a month. If referrals leave, your rate or your discount steps back down, and you are told before it applies. Nobody finds a price rise on their statement.",
  gainsTitre: "Every plan, and what it pays you",
  gainsIntro:
    "The amounts below are worked out on the price before tax, which is the real basis of the calculation. Better you see the right figure now than on your first payout.",
  gainsEntetes: ["What they take", "They pay", "You earn"],
  gainsAtelierLabel: "L'Atelier du Quiz",
  gainsAtelierRythme: `once (${PCT_ATELIER} %)`,
  gainsNote: (gain) =>
    `Thirty referrals on the monthly plan is ${gain} times 30, every month, and it carries on the month after without you doing anything again. That is where a subscription changes everything compared with a one-off sale.`,
  reglesTitre: "The rules, in full",
  reglesIntro:
    "No small print. If something reads as unclear, write to us and we will spell it out on this page, for everyone.",
  sioTitre: "Already promoting with a Systeme.io link?",
  sioP1:
    "Your old links stay valid and keep paying you, exactly as before. Nothing is lost, nothing has to be redone.",
  sioP2: {
    avant: "What changes is that the links in your affiliate area now carry your public code (",
    fort: "?ref=",
    apres:
      ") instead of the Systeme.io identifier. They go through our own checkout, so they count your clicks, your sign-ups and your sales, channel by channel. Old links cannot do that (their page passes us nothing).",
  },
  sioP3:
    "And the free month for your referral only works with links of this generation. That is a selling point you do not have on an old link, so it is worth swapping them into your content when you get the chance.",
  ctaTitreAvant: "Your link is ready in ",
  ctaTitreSurb: "two minutes",
  ctaTexte:
    "You create your affiliate account, you copy your link, you put it in your bio, under your video or in your next email. The dashboard then tells you which of your channels is actually working.",
  ctaCreer: "Create my affiliate account",
  ctaConditions: "Read the terms",
};

const FR_ATELIER: TexteAffiliationAtelier = {
  titre: "Affiliation Atelier du Quiz : 70 % par vente",
  description:
    `Recommande l'Atelier du Quiz, la formation de 7 jours à ${gainAtelier().prix}, et touche ` +
    `${PCT_ATELIER} % sur chaque vente. Comment obtenir ton lien et comment tu es payé.`,
  etiquette: "Affiliation",
  h1Apres: " sur l'Atelier du Quiz",
  accroche: `L'Atelier du Quiz est une formation de 7 jours à ${gainAtelier().prix}. Tu en touches ${gainAtelier().gain} par vente. C'est le taux le plus haut des deux programmes, parce que c'est un achat unique : il n'y a pas de mois suivant pour rattraper.`,
  ctaLien: "Récupérer mon lien",
  ctaTiquiz: "Voir aussi l'affiliation Tiquiz",
  recoitTitre: "Ce que ton filleul reçoit",
  recoitIntro: "Sept jours, une étape par jour, et Béné répond du premier au dernier.",
  etapes: [
    "Cadrage : quel quiz créer, et pour qui, avant d'écrire la première question",
    "Questions : celles qui qualifient vraiment, au lieu d'amuser",
    "Capture : les tags Systeme.io, pour ne perdre aucun lead en route",
    "En ligne : le quiz est publié en 1 clic et connecté à Systeme.io",
    "Trafic : envoyer du monde dessus sans payer un euro de publicité",
    "Viralité : le mécanisme qui fait que les participants partagent",
    "Ventes : le générateur qui écrit les emails de vente, profil par profil",
  ],
  recoitNote:
    "Avec ça : un coach IA disponible jour et nuit, la communauté, 5 bonus et 36 growth hacks. Et la garantie, dans les mots de Béné : tu appliques les méthodes, t'as pas de leads en 1 mois, elle te rembourse.",
  memeTitre: "Le même programme, un lien par produit",
  memeIntro:
    "Tu n'as pas deux comptes à gérer. C'est le même espace affilié, le même code public, le même compteur de filleuls et le même virement. Seul le lien change, parce que les deux produits ne vivent pas sur le même domaine.",
  labelTiquiz: "Pour Tiquiz",
  noteTiquiz: `${PCT_TIQUIZ} % à chaque échéance, tant qu'il reste abonné.`,
  labelAtelier: "Pour l'Atelier",
  noteAtelier: `${PCT_ATELIER} % une fois, sur la vente à ${gainAtelier().prix}.`,
  memeNote:
    "Ton code est le même dans les deux. Prends celui qui correspond à ce dont tu parles : un lien Tiquiz posé sous une vidéo qui parle de la formation enverrait les gens au mauvais endroit, et c'est la seule façon de perdre une commission ici.",
  memeCta: "Ouvrir mon espace affilié",
  payeTitre: "Comment tu es payé",
  payeIntro:
    "Exactement comme sur Tiquiz : c'est le même cycle, le même seuil et le même calendrier. Ces règles sont écrites à un seul endroit, pour qu'aucune des deux pages n'annonce un délai que l'autre contredit.",
  ctaConditions: "Conditions générales",
};

const EN_ATELIER: TexteAffiliationAtelier = {
  titre: "L'Atelier du Quiz affiliate programme: 70 % per sale",
  description:
    `Recommend L'Atelier du Quiz, the 7-day course at ${gainAtelier("en").prix}, and earn ` +
    `${PCT_ATELIER} % on every sale. How to get your link, and how you get paid.`,
  etiquette: "Affiliate",
  h1Apres: " on L'Atelier du Quiz",
  accroche: `L'Atelier du Quiz is a 7-day course at ${gainAtelier("en").prix}. You earn ${gainAtelier("en").gain} per sale. It is the higher of the two rates, because it is a one-off purchase: there is no next month to catch up on.`,
  ctaLien: "Get my link",
  ctaTiquiz: "See the Tiquiz programme too",
  recoitTitre: "What your referral gets",
  recoitIntro: "Seven days, one step a day, and Bene answers from the first to the last.",
  etapes: [
    "Framing: which quiz to build, and for whom, before writing the first question",
    "Questions: the ones that really qualify, instead of entertaining",
    "Capture: the Systeme.io tags, so no lead is lost on the way",
    "Live: the quiz is published in one click and connected to Systeme.io",
    "Traffic: sending people to it without paying a euro of advertising",
    "Sharing: the mechanism that makes participants pass it on",
    "Sales: the generator that writes the sales emails, profile by profile",
  ],
  recoitNote:
    "On top of that: an AI coach available day and night, the community, 5 bonuses and 36 growth hacks. And the guarantee, in Bene's own words: you apply the methods, you have no leads after a month, she refunds you.",
  memeTitre: "One programme, one link per product",
  memeIntro:
    "You do not have two accounts to manage. Same affiliate area, same public code, same referral counter, same payout. Only the link changes, because the two products do not live on the same domain.",
  labelTiquiz: "For Tiquiz",
  noteTiquiz: `${PCT_TIQUIZ} % on every payment, for as long as they stay subscribed.`,
  labelAtelier: "For L'Atelier",
  noteAtelier: `${PCT_ATELIER} % once, on the sale at ${gainAtelier("en").prix}.`,
  memeNote:
    "Your code is the same in both. Take the one that matches what you are talking about: a Tiquiz link under a video about the course would send people to the wrong place, and that is the only way to lose a commission here.",
  memeCta: "Open my affiliate area",
  payeTitre: "How you get paid",
  payeIntro:
    "Exactly as on Tiquiz: same cycle, same threshold, same calendar. These rules are written in a single place, so that neither page announces a delay the other contradicts.",
  ctaConditions: "Terms and conditions",
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteAffiliation>
> = { en: EN };

const TRADUCTIONS_ATELIER: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteAffiliationAtelier>
> = { en: EN_ATELIER };

export function contenuAffiliation(
  langue: LanguePublique = LANGUE_SANS_PREFIXE,
): TexteAffiliation {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}

export function contenuAffiliationAtelier(
  langue: LanguePublique = LANGUE_SANS_PREFIXE,
): TexteAffiliationAtelier {
  return langue === LANGUE_SANS_PREFIXE ? FR_ATELIER : TRADUCTIONS_ATELIER[langue];
}

/** Le taux affiche en gros, dans le titre. Il vient du catalogue. */
export const POURCENT_TIQUIZ = PCT_TIQUIZ;
export const POURCENT_ATELIER = PCT_ATELIER;

/** Le tableau des gains, dans la langue demandee. */
export function gainsPourLangue(langue: LanguePublique = LANGUE_SANS_PREFIXE) {
  return tableauDesGains(langue);
}
