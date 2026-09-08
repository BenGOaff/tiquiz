// lib/blog/faitsEn.ts
//
// CE QUE LES QUATRE ARTICLES ANGLAIS PROMETTENT, ET QUI DOIT ETRE VRAI.
//
// Béné, 8 septembre 2026 : "j'ai des users anglophones qui me trouvent
// sur tipote.blog avec les articles en anglais : on doit les récupérer
// sur le blog tiquiz.fr avec les articles et pages en anglais. Mais il
// faut que ce soit bien fait."
//
// -- CE QUE LA MESURE A TROUVE AVANT DE SERVIR QUOI QUE CE SOIT --------
//
// Les quatre articles ont ete importes tels quels depuis
// `tipote.blog`. Relevé, pas déduit :
//
//   - **les QUATRE portent l'ancien tarif** ($9/mois, $90/an), celui
//     d'avant le 6 aout. Et deux d'entre eux annoncent en plus **l'offre
//     beta a vie** (57 EUR / $62 une fois), qui n'existe plus ;
//   - **l'article d'affiliation promet ce que le systeme contredit** :
//     "no threshold, no conditions", "paid on the 10th", 40 % ecrit
//     comme un plafond, et **toute une section sur Tipote** (50 % a vie,
//     plans $19 a $99/mo, "x14 your income") sur un produit qui n'est
//     pas en vente ;
//   - **20 liens menent a `tipote.fr/tiquiz-us`**, un tunnel Systeme.io.
//     Depuis que nos liens portent `?ref=` (24 aout), **un lien qui
//     atterrit la ne paie plus personne** ;
//   - **54 liens `http://Systeme.io`**, une adresse qui n'existe pas :
//     l'editeur de Systeme.io a auto-lie le mot dans le texte. Les
//     articles FRANCAIS n'en portent aucun, mesure ;
//   - **52 tirets cadratins**, la signature que Bene bannit depuis le
//     7 juin.
//
// C'est mot pour mot ce que la passe francaise a corrige les 29, 31 aout
// et 1er septembre (`faitsProgramme.ts`), sur les memes articles, dans
// l'autre langue. Publier l'anglais tel quel, ce serait republier en
// anglais ce qu'on vient de corriger en francais, sur les pages qui
// vendent et qui recrutent les affilies.
//
// -- POURQUOI UN MODULE, ET PAS UNE CORRECTION A LA MAIN ---------------
//
// `scripts/importer-blog-en.mjs` ne corrige RIEN, expres : un re-import
// ecraserait toute retouche faite dans le JSON. La regle vit donc ici,
// `npm run blog:reparer-en` l'applique, et le test appelle LA MEME
// fonction : le contenu est propre quand la reparation ne change plus
// rien. Deux copies de la regle finiraient par ne plus etre d'accord.
//
// -- ON NE CONVERTIT AUCUNE DEVISE -------------------------------------
//
// Regle du 1er septembre. Les montants passent en EUROS, parce que
// c'est ce que Stripe encaisse : un lecteur anglophone qui lit 17 EUR
// paiera 17 EUR. Ecrire un montant en dollars demanderait un taux de
// change invente, faux le lendemain.

import {
  PRIX_ANNUEL_TTC,
  PRIX_MENSUEL_TTC,
  RENTE_PAR_FILLEUL,
} from "@/lib/blog/faitsProgramme";
import {
  TYPEFORM_PLUS_PAR_MOIS_USD,
  ZAPIER_PRO_PAR_MOIS_USD,
} from "@/lib/blog/liensIntegrations";
import { eur, usd } from "@/lib/site/montantAnglais";

// Les deux prix viennent de la table FRANCAISE, ils ne sont pas recopies :
// un tarif ecrit deux fois est un tarif qui divergera, et le blog
// annoncerait alors deux prix pour le meme abonnement selon la langue.
const PRIX_MENSUEL = PRIX_MENSUEL_TTC;
const PRIX_ANNUEL = PRIX_ANNUEL_TTC;
/** Le prix de l'Atelier du Quiz, et son taux. */
const PRIX_ATELIER = 47;
const TAUX_ATELIER = 0.7;

/** Ce que coute le montage concurrent, additionne une seule fois. */
const TOTAL_CONCURRENT_USD = TYPEFORM_PLUS_PAR_MOIS_USD + ZAPIER_PRO_PAR_MOIS_USD;

/*
 * LES MONTANTS A L'ANGLAISE VIVENT DANS `lib/site/montantAnglais.ts`.
 *
 * Ils y ont demenage le 8 septembre : le hub integrations en a besoin
 * pour son prix Zapier, et deux copies d'un formateur de montant
 * finissent toujours par diverger. Le comportement ne change pas d'un
 * caractere, et les cas de ce fichier le figent.
 */

/**
 * LES LIENS, ET CE QU'ILS COUTENT QUAND ILS SONT FAUX.
 *
 * Un lien qui atterrit chez Systeme.io ne paie plus personne depuis le
 * 24 aout : leur page ignore `?ref=`, notre middleware ne voit jamais la
 * requete, et leur webhook ne sait lire qu'un `sa`. Ce n'est donc pas un
 * lien "a mettre a jour", c'est une commission perdue a chaque clic.
 */
