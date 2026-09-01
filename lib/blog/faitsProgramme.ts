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
 */
function motif(de: string): RegExp {
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
