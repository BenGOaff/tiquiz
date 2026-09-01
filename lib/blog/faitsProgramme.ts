// lib/blog/faitsProgramme.ts
//
// CE QUE LE BLOG PROMET DU PROGRAMME D'AFFILIATION, ET QUI DOIT ÊTRE
// VRAI.
//
// -- CE QUE ÇA FERME (31 août 2026) ------------------------------------
//
// Béné : "vérifier que chaque affilié reçoit les bonnes infos."
//
// La FAQ de `rente-mensuelle-affiliation-tiquiz` portait cinq faits, et
// quatre étaient faux. Deux familles, et la seconde coûte plus cher que
// la première :
//
// **1. Une ARITHMÉTIQUE restée au tarif d'avant le 6 août.** "Avec 30
// filleuls actifs sur le mensuel, ta rente s'élève à 108 € par mois" :
// 108, c'est 30 x 9 € x 40 %, l'ancien prix. La phrase JUSTE AU DESSUS
// annonce 6,80 € par filleul, donc 204 €, et le corps de l'article dit
// 204 € lui aussi. Le même article se contredisait à deux paragraphes
// d'écart. Idem pour "1 800 € par an" sur 50 filleuls annuels, quand le
// corps dit 3 400 €.
//
// C'est exactement le piège écrit dans l'AGENTS.md du 29 août : la
// passe d'import corrige les PRIX et laisse les CALCULS faits avec
// l'ancien prix. Le prix devient juste et le résultat devient faux, ce
// qui est pire que de n'avoir rien touché.
//
// **2. Des PROMESSES que le système contredit.** "versée
// automatiquement le 10 de chaque mois" et surtout "Pas de seuil de
// versement à atteindre" : il y en a un, 20 €
// (`MONTANT_MINIMUM_CENTS`), et le versement a lieu ENTRE le 10 et le
// 13, 30 jours après le paiement du client. L'espace affilié le dit
// correctement depuis le 26 août ; le blog, non.
//
// C'est la faute la plus chère de la liste, parce qu'elle ne se
// découvre qu'au premier virement, et que c'est le blog qui recrute :
// un gros affilié lit la promesse ici, constate autre chose là-bas, et
// ne revient pas. Même famille que les CGV du 22 août, dont l'article 5
// annonçait une renonciation que l'écran ne recueillait pas.
//
// -- POURQUOI UN MODULE, ET PAS UN COUP DE `sed` -----------------------
//
// Parce que le contenu est un FICHIER : corrigé une fois à la main, il
// redeviendrait faux au prochain import, et personne ne le verrait. La
// règle vit donc ici, `npm run blog:reparer` l'applique, et
// `tests/logic/blog.test.mts` appelle LA MÊME fonction : le contenu est
// propre quand la réparation ne change plus rien. Deux copies de la
// règle finiraient par ne plus être d'accord (leçon de la
// reponctuation, 30 août).

/** Le prix mensuel TTC, tel que le catalogue le vend. */
const PRIX_MENSUEL_TTC = 17;
/** Le prix annuel TTC. */
const PRIX_ANNUEL_TTC = 170;
/** Le taux de BASE annoncé publiquement. */
const TAUX_BASE = 0.4;

/**
 * LA TVA RETIRÉE AVANT DE COMMISSIONNER.
 *
 * Béné, 31 août 2026 : "pour l'affiliation on fait uniquement 40 % etc.
 * sur le HT."
 *
 * C'est la décision qui manquait, et elle tranche l'écart nommé dans
 * l'AGENTS.md : le simulateur calculait sur le HT (ce que le système
 * verse) et le blog annonçait le TTC, soit **20 % de plus que ce qui
 * sera versé**. C'est mot pour mot le drame du 19 août, où l'app
 * promettait 32,90 € et payait 27,42 €.
 *
 * Le taux du pays du vendeur, parce que c'est celui de la très grande
 * majorité des ventes. Un affilié dont le filleul est belge ou
 * professionnel touchera un peu plus ; annoncer le cas le plus courant
 * et se tromper VERS LE HAUT à la marge est la seule erreur acceptable
 * dans ce sens là.
 */
const TVA = 0.2;

/**
 * La rente par filleul, telle que l'article l'annonce.
 *
 * Calculée, jamais recopiée : c'est ce qui a manqué à la passe
 * d'import. Tous les montants de l'article tombent d'ici, sinon un
 * changement de tarif ou de base laisserait encore des calculs faits
 * avec l'ancienne valeur.
 */
export const RENTE_PAR_FILLEUL = {
  mensuel: (PRIX_MENSUEL_TTC / (1 + TVA)) * TAUX_BASE,
  annuel: (PRIX_ANNUEL_TTC / (1 + TVA)) * TAUX_BASE,
} as const;