export const LIENS_EN: readonly { de: string; vers: string; pourquoi: string }[] = [
  {
    de: "https://www.tipote.fr/tiquiz-us",
    vers: "https://tiquiz.fr",
    pourquoi: "tunnel Systeme.io : un lien qui atterrit la ne paie plus personne (24 aout).",
  },
  {
    de: "https://www.tipote.fr/tiquiz",
    vers: "https://tiquiz.fr",
    pourquoi: "meme tunnel, sans le suffixe -us.",
  },
  {
    de: "https://www.tipote.blog/tiquiz/affiliation",
    vers: "https://tiquiz.fr/affiliation",
    pourquoi: "l'ancien blog, que Bene supprime. La page d'affiliation vit chez nous.",
  },
  {
    de: "https://www.tipote.blog/tiquiz/affiliate",
    vers: "https://tiquiz.fr/affiliation",
    pourquoi: "idem, l'autre orthographe du meme lien.",
  },
  {
    de: "https://www.tipote.blog",
    vers: "https://tiquiz.fr",
    pourquoi: "l'ancien blog : la demo et l'inscription vivent sur tiquiz.fr.",
  },
  {
    de: "http://tomycreativetype.com",
    vers: "https://mycreativetype.com",
    pourquoi:
      "l'editeur a auto-lie \"to mycreativetype.com\" en emportant le mot \"to\" : l'adresse n'existe pas.",
  },
];

/** Le texte VISIBLE d'un lien, quand il nomme l'ancienne adresse. */
export const TEXTES_DE_LIEN_EN: readonly { de: string; vers: string; pourquoi: string }[] = [
  {
    de: "tipote.blog/tiquiz/affiliate",
    vers: "tiquiz.fr/affiliation",
    pourquoi: "le libelle affiche disait encore l'ancien domaine.",
  },
  {
    de: "tipote.blog/tiquiz/affiliation ",
    vers: "tiquiz.fr/affiliation ",
    pourquoi: "idem, avec l'espace que l'editeur a laisse dans le libelle.",
  },
  {
    de: "tipote.blog/tiquiz/affiliation",
    vers: "tiquiz.fr/affiliation",
    pourquoi: "idem, sans l'espace.",
  },
  {
    de: "tipote.blog/tiquiz?sa=YOUR_ID",
    vers: "tiquiz.fr/?ref=YOUR_CODE",
    pourquoi:
      "le `?sa=` est le parametre de Systeme.io, banni le 24 aout : nos liens portent `?ref=`, et le code public n'est pas un `sa`.",
  },
  {
    // EN DERNIER, et l'ordre compte : les libelles plus longs ci-dessus
    // doivent mordre avant, sinon celui-ci les consomme et ils ne
    // trouvent plus rien (regle du 29 aout, le plus long d'abord).
    de: "tipote.blog",
    vers: "tiquiz.fr",
    pourquoi: "le nom de l'ancien blog, affiche comme libelle de lien.",
  },
];

/**
 * LES FAITS, PHRASE ENTIERE PAR PHRASE ENTIERE.
 *
 * Jamais un remplacement de nombre isole : `$9` se retrouverait dans un
 * prix de concurrent, et `108` dans un autre calcul. C'est le piege
 * nomme le 29 aout, ou le prix devient juste et le resultat devient
 * faux.
 */
