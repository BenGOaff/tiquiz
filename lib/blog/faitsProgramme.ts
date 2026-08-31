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
 * La rente par filleul, telle que l'article l'annonce.
 *
 * Calculée, jamais recopiée : c'est ce qui a manqué à la passe
 * d'import. 6,80 € et 68 € doivent tomber d'ici, sinon un changement de
 * tarif laisserait encore des calculs à l'ancien prix.
 */
export const RENTE_PAR_FILLEUL = {
  mensuel: PRIX_MENSUEL_TTC * TAUX_BASE,
  annuel: PRIX_ANNUEL_TTC * TAUX_BASE,
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
  {
    de: "Avec 30 filleuls actifs sur le mensuel, ta rente s'élève à 108 € par mois.",
    vers: `Avec 30 filleuls actifs sur le mensuel, ta rente s'élève à ${euros(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )} € par mois.`,
    pourquoi:
      "108 = 30 x 9 EUR x 40 %, l'ancien tarif. La phrase juste au dessus annonce 6,80 EUR par filleul, donc 204 EUR, et le corps de l'article dit 204 EUR.",
  },
  {
    de: "Avec 50 filleuls actifs sur l'annuel, ta rente atteint 1 800 € par an.",
    vers: `Avec 50 filleuls actifs sur l'annuel, ta rente atteint ${euros(
      50 * RENTE_PAR_FILLEUL.annuel,
    )} € par an.`,
    pourquoi:
      "1 800 = 50 x 90 EUR x 40 %, l'ancien tarif annuel. Le corps de l'article dit 3 400 EUR.",
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
