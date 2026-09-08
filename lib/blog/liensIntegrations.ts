// lib/blog/liensIntegrations.ts
//
// LE BLOG POINTE VERS LE HUB INTÉGRATIONS, ET NE LE CONTREDIT PAS.
//
// -- CE QUE ÇA FERME (1er septembre 2026) ------------------------------
//
// La consigne du hub demandait des liens entrants "dans le CORPS des
// deux articles de blog cités, pas seulement en fin d'article", et le
// document de suivi les annonçait comme posés. **Ils ne l'étaient pas :
// mesuré, aucun des onze articles ne contenait la chaîne
// `/integrations`.** Une page qui n'est liée que depuis le pied de page
// dépend entièrement de la patience d'un robot.
//
// -- ET LE PARAGRAPHE QUI AURAIT RENDU LE LIEN GÊNANT ------------------
//
// En allant poser le lien, le paragraphe de comparaison de prix de
// `comment-creer-quiz-systeme-io` s'est révélé faux TROIS fois :
//
//   « Typeform Plus à 50 €/mois, plus Zapier à 217 €/mois.
//     Total : 717 €/mois. Sur 5 ans, ça fait près de 5 000 €. »
//
//   1. **50 + 217 = 267, pas 717.** L'addition est fausse à l'écran.
//   2. **Aucun des deux totaux ne donne 5 000 € sur 5 ans** (717 x 60 =
//      43 020, 267 x 60 = 16 020). Et "450 € au lieu de 5 000 €" est
//      faux des deux côtés : 17 x 60 = 1 020, 170 x 5 = 850.
//   3. **Zapier à 217 €/mois contredit frontalement notre propre page**
//      `/integrations/zapier-systeme-io`, qui annonce 29,99 $ par mois
//      pour le premier plan payant. Poser un lien depuis ce paragraphe
//      aurait mis les deux chiffres à un clic l'un de l'autre.
//
// C'est le drame de la FAQ de la rente (31 août) dans un autre article :
// une passe d'import corrige les PRIX et laisse les CALCULS faits avec
// les anciens. Les montants se CALCULENT donc ici, ils ne se recopient
// pas.
//
// -- LES CHIFFRES, ET D'OÙ ILS VIENNENT --------------------------------
//
// Relevés le 1er septembre 2026, en paiement MENSUEL (c'est le mode
// comparé : personne ne s'engage un an pour un outil de transport) :
//
//   - Typeform Plus : 79 $ par mois, 1 000 réponses incluses
//     (`typeform.com/pricing`) ;
//   - Zapier Professional : 29,99 $ par mois (`ZAPIER`, capture de Béné).
//
// Les deux facturent en dollars, Tiquiz en euros : on garde les devises
// telles quelles. Convertir demanderait un taux de change inventé, qui
// serait faux le lendemain.

import { motif } from "@/lib/blog/faitsProgramme";
import { OWNER_CATALOG } from "@/lib/checkout/catalog";
import { ZAPIER, ZAPIER_PRO_USD } from "@/lib/site/integrations";

/** Typeform Plus, en paiement mensuel. Relevé le 1er septembre 2026. */
export const TYPEFORM_PLUS_PAR_MOIS_USD = 79;

/**
 * Zapier Professional, en paiement mensuel, lu dans la source unique.
 *
 * On lit le NOMBRE, plus la chaîne affichée. Cette ligne le rendait
 * en retirant les caractères non chiffrés de `29,99 $` : ça marchait,
 * et ça tombait au premier tarif écrit autrement (un prix rond, une
 * espace insécable, un autre symbole). Depuis le 8 septembre le nombre
 * existe pour lui même, parce que le prix s'affiche aussi en anglais.
 */
export const ZAPIER_PRO_PAR_MOIS_USD = ZAPIER_PRO_USD;

/** Le prix Tiquiz vient du CATALOGUE, jamais recopié. */
const TIQUIZ_MENSUEL_EUR = OWNER_CATALOG.mensuel.amountCents / 100;
const TIQUIZ_ANNUEL_EUR = OWNER_CATALOG.annuel.amountCents / 100;

/** Un nombre à la française : virgule décimale, espace insécable fine. */
function nombre(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/ | /g, " ");
}

const TOTAL_CONCURRENT = TYPEFORM_PLUS_PAR_MOIS_USD + ZAPIER_PRO_PAR_MOIS_USD;
const CONCURRENT_5_ANS = Math.round((TOTAL_CONCURRENT * 60) / 100) * 100;
const TIQUIZ_5_ANS = TIQUIZ_ANNUEL_EUR * 5;