export const FAITS_EN: readonly { de: string; vers: string; pourquoi: string }[] = [
  // ── LES PRIX DES CONCURRENTS, RELUS AU LIEU D'ETRE RECOPIES ──────────
  //
  // Son anglais annonce "Typeform at $59/month" et "$88/month" a cinq
  // endroits, sur les DEUX pages qui nous comparent a Typeform et Zapier.
  // Le francais portait le meme defaut le 1er septembre ("217 €/mois",
  // une addition fausse et un chiffre qui contredisait notre propre page
  // Zapier), et il a ete corrige en LISANT `liensIntegrations.ts`.
  //
  // Les deux chiffres viennent donc du meme endroit que le francais.
  // Recopier "88" ici referait le bug dans l'autre langue, et il vit a
  // l'endroit exact ou un lecteur va verifier.
  {
    de: "Zapier at $29/month + Typeform at $59/month = $88/month for life",
    vers: `Zapier Professional at ${usd(ZAPIER_PRO_PAR_MOIS_USD)}/month + Typeform Plus at ${usd(
      TYPEFORM_PLUS_PAR_MOIS_USD,
    )}/month = ${usd(TOTAL_CONCURRENT_USD)}/month for life`,
    pourquoi:
      "prix releves sur leurs pages de tarifs (Typeform Plus 79 $, Zapier Pro 29,99 $) : 59 et 88 sont perimes.",
  },
  {
    de: "(1) Typeform + Zapier (expensive, around $88/month)",
    vers: `(1) Typeform + Zapier (expensive, around ${usd(TOTAL_CONCURRENT_USD)}/month)`,
    pourquoi: "meme total perime, dans la FAQ.",
  },
  {
    de: "Typeform Plus (no native Systeme.io integration, requires Zapier): $59/month + $29/month for Zapier = <strong>$88/month</strong>",
    vers: `Typeform Plus (no native Systeme.io integration, requires Zapier): ${usd(
      TYPEFORM_PLUS_PAR_MOIS_USD,
    )}/month + ${usd(ZAPIER_PRO_PAR_MOIS_USD)}/month for Zapier = <strong>${usd(
      TOTAL_CONCURRENT_USD,
    )}/month</strong>`,
    pourquoi: "les trois chiffres de la ligne etaient perimes.",
  },
  {
    de: "you have to configure Zapier or Make (an extra $29/month)",
    vers: `you have to configure Zapier or Make (an extra ${usd(ZAPIER_PRO_PAR_MOIS_USD)}/month)`,
    pourquoi: "Zapier Professional est a 29,99 $, pas 29 $.",
  },
  {
    de: "Option 1: duct-tape something with Typeform + Zapier</strong>, around $88/month forever.",
    vers: `Option 1: duct-tape something with Typeform + Zapier</strong>, around ${usd(
      TOTAL_CONCURRENT_USD,
    )}/month forever.`,
    pourquoi: "le meme total perime, dans l'autre article.",
  },
  // ── L'ANCIEN TARIF, DANS LES QUATRE ARTICLES ──
  {
    // Le motif commence a l'espace : le mot "Systeme.io" juste avant
    // etait un lien auto-cree, et le deballer laisse une fermeture de
    // balise au milieu de la phrase.
    de: " integration, at $9/month for unlimited (free plan available to test).",
    vers: ` integration, at ${eur(PRIX_MENSUEL)}/month for unlimited quizzes (free plan available to test).`,
    pourquoi: "9 USD est le tarif d'avant le 6 aout.",
  },
  {
    de: "in beta: <strong>€57 (about $62) one-time, lifetime</strong>. After the beta phase: $9/month or $90/year for unlimited.",
    vers: `at <strong>${eur(PRIX_MENSUEL)}/month or ${eur(PRIX_ANNUEL)}/year</strong>, with a free plan to test before you pay anything.`,
    pourquoi:
      "l'offre beta a vie est terminee : l'annoncer, c'est vendre quelque chose qui n'existe plus.",
  },
  {
    de: "Tiquiz in beta: $62 once, lifetime. You do the math.",
    vers: `Tiquiz: ${eur(PRIX_MENSUEL)}/month, and a free plan to test before you pay anything. You do the math.`,
    pourquoi: "meme offre beta terminee, dans l'autre article.",
  },
  {
    de: "All for $62 one-time instead of $88/month for life.",
    vers: `All for ${eur(PRIX_MENSUEL)}/month instead of ${usd(TOTAL_CONCURRENT_USD)}/month for life.`,
    pourquoi:
      "idem. Les 88 USD de la comparaison sont ceux de Typeform et Zapier, qui facturent en dollars : on ne convertit aucune devise.",
  },

  // ── L'ARITHMETIQUE DE LA RENTE ──
  //
  // Chaque montant est CALCULE depuis `RENTE_PAR_FILLEUL`, la meme
  // source que le blog francais et que le simulateur : un montant
  // recopie serait faux au prochain changement de tarif, de taux ou de
  // base, et il vit ici a l'endroit exact ou un affilie le verifie.
  {
    de: "<strong>Real numbers:</strong> 1 monthly subscriber at $9/mo = <strong>$3.60/mo for life</strong>. 30 active referrals = <strong>$108/mo</strong>. 50 referrals on the annual plan = <strong>$1,800/yr</strong>.",
    vers: `<strong>Real numbers:</strong> 1 monthly subscriber at ${eur(PRIX_MENSUEL)}/mo = <strong>${eur(
      RENTE_PAR_FILLEUL.mensuel,
    )}/mo for life</strong>. 30 active referrals = <strong>${eur(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )}/mo</strong>. 50 referrals on the annual plan = <strong>${eur(
      50 * RENTE_PAR_FILLEUL.annuel,
    )}/yr</strong>.`,
    pourquoi: "les trois montants du chapeau sont 40% de l'ancien tarif.",
  },
  {
    de: "On the monthly plan at $9, you earn <strong>$3.60 per referral per month</strong>, or $43.20 per year per referral. On the annual plan at $90, you earn <strong>$36 per referral per year</strong>. With 30 active referrals on monthly, your income hits $108/mo. With 50 active referrals on annual, your income hits $1,800/yr. An official simulator on the Tiquiz affiliate page lets you project your income based on your target referral count.",
    vers: `On the monthly plan at ${eur(PRIX_MENSUEL)}, you earn <strong>${eur(
      RENTE_PAR_FILLEUL.mensuel,
    )} per referral per month</strong>, or ${eur(
      12 * RENTE_PAR_FILLEUL.mensuel,
    )} per year per referral. On the annual plan at ${eur(PRIX_ANNUEL)}, you earn <strong>${eur(
      RENTE_PAR_FILLEUL.annuel,
    )} per referral per year</strong>. With 30 active referrals on monthly, your income hits ${eur(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )}/mo. With 50 active referrals on annual, your income hits ${eur(
      50 * RENTE_PAR_FILLEUL.annuel,
    )}/yr. These figures use the 40% starting rate: your first paying referral moves you to 45%, and the rate climbs to 70%. A simulator on the Tiquiz affiliate page projects your income for the referral count you are aiming at.`,
    pourquoi:
      "la FAQ donnait quatre montants a l'ancien tarif, et les annoncait au plancher sans dire que c'etait le plancher.",
  },
  {
    de: "Over 3 cumulative years, <strong>one monthly referral at $9</strong> brings you $129.60 in total income. <strong>One annual referral at $90</strong> brings you $108. The monthly plan wins over time because the base ($9 × 12 = $108/yr) is slightly higher than $90/yr.",
    vers: `Over 3 cumulative years, <strong>one monthly referral at ${eur(PRIX_MENSUEL)}</strong> brings you ${eur(
      36 * RENTE_PAR_FILLEUL.mensuel,
    )} in total income. <strong>One annual referral at ${eur(PRIX_ANNUEL)}</strong> brings you ${eur(
      3 * RENTE_PAR_FILLEUL.annuel,
    )}. The monthly plan wins over time for one simple reason: your referral pays more across the year, ${eur(PRIX_MENSUEL)} twelve times is ${eur(
      12 * PRIX_MENSUEL,
    )}, against ${eur(PRIX_ANNUEL)} in one go.`,
    pourquoi: "projection a 3 ans calculee sur l'ancien tarif.",
  },
  {
    de: "In practice, monthly referrals also have <strong>better retention</strong> because $9 a month with no commitment is psychologically easier to keep than $90 paid upfront.",
    vers: `In practice, monthly referrals also have <strong>better retention</strong> because ${eur(PRIX_MENSUEL)} a month with no commitment is psychologically easier to keep than ${eur(PRIX_ANNUEL)} paid upfront.`,
    pourquoi: "ancien tarif dans une phrase sans arithmetique.",
  },
  {
    de: "At 20% on a $9/mo subscription, you earn $1.80 per referral per month. For a solopreneur, that doesn't build usable income. With 50 referrals, you cap out at $90 a month.",
    vers: `At 20% on a ${eur(PRIX_MENSUEL)}/mo subscription, you earn ${eur(
      (PRIX_MENSUEL / 1.2) * 0.2,
    )} per referral per month. For a solopreneur, that doesn't build usable income. With 50 referrals, you cap out at ${eur(
      50 * (PRIX_MENSUEL / 1.2) * 0.2,
    )} a month.`,
    pourquoi: "la comparaison avec les programmes a 20% tournait sur l'ancien tarif.",
  },
  {
    de: "With a 1,000-subscriber newsletter and a 1% conversion rate on your affiliate link (10 monthly referrals), you build <strong>$36/mo in income</strong>. Over a year, that's $432.",
    vers: `With a 1,000-subscriber newsletter and a 1% conversion rate on your affiliate link (10 monthly referrals), you build <strong>${eur(
      10 * RENTE_PAR_FILLEUL.mensuel,
    )}/mo in income</strong>. Over a year, that's ${eur(120 * RENTE_PAR_FILLEUL.mensuel)}.`,
    pourquoi: "36 USD est 10 x 40% de l'ancien tarif, et 432 ne correspondait a rien (36 x 12 = 432 est juste, mais sur un montant faux).",
  },
  {
    de: "aiming for 30 to 50 active referrals over a year is realistic. That's <strong>$108 to $180/mo in income</strong>.",
    vers: `aiming for 30 to 50 active referrals over a year is realistic. That's <strong>${eur(
      30 * RENTE_PAR_FILLEUL.mensuel,
    )} to ${eur(50 * RENTE_PAR_FILLEUL.mensuel)}/mo in income</strong>.`,
    pourquoi: "fourchette 30 a 50 filleuls, a l'ancien tarif.",
  },
  {
    de: "Your client signs up for an annual plan at $90. You earn $36 in immediate commission. And as long as they stay subscribed in the years that follow, <strong>your $36/yr income lands every year on autopilot</strong>",
    vers: `Your client signs up for an annual plan at ${eur(PRIX_ANNUEL)}. You earn ${eur(
      RENTE_PAR_FILLEUL.annuel,
    )} in immediate commission. And as long as they stay subscribed in the years that follow, <strong>that income lands every year on autopilot</strong>`,
    pourquoi: "meme calcul a l'ancien tarif annuel.",
  },

  // ── LES PROMESSES QUE LE SYSTEME CONTREDIT ──
  //
  // Il y a un seuil (20 EUR) et un delai (J+30), et le versement a lieu
  // ENTRE le 10 et le 13. C'est la faute la plus chere de la liste
  // parce qu'elle ne se decouvre qu'au premier virement, et que c'est
  // cet article qui recrute.
  {
    de: "The Tiquiz affiliate program builds you monthly recurring income: 40% lifetime commission, paid on the 10th, no threshold, no conditions.",
    vers:
      "The Tiquiz affiliate program builds you monthly recurring income: 40% lifetime commission to start, rising to 70%, paid between the 10th and the 13th of every month.",
    pourquoi:
      "la description de l'article, c'est a dire la seule phrase lue avant le clic, promettait l'absence de seuil et de conditions.",
  },
  {
    de: "lands automatically on the <strong>10th of every month</strong>, as long as your referrals stay subscribed. You earn <strong>40% lifetime commission</strong> on every Tiquiz subscription generated through your link.",
    vers:
      "lands between the <strong>10th and the 13th of every month</strong>, as long as your referrals stay subscribed. You earn <strong>40% lifetime commission at the minimum</strong> on every Tiquiz subscription generated through your link, and that rate climbs to 70% with the number of referrals who pay.",
    pourquoi: "le versement a lieu entre le 10 et le 13, et 40% est la premiere marche.",
  },
  {
    de: "<strong>Automatic payouts</strong> via PayPal or bank transfer. <strong>No threshold</strong>, <strong>no invoice</strong>, <strong>no conditions</strong>.",
    vers:
      "<strong>Payouts</strong> via PayPal or bank transfer, <strong>from €20</strong> and 30 days after your referral pays. Below that, the money stays yours and rolls into the next payout. <strong>No invoice to write</strong> (we issue it for you) and <strong>no signup conditions</strong>.",
    pourquoi: "IL Y A un seuil de 20 EUR et un delai de 30 jours.",
  },
  {
    de: "<strong>Step 5.</strong> Your income is paid out <strong>automatically on the 10th of every month</strong> via PayPal or bank transfer. No payout threshold to hit, no invoice to send, no follow-up needed.",
    vers:
      "<strong>Step 5.</strong> Your income is paid out <strong>between the 10th and the 13th of every month</strong> via PayPal or bank transfer. A commission becomes payable 30 days after your referral pays, and the transfer goes out from €20 onwards. No invoice to send, no follow-up needed: we write the invoice for you.",
    pourquoi: "les cinq etapes annoncaient le contraire du systeme.",
  },
  {
    de: "Your income is paid <strong>automatically on the 10th of every month</strong>, via PayPal or bank transfer (your choice). No payout threshold to hit, no invoice to send, no follow-up needed.",
    vers:
      "Your income is paid <strong>between the 10th and the 13th of every month</strong>, via PayPal or bank transfer (your choice). A commission becomes payable 30 days after your referral pays, and the transfer goes out from €20 onwards. No invoice to send, no follow-up needed: we write the invoice for you.",
    pourquoi: "meme promesse fausse dans la FAQ.",
  },
  {
    de: "Your commissions get paid out <strong>automatically on the 10th of every month</strong>.",
    vers: "Your commissions get paid out <strong>between the 10th and the 13th of every month</strong>.",
    pourquoi: "troisieme endroit du meme article.",
  },
  {
    de: "monthly recurring income paid automatically on the 10th of every month</strong> to your PayPal or bank account",
    vers:
      "monthly recurring income paid between the 10th and the 13th of every month</strong> to your PayPal or bank account",
    pourquoi: "quatrieme endroit, dans la FAQ.",
  },
  {
    de: "<strong>Automatic</strong>: paid on the 10th of every month, with zero action from you",
    vers: "<strong>Automatic</strong>: paid between the 10th and the 13th of every month, with zero action from you",
    pourquoi: "cinquieme endroit, dans la liste des trois traits.",
  },
  {
    de: "<strong>Get your first commission</strong> on the 10th of the month after your first referral's first paid subscription.",
    vers:
      "<strong>Get your first commission</strong> in the payout window that follows your first referral's first paid subscription, 30 days after they pay.",
    pourquoi: "sixieme endroit, dans la conclusion.",
  },
  {
    de: "administrative simplicity (no threshold, no conditions, automatic payouts)",
    vers: "administrative simplicity (we issue your invoice, you have nothing to send)",
    pourquoi: "le verdict du comparatif reprenait la promesse fausse.",
  },
  {
    de: "Tiquiz sits at the top of the market for recurring income (lifetime attribution) and",
    vers: "Tiquiz is built for recurring income (lifetime attribution) and",
    pourquoi:
      "\"top of the market\" est un superlatif qu'on ne peut pas prouver, et cet article recrute des affilies.",
  },

  // ── LE PLANCHER DIT COMME UN PLAFOND ──
  {
    de: "You earn <strong>40% lifetime recurring commission</strong> on every Tiquiz subscription you generate.",
    vers:
      "You earn <strong>40% lifetime recurring commission at the minimum</strong> on every Tiquiz subscription you generate, and that rate climbs to 70% with the number of referrals who pay.",
    pourquoi: "40% est la premiere marche, pas la seule.",
  },
  {
    de: "3. Why 40% lifetime is the most solid affiliate income on the market",
    vers: "3. Why 40% lifetime is an income, not a tip",
    pourquoi: "superlatif invérifiable, dans un titre.",
  },
  {
    de: "40% lifetime recurring is rare in SaaS affiliate market.",
    vers: "40% lifetime recurring, rising to 70%, is rare in the SaaS affiliate market.",
    pourquoi: "idem : le bareme monte, l'article n'en disait rien ici.",
  },
  {
    de: "3.3. Why 40% and not 50%",
    vers: "3.3. Why it starts at 40%",
    pourquoi: "le taux monte jusqu'a 70% : le titre disait le contraire du bareme.",
  },
  {
    de: "Because I want Tiquiz to stay profitable and keep evolving long-term. There's hosting, AI costs (quiz generation with Claude), customer support, product development. At 50% lifetime commission, I couldn't fund the product. Tiquiz would lose quality, your referrals would leave, and your income would crater.",
    vers:
      "Because a rate has to pay for itself. There's hosting, AI costs, customer support, product development. A program that starts too high makes it back somewhere else, usually on the quality of the tool, and your income is what suffers when your referrals leave.",
    pourquoi: "la justification \"pas 50%\" ne tient plus depuis que le bareme va jusqu'a 70%.",
  },
  {
    de: "<strong>40% is the balance point</strong>: high enough that your income is worth chasing, low enough that Tiquiz can keep investing in the product that feeds your income.",
    vers:
      "<strong>40% is where it starts</strong>: high enough that your income is worth chasing from day one, and it climbs as you bring people in, because at that point there is something to pay it with.",
    pourquoi: "meme raison : 40% n'est pas un point d'equilibre, c'est un plancher.",
  },
  {
    de: "As long as they stay subscribed, you keep earning 40% of every payment.",
    vers: "As long as they stay subscribed, you keep earning your commission on every payment.",
    pourquoi: "ecrire le taux en dur le fige au plancher.",
  },
  {
    de: "You earn <strong>40% of every payment your referral makes</strong>.",
    vers: "You earn <strong>a commission on every payment your referral makes</strong>, 40% at the minimum.",
    pourquoi: "idem, dans les cinq etapes.",
  },
  {
    de: "You earn <strong>40% recurring commission</strong> on every payment from your referral",
    vers: "You earn <strong>40% recurring commission at the minimum</strong> on every payment from your referral",
    pourquoi: "idem, dans la FAQ.",
  },
  {
    de: " has a higher rate (60%), but the market is way more saturated.",
    vers: "",
    pourquoi:
      "je n'ai verifie aucun taux de concurrent : citer 60% sans source est exactement ce qu'un lecteur ira verifier.",
  },
  // ── LES TROIS PROMESSES TIPOTE RESTEES HORS DE LA SECTION ──
  //
  // Le chapeau, l'introduction et la conclusion promettaient la meme
  // chose que la section 4, a trois endroits d'un article de 60 blocs.
  // C'est la mecanique habituelle : une promesse vit rarement a un seul
  // endroit, et retirer la section sans ces trois la laisserait un
  // article qui annonce Tipote dans son resume et n'en parle nulle part.
  {
    de: "<strong>Ecosystem bonus:</strong> Your Tiquiz referrals are already inside the Tipote pipeline. When Tipote launches (plans $19 to $99/mo, <strong>50% lifetime commission</strong>), I'll reach out to them first to upgrade. A single referral who moves to the Tipote top plan = <strong>$49.50/mo in your pocket</strong>, with zero extra effort from you. That's <strong>×14 on your initial income</strong>.",
    vers: `<strong>One account, two products:</strong> the same link pays you <strong>${
      TAUX_ATELIER * 100
    }%</strong> on the Atelier du Quiz, the ${eur(PRIX_ATELIER)} training, so ${eur(
      (PRIX_ATELIER / 1.2) * TAUX_ATELIER,
    )} per sale. And your Tiquiz rate climbs by steps, from 40% up to 70%, with the number of referrals who pay.`,
    pourquoi: "le chapeau promettait Tipote, qui n'est pas en vente.",
  },
  {
    de: "And there's a scale effect very few programs offer: your Tiquiz referrals enter the <strong>Tipote ecosystem</strong>. When Tipote launches (plans $19 to $99/mo), they'll get the upgrade pitch first, and <strong>your monthly income on them can climb to $49.50 per referral per month</strong>",
    vers:
      "And there's a scale effect very few programs offer: <strong>your rate itself climbs</strong>. It starts at 40%, moves to 45% on your first paying referral, and keeps going up to 70%",
    pourquoi: "l'introduction promettait la meme chose, sur le meme produit qui n'est pas en vente.",
  },
  {
    de: "The income stacks up as you bring in referrals, and it can grow on its own when Tipote launches.",
    vers:
      "The income stacks up as you bring in referrals, and your rate climbs with them.",
    pourquoi: "la conclusion, troisieme endroit du meme article.",
  },
];