/** Un montant en euros, écrit comme l'article les écrit. */
function euros(n: number): string {
  const arrondi = Math.round(n * 100) / 100;
  const s = Number.isInteger(arrondi)
    ? String(arrondi)
    : arrondi.toFixed(2).replace(".", ",");
  // L'espace des milliers de l'article est une INSÉCABLE, jamais une
  // espace ordinaire : la taper produirait un remplacement qui ne
  // trouve rien, en silence.
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * LES CORRECTIONS, PHRASE ENTIÈRE PAR PHRASE ENTIÈRE.
 *
 * Une phrase qui porte une arithmétique se corrige ENTIÈRE, jamais par
 * un remplacement de nombre : `108` seul se retrouverait dans une date,
 * un identifiant ou un autre calcul.
 *
 * Chaque règle dit POURQUOI. Une table sans raison écrite est une table
 * que le prochain passage "nettoie" en cassant le cas qu'il ne connaît
 * pas.
 */
export const FAITS: readonly {
  de: string;
  vers: string;
  pourquoi: string;
}[] = [
  // ── LES CALCULS DE RENTE ──
  //
  // Deux motifs par phrase, et ce n'est pas un doublon : l'un vise le
  // texte de l'import (l'ancien tarif à 9 €), l'autre le texte déjà
  // corrigé une fois (le TTC). Un ré-import ramènerait le premier, et
  // il doit retomber sur la MÊME cible que le second.
  {
    de: "Avec 30 filleuls actifs sur le mensuel, ta rente s'élève à 108 € par mois.",
    vers: `Avec 30 filleuls actifs sur le mensuel, ta rente s'élève à ${euros(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )} € par mois.`,
    pourquoi: "108 = 30 x 9 EUR x 40 %, l'ancien tarif d'avant le 6 aout.",
  },
  {
    de: "Avec 30 filleuls actifs sur le mensuel, ta rente s'élève à 204 € par mois.",
    vers: `Avec 30 filleuls actifs sur le mensuel, ta rente s'élève à ${euros(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )} € par mois.`,
    pourquoi: "204 = 30 x 40 % du TTC. La commission se calcule sur le HT (Bene, 31 aout).",
  },
  {
    de: "Avec 50 filleuls actifs sur l'annuel, ta rente atteint 1 800 € par an.",
    vers: `Avec 50 filleuls actifs sur l'annuel, ta rente atteint ${euros(
      50 * RENTE_PAR_FILLEUL.annuel,
    )} € par an.`,
    pourquoi: "1 800 = 50 x 90 EUR x 40 %, l'ancien tarif annuel.",
  },
  {
    de: "Avec 50 filleuls actifs sur l'annuel, ta rente atteint 3 400 € par an.",
    vers: `Avec 50 filleuls actifs sur l'annuel, ta rente atteint ${euros(
      50 * RENTE_PAR_FILLEUL.annuel,
    )} € par an.`,
    pourquoi: "3 400 = 50 x 40 % du TTC annuel. La commission se calcule sur le HT.",
  },
  {
    de: "<strong>Concrètement :</strong> 1 filleul à 17 €/mois = <strong>6,80 €/mois à vie</strong>. 30 filleuls actifs = <strong>204 €/mois</strong>. 50 filleuls sur le plan annuel = <strong>3 400 €/an</strong>.",
    vers: `<strong>Concrètement :</strong> 1 filleul à ${PRIX_MENSUEL_TTC} €/mois = <strong>${euros(
      RENTE_PAR_FILLEUL.mensuel,
    )} €/mois à vie</strong>. 30 filleuls actifs = <strong>${euros(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )} €/mois</strong>. 50 filleuls sur le plan annuel = <strong>${euros(
      50 * RENTE_PAR_FILLEUL.annuel,
    )} €/an</strong>.`,
    pourquoi: "les trois montants de l'accroche etaient 40 % du TTC, donc 20 % de trop.",
  },
  {
    de: "Sur le plan mensuel à 17 €, tu touches <strong>6,80 € de rente par filleul et par mois</strong>, soit 81,60 € par an et par filleul. Sur le plan annuel à 170 €, tu touches <strong>68 € de rente par filleul et par an</strong>.",
    vers: `Sur le plan mensuel à ${PRIX_MENSUEL_TTC} €, tu touches <strong>${euros(
      RENTE_PAR_FILLEUL.mensuel,
    )} € de rente par filleul et par mois</strong>, soit ${euros(
      12 * RENTE_PAR_FILLEUL.mensuel,
    )} € par an et par filleul. Sur le plan annuel à ${PRIX_ANNUEL_TTC} €, tu touches <strong>${euros(
      RENTE_PAR_FILLEUL.annuel,
    )} € de rente par filleul et par an</strong>.`,
    pourquoi: "la reponse de la FAQ annoncait 40 % du TTC sur les deux paliers.",
  },
  {
    de: "Sur 3 ans cumulés, <strong>un filleul mensuel à 17 €</strong> te rapporte 244,80 € de rente totale. <strong>Un filleul annuel à 170 €</strong> te rapporte 204 € de rente totale.",
    vers: `Sur 3 ans cumulés, <strong>un filleul mensuel à ${PRIX_MENSUEL_TTC} €</strong> te rapporte ${euros(
      36 * RENTE_PAR_FILLEUL.mensuel,
    )} € de rente totale. <strong>Un filleul annuel à ${PRIX_ANNUEL_TTC} €</strong> te rapporte ${euros(
      3 * RENTE_PAR_FILLEUL.annuel,
    )} € de rente totale.`,
    pourquoi:
      "projection a 3 ans calculee sur le TTC. La phrase suivante (17 x 12 = 204 EUR/an) parle de ce que le CLIENT paie : elle est juste, on n'y touche pas.",
  },
  {
    de: "tu génères <strong>68 € de rente par mois</strong>. Sur l'année, c'est 432 €.",
    vers: `tu génères <strong>${euros(10 * RENTE_PAR_FILLEUL.mensuel)} € de rente par mois</strong>. Sur l'année, c'est ${euros(
      120 * RENTE_PAR_FILLEUL.mensuel,
    )} €.`,
    pourquoi:
      "68 = 10 x 40 % du TTC, et surtout 432 ne correspondait a RIEN (68 x 12 = 816). Deux fautes dans la meme phrase.",
  },
  {
    de: "Soit une rente entre <strong>204 € et 340 € par mois</strong>.",
    vers: `Soit une rente entre <strong>${euros(30 * RENTE_PAR_FILLEUL.mensuel)} € et ${euros(
      50 * RENTE_PAR_FILLEUL.mensuel,
    )} € par mois</strong>.`,
    pourquoi: "fourchette 30 a 50 filleuls, calculee sur le TTC.",
  },
  {
    de: "Tu touches 68 € de commission immédiate.",
    vers: `Tu touches ${euros(RENTE_PAR_FILLEUL.annuel)} € de commission immédiate.`,
    pourquoi: "40 % du TTC annuel au lieu du HT.",
  },
  // Les deux comparaisons avec Tipote. Le montant TIPOTE (39,60 €,
  // 49,50 €) n'est PAS touché : Tipote n'est pas en vente, et ce que le
  // blog en promet est un point ouvert que Béné doit trancher. Mais la
  // moitié TIQUIZ de la comparaison, elle, doit dire la même chose que
  // le reste de l'article : le laisser à 6,80 € ferait se contredire
  // deux paragraphes du même texte, ce qui est exactement ce qu'on
  // vient de fermer.
  {
    de: "(6,80 € vers 49,50 €)",
    vers: `(${euros(RENTE_PAR_FILLEUL.mensuel)} € vers 49,50 €)`,
    pourquoi: "la moitie Tiquiz de la comparaison etait restee au TTC.",
  },
  {
    de: "<strong>39,60 € de rente par mois au lieu de 6,80 €</strong>",
    vers: `<strong>39,60 € de rente par mois au lieu de ${euros(RENTE_PAR_FILLEUL.mensuel)} €</strong>`,
    pourquoi: "idem : le montant Tiquiz de la comparaison doit etre celui verse.",
  },
  // ── LES DEUX SOURCES MAL CITÉES (1er septembre 2026) ──
  //
  // Sa fiche produit les signalait toutes les deux, et elles vivaient
  // dans LA MÊME PHRASE de `vendre-avec-un-quiz`. C'est son interdit
  // numéro un : ne jamais mentir, y compris en attribuant un chiffre à
  // une source qui ne le contient pas. Les deux sont vérifiables par
  // n'importe quel lecteur qui ouvre le rapport.
  //
  // 1. « ~45 % de ses VISITEURS » : le 44,9 % d'Interact est un taux
  //    START-TO-LEAD, mesuré sur les personnes qui COMMENCENT le quiz,
  //    pas sur celles qui voient la page. La formulation obligatoire est
  //    « des personnes qui commencent un quiz », et le chiffre exact est
  //    44,9 %, pas « ~45 ».
  //
  // 2. « un opt-in classique plafonne à 1 à 3 % (rapport Interact) » :
  //    LE RAPPORT NE CONTIENT AUCUN CHIFFRE SUR LES OPT-INS CLASSIQUES.
  //    L'attribution est fausse. Le chiffre reste, présenté pour ce
  //    qu'il est : ce qu'ELLE observe, pas ce qu'Interact publie.
  //
  // LE LIEN VERS LE RAPPORT RESTE, et il se DÉPLACE : il doit couvrir le
  // chiffre qu'Interact publie vraiment. Au passage, l'import avait coupé
  // le mot en deux (`Interac` puis `t` dans un second `<em>`), ce qui se
  // voyait au survol du lien.
  {
    de: "qu'<strong>un quiz bien fait séduise jusqu'à ~45 % de ses visiteurs</strong> dans le coaching et la formation, quand <strong>un opt-in classique plafonne à 1 à 3 %</strong> (<a href=\"https://www.tryinteract.com/blog/quiz-conversion-rate-report/\"><em>rapport Interac</em></a><em>t</em>).",
    vers: "que <strong>44,9 % des personnes qui commencent un quiz</strong> laissent leur email dans le coaching et la formation (<a href=\"https://www.tryinteract.com/blog/quiz-conversion-rate-report/\"><em>rapport Interact</em></a>), quand un opt-in classique plafonne à 1 à 3 % d'après ce que je vois passer.",
    pourquoi:
      "44,9 % est un taux start-to-lead, pas un taux de page ; et le 1 a 3 % n'est PAS dans le rapport Interact.",
  },
  {
    de: "bien plus que ses 6,80 € de rente mensuelle visible",
    vers: `bien plus que ses ${euros(RENTE_PAR_FILLEUL.mensuel)} € de rente mensuelle visible`,
    pourquoi: "40 % du TTC mensuel au lieu du HT.",
  },
  {
    de: "rente mensuelle versée automatiquement le 10 de chaque mois",
    vers: "rente mensuelle versée entre le 10 et le 13 de chaque mois",
    pourquoi:
      "le versement a lieu ENTRE le 10 et le 13, c'est ce que dit l'espace affilie depuis le 26 aout",
  },
  {
    de: "Ta rente est versée <strong>automatiquement le 10 de chaque mois</strong>, via PayPal ou virement bancaire au choix. Pas de seuil de versement à atteindre, pas de facture à émettre, pas de relance à faire.",
    vers:
      "Ta rente est versée <strong>entre le 10 et le 13 de chaque mois</strong>, via PayPal ou virement bancaire au choix. " +
      "Une commission devient versable 30 jours après le paiement de ton filleul, et le versement part dès 20 € cumulés. " +
      "En dessous de ce seuil l'argent reste acquis et part au versement suivant. Pas de facture à émettre, pas de relance à faire : nous l'émettons pour toi.",
    pourquoi:
      "IL Y A un seuil (20 EUR) et un delai (J+30). Promettre le contraire ne se decouvre qu'au premier virement, et c'est le blog qui recrute.",
  },
  {
    de: "et un dashboard de suivi de ta rente sur Systeme io",
    vers: "et un dashboard de suivi de ta rente dans ton espace affilié",
    pourquoi:
      "le tableau de bord vit sur affiliate.tipote.com depuis que le registre est chez nous ; Systeme.io ne montre plus que ses anciens tunnels",
  },
  // ── LA SECTION "ÉCOSYSTÈME" ET SES PROMESSES SUR TIPOTE (1er sept.) ──
  //
  // Béné : "peut être moins mentionner tipote sur cet article mais la
  // formation atelier du quiz et les futurs logiciels à venir".
  //
  // La section 4 entière a été réécrite dans le JSON (elle promettait
  // 50 % à vie sur des plans Tipote de 19 à 917 €/mois, sur un produit
  // qui n'est pas en vente). Ce qui reste ici, ce sont les phrases
  // ISOLÉES qui portaient la même promesse ailleurs dans l'article :
  // le TL;DR et la FAQ. Elles sont traitées en règles parce qu'un
  // ré-import les ramènerait telles quelles.
  {
    de: "versée le <strong>10 de chaque mois</strong> tant que tes filleuls restent abonnés. Tu touches <strong>40 % à vie</strong> sur chaque abonnement Tiquiz souscrit via ton lien.",
    vers:
      "versée entre le <strong>10 et le 13 de chaque mois</strong> tant que tes filleuls restent abonnés. " +
      "Tu touches <strong>40 % à vie au minimum</strong> sur chaque abonnement Tiquiz souscrit via ton lien, et ce taux monte jusqu'à 70 % avec le nombre de filleuls qui paient.",
    pourquoi:
      "le versement a lieu ENTRE le 10 et le 13, et 40 % est le plancher : annoncer le plancher comme un plafond sous-vend le programme.",
  },
  {
    de: "<p><strong>L'effet écosystème en bonus :</strong> tes filleuls Tiquiz sont déjà dans la base Tipote. Quand Tipote sort (plans 19 à 917 €/mois, <strong>50 % de commission à vie</strong>), je les sollicite en priorité pour basculer. Un seul filleul qui passe sur Tipote au plan haut = <strong>49,50 €/mois pour toi</strong>, sans effort de ta part. C'est <strong>×14 sur ta rente</strong>.</p>",
    vers:
      "<p><strong>L'effet écosystème en bonus :</strong> le même lien te paie <strong>70 % sur l'Atelier du Quiz</strong>, la formation à 47 €, soit <strong>27,42 €</strong> par vente. " +
      "Et ton taux Tiquiz monte par marches, de 40 % jusqu'à 70 %, avec le nombre de filleuls qui paient.</p>",
    pourquoi:
      "Tipote n'est pas en vente : ni ses plans, ni son taux, ni le x14 ne sont verifiables. L'Atelier, lui, se verifie dans le code.",
  },
  {
    de: "<strong>Versements automatiques</strong> par PayPal ou virement, <strong>sans seuil</strong>, <strong>sans facture à émettre</strong>, <strong>sans condition d'inscription</strong>.",
    vers:
      "<strong>Versements</strong> par PayPal ou virement, <strong>dès 20 € cumulés</strong> et 30 jours après le paiement de ton filleul, " +
      "<strong>sans facture à émettre</strong> (on l'écrit pour toi) et <strong>sans condition d'inscription</strong>.",
    pourquoi:
      "IL Y A un seuil de 20 EUR et un delai de 30 jours. C'est la meme promesse fausse que dans la FAQ, dans une autre phrase.",
  },
  {
    de: "Mes filleuls Tiquiz me génèrent-ils aussi une rente sur Tipote quand Tipote sort ?",
    vers: "Est-ce que le même lien me paie sur l'Atelier du Quiz ?",
    pourquoi: "la question elle-meme promettait une rente sur un produit qui n'est pas en vente.",
  },
  {
    de: "<p>Oui. L'attribution d'affiliation reste à toi pour tout l'écosystème Tipote. Quand Tipote ouvre ses portes (plans de 19 € à 917 €/mois), tes filleuls Tiquiz seront sollicités en priorité pour basculer ou s'ajouter Tipote. À taux d'affiliation identique (40 % à vie), un filleul qui prend Tipote au plan haut te génère <strong>39,60 € de rente par mois au lieu de 5,67 €</strong>. Tu n'as rien de plus à faire : tu as amené le filleul sur Tiquiz, l'écosystème prend la suite, et ta rente grossit toute seule.</p>",
    vers:
      "<p>Oui. C'est le même registre d'affiliés pour Tiquiz et pour l'Atelier du Quiz, tu n'as pas deux comptes à gérer. La formation est à 47 € et la commission est de <strong>70 %</strong>, soit <strong>27,42 €</strong> par vente, en une seule fois. Un filleul qui prend l'Atelier puis un abonnement Tiquiz te rapporte les deux.</p>" +
      "<p>Pour les outils et les formations qui sortiront plus tard, le rattachement est à vie et il vaut pour le registre, pas pour un produit. Je ne t'annonce ni date, ni prix, ni taux tant que ce n'est pas en vente.</p>",
    pourquoi:
      "meme raison : 19 a 917 EUR/mois, 40 % et 39,60 EUR ne sont verifiables nulle part.",
  },

  // ── LE PLANCHER DIT COMME UN PLAFOND ──
  {
    de: "Tu touches <strong>40 % de commission récurrente</strong> sur chaque paiement de ton filleul",
    vers:
      "Tu touches <strong>40 % de commission récurrente au minimum</strong> sur chaque paiement de ton filleul, et ce taux monte jusqu'à 70 % avec le nombre de filleuls qui paient",
    pourquoi: "40 % est la premiere marche, pas la seule.",
  },
  {
    de: "Tant qu'il reste abonné, tu continues à toucher 40 % de chaque paiement.",
    vers: "Tant qu'il reste abonné, tu continues à toucher ta commission sur chaque paiement.",
    pourquoi: "idem : le taux depend de sa marche, l'ecrire en dur le fige au plancher.",
  },
  {
    de: "Un simulateur officiel est disponible sur la page d'affiliation Tiquiz pour projeter ta rente selon ton nombre de filleuls visé.",
    vers:
      "Ces montants sont calculés au taux de départ de 40 % : dès ton premier filleul qui paie tu passes à 45 %, et le taux monte jusqu'à 70 %. " +
      "Un simulateur est disponible sur la page d'affiliation Tiquiz pour projeter ta rente selon ton nombre de filleuls visé.",
    pourquoi:
      "la FAQ donnait des montants au plancher sans dire que c'etait le plancher : l'affilie touchera plus, et il ne le savait pas.",
  },

  // ── LES PRIX DE L'ANCIEN TARIF, RESTÉS DANS UNE COMPARAISON ──
  {
    de: "parce que 9 € par mois sans engagement est psychologiquement plus facile à conserver que 90 € versés d'un coup",
    vers: `parce que ${PRIX_MENSUEL_TTC} € par mois sans engagement est psychologiquement plus facile à conserver que ${PRIX_ANNUEL_TTC} € versés d'un coup`,
    pourquoi: "9 EUR et 90 EUR sont les tarifs d'avant le 6 aout, restes dans une phrase sans arithmetique.",
  },
  {
    de: "Le mensuel gagne sur la durée parce que la base (17 € x 12 = 204 €/an) est supérieure à 170 €/an.",
    vers: `Le mensuel gagne sur la durée tout simplement parce que ton filleul paie plus sur l'année : ${PRIX_MENSUEL_TTC} € douze fois font ${12 * PRIX_MENSUEL_TTC} €, contre ${PRIX_ANNUEL_TTC} € en une fois.`,
    pourquoi:
      "la phrase reutilisait 204 pour designer ce que paie le CLIENT, deux lignes apres 204 EUR de RENTE sur 3 ans : deux choses differentes derriere le meme nombre.",
  },

  // ── CE QUI SE CONTREDISAIT DEPUIS QUE LE TAUX MONTE ──
  {
    de: "3. Pourquoi 40 % à vie est la rente la plus solide du marché",
    vers: "3. Pourquoi 40 % à vie, c'est une rente et pas un complément",
    pourquoi:
      "\"la plus solide du marche\" est un superlatif qu'on ne peut pas prouver, et le blog est ce qui recrute les affilies.",
  },
  {
    de: "3.3. Pourquoi 40 % et pas 50 %",
    vers: "3.3. Pourquoi ça démarre à 40 %",
    pourquoi:
      "le taux monte jusqu'a 70 % : le titre disait le contraire de la section 4, dans le meme article.",
  },
  {
    de: "<p>Parce que je veux que Tiquiz reste rentable et puisse continuer à évoluer dans la durée. Il y a l'hébergement, les coûts d'IA (génération des quiz avec Claude), le support client, les évolutions produit. À 50 % de commission à vie, je ne pourrais plus financer le développement du produit. À terme, Tiquiz perdrait en qualité, tes filleuls partiraient, et ta rente s'effondrerait.</p>",
    vers:
      "<p>Parce qu'un taux doit se financer. Il y a l'hébergement, les coûts d'IA, le support, les évolutions du produit. " +
      "Un programme qui démarre trop haut se rattrape ailleurs, en général sur la qualité de l'outil, et c'est ta rente qui trinque quand tes filleuls partent.</p>" +
      "<p>Alors 40 % au départ, et le taux monte quand tu amènes du monde : à ce moment là, il y a de quoi le payer. C'est le même argent qui finance les deux.</p>",
    pourquoi:
      "la justification \"pas 50 %\" ne tient plus depuis que le bareme va jusqu'a 70 %.",
  },
  {
    de: "<strong>Automatique</strong> : versement le 10 du mois, sans intervention de ta part",
    vers: "<strong>Automatique</strong> : versement entre le 10 et le 13, sans intervention de ta part",
    pourquoi: "troisieme endroit du meme article qui annoncait le 10 tout court.",
  },

  // ── LE KIT ANNONCÉ ET LE KIT RÉEL ──
  {
    de: "bannières dans plusieurs formats (web et réseaux sociaux), emails prêts à envoyer, posts pour LinkedIn / Instagram / X / Threads, liens trackés personnalisables vers chaque page du site, et un dashboard de suivi de ta rente dans ton espace affilié.",
    vers:
      "un générateur d'images aux couleurs Tiquiz (formats Instagram, LinkedIn, X, stories et Pinterest), des emails prêts à envoyer, " +
      "des posts éditables pour LinkedIn, Instagram, X et Threads, tes liens suivis vers chaque page du site, et le suivi de tes commissions en temps réel.",
    pourquoi:
      "la FAQ promettait des bannieres que l'espace affilie ne fournit pas, et oubliait le generateur d'images qu'il fournit.",
  },
  // ── LES TROIS DERNIERS ENDROITS DU MÊME ARTICLE ──
  //
  // La promesse Tipote et le "10 de chaque mois" vivaient à SIX endroits
  // d'un article de 60 blocs : le chapeau, l'intro, les cinq étapes, la
  // section 4, la FAQ et la conclusion. C'est la mécanique habituelle
  // d'une phrase recopiée : on en corrige une, on croit avoir fini.
  {
    de: "Tu reçois <strong>40 % de commission récurrente à vie</strong> sur chaque abonnement Tiquiz que tu génères. Tes commissions sont <strong>versées le 10 de chaque mois en automatique</strong>.",
    vers:
      "Tu reçois <strong>40 % de commission récurrente à vie</strong> sur chaque abonnement Tiquiz que tu génères, et ce taux monte jusqu'à 70 % avec le nombre de filleuls qui paient. " +
      "Tes commissions sont <strong>versées entre le 10 et le 13 de chaque mois</strong>.",
    pourquoi: "l'intro annoncait le 10 tout court et le plancher comme un plafond.",
  },
  {
    de: "<p>Et il y a un effet d'échelle que peu de programmes te proposent : tes filleuls Tiquiz entrent dans <strong>l'écosystème Tipote</strong>. Quand Tipote sortira (plans de 19 à 917 €/mois), ils seront sollicités pour basculer, et <strong>ta rente sur eux montera jusqu'à 39,60 € par filleul et par mois</strong>, sans rien faire de plus.</p>",
    vers:
      "<p>Et il y a un effet d'échelle que peu de programmes te proposent : le même lien te paie <strong>70 % sur l'Atelier du Quiz</strong>, la formation à 47 €, et ton taux Tiquiz monte par marches jusqu'à 70 % à mesure que tes filleuls s'accumulent. " +
      "Le travail que tu fais aujourd'hui augmente ce que te rapportent les filleuls que tu as déjà.</p>",
    pourquoi: "Tipote n'est pas en vente : ni les plans, ni les 39,60 EUR ne sont verifiables.",
  },
  {
    de: "<strong>Étape 4.</strong> Tu touches <strong>40 % de chaque paiement de ton filleul</strong>.",
    vers: "<strong>Étape 4.</strong> Tu touches <strong>40 % au minimum de chaque paiement de ton filleul</strong>.",
    pourquoi: "l'etape 4 figeait le taux au plancher.",
  },
  {
    de: "<strong>Étape 5.</strong> Ta rente est versée <strong>automatiquement le 10 de chaque mois</strong> via PayPal ou virement bancaire. Pas de seuil de versement à atteindre, pas de facture à émettre, pas de relance à faire. Tu paramètres ta méthode de paiement une seule fois et ça tombe tous les mois.",
    vers:
      "<strong>Étape 5.</strong> Ta rente est versée <strong>entre le 10 et le 13 de chaque mois</strong> via PayPal ou virement bancaire. " +
      "Une commission devient versable 30 jours après le paiement de ton filleul, et le versement part dès 20 € cumulés : en dessous, l'argent reste acquis et part au versement suivant. " +
      "Pas de facture à émettre, pas de relance à faire, on écrit la facture pour toi. Tu paramètres ta méthode de paiement une seule fois et ça tombe tous les mois.",
    pourquoi: "quatrieme endroit du meme article qui promettait \"pas de seuil\" et le 10 tout court.",
  },
  {
    de: "<strong>Reçois ta première commission</strong> le 10 du mois qui suit le premier abonnement payant d'un filleul. À partir de là, la commission devient récurrente et la rente commence à se construire mois après mois.",
    vers:
      "<strong>Reçois ta première commission</strong> au versement qui suit, entre le 10 et le 13, une fois passés les 30 jours et les 20 € cumulés. " +
      "À partir de là, la commission devient récurrente et la rente se construit mois après mois.",
    pourquoi: "la conclusion promettait le mois suivant, sans le delai ni le seuil.",
  },
  {
    de: "La rente s'empile au fur et à mesure des filleuls que tu amènes, et elle peut grossir d'elle-même quand Tipote sort.",
    vers: "La rente s'empile au fur et à mesure des filleuls que tu amènes, et chaque nouveau filleul qui paie fait monter ton taux sur tous les autres.",
    pourquoi: "derniere phrase de l'article, derniere promesse sur un produit qui n'est pas en vente.",
  },
  // ── LA DESCRIPTION ET LES MOTS CLÉS, QUI DISAIENT LA MÊME CHOSE ──
  //
  // La `description` est ce que Google affiche sous le titre : c'est
  // souvent la SEULE phrase que quelqu'un lit avant de cliquer, et elle
  // promettait "payée le 10 du mois, sans condition". Les mots clés
  // portaient les deux mêmes promesses fausses.
  {
    de: "L'affiliation Tiquiz te génère une rente mensuelle automatique : 40 % de commission à vie sur chaque abonnement, payée le 10 du mois, sans condition.",
    vers: "L'affiliation Tiquiz te génère une rente mensuelle : 40 % de commission à vie au minimum sur chaque abonnement, jusqu'à 70 %, versée entre le 10 et le 13 du mois.",
    pourquoi:
      "la description est la seule phrase lue avant le clic : elle promettait le 10 tout court et \"sans condition\".",
  },
  { de: "paiement le 10 du mois", vers: "paiement entre le 10 et le 13", pourquoi: "mot cle faux." },
  { de: "affiliation sans seuil", vers: "affiliation récurrente à vie", pourquoi: "il y a un seuil de 20 EUR." },
  // ── LE COMPARATIF QUI COMPARAIT DES CHIFFRES QU'ON N'A PAS ──
  //
  // Le tableau perdu à l'import comparait Tiquiz à "4 programmes
  // d'affiliation SaaS populaires en français", et le verdict annonçait
  // "Systeme io reste plus élevé en taux (60 %)". Je n'ai vérifié aucun
  // de ces taux. Les réinventer pour reconstruire le tableau serait
  // exactement l'interdit numéro un de Béné.
  //
  // La section compare donc les CRITÈRES d'une rente solide et ce que
  // Tiquiz répond sur chacun : tout y est vérifiable dans notre code.
  {
    de: "<p>Pour situer Tiquiz par rapport au marché, voici une comparaison de la solidité de la rente avec 4 programmes d'affiliation SaaS populaires en français.</p>",
    vers:
      "<p>Un programme d'affiliation se juge sur une poignée de questions, et ce sont toujours les mêmes. " +
      "Voici les critères qui comptent, et ce que Tiquiz répond sur chacun. Tu peux poser exactement les mêmes à n'importe quel autre programme avant de t'y inscrire.</p>",
    pourquoi:
      "le tableau compare des criteres, plus 4 programmes dont je n'ai verifie aucun taux.",
  },
  {
    de: "<p><strong>Verdict</strong> : Tiquiz se positionne dans le haut du marché en solidité de rente (récurrence à vie) et en simplicité administrative (aucun seuil, aucune condition, paiement auto). Systeme io reste plus élevé en taux (60 %) mais avec un marché plus que saturé.</p>",
    vers:
      "<p>Les deux réponses qui font toute la différence sont les deux premières. " +
      "Une commission versée une seule fois n'est pas une rente, et une commission qui s'arrête au bout de douze mois non plus : " +
      "dans les deux cas, tu dois recruter en permanence juste pour rester au même niveau. Pose ces deux questions en premier.</p>",
    pourquoi:
      "\"le haut du marche\" et les \"60 %\" de Systeme io ne sont verifiables nulle part, et \"aucun seuil\" est faux chez nous.",
  },
];

/**
 * LE MOTIF D'UNE RÈGLE, TOLÉRANT AUX ESPACES.
 *
 * -- CE QUI A ÉTÉ RATÉ AU PREMIER JET, ET QUI EST INSTRUCTIF ----------
 *
 * La règle sur "1 800 € par an" ne trouvait RIEN : l'article écrit ce
 * nombre avec une espace INSÉCABLE, et la règle portait une espace
 * ordinaire. Le remplacement échouait en silence.
 *
 * Pire, le CONTRÔLE échouait de la même façon, avec le même littéral :
 * il répondait "aucun fait faux" sur un article qui portait encore le
 * mauvais chiffre. **Un contrôle qui ne distingue pas ce qu'il est
 * censé distinguer est pire qu'un contrôle absent** (leçon du 22 août
 * sur les clés Supabase).
 *
 * Toute suite d'espaces du motif accepte donc n'importe quelle espace :
 * ordinaire, insécable, insécable fine. C'est le piège nommé dans
 * l'AGENTS.md du 29 août, qui disait déjà qu'une espace insécable ne se
 * tape pas, elle s'exprime.
 *
 * EXPORTÉ parce que `liensIntegrations.ts` corrige lui aussi des
 * phrases entières et doit voir EXACTEMENT ce que celle-ci voit. Deux
 * constructions de motif finiraient par ne plus être d'accord, et c'est
 * le contrôle qui mentirait le premier (leçon du 31 août : le motif de
 * "1 800 € par an" portait une espace ordinaire et l'article une
 * insécable, donc la réparation ET le contrôle passaient à côté).
 */
export function motif(de: string): RegExp {
  const echappe = de.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(echappe.replace(/[\s\u00a0\u202f]+/g, "[\\s\\u00a0\\u202f]+"), "g");
}

/**
 * Applique les corrections de faits à un fragment.
 *
 * Idempotente par construction : chaque motif disparaît après le
 * premier passage, donc relancer ne change plus rien. C'est ce qui
 * permet au test d'exiger que la réparation ne change rien sur le
 * contenu déployé.
 */
export function corrigerFaits(fragment: string): string {
  let out = String(fragment ?? "");
  for (const regle of FAITS) out = out.replace(motif(regle.de), regle.vers);
  return out;
}

/**
 * Ce qui reste FAUX dans un fragment, s'il y a quelque chose.
 *
 * Sert au contrôle, pas à la réparation : il nomme la règle qui n'a pas
 * été appliquée plutôt que de répondre par un booléen. Un contrôle qui
 * dit juste « non » envoie chercher au mauvais endroit.
 *
 * Il utilise LE MÊME motif que la réparation : c'est la seule façon
 * qu'il voie exactement ce qu'elle voit.
 */
export function faitsFaux(fragment: string): string[] {
  const texte = String(fragment ?? "");
  return FAITS.filter((r) => motif(r.de).test(texte)).map((r) => r.pourquoi);
}