/**
 * LES PHRASES À CORRIGER, ENTIÈRES.
 *
 * Jamais un remplacement de nombre : `217` seul se retrouverait dans une
 * date, un identifiant ou un autre calcul (règle du 29 août).
 */
export const FAITS_OUTILS: readonly {
  de: string;
  vers: string;
  pourquoi: string;
}[] = [
  {
    de: "tu pars sur du Typeform Plus à 50 €/mois (qui n’a aucune connexion native à Systeme io), plus Zapier à 217 €/mois (indispensable pour transmettre les réponses à Systeme io).",
    vers: `tu pars sur du Typeform Plus à ${TYPEFORM_PLUS_PAR_MOIS_USD} $/mois (qui n’a aucune connexion native à Systeme io), plus Zapier Professional à ${ZAPIER.professionnelParMois}/mois (indispensable pour transmettre les réponses à Systeme io).`,
    pourquoi:
      "Typeform Plus est a 79 $/mois en mensuel, et Zapier Professional a 29,99 $/mois : les 217 EUR contredisaient notre propre page Zapier.",
  },
  {
    de: "Total : <strong>717 €/mois</strong>.",
    vers: `Total : <strong>${nombre(TOTAL_CONCURRENT)} $/mois</strong>.`,
    pourquoi: "50 + 217 ne fait pas 717 : l'addition etait fausse a l'ecran.",
  },
  {
    de: "Sur 5 ans, ça fait près de 5 000 €.",
    vers: `Sur 5 ans, ça fait plus de ${nombre(CONCURRENT_5_ANS)} $.`,
    pourquoi: "717 x 60 = 43 020, jamais 5 000 : le total sur 5 ans ne venait d'aucun calcul.",
  },
  {
    de: "Sur 5 ans, ça fait 450 € au lieu de 5 000 €.",
    vers: `Sur 5 ans, ça fait ${nombre(TIQUIZ_5_ANS)} € en annuel, au lieu de plus de ${nombre(
      CONCURRENT_5_ANS,
    )} $.`,
    pourquoi:
      "170 EUR x 5 = 850, pas 450, et les 5 000 EUR d'en face n'existaient pas non plus.",
  },

  // ── LES MÊMES CHIFFRES, DANS LES FAQ ──
  //
  // Le CORPS de ces deux articles a été corrigé le 1er septembre, leur
  // FAQ non : le même article annonçait donc 79 $ dans son texte et
  // 717 € dans sa FAQ, à quelques écrans d'écart. C'est le défaut de
  // la rente du 31 août, à un autre endroit du même blog.
  //
  // Les montants viennent des MÊMES constantes que le corps, donc les
  // deux ne peuvent plus diverger au prochain changement de tarif.
  {
    de:
      "Typeform Plus combiné à Zapier (le bricolage classique) revient à environ 717 €/mois, " +
      "soit près de 950 €/an. Sur 5 ans, Tiquiz revient à 450 € au total contre près de 5 000 € " +
      "pour la stack Typeform + Zapier.",
    vers:
      `Typeform Plus combiné à Zapier (le bricolage classique) revient à ` +
      `${nombre(TOTAL_CONCURRENT)} $/mois. Sur 5 ans, Tiquiz revient à ${nombre(TIQUIZ_5_ANS)} € ` +
      `en annuel, contre plus de ${nombre(CONCURRENT_5_ANS)} $ pour la stack Typeform + Zapier.`,
    pourquoi:
      "717 et 950 ne venaient d'aucun calcul, et 450 EUR sur 5 ans contredisait le corps du meme article.",
  },
  {
    de: "avec Typeform + Zapier autour de 717 €/mois",
    vers: `avec Typeform + Zapier autour de ${nombre(TOTAL_CONCURRENT)} $/mois`,
    pourquoi: "le recapitulatif de fin d'article gardait le total faux que le corps avait corrige.",
  },

  // LE PRIX DE TALLY EST RETIRE, IL N'EST PAS CORRIGE.
  //
  // Il n'est verifiable NULLE PART dans ce depot, et un tarif annonce
  // faux se verifie en un clic. La version anglaise de cet article
  // l'avait deja retire pour cette raison le 8 septembre.
  //
  // Et "Tiquiz en beta c'est 57 EUR une fois a vie" est termine :
  // c'est exactement la promesse retiree de la page de vente le
  // 3 septembre, restee dans une FAQ que personne ne relisait.
  {
    de:
      "Côté prix, Typeform Plus c'est 50 €/mois, Tally Pro c'est 29 $/mois, " +
      "Tiquiz en bêta c'est 57 € une fois à vie.",
    vers:
      `Côté prix, Typeform Plus c'est ${TYPEFORM_PLUS_PAR_MOIS_USD} $/mois, et Tiquiz ` +
      `${TIQUIZ_MENSUEL_EUR} €/mois ou ${TIQUIZ_ANNUEL_EUR} €/an, avec un plan gratuit pour tester.`,
    pourquoi:
      "l'acces a vie a 57 EUR est termine, et le prix de Tally n'est verifiable nulle part.",
  },
];