/**
 * LA SECTION SUR TIPOTE, REMPLACEE EN ENTIER.
 *
 * Quatorze blocs (le titre "4. The Tipote ecosystem effect" jusqu'a la
 * fin de 4.4) promettaient 50 % a vie sur des plans de $19 a $99/mois,
 * un graphique de projection, et un "x14 your income". **Tipote n'est
 * pas en vente** : ni les plans, ni le taux, ni le x14 ne sont
 * verifiables.
 *
 * C'est exactement ce qui a ete retire de l'article FRANCAIS le
 * 1er septembre, et l'anglais le portait encore. On ne coupe pas la
 * section : on la remplace par ce qui est VRAI et qui se verifie dans
 * le code, l'Atelier du Quiz a 70 % et le bareme qui monte.
 */
export const SECTION_TIPOTE = {
  /** Le titre qui ouvre la section a remplacer. */
  ouvre: "4. The Tipote ecosystem effect: your income grows on autopilot when Tipote launches",
  /** Le titre du bloc SUIVANT, celui qu'on garde. */
  ferme: "5. Who this Tiquiz affiliate income is really for",
  blocs: [
    {
      type: "titre" as const,
      niveau: 3 as const,
      texte: "4. The same link pays you on the Atelier du Quiz",
      id: "4-the-same-link-pays-you-on-the-atelier-du-quiz",
    },
    {
      type: "html" as const,
      html:
        '<p dir="ltr"><span style="color: rgb(19, 14, 75)">You have one affiliate account, not two. The same link pays you on <strong>the Atelier du Quiz</strong>, the 7 day training at ' +
        `${eur(PRIX_ATELIER)}, at <strong>${TAUX_ATELIER * 100}% commission</strong>, so <strong>${eur(
          (PRIX_ATELIER / 1.2) * TAUX_ATELIER,
        )}</strong> per sale, paid once.</span></p>` +
        '<p></p><p dir="ltr"><span style="color: rgb(19, 14, 75)">A referral who takes the training and then subscribes to Tiquiz pays you on both. And your Tiquiz rate itself climbs by steps, from 40% up to 70%, with the number of referrals who pay.</span></p>',
    },
    {
      type: "titre" as const,
      niveau: 3 as const,
      texte: "4.1. What about the tools that come later",
      id: "4-1-what-about-the-tools-that-come-later",
    },
    {
      type: "html" as const,
      html:
        '<p dir="ltr"><span style="color: rgb(19, 14, 75)">Your referrals are tied to you for life, and that attribution belongs to the register, not to one product. Whatever ships later is covered by the same account.</span></p>' +
        '<p></p><p dir="ltr"><span style="color: rgb(19, 14, 75)">I am not announcing a date, a price or a rate for anything that is not on sale yet. When it is, you will read it here with the numbers attached.</span></p>',
    },
  ],
};