/**
 * LES LIENS ENTRANTS, POSÉS DANS LE CORPS.
 *
 * `apres` est un FRAGMENT DE TEXTE, jamais une position : un bloc
 * inséré plus haut décalerait tous les index, et le lien atterrirait
 * dans un paragraphe qui parle d'autre chose (règle des ancres de
 * `tableauxRente.ts`, 1er septembre).
 *
 * `href` sert aussi de marque d'idempotence : si le fragment porte déjà
 * l'adresse, on ne pose rien. C'est ce qui permet au test d'exiger que
 * la réparation ne change plus rien sur le contenu déployé.
 */
export const LIENS: readonly {
  apres: string;
  href: string;
  html: string;
  pourquoi: string;
}[] = [
  {
    apres: "Interact publie une page qui s'appelle \"intégration Systeme io\".",
    href: "/integrations/interact-systeme-io",
    html: ' Le détail de ce que leur documentation impose est ici : <a href="/integrations/interact-systeme-io">connecter Interact à Systeme.io</a>.',
    pourquoi:
      "Le paragraphe parle deja de leur centre d'aide : c'est l'endroit exact ou le lecteur veut le detail.",
  },
  {
    apres:
      "C'est la seule question qui change vraiment ta décision, et c'est celle que les comparatifs oublient",
    href: "/integrations",
    html: ' (le détail outil par outil est là : <a href="/integrations">connecter un formulaire ou un quiz à Systeme.io</a>)',
    pourquoi:
      "La phrase POSE la question a laquelle le hub repond : c'est la premiere seconde ou le lecteur en a besoin.",
  },
  {
    apres: "Soyons concrets sur les chiffres.",
    href: "/integrations/zapier-systeme-io",
    html: ' Les limites et les tarifs de Zapier sont détaillés ici : <a href="/integrations/zapier-systeme-io">Zapier et Systeme.io</a>.',
    pourquoi:
      "Le paragraphe qui suit compare des abonnements : le lecteur doit pouvoir verifier le chiffre de Zapier.",
  },
];

/**
 * Applique les corrections de chiffres à un fragment.
 *
 * Idempotente par construction : chaque motif disparaît après le premier
 * passage. Le MÊME motif que `faitsProgramme` est utilisé, pour que le
 * contrôle voie exactement ce que la réparation voit.
 */
export function corrigerFaitsOutils(fragment: string): string {
  let out = String(fragment ?? "");
  for (const regle of FAITS_OUTILS) out = out.replace(motif(regle.de), regle.vers);
  return out;
}

/** Ce qui reste faux, nommé plutôt que compté. */
export function faitsOutilsFaux(fragment: string): string[] {
  const texte = String(fragment ?? "");
  return FAITS_OUTILS.filter((r) => motif(r.de).test(texte)).map((r) => r.pourquoi);
}

/**
 * Pose les liens vers le hub dans un fragment, s'il porte leur ancre.
 *
 * Rend le fragment inchangé quand l'adresse y est déjà : relancer la
 * réparation ne doit rien produire de nouveau.
 */
export function poserLiensIntegrations(fragment: string): string {
  let out = String(fragment ?? "");
  for (const lien of LIENS) {
    if (!lien.html) continue;
    if (out.includes(`href="${lien.href}"`)) continue;
    const m = motif(lien.apres);
    if (!m.test(out)) continue;
    out = out.replace(motif(lien.apres), (trouve) => trouve + lien.html);
  }
  return out;
}

/** Le prix Tiquiz mensuel, pour le test qui compare au catalogue. */
export const PRIX_TIQUIZ_MENSUEL_EUR = TIQUIZ_MENSUEL_EUR;