/**
 * CE QUI NE DOIT PLUS EXISTER APRES LA REPARATION.
 *
 * Le controle qui compte : la reparation dit ce qu'elle a change, et
 * celui-ci dit ce qui reste. Sans lui, une correction qui ne trouve pas
 * sa cible est une correction qu'on croit appliquee (leçon du 4
 * septembre).
 */
export const INTERDITS_EN: readonly { motif: RegExp; pourquoi: string }[] = [
  { motif: /tipote\.fr\/tiquiz/i, pourquoi: "tunnel Systeme.io : ne commissionne plus personne" },
  { motif: /tipote\.blog/i, pourquoi: "l'ancien blog, supprime par Bene" },
  { motif: /http:\/\/Systeme\.io/i, pourquoi: "adresse auto-liee par l'editeur, elle n'existe pas" },
  { motif: /[—–]/, pourquoi: "tiret cadratin ou demi-cadratin : la signature bannie le 7 juin" },
  // LE `?sa=` EST BANNI SUR NOS HÔTES, ET SEULEMENT LÀ.
  //
  // Le motif visait `?sa=` partout, et c'était trop large. Mesuré le
  // 8 septembre sur les 16 articles : les 14 occurrences du corpus sont
  // toutes `https://systeme.io/...?sa=sa0007...`, c'est à dire le lien
  // d'affiliation de Béné CHEZ Systeme.io, dans le paramètre de
  // Systeme.io, sur le site de Systeme.io. Il la paie, et le retirer
  // lui coûterait ses commissions Systeme.io sans que rien ne le dise.
  //
  // Ce que la règle du 24 août interdit, c'est un `?sa=` sur NOS
  // adresses : là, il ne commissionne plus personne (leur page ignore
  // le paramètre, notre middleware ne voit jamais la requête). Le motif
  // dit donc exactement ça.
  {
    motif: /(?:tiquiz\.fr|tipote\.(?:fr|com|blog)|quiz\.tipote\.com|atelierduquiz\.fr)[^"'\s]*\?sa=/i,
    pourquoi: "un ?sa= sur un de NOS hotes ne paie plus personne depuis le 24 aout",
  },
  { motif: /\$9\b|\$90\b|\$3\.60|\$1,800|\$43\.20|\$62\b|€57/, pourquoi: "l'ancien tarif, ou l'offre beta a vie" },
  // "no conditions" tout court parle de l'INSCRIPTION au programme, qui
  // est vraiment ouverte a tout le monde : l'interdire ferait rougir le
  // controle sur deux phrases parfaitement vraies, et un controle qui
  // crie pour rien finit desactive (leçon du filet genre-neutre).
  { motif: /no (payout )?threshold/i, pourquoi: "il y a un seuil de €20 et un delai de 30 jours" },
  { motif: /on the 10th of every month|on the 10th of the month/i, pourquoi: "le versement a lieu ENTRE le 10 et le 13" },
  // "TIPOTE" LE PRODUIT, PAS `quiz.tipote.com` LE DOMAINE.
  //
  // Le motif visait le mot partout, et c'était trop large. Mesuré le
  // 8 septembre : la seule occurrence du corpus est
  // `quiz.tipote.com/p/mon-popquiz`, c'est à dire l'adresse PUBLIQUE
  // d'un Popquiz, celle que la créatrice partage vraiment, et qui est
  // en plus visible dans la capture d'écran juste à côté. La refuser
  // ferait rougir le contrôle sur un fait exact, et un contrôle qui
  // crie pour rien finit désactivé (leçon du filet genre-neutre).
  //
  // Ce que la règle interdit, c'est de PROMETTRE Tipote : "the Tipote
  // ecosystem", "when Tipote launches", un taux ou un prix sur un
  // produit qui n'est pas en vente. Le motif dit donc exactement ça :
  // le mot seul, jamais un nom d'hôte.
  {
    motif: /(?<![.\w])Tipote(?!\.(?:com|fr|blog))/i,
    pourquoi: "Tipote n'est pas en vente : rien de ce qu'on en promet n'est verifiable",
  },
  { motif: /50% lifetime|50% lifetime/i, pourquoi: "taux annonce sur un produit qui n'est pas en vente" },
];

/**
 * LES TIRETS CADRATINS.
 *
 * Bene, 7 juin 2026 : aucun em-dash ni en-dash dans le contenu vu par
 * un lecteur. La regle a ete ecrite pour le francais et elle vaut ici :
 * ces 52 tirets sont exactement la signature qu'elle bannit, et ils
 * viennent d'une traduction automatique.
 *
 * DEUX remplacements, pas un seul. Apres un libelle numerote ("Step 2",
 * "Mistake 3", "FAQ"), le tiret INTRODUIT, donc il devient un
 * deux-points ; partout ailleurs il marque une incise, donc une
 * virgule. Un seul remplacement pour les deux donnerait "FAQ, Creating
 * a Quiz", ce qui ne veut rien dire.
 */
export function retirerTirets(texte: string): string {
  return (
    texte
      // Un libelle numerote (ou "FAQ") suivi d'un tiret : il introduit.
      .replace(/\b(FAQ|Strategy \d+|Mistake \d+|Option \d+|Step \d+)\s*[—–]\s*/g, "$1: ")
      // Un tiret colle a une ponctuation : elle suffit, le tiret part.
      .replace(/([,;:.!?])\s*[—–]\s*/g, "$1 ")
      // Partout ailleurs : une incise, donc une virgule.
      .replace(/\s*[—–]\s*/g, ", ")
  );
}

/**
 * LA PONCTUATION ANGLAISE NE PORTE PAS D'ESPACE DEVANT.
 *
 * Bene, 8 septembre 2026 : "il faut a chaque fois utiliser le champ
 * semantique, les expressions, tournures de phrases, ponctuation etc ..
 * propre a chaque langue, c'est pas uniquement du mot a mot."
 *
 * -- MESURE, PAS DEDUIT -------------------------------------------------
 *
 * Ses quatre articles anglais portent TROIS espaces avant une
 * ponctuation ("And now ?" deux fois, "three options : " une fois).
 * C'est l'habitude francaise ecrite dans un texte anglais : en anglais
 * la ponctuation se colle au mot, sans exception.
 *
 * C'est le meme travail que `reponctuation.ts` fait sur le francais
 * depuis le 30 aout, dans l'autre sens : la regle est PAR LANGUE, et
 * appliquer celle du francais a l'anglais est exactement la faute du
 * 1er aout (une logique ecrite pour un cas appliquee telle quelle a un
 * autre).
 *
 * -- LES GARDES, ET POURQUOI ILS COMPTENT -------------------------------
 *
 * RETIRER une espace est aussi dangereux que d'en inserer (lecon du
 * 3 aout). On ne touche donc qu'a une ponctuation qui TERMINE : precedee
 * d'une lettre ou d'un chiffre, suivie d'une espace, d'une fermeture ou
 * de la fin. Ca protege un `https://` (precede de deux points, pas d'une
 * lettre), une heure (`12:30`, suivie d'un chiffre), un `&nbsp;` (le
 * point-virgule y suit une lettre mais AUCUNE espace ne le precede) et
 * un `style="color:red"`.
 *
 * IDEMPOTENTE par construction : une fois l'espace retiree, le motif ne
 * trouve plus rien. C'est l'invariant du 1er septembre, et c'est ce qui
 * evite qu'un texte derive un peu plus a chaque passage.
 */
export function ponctuationAnglaise(texte: string): string {
  return texte.replace(/([A-Za-z0-9])[  ]+([:;!?])(?=\s|$|<|&|["'\)\]])/g, "$1$2");
}

/**
 * LES QUESTIONS DE FAQ RETIREES EN ENTIER.
 *
 * Une question dont la reponse entiere promet un produit qui n'est pas
 * en vente ne se corrige pas phrase par phrase : c'est la question
 * elle-meme qui promet. La retirer est la seule reponse honnete.
 */
export const QUESTIONS_RETIREES_EN: readonly { question: string; pourquoi: string }[] = [
  {
    question: "Do my Tiquiz referrals also build income on Tipote when Tipote launches?",
    pourquoi:
      "la question promet une rente sur Tipote, qui n'est pas en vente : ni les plans, ni le taux, ni le x14 ne sont verifiables.",
  },
];
